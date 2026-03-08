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
  const huggingUrl = localStorage.getItem('gsat_hugging_url');

  const allImages = [...images];
  if (image) allImages.push(image);

  if (geminiKey) {
    try {
      const contents = [{ parts: [{ text: prompt }] }];
      if (allImages.length > 0) {
        allImages.forEach(img => contents[0].parts.push({ inlineData: img }));
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature, responseMimeType: responseJson ? "application/json" : "text/plain" }
        })
      });
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) { console.warn("Gemini failing, trying fallback...", e); }
  }

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
    } catch (e) { console.error("AI service failure", e); }
  }
  return null;
};
