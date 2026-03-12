// ============================================
// UI Controllers & Page Navigation
// ============================================
function toggleNavDropdown() {
  const dropdown = document.getElementById('navDropdown');
  if (dropdown) dropdown.classList.toggle('show');
}

window.onclick = function (event) {
  if (!event.target.closest('.nav-dropdown')) {
    const dropdown = document.getElementById('navDropdown');
    if (dropdown && dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
    }
  }
};

function switchPage(pageId, titleText) {
  const tabMap = {
    'recordPage': { icon: '✏️', title: '記錄單字' },
    'examPage': { icon: '🎯', title: '大考中心' },
    'historyPage': { icon: '📋', title: '單字複習' }
  };

  const titleEl = document.getElementById('currentNavTitle');
  if (titleEl) {
    if (tabMap[pageId]) {
      titleEl.textContent = `${tabMap[pageId].icon} ${tabMap[pageId].title}`;
    } else if (titleText) {
      titleEl.textContent = titleText;
    }
  }

  document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add('active');

  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.classList.remove('active');
    if (tab.dataset.page === pageId) tab.classList.add('active');
  });

  if (pageId === 'historyPage') {
    switchHistoryTab('recent');
    loadRecentRecords();
  }
  window.scrollTo(0, 0);
}

function switchHistoryTab(tab) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.getElementById('recentTab').style.display = tab === 'recent' ? 'block' : 'none';
  document.getElementById('reviewTab').style.display = tab === 'review' ? 'block' : 'none';
}

// ============================================
// Firebase Configuration & Global State
// ============================================
const firebaseConfig = {
  apiKey: "AIzaSyDFFtn4Sn5l9LKBV4vpmDohknwr-C42TuY",
  authDomain: "gsat-pro.firebaseapp.com",
  projectId: "gsat-pro",
  storageBucket: "gsat-pro.firebasestorage.app",
  messagingSenderId: "288124052978",
  appId: "1:288124052978:web:37f00d24cfd0322d38376b",
  measurementId: "G-BFLEWM3GSX"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

const urlParams = new URLSearchParams(window.location.search);
const userEmail = urlParams.get('email') || localStorage.getItem('nhsh-user-email') || '';
const userName = urlParams.get('name') || '';
const isStaff = userEmail.endsWith('@nhsh.tp.edu.tw');
let currentGrade = localStorage.getItem('nhsh-vocab-grade') || 'G1';

let recordedWordsList = [];
const cache = { vocabByLevel: {}, recentRecords: null, timestamp: {} };
const CACHE_TTL = 5 * 60 * 1000;

function getGeminiKey() { return localStorage.getItem('gsat_gemini_key') || ""; }
function hasAnyAiEngine() { return getGeminiKey() || (window.ai && (typeof window.ai.appendText === 'function' || typeof window.ai.canCreateTextSession === 'function')); }

function isCacheValid(key) { return cache.timestamp[key] && (Date.now() - cache.timestamp[key] < CACHE_TTL); }
function setCache(key, data) { cache.timestamp[key] = Date.now(); return data; }
function clearCache(key) { delete cache.timestamp[key]; }

function showToast(message) {
  const toast = document.getElementById('toast');
  if (toast) {
    toast.textContent = message;
    toast.className = 'toast show';
    setTimeout(() => toast.classList.remove('show'), 2500);
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text) {
  if (!text) return '';
  return text.replace(/'/g, "\\'").replace(/"/g, '\\"');
}

// ============================================
// Data Persistence (GAS + Firestore 雙軌)
// ============================================
const STORAGE_KEY = 'nhsh-vocab-api-url';
let gasUrl = localStorage.getItem(STORAGE_KEY) || '';

async function updateConnectionStatus() {
  const statusEl = document.getElementById('connectionStatus');
  const statusText = document.getElementById('statusText');
  if (!statusEl || !statusText) return;

  const hasKey = !!getGeminiKey();
  statusEl.className = hasKey ? 'connection-status status-connected' : 'connection-status status-disconnected';
  statusText.textContent = hasKey ? 'AI 已連線' : '未設定 AI 金鑰';
}

async function apiGet(action, params = {}) {
  const cacheKey = `${action}_${JSON.stringify(params)}_${currentGrade}`;
  if (isCacheValid(cacheKey) && cache.vocabByLevel[cacheKey]) {
    return { success: true, records: cache.vocabByLevel[cacheKey] };
  }

  try {
    let records = [];
    if (action === 'getRecentRecords') {
      const snap = await db.collection('vocab')
        .where('userEmail', '==', userEmail)
        .where('grade', '==', currentGrade)
        .orderBy('serialNumber', 'desc')
        .limit(50).get();
      records = snap.docs.map(d => d.data());
    } else if (action === 'getWordsByLevel') {
      const snap = await db.collection('vocab')
        .where('grade', '==', currentGrade)
        .where('level', '==', params.level.toString())
        .limit(100).get();
      records = snap.docs.map(d => d.data());
    } else if (action === 'getSharedWords') {
      const snap = await db.collection('vocab')
        .where('grade', '==', currentGrade)
        .where('shared', '==', true)
        .get();
      records = snap.docs.map(d => d.data());
    } else if (action === 'searchRecords') {
      const snap = await db.collection('vocab').where('grade', '==', currentGrade).get();
      const kw = params.keyword.toLowerCase();
      records = snap.docs.map(d => d.data()).filter(d =>
        (d.word && d.word.toLowerCase().includes(kw)) || (d.chinese && d.chinese.includes(kw))
      );
    }

    cache.vocabByLevel[cacheKey] = records;
    setCache(cacheKey, records);
    
    // Background GAS sync (optional backup)
    if (gasUrl) {
      setTimeout(async () => {
        try {
          const url = new URL(gasUrl);
          url.searchParams.set('action', action);
          url.searchParams.set('email', userEmail);
          url.searchParams.set('name', userName);
          Object.keys(params).forEach(key => url.searchParams.set(key, params[key]));
          await fetch(url.toString());
        } catch (e) { /* silent fail for background task */ }
      }, 0);
    }

    return { success: true, records };
  } catch (e) {
    console.error('Firestore GET failed', e);
    return { success: false, error: e.message };
  }
}

async function apiPost(action, data = {}) {
  try {
    let result = { success: false };
    if (action === 'addRecord') {
      const docData = {
        serialNumber: Date.now(),
        word: data.word,
        chinese: data.chinese,
        pos: data.pos || '',
        level: data.level || '',
        example: data.example || '',
        grade: currentGrade,
        userEmail: userEmail,
        type: data.type || '個人',
        shared: !!(isStaff && window._adminSharing),
        date: new Date().toLocaleDateString('zh-TW')
      };
      await db.collection('vocab').doc(docData.serialNumber.toString()).set(docData);
      result = { success: true, record: docData };
    } else if (action === 'updateRecord') {
      await db.collection('vocab').doc(data.serialNumber.toString()).update(data);
      result = { success: true };
    } else if (action === 'deleteRecord') {
      await db.collection('vocab').doc(data.serialNumber.toString()).delete();
      result = { success: true };
    }

    // Background GAS backup
    if (gasUrl) {
      setTimeout(async () => {
        try {
          await fetch(gasUrl, {
            method: 'POST',
            body: JSON.stringify({ action, email: userEmail, name: userName, ...data, grade: currentGrade })
          });
        } catch (e) { /* silent fail */ }
      }, 0);
    }

    return result;
  } catch (e) {
    console.error('Firestore POST failed', e);
    return { success: false, error: e.message };
  }
}

// ============================================
// 互動功能：TTS 朗讀與文字反白即查
// ============================================
window.speakWord = function (text) {
  if (!text) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.85; // 稍微放慢以利學習
    window.speechSynthesis.speak(utterance);
  } else {
    showToast('您的瀏覽器不支援語音朗讀功能');
  }
};

document.addEventListener('selectionchange', () => {
  const selection = window.getSelection();
  const text = selection.toString().trim();
  const tooltip = document.getElementById('selectionTooltip');
  if (!tooltip) return;

  if (text && /^[a-zA-Z\s\-']+$/.test(text) && text.length < 35 && text.length > 1) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    tooltip.style.display = 'flex';
    tooltip.style.top = `${rect.top - 45 + window.scrollY}px`;
    tooltip.style.left = `${rect.left + rect.width / 2}px`;
  } else {
    tooltip.style.display = 'none';
  }
});

window.handleSelectionAdd = () => {
  const text = window.getSelection().toString().trim();
  if (text) {
    document.getElementById('selectionTooltip').style.display = 'none';
    switchPage('recordPage');
    if (document.getElementById('wordInput')) {
      document.getElementById('wordInput').value = text;
      showToast(`正在查詢 "${text}"...`);
      window.getSelection().removeAllRanges();
      autoFillWithAI();
    }
  }
};

// ============================================
// AI 核心 (Gemini API) 與自動分類
// ============================================
async function fetchAI(prompt, options = {}) {
  const { temperature = 0.7, forceJson = false } = options;
  const apiKey = getGeminiKey();
  if (!apiKey) throw new Error("API Key 未設定");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature, responseMimeType: forceJson ? "application/json" : "text/plain" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || "API 請求失敗");
  }
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}

async function autoFillWithAI() {
  const word = document.getElementById('wordInput').value.trim();
  if (!word) return showToast('請先輸入英文單字！');
  if (!hasAnyAiEngine()) return showToast('請先至設定綁定 AI 金鑰');

  const btn = document.querySelector('.btn-ai');
  if (btn) {
    btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;"></div>';
    btn.disabled = true;
  }

  const prompt = `你是一個專業的高中英文老師。請詳細分析單字 "${word}"。
  請將該單字的所有常見意思與詞性進行分類，並給出一個大考程度的實用例句。
  請嚴格以 JSON 格式回傳：
  {
    "chinese": "1. [n.] 意思A; 2. [v.] 意思B...",
    "pos": "最主要的詞性縮寫 (例如 n., v., adj., adv., prep., conj., phr.)",
    "level": "符合台灣學測大考中心標準的分級(1-6)",
    "example": "提供一句符合學測難度、包含此單字的英文例句，並附上中文翻譯"
  }`;

  try {
    const rawText = await fetchAI(prompt, { temperature: 0.2, forceJson: true });
    const result = JSON.parse(rawText.replace(/```json/gi, '').replace(/```/g, '').trim());

    document.getElementById('chineseInput').value = result.chinese || '';
    document.getElementById('posInput').value = result.pos || '';
    document.getElementById('levelInput').value = result.level || '';
    if (document.getElementById('exampleInput')) document.getElementById('exampleInput').value = result.example || '';

    showToast('✨ AI 智慧分類完成');
    speakWord(word);
  } catch (e) {
    showToast('AI 解析失敗: ' + e.message);
  } finally {
    if (btn) { btn.innerHTML = 'AI 輔助'; btn.disabled = false; }
  }
}

async function analyzeWordWithAI(word) {
  if (!hasAnyAiEngine()) return showToast('請先設置 AI 金鑰');
  const modal = document.getElementById('aiModal');
  const content = document.getElementById('aiContent');
  const loading = document.getElementById('aiLoading');

  modal.classList.add('show');
  content.innerHTML = '';
  loading.style.display = 'flex';

  try {
    const prompt = `請以台灣學測大考中心的命題風格，深度解析單字 "${word}"。
    內容需包含：
    1. 核心定義與一字多義解析
    2. 常考搭配詞 (Collocations) 與片語
    3. 同義字與易混淆字比較
    4. 一題模擬學測單選題與詳解
    請使用 HTML 標籤 (<h3>, <strong>, <ul>, <li>, <br>) 排版，不要使用 Markdown。`;

    const htmlText = await fetchAI(prompt, { temperature: 0.7 });
    content.innerHTML = htmlText;
  } catch (e) {
    content.innerHTML = `<div style="color:var(--danger-color);text-align:center;font-weight:bold;">解析失敗：${e.message}</div>`;
  } finally {
    loading.style.display = 'none';
  }
}

// ============================================
// 大考題型測驗 (AI Quiz)
// ============================================
async function loadAiQuiz() {
  if (!hasAnyAiEngine()) return showToast("請先設置 AI 金鑰");

  const mode = document.getElementById('quizModeSelect').value;
  const scope = document.getElementById('quizScopeSelect').value;
  const container = document.getElementById('quizContainer');

  container.innerHTML = '<div class="loading"><div class="spinner"></div><span style="margin-left:12px;font-weight:bold;">大考中心 AI 命題中...</span></div>';

  try {
    let words = [...recordedWordsList];
    if (scope === 'shared') {
      const res = await apiGet('getSharedWords');
      if (res.success) words = [...words, ...res.records];
    }

    const uniqueWords = Array.from(new Set(words.map(w => w.word))).map(word => words.find(w => w.word === word));
    if (uniqueWords.length < 3) {
      container.innerHTML = '<div class="empty-state">單字庫太少，請至少收錄 3 個單字再來挑戰測驗喔！</div>';
      return;
    }

    const shuffled = uniqueWords.sort(() => 0.5 - Math.random()).slice(0, 8);
    const wordsListInfo = shuffled.map(w => `${w.word} (${w.chinese})`).join(', ');

    let promptDesc = "";
    if (mode === 'meaning') {
      promptDesc = `出 3 題「字義選擇題」。測驗單字的正確中文意思或同義詞。`;
    } else if (mode === 'context') {
      promptDesc = `出 3 題「單字情境選擇題（單選題）」。給定一個學測難度的英文句子並挖空，讓學生選出最適合填入的單字。`;
    } else if (mode === 'cloze') {
      promptDesc = `撰寫一篇約 120 字的「綜合測驗 (克漏字) 短文」。將上述挑選的 3 個單字在文中挖空（標示為 1, 2, 3）。出 3 題選擇題。`;
    } else if (mode === 'reading') {
      promptDesc = `撰寫一篇約 150-200 字的「閱讀理解測驗」短文。文章內必須包含且標註 <u>底線</u> 上述的幾個單字。在文章下方，出 2 題閱讀理解選擇題（包含主旨題或細節推論題）。`;
    }

    const prompt = `你是一位台灣大考中心(CEFR B1-B2)命題委員。請使用以下學生收錄的單字作為測驗核心：[${wordsListInfo}]。
    ${promptDesc}
    請嚴格回傳 JSON 格式，不要包含任何 markdown 標記：
    {
      "article": "閱讀或克漏字的文章內容 (若無短文請填 null，若有請用 <br> 換行，底線用 <u> 標記)",
      "questions": [
        {
          "q": "題目內容或題號",
          "opts": ["(A) 選項一", "(B) 選項二", "(C) 選項三", "(D) 選項四"],
          "ans": 0,
          "exp": "詳細的中文解析與翻譯"
        }
      ]
    }`;

    const rawJson = await fetchAI(prompt, { temperature: 0.8, forceJson: true });
    const data = JSON.parse(rawJson.replace(/```json/gi, '').replace(/```/g, '').trim());
    renderAiQuiz(data);
  } catch (e) {
    container.innerHTML = `<div class="empty-state">生成測驗失敗，請確認 API 狀態。<br><small>${e.message}</small></div>`;
  }
}

function renderAiQuiz(data) {
  const container = document.getElementById('quizContainer');
  let html = '';

  if (data.article) {
    html += `<div class="quiz-article">${escapeHtml(data.article).replace(/\n/g, '<br>').replace(/&lt;u&gt;/g, '<u>').replace(/&lt;\/u&gt;/g, '</u>')}</div>`;
  }

  data.questions.forEach((q, idx) => {
    html += `
      <div class="quiz-card">
        <div class="quiz-question-text">${idx + 1}. ${escapeHtml(q.q)}</div>
        <div class="quiz-options" id="quizOpts_${idx}">
          ${q.opts.map((opt, oIdx) => `
            <button class="quiz-option" onclick="checkQuizAns(${idx}, ${oIdx}, ${q.ans}, '${escapeAttr(q.exp)}')">
              ${escapeHtml(opt)}
            </button>
          `).join('')}
        </div>
        <div id="quizResult_${idx}" style="display:none; margin-top:16px; padding:16px; border-radius:16px; line-height:1.6;"></div>
      </div>
    `;
  });
  container.innerHTML = html;
}

window.checkQuizAns = function (qIdx, sIdx, aIdx, exp) {
  const container = document.getElementById(`quizOpts_${qIdx}`);
  const resultDiv = document.getElementById(`quizResult_${qIdx}`);
  const btns = container.querySelectorAll('.quiz-option');

  btns.forEach(b => b.disabled = true);

  const isCorrect = sIdx === aIdx;
  btns[sIdx].classList.add(isCorrect ? 'correct' : 'wrong');
  btns[aIdx].classList.add('correct');

  resultDiv.style.display = 'block';
  resultDiv.className = isCorrect ? 'quiz-result-correct' : 'quiz-result-wrong';
  resultDiv.innerHTML = `
    <div style="font-weight:900; font-size:16px; margin-bottom:8px;">
      ${isCorrect ? '🎉 答對了！' : '💪 再接再厲！'}
    </div>
    <div style="font-weight:600; color: var(--text-secondary); font-size:14px;">${escapeHtml(exp)}</div>
  `;
}

// ============================================
// Record Management & Rendering
// ============================================
// 保留原始的師長切換模式
function toggleAdminView() {
  const btn = document.getElementById('adminShareBtn');
  const isSharing = btn.classList.toggle('active');
  btn.style.background = isSharing ? '#064e3b' : '#fef3c7';
  btn.style.color = isSharing ? '#34d399' : '#d97706';
  showToast(isSharing ? '已開啟管理員分享模式' : '已關閉分享模式');
  window._adminSharing = isSharing;
}

async function saveRecord() {
  const word = document.getElementById('wordInput').value.trim();
  const chinese = document.getElementById('chineseInput').value.trim();
  const pos = document.getElementById('posInput').value;
  const level = document.getElementById('levelInput').value;
  const example = document.getElementById('exampleInput') ? document.getElementById('exampleInput').value.trim() : '';

  if (!word || !chinese) return showToast('請輸入英文與中文意思');

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) { saveBtn.disabled = true; saveBtn.textContent = '儲存中...'; }

  const res = await apiPost('addRecord', { word, chinese, pos, level, example });

  if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '儲存單字卡'; }
  if (res.success) {
    showToast('✅ 成功收錄單字');
    document.getElementById('wordInput').value = '';
    document.getElementById('chineseInput').value = '';
    document.getElementById('posInput').value = '';
    document.getElementById('levelInput').value = '';
    if (document.getElementById('exampleInput')) document.getElementById('exampleInput').value = '';
    refreshCurrentRecords();
  }
}

function renderRecordItem(record) {
  const isPersonal = record.userEmail === userEmail;
  const badgeClass = record.shared ? 'badge-exam' : (isPersonal ? 'badge-personal' : 'badge-review');
  const encoded = encodeURIComponent(JSON.stringify(record));
  const exampleBlock = record.example ? `<div class="record-example">${escapeHtml(record.example)}</div>` : '';

  return `
    <div class="record-item shadow-soft">
      <div class="record-header" style="align-items: flex-start;">
        <div class="record-word">
          <div style="flex: 1;">${escapeHtml(record.word)}</div>
          <button class="btn-tts" onclick="speakWord('${escapeAttr(record.word)}')">🗣️</button>
        </div>
        <div style="display:flex; gap:6px; flex-shrink: 0;">
          <button class="edit-btn" onclick="analyzeWordWithAI('${escapeAttr(record.word)}')">💡</button>
          ${isPersonal ? `<button class="edit-btn" onclick="openEditModal('${encoded}')">✏️</button>` : ''}
        </div>
      </div>
      <div class="record-chinese">${escapeHtml(record.chinese).replace(/\n/g, '<br>')}</div>
      ${exampleBlock}
      <div class="record-meta">
        <span class="word-pos">${escapeHtml(record.pos) || '---'}</span>
        <span class="record-badge ${badgeClass}">L${record.level || '?'}</span>
      </div>
    </div>
  `;
}

async function loadRecentRecords(force = false) {
  const container = document.getElementById('recentRecords');
  if (!container) return;

  if (!force && isCacheValid('recentRecords') && cache.recentRecords) {
    container.innerHTML = cache.recentRecords.length ? cache.recentRecords.map(renderRecordItem).join('') : '<div class="empty-state">尚未記錄單字</div>';
    return;
  }

  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const res = await apiGet('getRecentRecords');
  if (res.success) {
    cache.recentRecords = res.records;
    setCache('recentRecords', res.records);
    recordedWordsList = res.records;
    container.innerHTML = res.records.length ? res.records.map(renderRecordItem).join('') : '<div class="empty-state">尚未記錄任何單字，快去收錄吧！</div>';
  }
}

function refreshCurrentRecords() {
  clearCache('recentRecords');
  loadRecentRecords(true);
}

// ============================================
// Modals & Search Handlers
// ============================================
function openEditModal(encodedData) {
  const data = JSON.parse(decodeURIComponent(encodedData));
  window._editingRecord = data;
  document.getElementById('editWordInput').value = data.word;
  document.getElementById('editChineseInput').value = data.chinese;
  document.getElementById('editPosInput').value = data.pos;
  document.getElementById('editLevelInput').value = data.level;
  if (document.getElementById('editExampleInput')) document.getElementById('editExampleInput').value = data.example || '';
  document.getElementById('editModal').classList.add('show');
}

function closeEditModal() { document.getElementById('editModal').classList.remove('show'); }

async function saveEdit() {
  const data = window._editingRecord;
  if (!data) return;
  const updated = {
    serialNumber: data.serialNumber,
    word: document.getElementById('editWordInput').value.trim(),
    chinese: document.getElementById('editChineseInput').value.trim(),
    pos: document.getElementById('editPosInput').value,
    level: document.getElementById('editLevelInput').value,
    example: document.getElementById('editExampleInput') ? document.getElementById('editExampleInput').value.trim() : ''
  };
  const res = await apiPost('updateRecord', updated);
  if (res.success) { showToast('更新成功'); closeEditModal(); refreshCurrentRecords(); }
}

async function deleteRecord(sNum) {
  if (!confirm('確定要刪除這個單字嗎？')) return;
  const res = await apiPost('deleteRecord', { serialNumber: sNum || window._editingRecord?.serialNumber });
  if (res.success) { showToast('已刪除'); closeEditModal(); refreshCurrentRecords(); }
}

function openSettings() {
  document.getElementById('settingsModal').classList.add('show');
  document.getElementById('geminiKeyInput').value = getGeminiKey();
  document.getElementById('apiUrlInput').value = gasUrl;
  updateConnectionStatus();
}
function closeSettings() { document.getElementById('settingsModal').classList.remove('show'); }

function saveSettings() {
  const k = document.getElementById('geminiKeyInput').value.trim();
  const u = document.getElementById('apiUrlInput').value.trim();
  if (k) localStorage.setItem('gsat_gemini_key', k);
  if (u) { localStorage.setItem(STORAGE_KEY, u); gasUrl = u; }
  showToast('設定已儲存');
  updateConnectionStatus();
  closeSettings();
  if (document.getElementById('historyPage').classList.contains('active')) loadRecentRecords();
}

function handleExamSearch(e) {
  if (e.key === 'Enter' || e.type === 'keyup') {
    const kw = e.target.value.toLowerCase().trim();
    const items = document.querySelectorAll('#examContent .record-item');
    items.forEach(item => {
      const text = item.textContent.toLowerCase();
      item.style.display = text.includes(kw) ? 'flex' : 'none';
    });
  }
}

async function loadExamLevel(level) {
  const container = document.getElementById('examContent');
  container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  const res = await apiGet('getWordsByLevel', { level });
  if (res.success && res.records?.length) {
    container.innerHTML = res.records.map(renderRecordItem).join('');
  } else {
    container.innerHTML = '<div class="empty-state">此級別尚無單字</div>';
  }
}

// ============================================
// DOM Initialization & Injection
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  apiUrl = localStorage.getItem(STORAGE_KEY) || '';
  updateConnectionStatus();

  // 1. 動態注入純英文縮寫詞性選項
  const posOptions = `
    <option value="">選填</option>
    <option value="n.">n.</option>
    <option value="v.">v.</option>
    <option value="adj.">adj.</option>
    <option value="adv.">adv.</option>
    <option value="prep.">prep.</option>
    <option value="conj.">conj.</option>
    <option value="phr.">phr.</option>
  `;
  if (document.getElementById('posInput')) document.getElementById('posInput').innerHTML = posOptions;
  if (document.getElementById('editPosInput')) document.getElementById('editPosInput').innerHTML = posOptions;

  // 2. 動態注入大考題型選項
  if (document.getElementById('quizModeSelect')) {
    document.getElementById('quizModeSelect').innerHTML = `
      <option value="meaning">📝 字義測驗 (基礎)</option>
      <option value="context">🎯 單字情境選擇 (學測單選)</option>
      <option value="cloze">🧩 綜合測驗 (克漏字)</option>
      <option value="reading">📖 閱讀理解 (短文與題組)</option>
    `;
  }

  // 3. 動態注入例句輸入框
  if (!document.getElementById('exampleInput') && document.getElementById('chineseInput')) {
    const chineseGroup = document.getElementById('chineseInput').closest('.input-group');
    chineseGroup.insertAdjacentHTML('afterend', `
      <div class="input-group">
        <label>實用例句</label>
        <textarea class="input-field" id="exampleInput" placeholder="AI 會自動造句，也可手動輸入..." rows="2" style="resize:none;"></textarea>
      </div>
     `);
  }
  if (!document.getElementById('editExampleInput') && document.getElementById('editChineseInput')) {
    const editChineseGroup = document.getElementById('editChineseInput').closest('.input-group');
    editChineseGroup.insertAdjacentHTML('afterend', `
      <div class="input-group">
        <label>實用例句</label>
        <textarea class="input-field" id="editExampleInput" rows="2" style="resize:none;"></textarea>
      </div>
     `);
  }

  // 4. 大考中心級別切換事件綁定
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      loadExamLevel(e.target.dataset.level);
    });
  });

  // 5. 其他初始化
  const headerSelect = document.getElementById('headerGradeSelect');
  if (headerSelect) headerSelect.value = currentGrade;

  const adminBtn = document.getElementById('adminShareBtn');
  if (isStaff && adminBtn) adminBtn.style.display = 'block';

  if (!getGeminiKey()) openSettings();
  else loadRecentRecords();
});