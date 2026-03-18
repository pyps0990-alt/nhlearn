const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { DateTime } = require("luxon");
const { GoogleGenAI } = require("@google/genai"); // 升級為新版 SDK

admin.initializeApp();

// 定義 Secret
const geminiApiKey = defineSecret("GEMINI_API_KEY");

// 1. 監聽「新增通知」，並發送真實的 FCM 雲端推播 (改用 Topic 避免三重重複通知)
exports.sendPushNotificationOnNotice = onDocumentCreated("classes/{classId}/notices/{noticeId}", async (event) => {
    const notice = event.data.data();
    const classId = event.params.classId;

    // 2. 冗餘濾除：AI 連線、同步成功等不需要推播
    const skipPushTypes = ["ai_connect", "sync_success", "status_info", "status"];
    if (skipPushTypes.includes(notice.type) || notice.silent) {
        console.log(`[${classId}] 偵測到冗餘或靜音通知 (${notice.type})，跳過推播.`);
        return null;
    }

    try {
        const message = {
            notification: {
                title: notice.title || "班級新通知",
                body: notice.content || "請開啟 App 查看最新資訊"
            },
            data: {
                type: notice.type || "general",
                classId: classId
            },
            topic: `class_${classId}` // 使用主題訂閱
        };

        const response = await admin.messaging().send(message);
        console.log(`[${classId}] 主題推播發送完成: ${response}`);
    } catch (error) {
        console.error("FCM 發送流程失敗:", error);
    }
    return null;
});

// 1.5 監聽「班級文件更新」，並專準挑出「課表異動」發送通知
exports.notifyScheduleUpdate = onDocumentUpdated("classes/{classId}", async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();
    const classId = event.params.classId;

    const beforeSchedule = beforeData.schedule || [];
    const afterSchedule = afterData.schedule || [];

    // 🚀 關鍵防呆：將陣列轉為字串比對，確保只有「課表」真的被修改時才發送通知
    // 這樣老師更新「聯絡簿 (contactBook)」時，就不會誤觸課表更新通知
    if (JSON.stringify(beforeSchedule) !== JSON.stringify(afterSchedule)) {
        console.log(`[${classId}] 偵測到課表發生變動，準備發送主題推播`);
        const message = {
            notification: {
                title: "課表異動通知 🔄",
                body: "班級課表已有更新 (可能為調課或更改教室)，請開啟 App 確認最新課表！"
            },
            data: {
                type: "schedule_update",
                classId: classId
            },
            topic: `class_${classId}`
        };
        try {
            await admin.messaging().send(message);
        } catch (error) {
            console.error(`[${classId}] 發送課表異動推播失敗:`, error);
        }
    }
});

// 2. 每天晚上 20:00 執行：結合 AI 摘要，提醒明日行程與考試
exports.dailyExamReminder = onSchedule({ schedule: "0 20 * * *", timeZone: "Asia/Taipei", secrets: [geminiApiKey] }, async (event) => {
    const apiKey = geminiApiKey.value();

    // 🚀 強制使用台北時區確保跨日正確 (取代舊版有 UTC 時差風險的 new Date)
    const tomorrowTaipei = DateTime.now().setZone("Asia/Taipei").plus({ days: 1 });
    const tomorrowStr = tomorrowTaipei.toFormat("yyyy-MM-dd");
    const jsDay = tomorrowTaipei.weekday === 7 ? 0 : tomorrowTaipei.weekday;

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const data = classDoc.data();
        const contactBook = data.contactBook || {};
        const schedule = data.schedule || [];

        const tomorrowsEntries = contactBook[tomorrowStr] || [];
        const tomorrowSchedule = schedule.filter(c => Number(c.day) === jsDay);

        // 如果明天放假且沒作業/考試，就略過不打擾
        if (tomorrowsEntries.length === 0 && tomorrowSchedule.length === 0) continue;

        // 準備餵給 AI 的資料陣列
        const contentArray = [];
        tomorrowSchedule.forEach(c => contentArray.push(`課程: ${c.course} (${c.startTime})`));
        tomorrowsEntries.forEach(e => {
            if (e.homework) contentArray.push(`作業: ${e.subject} - ${e.homework}`);
            if (e.exam) contentArray.push(`考試: ${e.subject} - ${e.exam} (${e.examType || '小考'})`);
        });

        const exams = tomorrowsEntries.filter(e => e.exam);
        const homeworks = tomorrowsEntries.filter(e => e.homework);
        let summary = `明天有 ${exams.length} 項考試與 ${homeworks.length} 項作業，請記得準備！`;

        // 呼叫 Gemini 生成精要提醒
        if (apiKey && contentArray.length > 0) {
            const aiResult = await generateGeminiSummary(contentArray, apiKey);
            if (aiResult && !aiResult.includes("產生失敗")) {
                summary = aiResult;
            }
        }

        // 🚀 直接發送 FCM 主題推播，不寫入 notices，避免髒資料與觸發其他迴圈
        const message = {
            notification: {
                title: "明日準備事項 🎒",
                body: summary
            },
            data: { type: "prep", classId: classDoc.id },
            topic: `class_${classDoc.id}`
        };

        try {
            await admin.messaging().send(message);
            console.log(`[${classDoc.id}] 明日 AI 準備事項推播已發送`);
        } catch (err) {
            console.error(`[${classDoc.id}] 發送明日準備失敗:`, err);
        }
    }
});

// 3. 每天下午 17:00 執行：提醒明日作業 (放學通知)
exports.dailyHomeworkReminder = onSchedule({ schedule: "0 17 * * *", timeZone: "Asia/Taipei" }, async (event) => {
    const tomorrowStr = DateTime.now().setZone("Asia/Taipei").plus({ days: 1 }).toFormat("yyyy-MM-dd");

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const contactBook = classDoc.data().contactBook || {};
        const tomorrowsEntries = contactBook[tomorrowStr] || [];

        const homeworks = tomorrowsEntries.filter(e => e.homework);
        if (homeworks.length > 0) {
            const message = {
                notification: {
                    title: "放學囉！明日作業提醒 📝",
                    body: `明天有 ${homeworks.length} 項作業，放學回家記得寫喔！`
                },
                data: { type: "homework", classId: classDoc.id },
                topic: `class_${classDoc.id}`
            };
            try {
                await admin.messaging().send(message);
                console.log(`[${classDoc.id}] 明日作業提醒已發送`);
            } catch (err) {
                console.error(`[${classDoc.id}] 發送作業提醒失敗:`, err);
            }
        }
    }
});

// 4. 每 1 分鐘檢查一次，是否有課程即將在 5 分鐘後開始 (修正時區與頻率)
exports.checkAndSendClassReminders = onSchedule({
    schedule: "every 1 minutes",
    timeZone: "Asia/Taipei"
}, async (event) => {
    // 獲取台北時間
    const nowTaipei = DateTime.now().setZone("Asia/Taipei");

    // 🚀 改為精準抓取「剛好在 5 分鐘後」的課程
    const targetStart = nowTaipei.plus({ minutes: 5 });

    // 轉換 Luxon weekday 到 JS day (0=Sun...6=Sat)
    const jsDay = targetStart.weekday === 7 ? 0 : targetStart.weekday;
    const targetTimeStr = targetStart.toFormat("HH:mm");

    console.log(`正在檢查課表 (台北時間: ${nowTaipei.toFormat("HH:mm")}), 目標時間: ${targetTimeStr}`);

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const data = classDoc.data();
        const schedule = data.schedule || [];

        const upcomingClasses = schedule.filter(c =>
            Number(c.day) === jsDay && c.startTime === targetTimeStr
        );

        for (const course of upcomingClasses) {
            // 直接發送主題推播，避免透過 Notice Collection 造成二次觸發或重複
            const message = {
                notification: {
                    title: `即將上課：${course.course} 🔔`,
                    body: `課程將在 5 分鐘後 (${course.startTime}) 開始${course.location ? `，地點：${course.location}` : ''}`
                },
                data: {
                    type: "course",
                    classId: classDoc.id
                },
                topic: `class_${classDoc.id}`
            };

            try {
                await admin.messaging().send(message);
                console.log(`[${classDoc.id}] 課程提醒推播已發送.`);
            } catch (err) {
                console.error("發送課程提醒失敗:", err);
            }
        }
    }
});

// 5. 內建 AI Proxy (使用 @google/genai 與 Gemini 2.5 Flash)
exports.callBuiltInAI = onCall({ region: "us-central1", secrets: [geminiApiKey] }, async (request) => {
    const { prompt, options = {} } = request.data;
    const apiKey = geminiApiKey.value();

    if (!apiKey) throw new HttpsError("failed-precondition", "後端系統尚未配置 GEMINI_API_KEY 密鑰");
    if (!prompt) throw new HttpsError("invalid-argument", "Prompt cannot be empty");

    try {
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: parseFloat(options.temperature) || 0.7,
                responseMimeType: options.responseJson ? "application/json" : "text/plain"
            }
        });

        return { text: response.text };
    } catch (error) {
        console.error("AI Proxy Error:", error);
        throw new HttpsError("internal", error.message || "AI 呼叫失敗");
    }
});

// 6. AI 智慧字典抓取 (具有 Firestore 快取機制)
exports.dictLookupAI = onCall({ region: "us-central1", secrets: [geminiApiKey] }, async (request) => {
    const { word } = request.data;
    const apiKey = geminiApiKey.value();

    if (!apiKey) throw new HttpsError("failed-precondition", "未配置 API KEY");
    if (!word) throw new HttpsError("invalid-argument", "請提供單字");

    const cleanWord = word.trim().toLowerCase();
    const cacheRef = admin.firestore().collection("ai_cache").doc("dictionary").collection("words").doc(cleanWord);

    try {
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists) {
            const cacheData = cacheSnap.data();
            const isExpired = Date.now() - cacheData.cachedAt.toMillis() > 30 * 24 * 60 * 60 * 1000;
            if (!isExpired) return { data: cacheData.result, cached: true };
        }

        const ai = new GoogleGenAI({ apiKey });
        const dictionaryPrompt = `解析單字 "${cleanWord}" 並回傳 JSON：
        {
          "word": "${cleanWord}",
          "pos": "詞性",
          "chinese": "中文解釋",
          "etymology": "語源解析",
          "example": "例句(附繁體中文翻譯)",
          "level": "難度(1-6)"
        }
        請用繁體中文。`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: dictionaryPrompt,
            config: { responseMimeType: "application/json", temperature: 0.3 }
        });

        const jsonResult = JSON.parse(response.text);

        await cacheRef.set({
            result: jsonResult,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { data: jsonResult, cached: false };
    } catch (error) {
        console.error("Dict Lookup Error:", error);
        throw new HttpsError("internal", "字典查詢失敗");
    }
});

// 7. [共用函式] Gemini 2.5 Flash 內容摘要 (Phase 2 需求預作)
async function generateGeminiSummary(contentArray, apiKey) {
    if (!apiKey) return "無法使用 AI 摘要 (Missing API Key)";
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `你是一個貼心的助教，請根據以下今日資訊（包含行程、作業、考試），生成一段 50 字以內、親切且具鼓勵性的繁體中文摘要，提醒學生明天要做什麼。
        資訊內容：
        ${contentArray.join("\n")}
        摘要重點：`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt
        });
        return response.text;
    } catch (error) {
        console.error("Summary generation failed:", error);
        return "今日摘要產生失敗，請加油！";
    }
}

// 8. [新增] 供前端呼叫以訂閱 FCM 主題
exports.subscribeToTopic = onCall({ region: "us-central1" }, async (request) => {
    const { token, topic } = request.data;
    if (!token || !topic) throw new HttpsError("invalid-argument", "缺少 token 或 topic 參數");

    try {
        await admin.messaging().subscribeToTopic(token, topic);
        console.log(`成功將 token 訂閱至主題: ${topic}`);
        return { success: true };
    } catch (error) {
        console.error("訂閱主題失敗:", error);
        throw new HttpsError("internal", error.message);
    }
});

// 9. [新增] 管理員專屬：獲取系統營運數據與健康度
exports.getSystemStats = onCall({ region: "us-central1" }, async (request) => {
    // 🔒 嚴格的安全性檢查：確認是否登入，且信箱必須是內湖高中的管理員網域
    const email = request.auth?.token?.email || "";
    const isAdminEmail = email.endsWith('@nhsh.tp.edu.tw');
    
    if (!request.auth || !isAdminEmail) {
        console.warn(`[資安警告] 未授權的存取嘗試: ${email}`);
        throw new HttpsError("permission-denied", "權限不足：此 API 僅限管理員存取。");
    }

    try {
        const db = admin.firestore();
        
        // 📊 使用 count() 聚合查詢 (比起 get() 撈取全部文件，count() 不會消耗大量讀取額度，非常省錢)
        const usersCount = await db.collection("users").count().get();
        const classesCount = await db.collection("classes").count().get();

        return {
            status: "healthy",
            stats: {
                totalUsers: usersCount.data().count,
                totalClasses: classesCount.data().count,
            },
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        console.error("獲取系統數據失敗:", error);
        throw new HttpsError("internal", "獲取數據失敗");
    }
});