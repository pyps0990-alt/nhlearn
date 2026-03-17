const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const fetch = require("node-fetch"); 
admin.initializeApp();

// 1. 監聽「新增通知」，並發送真實的 FCM 雲端推播
exports.sendPushNotificationOnNotice = onDocumentCreated("classes/{classId}/notices/{noticeId}", async (event) => {
    const notice = event.data.data();
    const classId = event.params.classId;

    try {
        const usersSnap = await admin.firestore().collection("users")
            .where("classID", "==", classId)
            .get();
        
        const tokens = [];
        usersSnap.forEach(doc => {
            const token = doc.data().fcmToken;
            if (token) tokens.push(token);
        });

        if (tokens.length === 0) return null;

        const message = {
            notification: {
                title: notice.title || "班級新通知",
                body: notice.content || "請開啟 App 查看最新資訊"
            },
            data: {
                type: notice.type || "general"
            },
            webpush: {
                fcmOptions: {
                    link: "https://gsat-pro.vercel.app/"
                }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${classId}] 推播發送完成. 成功: ${response.successCount}`);
    } catch (error) {
        console.error("FCM 發送流程崩潰:", error);
    }
    return null;
});

// 2. 每天晚上 20:00 執行，提醒明日考試
exports.dailyExamReminder = onSchedule({ schedule: "0 20 * * *", timeZone: "Asia/Taipei" }, async (event) => {
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const contactBook = classDoc.data().contactBook || {};
        const tomorrowsEntries = contactBook[tomorrowStr] || [];

        const exams = tomorrowsEntries.filter(e => e.exam).length;
        if (exams > 0) {
            await classDoc.ref.collection("notices").add({
                title: "明日考試提醒 💯",
                content: `明天有 ${exams} 項考試，請記得準備！`,
                type: "exam",
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
});

// 3. 每天下午 17:00 執行，提醒明日作業 (放學通知)
exports.dailyHomeworkReminder = onSchedule({ schedule: "0 17 * * *", timeZone: "Asia/Taipei" }, async (event) => {
    const tomorrow = new Date(new Date().getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const contactBook = classDoc.data().contactBook || {};
        const tomorrowsEntries = contactBook[tomorrowStr] || [];

        const homeworks = tomorrowsEntries.filter(e => e.homework).length;
        if (homeworks > 0) {
            await classDoc.ref.collection("notices").add({
                title: "明日作業提醒 📝",
                content: `明天有 ${homeworks} 項作業，放學回家記得寫喔！`,
                type: "homework",
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
});

// 4. 每 5 分鐘檢查一次，是否有課程即將在 5 分鐘後開始
exports.checkAndSendClassReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "Asia/Taipei" }, async (event) => {
    const now = new Date();
    const targetTime = new Date(now.getTime() + 5 * 60 * 1000);
    const targetDay = targetTime.getDay();
    const targetH = String(targetTime.getHours()).padStart(2, '0');
    const targetM = String(targetTime.getMinutes()).padStart(2, '0');
    const targetTimeStr = `${targetH}:${targetM}`;

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const data = classDoc.data();
        const schedule = data.schedule || [];
        
        // 找出 5 分鐘後開始的課程
        const upcomingClasses = schedule.filter(c => c.day === targetDay && c.startTime === targetTimeStr);

        for (const course of upcomingClasses) {
            await classDoc.ref.collection("notices").add({
                title: `即將上課：${course.course} 🔔`,
                content: `課程將在 5 分鐘後 (${course.startTime}) 開始${course.location ? `，地點：${course.location}` : ''}`,
                type: "course",
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
});

// 5. 內建 AI Proxy (使用 Secret Manager)
exports.callBuiltInAI = onCall({ region: "us-central1", secrets: ["GEMINI_API_KEY"] }, async (request) => {
    const { prompt, options = {} } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        console.error("Missing GEMINI_API_KEY in Secret Manager");
        throw new HttpsError("failed-precondition", "後端系統尚未配置 GEMINI_API_KEY 密鑰");
    }

    if (!prompt) {
        throw new HttpsError("invalid-argument", "Prompt cannot be empty");
    }

    try {
        const temperature = parseFloat(options.temperature) || 0.7;
        const responseJson = !!options.responseJson;
        
        // 使用 2.5-flash 作為旗艦模型
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        const body = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
                temperature,
                maxOutputTokens: 2048
            }
        };

        if (responseJson) {
            body.generationConfig.responseMimeType = "application/json";
        }

        console.log(`Calling Gemini API for prompt: ${prompt.substring(0, 50)}...`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Gemini API Error Detail (${response.status}):`, JSON.stringify(data));
            
            if (response.status === 429) {
                throw new HttpsError("resource-exhausted", "內建 AI 流量過載 (429)，請稍候再試或使用自備 API Key");
            }
            
            const errMsg = data.error?.message || JSON.stringify(data);
            throw new HttpsError("internal", `Gemini API responded with status ${response.status}: ${errMsg}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!text) {
            console.error("Empty response from Gemini:", JSON.stringify(data));
            throw new HttpsError("internal", "AI 回傳內容為空，請調整 Prompt 後重試");
        }

        return { text };
    } catch (error) {
        console.error("AI Proxy Internal Error:", error);
        if (error instanceof HttpsError) throw error;
        throw new HttpsError("internal", error.message || "AI 請求失敗");
    }
});

// 6. AI 智慧字典抓取 (具有 Firestore 快取機制)
exports.dictLookupAI = onCall({ region: "us-central1", secrets: ["GEMINI_API_KEY"] }, async (request) => {
    const { word } = request.data;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new HttpsError("failed-precondition", "後端系統尚未配置 GEMINI_API_KEY 密鑰");
    }

    if (!word) throw new HttpsError("invalid-argument", "請提供單字");

    const cleanWord = word.trim().toLowerCase();
    const cacheRef = admin.firestore().collection("ai_cache").doc("dictionary").collection("words").doc(cleanWord);

    try {
        // 1. 檢查快取
        const cacheSnap = await cacheRef.get();
        if (cacheSnap.exists()) {
            const cacheData = cacheSnap.data();
            // 快取有效期為 30 天
            const isExpired = Date.now() - cacheData.cachedAt.toMillis() > 30 * 24 * 60 * 60 * 1000;
            if (!isExpired) {
                console.log(`Cache Hit for: ${cleanWord}`);
                return { data: cacheData.result, cached: true };
            }
        }

        const dictionaryPrompt = `
        你是一個專業的英語字典，請解析單字 "${cleanWord}" 並回傳 JSON：
        {
          "word": "${cleanWord}",
          "pos": "詞性 (例如 n., v., adj.)",
          "chinese": "中文解釋",
          "etymology": "語源解析 (字根字首)",
          "example": "例句 (附中文翻譯)",
          "level": "難度級別 (1-6)"
        }
        請使用繁體中文，且只回傳 JSON 字串。
        `;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        
        console.log(`Cache Miss. Fetching AI for: ${cleanWord}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: dictionaryPrompt }] }],
                generationConfig: { 
                    temperature: 0.3, 
                    responseMimeType: "application/json" 
                }
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error(`Dict Lookup API Error (${response.status}):`, JSON.stringify(data));
            throw new HttpsError("internal", `Gemini API responded with status ${response.status}`);
        }

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("字典解析失敗，AI 未回傳內容");
        
        const result = JSON.parse(text);

        // 2. 存入快取
        await cacheRef.set({
            result,
            cachedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { data: result, cached: false };
    } catch (error) {
        console.error("Dict Lookup Internal Error:", error);
        throw new HttpsError("internal", error.message || "字典查詢失敗");
    }
});