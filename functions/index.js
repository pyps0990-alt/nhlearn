const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { DateTime } = require("luxon");
const { GoogleGenerativeAI } = require("@google/generative-ai");

admin.initializeApp();

// 密鑰定義 (Gemini 2.0 API)
const geminiApiKey = defineSecret("GEMINI_API_KEY");

/**
 * 🛑 檢查當前是否處於「段考期間」(暫停雲端推播)
 * @returns {Promise<boolean>} true 表示處於段考中，應暫停推播
 */
async function isExamPeriodActive(schoolId, gradeId, classId) {
    if (!schoolId || !gradeId || !classId) return false;
    try {
        const today = DateTime.now().setZone("Asia/Taipei").toFormat("yyyy-MM-dd");
        const examsSnap = await admin.firestore()
            .collection(`Schools/${schoolId}/Grades/${gradeId}/Classes/${classId}/ExamPeriods`)
            .where("startDate", "<=", today)
            .get();
        
        // Firestore 不支援兩個欄位的 range 比較 (startDate <= today AND endDate >= today)
        // 所以在記憶體中過濾 endDate
        const activeExams = examsSnap.docs.filter(doc => doc.data().endDate >= today);
        return activeExams.length > 0;
    } catch (e) {
        console.error("檢查段考期間出錯:", e);
        return false;
    }
}

/**
 * 🚀 1. 聯絡簿新事項推播 (自動區分作業/考試)
 * 監聽路徑: Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/Assignments/{docId}
 */
exports.sendPushNotificationOnNotice = onDocumentCreated("Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/Assignments/{assignmentId}", async (event) => {
    const data = event.data.data();
    const { schoolId, gradeId, classId } = event.params;
    if (!data || data.silent) return null;

    // 🔴 段考期間過濾
    const inExam = await isExamPeriodActive(schoolId, gradeId, classId);
    if (inExam) {
        console.log(`[FCM] 段考期間暫停即時通知: ${classId}`);
        return null;
    }

    let title = "聯絡簿新消息 📝";
    let body = "";
    let type = "general";

    if (data.exam) {
        title = `【${data.examType || '考試'}】${data.subject} 💯`;
        body = `${data.exam}${data.examDeadline ? ` (日期: ${data.examDeadline})` : ''}`;
        type = "exam";
    } else if (data.homework) {
        title = `【作業】${data.subject} ✍️`;
        body = `${data.homework}${data.homeworkDeadline ? ` (期限: ${data.homeworkDeadline})` : ''}`;
        type = "homework";
    } else {
        body = "班級聯絡簿有新更新，請進入查看。";
    }

    const message = {
        notification: { title, body },
        data: { type, classId, id: event.params.assignmentId },
        topic: `class_${classId}` // 基礎通知主題
    };

    try {
        await admin.messaging().send(message);
        console.log(`[FCM] 即時聯絡簿推播完成: ${classId} (${type})`);
    } catch (e) {
        console.error("即時推送失敗:", e);
    }
    return null;
});

/**
 * 🚀 2. 課表與調課提醒 (notifyScheduleUpdate)
 * 監聽路徑: Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/ClassSchedule/{scheduleId}
 */
exports.notifyScheduleUpdate = onDocumentUpdated("Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/ClassSchedule/{scheduleId}", async (event) => {
    const before = event.data.before.data();
    const after = event.data.after.data();
    const { schoolId, gradeId, classId } = event.params;

    // 🔴 段考期間過濾
    const inExam = await isExamPeriodActive(schoolId, gradeId, classId);
    if (inExam) return null;

    // 檢查老師、地點或科目是否有變更
    const isChanged = before.courseName !== after.courseName || 
                      before.startTime !== after.startTime || 
                      before.location !== after.location;

    if (isChanged) {
        const message = {
            notification: {
                title: "課表異動通知 🔄",
                body: `課程「${after.courseName || '未知名'}」已有資訊更新 (可能為調課或更換教室)。`
            },
            data: { type: "schedule_alert", classId },
            topic: `class_${classId}_alerts`
        };

        try {
            await admin.messaging().send(message);
            console.log(`[FCM] 課表異動通知已發送: ${classId}`);
        } catch (e) { console.error("課表推送失敗:", e); }
    }
    return null;
});

/**
 * 🚀 3. 每日晚間 20:00：明日大考專屬提醒 (dailyExamReminder)
 * 使用 Gemini 2.0 Flash 正式版
 */
exports.dailyExamReminder = onSchedule({ 
    schedule: "0 20 * * *", 
    timeZone: "Asia/Taipei", 
    secrets: [geminiApiKey] 
}, async (event) => {
    const apiKey = geminiApiKey.value();
    const tomorrow = DateTime.now().setZone("Asia/Taipei").plus({ days: 1 });
    const tomorrowStr = tomorrow.toFormat("yyyy-MM-dd");

    // 掃描所有學校層級下的 Assignments
    const assignmentsSnap = await admin.firestore().collectionGroup("Assignments")
        .where("examDeadline", "==", tomorrowStr)
        .get();

    // 依據 classId 彙整
    const classMap = new Map();
    assignmentsSnap.docs.forEach(doc => {
        const data = doc.data();
        const classId = doc.ref.parent.parent.id;
        if (!classMap.has(classId)) {
            // 解析路徑取得 schoolId 與 gradeId
            const pathParts = doc.ref.path.split('/');
            // Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/Assignments/{docId}
            const sId = pathParts[1];
            const gId = pathParts[3];
            classMap.set(classId, { exams: [], sId, gId });
        }
        classMap.get(classId).exams.push(`${data.subject}(${data.examType || '小考'}): ${data.exam}`);
    });

    for (const [classId, info] of classMap.entries()) {
        const { exams, sId, gId } = info;

        // 🔴 段考期間過濾 (雖然是提醒明天考試，但若已在段考週，使用者可能希望安靜)
        if (await isExamPeriodActive(sId, gId, classId)) continue;

        let aiBody = `明天有 ${exams.length} 場測驗，請記得複習喔！`;

        if (apiKey) {
            try {
                const ai = new GoogleGenerativeAI(apiKey);
                const model = ai.getGenerativeModel({ model: "gemini-2.0-flash" });
                const prompt = `明天有以下考試：${exams.join('; ')}。
                請以一位貼心班導師的口吻，寫一段 50 字內的提醒文字 (繁體中文)，鼓勵學生並提醒重點。絕對不要使用 Markdown 代碼。`;
                const result = await model.generateContent(prompt);
                aiBody = result.response.text().trim();
            } catch (e) { console.warn("AI 摘要暫時失效, 使用預設文字"); }
        }

        const message = {
            notification: { title: "📚 明日考試提醒", body: aiBody },
            topic: `class_${classId}_exam`
        };

        await admin.messaging().send(message).catch(e => console.error(e));
    }
});

/**
 * 🚀 4. 每日下課提醒：今日作業清單 (dailyHomeworkReminder)
 * 週一至週五 17:15 執行 (通常是放學時間)
 */
exports.dailyHomeworkReminder = onSchedule({ 
    schedule: "15 17 * * 1-5", 
    timeZone: "Asia/Taipei" 
}, async (event) => {
    const todayStr = DateTime.now().setZone("Asia/Taipei").toFormat("yyyy-MM-dd");
    
    // 獲取今天「截止」或「新增」的作業
    const hwSnap = await admin.firestore().collectionGroup("Assignments")
        .where("homeworkDeadline", "==", todayStr)
        .get();

    const classMap = new Map();
    hwSnap.docs.forEach(doc => {
        const classId = doc.ref.parent.parent.id;
        if (!classMap.has(classId)) {
            const pathParts = doc.ref.path.split('/');
            const sId = pathParts[1];
            const gId = pathParts[3];
            classMap.set(classId, { count: 0, sId, gId });
        }
        const current = classMap.get(classId);
        classMap.set(classId, { ...current, count: current.count + 1 });
    });

    for (const [classId, info] of classMap.entries()) {
        const { count, sId, gId } = info;
        if (await isExamPeriodActive(sId, gId, classId)) continue;

        const message = {
            notification: {
                title: "別忘了帶作業回家！🏘️",
                body: `今天有 ${count} 項作業即將到期，記得檢查聯絡簿完成它們。`
            },
            topic: `class_${classId}_homework`
        };
        await admin.messaging().send(message).catch(e => console.error(e));
    }
});

/**
 * 🚀 5. 課前自動提醒 (checkAndSendClassReminders)
 * 每 10 分鐘檢查是否有即將開始的課程
 */
exports.checkAndSendClassReminders = onSchedule({ 
    schedule: "*/10 7-16 * * 1-5", 
    timeZone: "Asia/Taipei" 
}, async (event) => {
    const now = DateTime.now().setZone("Asia/Taipei");
    const targetTime = now.plus({ minutes: 5 }).toFormat("HH:mm"); // 提前 5 分鐘通知
    const day = now.weekday === 7 ? 0 : now.weekday;

    const schedulesSnap = await admin.firestore().collectionGroup("ClassSchedule")
        .where("day", "==", day)
        .where("startTime", "==", targetTime)
        .get();

    for (const docSnap of schedulesSnap.docs) {
        const course = docSnap.data();
        const classId = docSnap.ref.parent.parent.id;
        
        // 解析路徑
        const pathParts = docSnap.ref.path.split('/');
        const sId = pathParts[1];
        const gId = pathParts[3];

        if (await isExamPeriodActive(sId, gId, classId)) continue;

        const message = {
            notification: {
                title: `即將上課: ${course.courseName} 🔔`,
                body: `課程將在 ${course.startTime} 開始${course.location ? `，地點在 ${course.location}` : ''}。`
            },
            topic: `class_${classId}_alerts`
        };
        await admin.messaging().send(message).catch(e => console.error(e));
    }
});

/**
 * 🚀 6. 管理與訂閱 RPC (維持原樣，供前端調用)
 */
exports.subscribeToTopic = onCall(async (request) => {
    const { token, topic } = request.data;
    if (!token || !topic) throw new HttpsError("invalid-argument", "Missing params");
    await admin.messaging().subscribeToTopic(token, topic);
    return { success: true };
});

exports.unsubscribeFromTopic = onCall(async (request) => {
    const { token, topic } = request.data;
    if (!token || !topic) throw new HttpsError("invalid-argument", "Missing params");
    await admin.messaging().unsubscribeFromTopic(token, topic);
    return { success: true };
});

exports.callBuiltInAI = onCall({ secrets: [geminiApiKey] }, async (request) => {
    try {
        const { prompt, options } = request.data;
        const modelName = options?.model || "gemini-2.5-flash";
        const apiKey = geminiApiKey.value();
        
        if (!apiKey) {
            throw new HttpsError("failed-precondition", "GEMINI_API_KEY 未設定，請聯絡開發者。");
        }

        const ai = new GoogleGenerativeAI(apiKey);
        const model = ai.getGenerativeModel({ 
            model: modelName,
            generationConfig: { temperature: options?.temperature || 0.7 }
        });

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        return { success: true, text };
    } catch (e) {
        console.error("AI 調用失敗:", e);
        // 不直接拋出 error 給前端，而是返還 success: false，讓前端能無感降級
        return { 
            success: false, 
            error: e.message,
            fallback: "AI 暫時休息中，請稍後再試。" 
        };
    }
});

exports.dictLookupAI = onCall({ secrets: [geminiApiKey] }, async (request) => {
    const { word } = request.data;
    const apiKey = geminiApiKey.value();
    const ai = new GoogleGenerativeAI(apiKey);
    const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `解析單字 "${word}" 並輸出 JSON (包含 word, pos, chinese, etymology, level)。`;
    const result = await model.generateContent(prompt);
    return { data: JSON.parse(result.response.text().replace(/```json/g, '').replace(/```/g, '').trim()) };
});

exports.getSystemStats = onCall(async (request) => {
    const users = await admin.firestore().collection("Users").count().get();
    return { totalUsers: users.data().count, status: "healthy" };
});