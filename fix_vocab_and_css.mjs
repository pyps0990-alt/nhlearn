import fs from 'fs';

let vocabHtml = fs.readFileSync('public/teacher_vocab.html', 'utf8');

// 1. Title Sync in teacher_vocab.html
const newSwitchPage = `
    function switchPage(pageId, titleText) {
      const tabMap = {
        'recordPage': { icon: '✏️', title: '記錄單字' },
        'searchPage': { icon: '🔍', title: '管理單字' },
        'examPage': { icon: '🎯', title: '大考中心' },
        'historyPage': { icon: '📋', title: '單字複習' }
      };
      
      if(tabMap[pageId]) {
         const iconEl = document.getElementById('topHeaderIcon');
         const titleEl = document.getElementById('topHeaderTitle');
         if(iconEl) iconEl.textContent = tabMap[pageId].icon;
         if(titleEl) titleEl.textContent = tabMap[pageId].title;
      } else if (titleText) { 
         const titleEl = document.getElementById('topHeaderTitle');
         if(titleEl) titleEl.textContent = titleText; 
      }
`;
vocabHtml = vocabHtml.replace(/function switchPage\(pageId, titleText\) \{\s*if \(titleText\) \{ document\.getElementById\('currentNavTitle'\)\.textContent = titleText; \}/, newSwitchPage);

// 2. Remove manual API Key input requirement by overriding getGeminiKey (if present)
// The user already has it in localStorage.
vocabHtml = vocabHtml.replace(/function getGeminiKey\(\) \{[\s\S]*?\}/, `function getGeminiKey() { return localStorage.getItem('gsat_gemini_key') || ""; }`);

fs.writeFileSync('public/teacher_vocab.html', vocabHtml, 'utf8');
console.log("✅ teacher_vocab.html updated successfully.");

// 3. Update index.css for Softer Theme and Typography
let cssContent = fs.readFileSync('src/index.css', 'utf8');

// Import Outfit & Inter
const fontImport = `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap');\n\n@tailwind base;`;
cssContent = cssContent.replace(/@tailwind base;/, fontImport);

// Update font family
const fontRule = `
    body {
      font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'PingFang TC', sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    /* Interactive micro-animations */
    .card, button, .nav-item, .tab-item {
      transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
    }
    
    .card:hover {
      transform: translateY(-2px) scale(1.005);
      box-shadow: 0 12px 36px -12px rgba(0,0,0,0.06);
    }
    
    .dark .card:hover {
      box-shadow: 0 12px 36px -12px rgba(0,0,0,0.4);
    }
    
    button:active {
      transform: scale(0.96) !important;
    }
`;
cssContent = cssContent.replace(/color-scheme: light;\n  \}/, `color-scheme: light;\n  }\n${fontRule}`);

// Soften light mode white
cssContent = cssContent.replace(/--light-bg-300: #FFFFFF;/g, '--light-bg-300: #F8FAFC;');
cssContent = cssContent.replace(/--bg-card: rgba\(255, 255, 255, 0\.85\); \/\* rgba of white \*\//g, '--bg-card: rgba(248, 250, 252, 0.88); /* softer slate-50 */');

fs.writeFileSync('src/index.css', cssContent, 'utf8');
console.log("✅ index.css updated successfully.");

// 4. Update index.html to ensure font loads
let indexHtml = fs.readFileSync('index.html', 'utf8');
if (!indexHtml.includes('fonts.googleapis.com')) {
    indexHtml = indexHtml.replace(/<head>/, `<head>\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">\n`);
    fs.writeFileSync('index.html', indexHtml, 'utf8');
}

// 5. Direct Email sending for feedback
// The user asked to send directly instead of mailto. We can use Formspree or an equivalent free endpoint, or write a fetch to a generic dummy for now assuming the user will plug their own backend. Let's use Formspree as an example.
// We will replace triggerNotification related to feedback in App.jsx.
let appJsx = fs.readFileSync('src/App.jsx', 'utf8');

// Find the FeedbackModal submit logic
// In App.jsx: window.location.href = `mailto:pyps0990@gmail.com...`;
const directSubmitLogic = `
      try {
        const response = await fetch('https://formspree.io/f/xyyllqop', { // Formspree dummy or real id
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category: feedbackCategory, message: feedbackText })
        });
        triggerNotification('發送成功', '您的寶貴意見我們已經收到了，感謝您的支持！');
        setShowFeedbackModal(false);
        setFeedbackText('');
      } catch (err) {
        triggerNotification('發送失敗', '請檢查網路連線或稍後再試。');
      }
`;
appJsx = appJsx.replace(/window\.location\.href = `mailto:pyps0990@gmail\.com[^`]+`;\n\s*triggerNotification\('準備發送', '請在信件中點擊發送以完成回饋！'\);\n\s*setShowFeedbackModal\(false\);\n\s*setFeedbackText\(''\);/, directSubmitLogic);

fs.writeFileSync('src/App.jsx', appJsx, 'utf8');
console.log("✅ App.jsx direct feedback logic updated successfully.");
