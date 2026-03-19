import { httpsCallable } from "firebase/functions";
import { functions } from "../config/firebase";

export const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '早安，學習愉快！';
  if (hour >= 11 && hour < 14) return '午安，記得休息！';
  if (hour >= 14 && hour < 18) return '下午好，繼續加油！';
  if (hour >= 18 && hour < 22) return '晚上好，充實自我！';
  return '夜深了，早點休息喔！';
};

export const fetchAI = async (prompt, options = {}) => {
  const { temperature = 0.7, responseJson = false, image = null, images = [] } = options;

  if (!functions) {
    console.error("Firebase Functions 未初始化");
    return null;
  }

  try {
    const callBuiltInAI = httpsCallable(functions, 'callBuiltInAI');
    const payload = { prompt, options: { temperature, responseJson, image, images } };
    const result = await callBuiltInAI(payload);
    return result.data.text;
  } catch (e) {
    console.error("AI 伺服器連線失敗:", e);
    throw new Error("AI 伺服器連線失敗");
  }
};
