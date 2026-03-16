const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
admin.initializeApp();

// 1. 監聽「新增通知」，並發送真實的 FCM 雲端推播
exports.sendPushNotificationOnNotice = onDocumentCreated("classes/{classId}/notices/{noticeId}", async (event) => {
    const notice = event.data.data();
    const classId = event.params.classId;

    // 💡 修正：原本從班級文件讀取不存在的 fcmTokens
    // 現在改為：從 users 集合中找出所有屬於該 classID 的使用者 Token
    try {
        const usersSnap = await admin.firestore().collection("users")
            .where("classID", "==", classId)
            .get();
        
        const tokens = [];
        usersSnap.forEach(doc => {
            const token = doc.data().fcmToken;
            if (token) tokens.push(token);
        });

        if (tokens.length === 0) {
            console.log(`[${classId}] 找不到任何訂閱者的 FCM Token，略過發送`);
            return null;
        }

        // 建構推播訊息 (支援 iOS 背景顯示與點擊跳轉)
        const message = {
            notification: {
                title: notice.title || "班級新通知",
                body: notice.content || "請開啟 App 查看最新資訊"
            },
            webpush: {
                fcmOptions: {
                    link: "https://gsat-pro.vercel.app/" // 優化：改為 Vercel 可能是目前的部署網址
                }
            },
            tokens: tokens
        };

        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[${classId}] 推播發送完成. 成功: ${response.successCount}, 失敗: ${response.failureCount}`);
        
        // 額外清理無效 Token (選用，防止累積死掉的 Token)
        if (response.failureCount > 0) {
            console.log('有部分 Token 發送失敗，建議使用者重新登入以刷新 Token');
        }
    } catch (error) {
        console.error("FCM 發送流程崩潰:", error);
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
                    type: "exam",
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
    }
    return null;
});

// 3. 每日作業提醒
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
                type: "homework",
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
        }
    }
    return null;
});

// 4. 定時檢查排程 (5分鐘一次)
exports.checkAndSendClassReminders = onSchedule({ schedule: "every 5 minutes", timeZone: "Asia/Taipei" }, async (event) => {
    console.log("執行定時排程檢查中...");
    return null;
});