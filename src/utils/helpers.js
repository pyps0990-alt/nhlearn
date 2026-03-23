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

  // 🚀 模型池：自動備援機制。優先使用 2.0 系列，若塞車則備援至 1.5 系列
  const models = [
    'gemini-2.0-flash', 
    'gemini-2.0-flash-lite-preview-02-05',
    'gemini-1.5-flash', 
    'gemini-1.5-pro'
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
      // 配合後端新結構：檢查 success 旗標與 text
      if (result?.data?.success && result?.data?.text) {
        console.log(`✅ AI 模型 ${model} 回傳成功`);
        return result.data.text;
      }
      throw new Error(result?.data?.error || `模型 ${model} 回傳不成功`);
    } catch (e) {
      console.warn(`⚠️ 模型 ${model} 請求失敗:`, e.message);
      lastError = e;
    }
  }

  console.error("❌ 所有 AI 模型均嘗試失敗:", lastError);
  return null; // 返回 null 讓 UI 使用備援金句
};

export const normalizePOS = (pos) => {
  if (!pos) return 'n.';
  const p = pos.trim().toLowerCase().replace(/\./g, '');
  const map = {
    'noun': 'n.',
    'n': 'n.',
    'verb': 'v.',
    'v': 'v.',
    'adjective': 'adj.',
    'adj': 'adj.',
    'a': 'adj.',
    'adverb': 'adv.',
    'adv': 'adv.',
    'preposition': 'prep.',
    'prep': 'prep.',
    'pr': 'prep.',
    'conjunction': 'conj.',
    'conj': 'conj.',
    'c': 'conj.',
    'pronoun': 'pron.',
    'pron': 'pron.',
    'interjection': 'int.',
    'int': 'int.',
    'i': 'int.',
    'phrase': 'phr.',
    'phr': 'phr.',
    'abbreviation': 'abbr.',
    'abbr': 'abbr.',
    'suffix': 'suf.',
    'prefix': 'pref.'
  };
  return map[p] || (pos.endsWith('.') ? pos.toLowerCase() : pos.toLowerCase() + '.');
};

/**
 * 🚀 核心需求：邏輯拆解 (Logical Decomposition)
 * 將單字拆解析為 [字首, 字根, 字尾] 並回傳結構化片斷
 */
export const processWordDecomposition = (wordData) => {
  const word = wordData.word || '';
  const parts = [];
  
  // 清理資料 (移除 AI 可能帶入的連字號)
  const prefix = (wordData.prefix || '').replace(/-/g, '').toLowerCase();
  const root = (wordData.root || '').replace(/-/g, '').toLowerCase();
  const suffix = (wordData.suffix || '').replace(/-/g, '').toLowerCase();

  let remaining = word.toLowerCase();
  let offset = 0;

  const addPart = (text, type, meaning = '') => {
    if (!text) return;
    const startIdx = remaining.indexOf(text);
    if (startIdx !== -1) {
      // 如果中間有漏掉的連接字母，先補上
      if (startIdx > 0) {
        parts.push({ text: remaining.substring(0, startIdx), type: 'connector', offset: offset });
      }
      parts.push({ text, type, meaning, offset: offset + startIdx });
      remaining = remaining.substring(startIdx + text.length);
      offset += startIdx + text.length;
    }
  };

  addPart(prefix, 'Prefix', wordData.prefixMeaning);
  addPart(root, 'Root', wordData.rootMeaning);
  addPart(suffix, 'Suffix', wordData.suffixMeaning);

  if (remaining) {
    parts.push({ text: remaining, type: 'connector', offset });
  }

  return parts;
};

/**
 * 🚀 複習演算法整合：根據字根罕見度調整複習權重
 */
export const calculateSRSWeight = (word, commonalityMap) => {
  const root = (word.root || '').toLowerCase();
  if (!root) return 1.0;

  // commonalityMap: { 'act': 15, 'dic': 3, ... }
  const count = commonalityMap[root] || 1;
  
  // 字根越罕見 (count 越小)，權重越高 (Interval 縮短，增加複習頻率)
  // 基礎 1.0，罕見字根增加 0.2 ~ 0.5 權重
  const rarirtyBonus = count < 3 ? 0.5 : count < 6 ? 0.3 : 0.1;
  return 1.0 + rarirtyBonus;
};
