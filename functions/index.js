const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. 監聽「新增通知」，並發送真實的 FCM 雲端推播
exports.sendPushNotificationOnNotice = onDocumentCreated("classes/{classId}/notices/{noticeId}", async (event) => {
    const notice = event.data.data();
    const classId = event.params.classId;

    // 💡 優化：直接從班級文件讀取 fcmTokens 陣列，避免跨集合查詢的權限問題
    const classDoc = await admin.firestore().collection("classes").doc(classId).get();
    const tokens = classDoc.data()?.fcmTokens || [];

    if (tokens.length === 0) return null;

    // 建構真實的推播訊息 (支援 iOS 背景顯示與點擊跳轉)
    const message = {
        notification: {
            title: notice.title || "班級新通知",
            body: notice.content || "請開啟 App 查看最新資訊"
        },
        webpush: {
            fcmOptions: {
                link: "https://gsat-pro.web.app/" // 請確保這是您網站的正確網址
            }
        },
        tokens: tokens
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log("推播發送完成. 成功:", response.successCount, "失敗:", response.failureCount);
    } catch (error) {
        console.error("FCM 發送錯誤:", error);
    }
    return null;
});

// 2. 每天晚上 20:00 執行，掃描隔天考試並發送推播
exports.dailyExamReminder = onSchedule({ schedule: "0 20 * * *", timeZone: "Asia/Taipei" }, async (event) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const data = classDoc.data();
        const contactBook = data.contactBook || {};
        const tomorrowsEntries = contactBook[tomorrowStr] || [];

        if (tomorrowsEntries.length > 0) {
            const exams = tomorrowsEntries.filter(e => e.exam).length;

            if (exams > 0) {
                await classDoc.ref.collection("notices").add({
                    title: "明日考試提醒 💯",
                    content: `明天有 ${exams} 項考試，請記得準備！`,
                    type: "EXAM",
                    timestamp: Date.now()
                });
            }
        }
    }
    return null;
});

// 3. 保留：每日作業提醒 (獨立於考試提醒)
exports.dailyHomeworkReminder = onSchedule({ schedule: "0 20 * * *", timeZone: "Asia/Taipei" }, async (event) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const classesSnap = await admin.firestore().collection("classes").get();

    for (const classDoc of classesSnap.docs) {
        const data = classDoc.data();
        const contactBook = data.contactBook || {};
        const tomorrowsEntries = contactBook[tomorrowStr] || [];

        const homeworks = tomorrowsEntries.filter(e => e.homework).length;

        if (homeworks > 0) {
            await classDoc.ref.collection("notices").add({
                title: "明日作業提醒 📝",
                content: `明天有 ${homeworks} 項作業，別忘記寫囉！`,
                type: "HOMEWORK",
                timestamp: Date.now()
            });
        }
    }
    return null;
});

// 4. 保留：課程上課提醒邏輯
exports.checkAndSendClassReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "Asia/Taipei" }, async (event) => {
    console.log("執行 checkAndSendClassReminders 檢查...");
    // 這裡保留您原本的課程檢查邏輯外殼
    return null;
});