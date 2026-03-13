const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentUpdated } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");
const moment = require("moment-timezone");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const TIMEZONE = "Asia/Taipei";

// --- 輔助函數：將 "08:00" 轉換為分鐘數 ---
const timeToMins = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
};

// --- 輔助函數：將各種課表結構標準化為「課程清單陣列」 ---
const normalizeSchedule = (schedule) => {
    if (!schedule) return [];
    if (Array.isArray(schedule)) return schedule;
    if (typeof schedule === 'object') {
        // 如果是 Map 結構 { "1": [...], "2": [...] }，將所有課程攤平成一維陣列進行比對
        return Object.values(schedule).flat().filter(Boolean);
    }
    return [];
};

// --- 輔助函數：發送推播 (優化 iOS 與 優先級) ---
const sendPushToClass = async (classId, title, body, priority = 'high') => {
    try {
        // 💡 確保 classId 為字串進行查詢
        const usersSnap = await db.collection("users").where("classID", "==", String(classId)).get();
        const tokens = [];
        usersSnap.forEach((doc) => {
            const data = doc.data();
            if (data.fcmToken) tokens.push(data.fcmToken);
        });

        if (tokens.length === 0) {
            console.log(`[通知跳過] 班級 ${classId} 目前沒有註冊的設備 Token`);
            return;
        }

        const message = {
            tokens: tokens,
            notification: { title, body },
            android: {
                priority: priority,
                notification: { sound: "default", channelId: "class_alerts" }
            },
            apns: {
                payload: { aps: { sound: "default", badge: 1, contentAvailable: true } }
            },
            webpush: {
                headers: { Urgency: priority === 'high' ? 'high' : 'normal' },
                notification: { title, body, icon: "/favicon.ico", sound: "default" },
                fcmOptions: { link: "/" }
            }
        };

        const response = await messaging.sendEachForMulticast(message);
        console.log(`[推播成功] 班級 ${classId}: 成功 ${response.successCount} 則, 失敗 ${response.failureCount} 則`);
    } catch (error) {
        console.error(`[推播錯誤] 班級 ${classId} 發送失敗:`, error);
    }
};

// ============================================================================
// ⚡ 核心優化：即時異動推送 (秒級反應)
// ============================================================================
exports.onClassScheduleUpdate = onDocumentUpdated("classes/{classId}", async (event) => {
    const newData = event.data.after.data();
    const oldData = event.data.before.data();
    const classId = event.params.classId;

    if (!newData || !newData.schedule) return;

    const newFlat = normalizeSchedule(newData.schedule);
    const oldFlat = normalizeSchedule(oldData ? oldData.schedule : null);

    const newlyRescheduled = [];

    newFlat.forEach(newCourse => {
        // 尋找舊資料中的同一堂課 (透過 ID 比對)
        const oldCourse = oldFlat.find(o => String(o.id) === String(newCourse.id));

        // 💡 觸發條件：原本沒標記調課 -> 現在標記了；或是 科目名稱改變且正處於調課狀態
        const isNowRescheduled = newCourse.rescheduled === true;
        const wasPreviouslyRescheduled = oldCourse ? oldCourse.rescheduled === true : false;

        if (isNowRescheduled && !wasPreviouslyRescheduled) {
            newlyRescheduled.push(newCourse.subject || newCourse.course);
        }
    });

    if (newlyRescheduled.length > 0) {
        console.log(`[即時監聽] 偵測到 ${classId} 有新調課: ${newlyRescheduled.join(", ")}`);
        await sendPushToClass(
            classId,
            "🚨 課表緊急異動",
            `今日課表已更新：${newlyRescheduled.join(", ")} 已調整，請點擊確認地點。`,
            'high'
        );
    }
});

// ============================================================================
// 1. 課前提醒 (每 5 分鐘檢查一次)
// ============================================================================
exports.checkAndSendClassReminders = onSchedule({
    schedule: "every 5 minutes",
    timeZone: TIMEZONE,
    timeoutSeconds: 60
}, async (event) => {
    const now = moment().tz(TIMEZONE);
    const dayNum = now.day(); // 0-6
    const currentMins = now.hours() * 60 + now.minutes();

    if (dayNum === 0 || dayNum === 6) return; // 週末不運行

    try {
        const classesSnap = await db.collection("classes").get();
        console.log(`[排程檢查] 開始掃描 ${classesSnap.size} 個班級...`);

        for (const classDoc of classesSnap.docs) {
            const classId = classDoc.id;
            const schedule = classDoc.data().schedule;
            if (!schedule) continue;

            let todayClasses = [];
            // 💡 相容性處理：判斷是物件 Map 還是陣列 Array
            if (Array.isArray(schedule)) {
                todayClasses = schedule.filter(c => Number(c.day) === dayNum);
            } else {
                // 如果是 Map，Key 可能為字串 "1" 或數字 1
                todayClasses = schedule[dayNum] || schedule[String(dayNum)] || [];
            }

            for (const course of todayClasses) {
                if (!course.startTime) continue;
                const startMins = timeToMins(course.startTime);
                const timeDiff = startMins - currentMins;

                // 💡 邏輯：上課前 1~5 分鐘發送
                if (timeDiff > 0 && timeDiff <= 5) {
                    const title = `🔔 準備上課：${course.subject || course.course}`;
                    const body = `📍 地點：${course.location || "原班級"} | 將於 ${course.startTime} 開始`;
                    await sendPushToClass(classId, title, body, 'normal');
                }
            }
        }
    } catch (error) {
        console.error("[排程錯誤] 課前提醒檢查失敗:", error);
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
        console.error("[排程錯誤] 每日功課提醒失敗:", error);
    }
});