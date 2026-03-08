import { readFileSync, writeFileSync } from 'fs';

let html = readFileSync('public/teacher_vocab.html', 'utf8');

// Normalize line endings for reliable matching if needed
// html = html.replace(/\r\n/g, '\n');

// 1. Replace Top Navbar Dropdown
const newHeader = `
    <div style="font-size: 20px; font-weight: 900; color: #047857; display: flex; align-items: center; gap: 8px;">
        <span id="topHeaderIcon">✏️</span>
        <span id="topHeaderTitle">記錄單字</span>
    </div>`;

// Find the <div class="nav-dropdown"> and its contents up to its closing </div>
html = html.replace(/<div class="nav-dropdown">[\s\S]*?<\/button>[\s\S]*?<div class="nav-dropdown-content" id="navDropdown">[\s\S]*?<\/div>\s*<\/div>/, newHeader);

// 2. Add Bottom Tab Bar before </body>
const tabBar = `
    <!-- Bottom Tab Bar -->
    <nav class="tab-bar">
        <button class="tab-item active" data-page="recordPage" onclick="switchPage('recordPage')">
            <span class="tab-icon">✏️</span>
            <span class="tab-label">記錄</span>
        </button>
        <button class="tab-item" data-page="searchPage" onclick="switchPage('searchPage')">
            <span class="tab-icon">🔍</span>
            <span class="tab-label">管理</span>
        </button>
        <button class="tab-item" data-page="examPage" onclick="switchPage('examPage')">
            <span class="tab-icon">📖</span>
            <span class="tab-label">大考</span>
        </button>
        <button class="tab-item" data-page="historyPage" onclick="switchPage('historyPage')">
            <span class="tab-icon">📋</span>
            <span class="tab-label">歷史</span>
        </button>
    </nav>
`;
html = html.replace('</body>', tabBar + '\n</body>');

// 3. Add CSS before </style>
const tabCss = `
    /* Bottom Tab Bar */
    .tab-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: calc(65px + env(safe-area-inset-bottom, 0px));
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-top: 1px solid rgba(16, 185, 129, 0.1);
      display: flex;
      justify-content: space-around;
      padding-bottom: env(safe-area-inset-bottom, 0px);
      z-index: 1000;
      margin: 0;
    }
    .tab-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: none;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      transition: all 0.2s;
      padding: 8px 0;
    }
    .tab-item.active {
      color: #10b981;
    }
    .tab-icon {
      font-size: 22px;
      margin-bottom: 2px;
      transition: transform 0.2s;
    }
    .tab-item.active .tab-icon {
      transform: scale(1.15);
    }
    .tab-label {
      font-size: 10px;
      font-weight: 800;
    }
    body {
      padding-bottom: calc(85px + env(safe-area-inset-bottom, 0px));
    }
`;
html = html.replace('</style>', tabCss + '\n  </style>');

// 4. Update switchPage logic
const newSwitchPage = `function switchPage(pageId) {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      const activePage = document.getElementById(pageId);
      if(activePage) activePage.classList.add('active');
      
      const tabMap = {
        'recordPage': { icon: '✏️', title: '記錄單字' },
        'searchPage': { icon: '🔍', title: '搜尋與管理' },
        'examPage': { icon: '🎯', title: '大考中心詞彙' },
        'historyPage': { icon: '📋', title: '學習記錄' }
      };
      
      if(tabMap[pageId]) {
         const iconEl = document.getElementById('topHeaderIcon');
         const titleEl = document.getElementById('topHeaderTitle');
         if(iconEl) iconEl.textContent = tabMap[pageId].icon;
         if(titleEl) titleEl.textContent = tabMap[pageId].title;
      }
      
      document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
      const activeTab = document.querySelector(\`.tab-item[data-page="\${pageId}"]\`);
      if (activeTab) activeTab.classList.add('active');
      window.scrollTo(0, 0);
      
      // Auto toggle nav visibility off (mock)
      const navMenu = document.getElementById('navDropdown');
      if (navMenu) {
        navMenu.classList.remove('show');
      }
    }`;
html = html.replace(/function switchPage\(pageId.*?\}[\s\S]*?\}/, newSwitchPage);


// 5. Add Firebase SDKs before the first script tag that defines `apiUrl` or `function apiUrl`
// Actually just replace `<script>` at the end of body.
const fbSdks = `
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js"></script>
  <script src="https://www.gstatic.com/firebasejs/10.9.0/firebase-firestore-compat.js"></script>
  <script>
`;
html = html.replace(/<script>/, fbSdks);

// 6. Rewrite API functions to Firebase Action
const firebase_api_logic = `
    // --- Firebase API Logic ---
    const firebaseConfig = {
      apiKey: localStorage.getItem('gsat_gemini_key') || "mock_key",
      authDomain: "gsat-pro.firebaseapp.com",
      projectId: "gsat-pro",
      storageBucket: "gsat-pro.appspot.com",
      messagingSenderId: "288124052978",
      appId: "1:288124052978:web:b1d5e67a68e83344b5a228",
      measurementId: "G-F7WBN6WYZB"
    };
    if (!firebase.apps.length) {
       firebase.initializeApp(firebaseConfig);
    }
    const db = firebase.firestore();

    async function apiGet(action, params = {}) {
      if (action === 'ping') return { success: true };
      try {
        if (action === 'getRecentRecords') {
          const snap = await db.collection('vocab').orderBy('serialNumber', 'desc').limit(50).get();
          return { success: true, records: snap.docs.map(d => d.data()) };
        }
        if (action === 'searchRecords') {
          const snap = await db.collection('vocab').get();
          let res = snap.docs.map(d => d.data()).filter(d => 
             (d.word && d.word.toLowerCase().includes(params.keyword.toLowerCase())) || 
             (d.chinese && d.chinese.includes(params.keyword))
          );
          return { success: true, records: res };
        }
        if (action === 'getWordsByLevel') {
          const snap = await db.collection('vocab').where('level', '==', params.level.toString()).get();
          return { success: true, records: snap.docs.map(d => d.data()) };
        }
      } catch(e) { console.error('Firebase GET error', e); return { success: false, error: e.message }; }
      return { success: false, error: 'Unknown action' };
    }

    async function apiPost(action, data = {}) {
      try {
        if (action === 'addRecord') {
          data.serialNumber = Date.now();
          data.date = new Date().toLocaleDateString('zh-TW');
          await db.collection('vocab').doc(data.serialNumber.toString()).set(data);
          return { success: true, record: data };
        }
        if (action === 'updateRecord') {
          await db.collection('vocab').doc(data.serialNumber.toString()).update(data);
          return { success: true };
        }
        if (action === 'deleteRecord') {
          await db.collection('vocab').doc(data.serialNumber.toString()).delete();
          return { success: true };
        }
        if (action === 'shareRecord') {
           await db.collection('vocab').doc(data.serialNumber.toString()).update({ shared: true });
           return { success: true };
        }
      } catch(e) { console.error('Firebase POST error', e); return { success: false, error: e.message }; }
      return { success: false, error: 'Unknown action' };
    }
`;

// Replace existing apiGet
html = html.replace(/async function apiGet\(action, params = \{\}\) \{[\s\S]*?return apiResult \|\| \{ success: false, error: 'API 請求失敗' \};\s*\}/, firebase_api_logic);

// Remove existing apiPost
html = html.replace(/async function apiPost\(action, data = \{\}\) \{[\s\S]*?return apiResult \|\| \{ success: false, error: 'API 請求失敗' \};\s*\}/, '');

writeFileSync('public/teacher_vocab.html', html, 'utf8');
console.log('✅ JS rewrite successful!');
