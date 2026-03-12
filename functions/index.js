const { onSchedule } = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = "Asia/Taipei";

// --- 輔助函數：將 "08:00" 轉換為分鐘數 ---
const timeToMins = (timeStr) => {
    if (!timeStr) return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

// --- 輔助函數：發送推播 ---
const sendPushToClass = async (classId, title, body) => {
    try {
        const usersSnap = await db.collection("users").where("classID", "==", classId).get();
        const tokens = [];
        usersSnap.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length === 0) {
            console.log(`[發送] 班級 ${classId} 沒有可用的 Token`);
            return;
        }

        const payload = {
            notification: { title, body }
        };

        const response = await messaging.sendEachForMulticast({ tokens, ...payload });
        console.log(`[成功] 班級 ${classId}: 發送 ${response.successCount} 則, 失敗 ${response.failureCount} 則`);
    } catch (error) {
        console.error(`[錯誤] 班級 ${classId} 發送推播失敗:`, error);
    }
};

// ============================================================================
// 1. 課前提醒 (每 5 分鐘檢查一次) - 使用 v2 語法
// ============================================================================
exports.checkAndSendClassReminders = onSchedule({
    schedule: "every 5 minutes",
    timeZone: TIMEZONE,
    timeoutSeconds: 60
}, async (event) => {

    const now = moment().tz(TIMEZONE);
    const currentDayOfWeek = now.day(); // 0=日, 1=一 ... 6=六
    const currentMins = now.hours() * 60 + now.minutes();

    // 假日不檢查
    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) return;

    try {
        const classesSnap = await db.collection("classes").get();

        // 改用一般的 for 迴圈搭配 await 避免異步問題
        for (const classDoc of classesSnap.docs) {
            const classId = classDoc.id;
            const classData = classDoc.data();
            const schedule = classData.schedule || [];

            // 找出今天的課
            const todayClasses = schedule.filter((c) => c.day === currentDayOfWeek);

            for (const course of todayClasses) {
                const startMins = timeToMins(course.startTime);
                const timeDiff = startMins - currentMins;

                // 距離上課 1~5 分鐘內
                if (timeDiff > 0 && timeDiff <= 5) {
                    const title = `🔔 準備上課：${course.course || course.subject}`;
                    const body = `📍 地點：${course.location || "原班級"} | ${timeDiff} 分鐘後開始`;
                    await sendPushToClass(classId, title, body);
                }
            }
        }
    } catch (error) {
        console.error("[錯誤] 課前提醒檢查失敗:", error);
    }
});

// ============================================================================
// 2. 每日進度與功課提醒 (每天下午 5:00 執行) - 使用 v2 語法
// ============================================================================
exports.dailyHomeworkReminder = onSchedule({
    schedule: "0 17 * * *", // 每天 17:00 (5:00 PM)
    timeZone: TIMEZONE,
    timeoutSeconds: 60
}, async (event) => {

    const tomorrow = moment().tz(TIMEZONE).add(1, "days");
    const tomorrowStr = tomorrow.format("YYYY-MM-DD"); // 格式：2024-03-20

    try {
        const classesSnap = await db.collection("classes").get();

        for (const classDoc of classesSnap.docs) {
            const classId = classDoc.id;

            // 假設功課存在 classes/{classId}/contactBook/{docId}
            const contactBookRef = db.collection("classes").doc(classId).collection("contactBook");
            const itemsSnap = await contactBookRef.where("deadline", "==", tomorrowStr).get();

            if (itemsSnap.empty) continue; // 這班沒功課就跳過

            let homeworkList = [];
            let examList = [];

            itemsSnap.forEach((doc) => {
                const data = doc.data();
                if (data.type === "homework") homeworkList.push(data.content);
                if (data.type === "exam") examList.push(data.content);
            });

            if (homeworkList.length > 0 || examList.length > 0) {
                let bodyText = "";
                if (homeworkList.length > 0) bodyText += `🎒 作業：${homeworkList.join(", ")}\n`;
                if (examList.length > 0) bodyText += `📝 考試：${examList.join(", ")}`;

                await sendPushToClass(classId, `📚 明日進度提醒 (${tomorrowStr})`, bodyText);
            }
        }
    } catch (error) {
        console.error("[錯誤] 每日提醒檢查失敗:", error);
    }
});