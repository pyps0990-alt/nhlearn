import React, { useState } from 'react';
import {
  Sparkles, LayoutDashboard, Library, Notebook, BookOpen,
  Bike, Store, BrainCircuit, Settings, ChevronRight, MessageSquare,
  Bell, Cloud, Globe, Navigation, Calendar, Key, LayoutTemplate
} from 'lucide-react';

const TutorialTab = ({ onOpenFeedback, campusName }) => {
  const [openSection, setOpenSection] = useState(null);

  const sections = [
    {
      title: '🚀 快速開始',
      icon: Sparkles,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      content: [
        { q: '第一次啟動要做什麼？', a: '1. 允許通知 ➜ 掌握課表與重要提醒\n2. 連結 Google ➜ 啟用跨裝置雲端備份\n3. 綁定 Gemini API Key ➜ 解鎖強大的 AI 學習輔助\n4. 前往「設定」自訂你的專屬首頁！' },
        { q: '需要帳號才能使用嗎？', a: '不需要！若選擇訪客模式，所有資料（課表、聯絡簿、筆記）皆會安全地儲存於您的本機設備中。登入 Google 僅是為了讓資料能備份上雲端。' },
        { q: '如何獲得最佳體驗？', a: '強烈建議在 iOS / Android 瀏覽器中點擊「加入主畫面」，讓 GSAT Pro 成為全螢幕且能穩定接收通知的沉浸式 App！' }
      ]
    },
    {
      title: '🎨 首頁與排版自訂',
      icon: LayoutTemplate,
      color: 'text-pink-500',
      bg: 'bg-pink-50',
      content: [
        { q: '如何改變首頁卡片的順序？', a: '前往「設定 ➜ 一般與外觀 ➜ 首頁排版設定」，你可以直接拖曳 (或使用上下按鈕) 來改變番茄鐘、課表、外部連結等區塊的順序，甚至能隱藏不需要的模組。' },
        { q: '如何新增自訂倒數計時？', a: '同樣在「設定 ➜ 一般與外觀」，找到「自定義倒數設置」，即可新增你的專屬目標（如：畢業典禮、模擬考），並可自由切換卡片的漸層、極簡或霓虹風格。' }
      ]
    },
    {
      title: '📅 課表排程',
      icon: Calendar,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      content: [
        { q: '如何查看與編輯課表？', a: '首頁課表區塊提供「今日時間軸」與「一週網格」兩種檢視模式。點擊「編輯」即可自訂卡片顏色、設定外部上課連結，或標記調課狀態。' },
        { q: 'AI 自動解析課表是什麼？', a: '進入編輯模式後，點選「上傳課表照片」，AI 就會幫你把整張圖轉成數位課表，自動填入課程名稱、時間與地點，免去手動輸入的麻煩！' },
        { q: '個人課表與班級課表有何不同？', a: '若您在設定中「未輸入」班級代碼，課表將屬於您的「本機自訂課表」；若輸入了班級代碼，則會與班上同學同步共享雲端課表，所有調課資訊將即時推播。' }
      ]
    },
    {
      title: '📖 單字特訓',
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      content: [
        { q: '單字特訓有什麼功能？', a: '📚 單字庫檢視 / 🧠 記憶曲線(SRS)今日複習 / 🏆 多元測驗模式 (選擇、拼寫、AI文法) / 📸 AI 考卷掃描匯入。' },
        { q: 'AI 自動填入如何使用？', a: '手動新增單字時，只需輸入英文，點擊旁邊的「✨ AI 填入」，系統會自動幫您補齊最精準的中文解釋與詞性。' },
        { q: '測驗模式怎麼玩？', a: '選擇題考驗字義反應，拼寫題強化肌肉記憶。如果您有綁定 AI 金鑰，還能讓系統根據您的單字，即時生成帶有詳解的「學測級英文文法題」！' },
        {
          q: '有專屬的單字庫可以參考嗎？',
          a: `當然有！系統已經將「${campusName || '校園'}專屬 6000 核心單字」以及「教師推薦」無縫同步至雲端單字庫。您不再需要複製貼上，只需在單字庫中切換分類，就能一鍵將不熟的單字加入「個人收藏」，並搭配 AI 測驗與記憶曲線進行每日特訓！`
        }
      ]
    },
    {
      title: '📓 電子聯絡簿',
      icon: Notebook,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      content: [
        { q: '聯絡簿能與課表連動嗎？', a: '會的！只要您記錄了當日的作業與考試，除了會顯示在首頁的「明日準備事項」中，也會自動吸附在「一週網格課表」對應的日期卡片下方。' },
        { q: '不想打字怎麼辦？', a: '聯絡簿支援「AI 圖片導入」。直接拍下黑板上的聯絡簿，AI 會自動為您萃取科目、作業及考試內容，並分門別類填入表單！' }
      ]
    },
    {
      title: '📝 知識筆記',
      icon: Library,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      content: [
        { q: '筆記可以怎麼分類？', a: '您可以自由新增科目，並為每個科目挑選專屬的「Emoji 圖示」與「顏色標籤」。筆記內容支援錯題本與課堂筆記等標籤。' },
        { q: 'AI 出題怎麼用？', a: '進入某科目後，點選右上角「✨ AI 出題」按鈕，系統會詳讀該科目下的所有筆記，為您客製化生成帶有詳解的選擇題測驗。' }
      ]
    },
    {
      title: '🏪 特約商店',
      icon: Store,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      content: [
        { q: '特約商店是什麼？', a: '尋找校園周邊合作的優質店家。結帳時出示學生證與系統畫面，即可享有 GSAT Pro 統整的獨家折扣與外送優惠，並支援一鍵地圖導航。' }
      ]
    },
    {
      title: '🚲 YouBike',
      icon: Bike,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      content: [
        { q: 'YouBike 資料會自動更新嗎？', a: '會的！資料來源為台北市政府開放資料，不僅每 30 秒自動更新，還會精準計算與您的即時距離。' },
        { q: '如何快速找到想要的車？', a: '您可以使用上方的過濾器篩選「⚡ 電動」或「🚲 一般」車型，並利用排序按鈕依照「距離最近」、「可借最多」或「可還最多」來調整站點順序！' }
      ]
    },
    {
      title: '🤖 AI 功能設定',
      icon: BrainCircuit,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      content: [
        { q: '如何取得 Gemini API Key？', a: '前往 aistudio.google.com/app/apikey，用 Google 帳號登入後免費建立 API Key。每月有大量免費額度，一般使用完全夠用。' },
        { q: 'AI 金鑰安全嗎？', a: '絕對安全。API Key 僅存在您的瀏覽器本地端 (LocalStorage) 中，所有的 AI 請求都是由您的裝置直接發送給 Google 伺服器，我們不會經過任何中間層竊取您的金鑰。' }
      ]
    },
    {
      title: '🔔 通知與提醒',
      icon: Bell,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      content: [
        { q: '如何接收班級調課通知？', a: '在設定中允許通知，並綁定您的班級代碼。當班級課表發生「調課」或「重要公告」時，Firebase 會即時將通知推送至您的裝置。' },
        { q: 'iOS 為什麼收不到通知？', a: 'iOS 系統限制較嚴格，必須先將網頁「加入主畫面」（Safari ➜ 分享 ➜ 加入主畫面），並從主畫面啟動 App 後，才能順利授權並接收推播。' }
      ]
    }
  ];

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade pb-12">
      {/* Header */}
      <div className="px-1 mb-2">
        <h2 className="text-2xl font-black text-amber-500 flex items-center gap-3">
          <Sparkles size={28} className="shrink-0 neon-glow-amber" /> 使用指南
        </h2>
        <p className="text-[13px] font-bold text-slate-500 dark:text-gray-400 mt-1 ml-9">常見問題與功能完整說明</p>
      </div>

      {/* Gemini API Link */}
      <a
        href="https://aistudio.google.com/app/apikey"
        target="_blank"
        rel="noreferrer"
        className="flex items-center gap-4 bg-gradient-to-r from-purple-600 to-indigo-600 p-5 rounded-[28px] text-white shadow-md active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
          <Key size={24} className="shrink-0" />
        </div>
        <div>
          <div className="font-black text-[16px]">取得 Gemini API Key</div>
          <div className="text-[12px] font-bold opacity-80">免費取得 · 解鎖所有 AI 功能</div>
        </div>
        <ChevronRight size={20} className="ml-auto opacity-70 shrink-0" />
      </a>

      {/* FAQ Accordion */}
      {sections.map((sec, idx) => (
        <div key={idx} className="bg-[var(--bg-surface)] rounded-[28px] border border-[var(--border-color)] shadow-soft overflow-hidden glass-effect">
          <button
            onClick={() => setOpenSection(openSection === idx ? null : idx)}
            className="w-full flex justify-between items-center p-5 active:bg-slate-50 dark:active:bg-white/5 transition-colors group"
          >
            <div className="flex items-center gap-3.5">
              <div className={`w-10 h-10 ${sec.bg} dark:bg-opacity-10 rounded-2xl flex items-center justify-center shrink-0 border border-transparent dark:border-[var(--border-color)]`}>
                <sec.icon size={20} className={`${sec.color} shrink-0`} />
              </div>
              <span className="font-black text-[var(--text-primary)] text-[15px] group-hover:translate-x-1 transition-transform">{sec.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, '')}</span>
            </div>
            <ChevronRight size={18} className={`text-slate-300 transition-transform duration-300 shrink-0 ${openSection === idx ? 'rotate-90 text-emerald-500' : 'group-hover:translate-x-1'}`} />
          </button>
          {openSection === idx && (
            <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-color)] pt-4 animate-fadeIn bg-slate-50/5">
              {sec.content.map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="text-[13px] font-black text-slate-500 flex items-start gap-2">
                    <span className="text-emerald-500 mt-0.5 shrink-0">Q</span>
                    {item.q}
                  </div>
                  <div className="text-[14px] font-bold text-slate-700 dark:text-gray-300 whitespace-pre-line bg-white/50 dark:bg-black/20 p-3.5 rounded-2xl leading-relaxed border border-slate-100 dark:border-white/5">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Feedback */}
      <div className="bg-emerald-600 p-6 rounded-[28px] text-white shadow-lg shadow-emerald-500/20 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        <h3 className="font-black text-[16px] flex items-center gap-2 mb-2 relative z-10">
          <MessageSquare size={18} className="shrink-0" /> 還有問題？
        </h3>
        <p className="text-[13px] font-bold opacity-90 mb-4 relative z-10">歡迎填寫回饋表單，幫助我們改進 GSAT Pro！</p>
        <button
          onClick={onOpenFeedback}
          className="w-full py-3.5 bg-white text-emerald-600 rounded-2xl font-black text-[14px] active:scale-95 transition-all shadow-sm hover:shadow-float relative z-10"
        >
          回饋問題 / 功能請求
        </button>
      </div>
    </div>
  );
};

export default TutorialTab;