import React, { useState } from 'react';
import {
  Sparkles, LayoutDashboard, Library, Notebook, BookOpen,
  Bike, Store, BrainCircuit, Settings, ChevronRight, MessageSquare,
  Bell, Cloud, Globe, Navigation, Calendar, Key
} from 'lucide-react';

const TutorialTab = ({ onOpenFeedback }) => {
  const [openSection, setOpenSection] = useState(null);

  const sections = [
    {
      title: '🚀 快速開始',
      icon: Sparkles,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      content: [
        { q: '第一次啟動要做什麼？', a: '1. 點選「允許通知」➜ 授權推播提醒\n2. 點選「連結 Google」➜ 啟用雲端備份\n3. 在設定綁定 Gemini API Key ➜ 解鎖 AI 功能\n4. 開始使用！' },
        { q: '需要帳號才能使用嗎？', a: '不需要！大部分功能（課表、聯絡簿、筆記）皆可離線使用，只有雲端備份和部分 AI 功能需要登入 Google。' },
        { q: '支援哪些裝置？', a: '支援所有現代瀏覽器，強烈建議在 iOS/Android 上加到主畫面以獲得最佳體驗（可接收推播通知）。' }
      ]
    },
    {
      title: '📅 課表排程',
      icon: Calendar,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      content: [
        { q: '如何編輯課表？', a: '首頁 ➜ 課表卡片右側點「編輯」按鈕，可以手動新增／修改／刪除每天的課程。' },
        { q: 'AI 自動解析課表是什麼？', a: '進入編輯模式後，點選「上傳課表照片」，AI 會自動從照片中辨識課程名稱、時間、地點，一鍵匯入！' },
        { q: '課表資料儲存在哪裡？', a: '儲存在瀏覽器的 localStorage，不會上傳至伺服器。清除瀏覽器資料會導致課表遺失，建議連結 Google 備份。' }
      ]
    },
    {
      title: '📖 單字特訓',
      icon: BookOpen,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      content: [
        { q: '單字特訓有什麼功能？', a: '✏️ 記錄單字 / 💡 AI 自動填入詞性與中文意思 / 📝 大考模式查看考試重點 / 🧠 AI 出克漏字與閱讀測驗' },
        { q: 'AI 自動填入如何使用？', a: '輸入英文單字後，點選旁邊的「✨」按鈕，AI 會自動填入中文意思、詞性和建議的學測級別。' },
        { q: '如何同步設定的 API Key？', a: '在設定頁輸入 Gemini API Key 後，返回單字頁面時 AI 功能即會自動使用該 Key。' },
        {
          q: '有專屬的單字庫可以參考嗎？',
          a: (
            <>
              當然有！我們為您準備了「內中專屬 6000 單字表」。您可以點擊下方連結前往 Notion，在裡面挑選自己不熟的單字，複製並加入到系統的單字本中，搭配 AI 測驗與大考模式進行每日特訓：<br /><br />
              🔗 <a href="https://stupendous-harpymimus-52c.notion.site/NHSH-6000e-2ef4ca55a08e81f5ba79fc23424fda7e" target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 underline break-all font-black transition-colors">內中 6000 單字表 Notion 連結</a>
            </>
          )
        }
      ]
    },
    {
      title: '📓 電子聯絡簿',
      icon: Notebook,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
      content: [
        { q: '聯絡簿可以記錄什麼？', a: '可以依日期、科目記錄作業內容與考試資訊。首頁會自動顯示「明日準備事項」提醒。' },
        { q: '提醒功能如何運作？', a: '授權推播通知後，系統會在放學時間自動推播明天要交的作業與考試提醒。' }
      ]
    },
    {
      title: '📝 知識筆記',
      icon: Library,
      color: 'text-indigo-500',
      bg: 'bg-indigo-50',
      content: [
        { q: '筆記有哪些功能？', a: '科目分類管理 / 圖片附件上傳 / AI 重點摘要 / AI 隨堂測驗（選擇題）/ Google Drive 雲端備份' },
        { q: 'AI 出題怎麼用？', a: '進入某科目後，點選右上角「AI 出題」按鈕，系統會根據該科目所有筆記出 3 道選擇題。' },
        { q: '如何備份到 Google Drive？', a: '先在設定頁連結 Google 帳號，之後新增筆記時即會自動備份，也可以手動點選筆記卡片上的「☁️」圖示。' }
      ]
    },
    {
      title: '🏪 特約商店',
      icon: Store,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
      content: [
        { q: '特約商店是什麼？', a: '顯示學校附近的特約合作商店，出示學生證可享有專屬折扣優惠。包含外送連結、導航功能。' },
        { q: '商店資料如何新增？', a: '需要管理員權限（輸入密碼）才能在設定頁新增／編輯／刪除商店資料，資料儲存在 Firebase Firestore。' }
      ]
    },
    {
      title: '🚲 YouBike',
      icon: Bike,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      content: [
        { q: 'YouBike 資料準確嗎？', a: '資料來源為台北市政府開放資料（每30秒自動更新），顯示附近內湖高中相關站點的即時可借／可還數量。' },
        { q: '為什麼顯示 0 台？', a: '若所有站點可借數量為 0，表示當前附近站點已無車可借。可以點右上角重新整理按鈕手動更新。' }
      ]
    },
    {
      title: '🤖 AI 功能設定',
      icon: BrainCircuit,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      content: [
        { q: '如何取得 Gemini API Key？', a: '前往 aistudio.google.com/app/apikey，用 Google 帳號登入後免費建立 API Key。每月有大量免費額度，一般使用完全夠用。' },
        { q: 'AI 金鑰安全嗎？', a: 'API Key 只儲存在你的瀏覽器 localStorage，不會傳到任何伺服器。每個請求直接從你的裝置傳給 Google AI。' }
      ]
    },
    {
      title: '🔔 通知與提醒',
      icon: Bell,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      content: [
        { q: '如何開啟課程提醒？', a: '在設定頁點選「授權通知」，允許後即可在課程開始前 5 分鐘接到推播提醒。' },
        { q: 'iOS 無法收到通知？', a: 'iOS 必須先將網頁「加入主畫面」（Safari ➜ 分享 ➜ 加入主畫面），從主畫面圖示開啟後才支援推播。(系統需要 iOS 18.4 以上才支援喔)' }
      ]
    },
    {
      title: '☁️ 雲端備份',
      icon: Cloud,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      content: [
        { q: '哪些資料可以備份？', a: '筆記內容支援 Google Drive 備份。課表、聯絡簿目前存在 localStorage，之後版本會加入備份功能。' },
        { q: '如何查看備份的筆記？', a: '備份的筆記會儲存在 Google Drive 的「GSAT Pro 筆記」資料夾，按科目分類存放為 .txt 檔案。' }
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