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
  const geminiKey = localStorage.getItem('gsat_gemini_key');
  const openRouterKey = localStorage.getItem('gsat_openrouter_key');

  const allImages = [...images];
  if (image) allImages.push(image);

  // 1. 優先嘗試使用者自備的 Gemini Key
  // 使用 sessionStorage 記錄停用狀態，確保重新整理後也不會噴發第一次的 429 紅字報錯
  const isSuspended = sessionStorage.getItem('_gsat_local_gemini_suspended');
  
  if (geminiKey && !isSuspended) {
    try {
      const contents = [{ parts: [{ text: prompt }] }];
      if (allImages.length > 0) {
        allImages.forEach(img => contents[0].parts.push({ inlineData: img }));
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature, responseMimeType: responseJson ? "application/json" : "text/plain" }
        })
      });

      if (!res.ok) {
        // 全面跳過：只要 2.5 在本地端報錯，立刻記錄到 Session 並切換到 Proxy
        sessionStorage.setItem('_gsat_local_gemini_suspended', 'true');
        throw `LOCAL_KEY_ERROR_${res.status}`;
      }

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return text;
    } catch (e) {
      if (typeof e === 'string' && e.startsWith("LOCAL_KEY_ERROR")) {
        // 默默失敗，讓後面的 fallback 處理
      } else {
        console.warn("Gemini user key failing, trying fallback...", e); 
      }
    }
  }

  // 2. 嘗試 OpenRouter (如果有提供)
  if (openRouterKey) {
    try {
      const body = {
        model: "google/gemini-2.0-flash",
        messages: [{ role: "user", content: prompt }],
        temperature
      };
      if (allImages.length > 0) {
        body.messages[0].content = [
          { type: "text", text: prompt },
          ...allImages.map(img => ({
            type: "image_url",
            image_url: { url: `data:${img.mimeType};base64,${img.data}` }
          }))
        ];
      }
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://gsat-pro.vercel.app',
          'X-Title': 'GSAT Pro'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (e) { console.warn("OpenRouter failing, trying fallback...", e); }
  }

  // 3. ✨ 最終回退：使用內建 AI Proxy (由開發者提供 Key)
  if (functions) {
    try {
      const callAI = httpsCallable(functions, 'callBuiltInAI');
      const result = await callAI({ prompt, options: { temperature, responseJson } });
      return result.data.text;
    } catch (e) {
      console.error("內建 AI Proxy 請求失敗:", e);
    }
  }

  return null;
};
