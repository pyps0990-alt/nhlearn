const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore"); // 💡 引入即時監聽器
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

// --- 輔助函數：發送推播 (優化 iOS 與 優先級) ---
const sendPushToClass = async (classId, title, body, priority = 'high') => {
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

        const message = {
            tokens: tokens,
            notification: { title, body },
            // 💡 針對 Android 的高優先級設定
            android: {
                priority: priority,
                notification: { sound: "default", channelId: "class_alerts" }
            },
            // 💡 針對 iOS (APNs) 的快速推送與聲音設定
            apns: {
                payload: { aps: { sound: "default", badge: 1, contentAvailable: true } }
            },
            // 💡 針對 Web PWA 的快速推送
            webpush: {
                headers: { Urgency: priority === 'high' ? 'high' : 'normal' },
                notification: { title, body, icon: "/favicon.ico", sound: "default" },
                fcmOptions: { link: "/" }
            }
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`[成功] 班級 ${classId}: 發送 ${response.successCount} 則, 失敗 ${response.failureCount} 則`);
    } catch (error) {
        console.error(`[錯誤] 班級 ${classId} 發送推播失敗:`, error);
    }
};

// ============================================================================
// ⚡ 核心優化：即時異動推送 (解決速度問題)
// 當有人修改 classes/{classId} 內的 schedule 時，立即反應
// ============================================================================
exports.onClassScheduleUpdate = onDocumentUpdated("classes/{classId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const classId = event.params.classId;

    if (!newData.schedule) return;

    const newlyRescheduled = [];

    // 比對新舊資料，找出「剛被標記為異動」的課程
    Object.keys(newData.schedule).forEach(dayKey => {
        const newDayClasses = newData.schedule[dayKey] || [];
        const oldDayClasses = (oldData.schedule && oldData.schedule[dayKey]) ? oldData.schedule[dayKey] : [];

        newDayClasses.forEach(newCourse => {
            const oldCourse = oldDayClasses.find(c => c.id === newCourse.id);
            // 邏輯：原本不是異動 (或不存在)，現在變成了異動狀態
            if (newCourse.rescheduled === true && (!oldCourse || !oldCourse.rescheduled)) {
                newlyRescheduled.push(newCourse.subject || newCourse.course);
            }
        });
    });

    if (newlyRescheduled.length > 0) {
        console.log(`[即時推播] 偵測到 ${classId} 班級調課異動`);
        await sendPushToClass(
            classId,
            "🚨 課表緊急異動",
            `今日課表剛更新了：${newlyRescheduled.join(", ")} 已調整，請確認地點！`,
            'high' // 使用最高優先級
        );
    }
});

// ============================================================================
// 1. 課前提醒 (每 5 分鐘檢查一次) - 使用 v2 語法
// ============================================================================
exports.checkAndSendClassReminders = onSchedule({
    schedule: "every 5 minutes",
    timeZone: TIMEZONE,
    timeoutSeconds: 60
}, async (event) => {

    const now = moment().tz(TIMEZONE);
    const currentDayOfWeek = now.day();
    const currentMins = now.hours() * 60 + now.minutes();

    if (currentDayOfWeek === 0 || currentDayOfWeek === 6) return;

    try {
        const classesSnap = await db.collection("classes").get();

        for (const classDoc of classesSnap.docs) {
            const classId = classDoc.id;
            const classData = classDoc.data();
            const schedule = classData.schedule || {};

            // 💡 修正：支援您提供的兩種結構 (Array 或 Map)
            let todayClasses = [];
            if (Array.isArray(schedule)) {
                todayClasses = schedule.filter((c) => c.day === currentDayOfWeek);
            } else {
                todayClasses = schedule[currentDayOfWeek] || [];
            }

            for (const course of todayClasses) {
                if (!course.startTime) continue;
                const startMins = timeToMins(course.startTime);
                const timeDiff = startMins - currentMins;

                // 距離上課 1~5 分鐘內
                if (timeDiff > 0 && timeDiff <= 5) {
                    const title = `🔔 準備上課：${course.course || course.subject}`;
                    const body = `📍 地點：${course.location || "原班級"} | ${timeDiff} 分鐘後開始`;
                    await sendPushToClass(classId, title, body, 'normal');
                }
            }
        }
    } catch (error) {
        console.error("[錯誤] 課前提醒檢查失敗:", error);
    }
});

// ============================================================================
// 2. 每日進度與功課提醒 (每天下午 5:00 執行)
// ============================================================================
exports.dailyHomeworkReminder = onSchedule({
    schedule: "0 17 * * *",
    timeZone: TIMEZONE,
    timeoutSeconds: 60
}, async (event) => {

    const tomorrowStr = moment().tz(TIMEZONE).add(1, "days").format("YYYY-MM-DD");

    try {
        const classesSnap = await db.collection("classes").get();

        for (const classDoc of classesSnap.docs) {
            const classId = classDoc.id;
            const contactBookRef = db.collection("classes").doc(classId).collection("contactBook");
            const itemsSnap = await contactBookRef.where("deadline", "==", tomorrowStr).get();

            if (itemsSnap.empty) continue;

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

                await sendPushToClass(classId, `📚 明日進度提醒 (${tomorrowStr})`, bodyText.trim(), 'normal');
            }
        }
    } catch (error) {
        console.error("[錯誤] 每日提醒檢查失敗:", error);
    }
});