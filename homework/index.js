/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const { setGlobalOptions } = require("firebase-functions/v2");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

exports.onContactBookComment = onDocumentUpdated(
    "Schools/{schoolId}/Grades/{gradeId}/Classes/{classId}/Assignments/{assignmentId}",
    async (event) => {
        const beforeData = event.data.before.data();
        const afterData = event.data.after.data();

        const beforeComments = beforeData.comments || [];
        const afterComments = afterData.comments || [];

        // 只在「新增留言」時才觸發推播 (排除修改或刪除的情況)
        if (afterComments.length <= beforeComments.length) return;

        // 取得最新的一則留言
        const newComment = afterComments[afterComments.length - 1];

        // 找出所有曾經在這個討論串留言過的人（排除剛留言的這一位自己）
        const participantIds = new Set();
        afterComments.forEach(c => {
            if (c.authorId && c.authorId !== newComment.authorId) {
                participantIds.add(c.authorId);
            }
        });

        if (participantIds.size === 0) return; // 沒人可以通知就提早結束

        // 去 Users 集合中撈出這些參與者的 FCM Token
        const tokens = [];
        for (const uid of participantIds) {
            const userDoc = await admin.firestore().collection('Users').doc(uid).get();
            if (userDoc.exists && userDoc.data().fcmToken) {
                tokens.push(userDoc.data().fcmToken);
            }
        }

        if (tokens.length === 0) return;

        // 發送推播通知給所有參與討論的同學
        const payload = {
            notification: {
                title: `💬 ${newComment.author} 回覆了聯絡簿討論`,
                body: newComment.text.length > 30 ? newComment.text.substring(0, 30) + '...' : newComment.text,
            },
            tokens: tokens,
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(payload);
            console.log(`成功發送 ${response.successCount} 則推播，失敗 ${response.failureCount} 則`);
        } catch (error) {
            console.error('發送推播失敗:', error);
        }
    }
);

// 🚀 修正版：課表上課前 5 分鐘自動提醒
exports.checkAndSendClassReminders = onSchedule({
    schedule: "* * * * *", // 每分鐘執行一次
    timeZone: "Asia/Taipei"
}, async (event) => {
    try {
        // 1. 取得當下 UTC 時間，並轉換為台灣在地時間 (解決凌晨時段跨日 Bug)
        const utcNow = new Date();
        const twNow = new Date(utcNow.toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
        
        // 2. 目標時間 = 現在時間 + 5 分鐘
        twNow.setMinutes(twNow.getMinutes() + 5);
        
        const currentDay = twNow.getDay(); // 0-6 (0 是週日)
        const hours = String(twNow.getHours()).padStart(2, '0');
        const mins = String(twNow.getMinutes()).padStart(2, '0');
        const targetTime = `${hours}:${mins}`;

        console.log(`[課表推播] 檢查星期 ${currentDay}，時間 ${targetTime} 的課程...`);

        // 3. 透過 Collection Group 跨班級查詢 ClassSchedule
        // 使用 dayOfWeek 查詢，並在記憶體中過濾 startTime，避免 Firebase 缺少複合索引而報錯
        const snapshot = await admin.firestore().collectionGroup('ClassSchedule')
            .where('dayOfWeek', '==', currentDay)
            .get();

        if (snapshot.empty) return;

        const promises = [];
        const sentTopics = new Set();

        snapshot.forEach(doc => {
            const data = doc.data();
            
            if (data.startTime !== targetTime) return; // 記憶體過濾時間

            // 提取班級 ID (例如路徑: Schools/nhsh/Grades/g1/Classes/302/ClassSchedule/docId)
            const pathSegments = doc.ref.path.split('/');
            const classIdIndex = pathSegments.indexOf('Classes') + 1;
            
            if (classIdIndex > 0 && classIdIndex < pathSegments.length) {
                const classId = pathSegments[classIdIndex];
                const topic = `class_${classId}_alerts`;
                
                // 確保同一個班級不重複發送 (防呆：避免使用者重複建立多筆相同時間的課)
                if (sentTopics.has(topic)) return;
                sentTopics.add(topic);

                const subject = data.courseName || data.subject || '課程';
                const location = data.location ? ` (${data.location})` : '';
                
                const payload = {
                    notification: {
                        title: `🔔 上課提醒：${subject}`,
                        body: `還有 5 分鐘就要上課囉！${location}請準備好上課用品。`
                    },
                    topic: topic
                };
                
                console.log(`[課表推播] 發送至 ${topic}: ${subject}`);
                promises.push(admin.messaging().send(payload));
            }
        });

        if (promises.length > 0) {
            const results = await Promise.allSettled(promises);
            const fulfilled = results.filter(r => r.status === 'fulfilled').length;
            console.log(`[課表推播] 執行完畢！成功發送: ${fulfilled} 則推播`);
        }

    } catch (error) {
        console.error('[課表推播] 發生錯誤:', error);
    }
});
