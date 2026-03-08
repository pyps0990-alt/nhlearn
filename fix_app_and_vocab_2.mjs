import fs from 'fs';

let content = fs.readFileSync('public/teacher_vocab.html', 'utf8');

// 1. Remove the "Search" tab from historyPage HTML
content = content.replace(/<button class="tab" data-tab="search" onclick="switchHistoryTab\('search'\)">全庫搜尋<\/button>/g, '');
content = content.replace(/<!-- 搜尋 -->[\s\S]*?<!-- 複習模式 -->/, '<!-- 複習模式 -->');

// 2. Remove the search logic from switchHistoryTab
content = content.replace(/document\.getElementById\('searchTab'\)\.style\.display = tab === 'search' \? 'block' : 'none';/, '');

// 3. Update examPage Search Input HTML to hook into a new JS function
content = content.replace(
    /<input type="text" class="search-input" id="examSearchInput" placeholder="輸入英文或中文...">/,
    `<input type="text" class="search-input" id="examSearchInput" placeholder="輸入英文或中文..." onkeyup="handleExamSearch(event)">`
);

// 4. Add quizLevelSelect to reviewTab HTML
const quizLevelHtml = `
        <div class="input-group" style="margin-bottom:0;">
          <label>請選擇複習題型 (由 AI 根據您的單字庫出題)</label>
          <select class="select-field" id="quizModeSelect" onchange="loadAiQuiz()">
            <option value="meaning">📝 模式一：單字意思測驗</option>
            <option value="multiple_choice">🎯 模式二：單字情境選擇題</option>
            <option value="cloze">🧩 模式三：短文克漏字填空</option>
            <option value="reading">📖 模式四：閱讀理解題</option>
          </select>
        </div>
        <div class="input-group" style="margin-top:12px; margin-bottom:0;">
          <label>選擇題庫範圍 (可擷取老師上傳的級別資料)</label>
          <select class="select-field" id="quizLevelSelect">
            <option value="all">📚 全庫不分級抽取</option>
            <option value="1">L 1 (級別 1)</option>
            <option value="2">L 2 (級別 2)</option>
            <option value="3">L 3 (級別 3)</option>
            <option value="4">L 4 (級別 4)</option>
            <option value="5">L 5 (級別 5)</option>
            <option value="6">L 6 (級別 6)</option>
          </select>
        </div>
`;
content = content.replace(/<div class="input-group" style="margin-bottom:0;">\s*<label>請選擇複習題型(.|\n)*?<\/select>\s*<\/div>/m, quizLevelHtml);

// 5. Inject handleExamSearch and update loadAiQuiz in JS
const handleExamSearchJS = `
    let examSearchTimeout = null;
    function handleExamSearch(event) {
      clearTimeout(examSearchTimeout);
      const keyword = event.target.value.trim();
      const container = document.getElementById('examContent');
      if (!keyword) { 
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎯</div><div class="empty-state-text">請點擊上方級別或輸入關鍵字開始學習</div></div>'; 
          return; 
      }
      examSearchTimeout = setTimeout(() => doExamSearch(keyword), 300);
    }

    async function doExamSearch(keyword) {
      const container = document.getElementById('examContent');
      container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      try {
        const result = await apiGet('searchRecords', { keyword: keyword });
        if (result.success && result.records.length > 0) {
            container.innerHTML = result.records.map(record => renderRecordItem(record)).join('');
        } else {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔍</div><div class="empty-state-text">題庫中找不到相關單字</div></div>';
        }
      } catch (error) { 
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">搜尋失敗，請稍後再試</div></div>'; 
      }
    }
`;

// Insert handleExamSearch before loadAiQuiz
content = content.replace(/\/\/ ==+[\n\s]*\/\/ 🔥 全新 AI/, `${handleExamSearchJS}\n\n    // ============================================\n    // 🔥 全新 AI`);

// Modify loadAiQuiz logic to filter by level
const originalLoadAiQuizRegex = /const shuffledWords = \[\.\.\.recordedWordsList\]\.sort\(\(\) => 0\.5 - Math\.random\(\)\);/;
const filteredLoadAiQuiz = `
        const levelSelect = document.getElementById('quizLevelSelect');
        const targetLevel = levelSelect ? levelSelect.value : 'all';
        let availableWords = [...recordedWordsList];
        
        if (targetLevel !== 'all') {
           availableWords = availableWords.filter(r => String(r.level) === targetLevel);
        }

        if (availableWords.length < 4) {
           container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">該級別單字不足 (至少需要 4 個)，請先新增或更換題庫範圍</div></div>';
           nextBtn.style.display = 'block';
           nextBtn.textContent = '重試一次';
           return;
        }

        const shuffledWords = availableWords.sort(() => 0.5 - Math.random());
`;
content = content.replace(originalLoadAiQuizRegex, filteredLoadAiQuiz);

fs.writeFileSync('public/teacher_vocab.html', content, 'utf8');
console.log("✅ teacher_vocab.html logic updated for Examination UI integration and Grade selector.");

// --- Fix App.jsx Schedule UI ---
// Based on the user stating the UI wasn't changed.
let appContent = fs.readFileSync('src/App.jsx', 'utf8');

// The original dashboard card style for classes might look like:
// bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300
// In DashboardTab
appContent = appContent.replace(
    /className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-900\/30 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-sm"/g,
    'className="flex items-center gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/10 rounded-[22px] transition-all hover:scale-[1.01] shadow-sm"'
);

appContent = appContent.replace(
    /className="text-emerald-800 dark:text-emerald-300 font-bold"/g,
    'className="text-slate-800 dark:text-white font-extrabold text-lg"'
);

appContent = appContent.replace(
    /className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1"/g,
    'className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full"'
);

fs.writeFileSync('src/App.jsx', appContent, 'utf8');
console.log("✅ App.jsx visual UI explicitly updated.");
