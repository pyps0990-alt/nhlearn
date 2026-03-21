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
