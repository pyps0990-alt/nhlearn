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

  // 🚀 模型池：自動備援機制。優先使用 2.0 系列，若塞車則備援至 1.5 或 GPT
  const models = [
    'gemini-2.0-flash', 
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-2.5-flash', 
    'gemini-2.5-pro',
    'gemini-3.0-flash', 
    'gemini-3.0-flash-lite',
    'gemini-3.0-pro-preview',
  ];
  let lastError = null;

  for (const model of models) {
    try {
      console.log(`🤖 正在嘗試 AI 模型: ${model}...`);
      const callBuiltInAI = httpsCallable(functions, 'callBuiltInAI');
      const payload = {
        prompt,
        options: { temperature, responseJson, image, images, model }
      };

      const result = await callBuiltInAI(payload);
      if (result?.data?.text) {
        console.log(`✅ AI 模型 ${model} 回傳成功`);
        return result.data.text;
      }
      throw new Error(`模型 ${model} 回傳內容為空`);
    } catch (e) {
      console.warn(`⚠️ 模型 ${model} 請求失敗:`, e.message);
      lastError = e;
      // 繼續嘗試下一個模型
    }
  }

  console.error("❌ 所有 AI 模型均嘗試失敗:", lastError);
  throw new Error("AI 伺服器繁忙，所有備援模型均連線失敗，請稍後再試。");
};
