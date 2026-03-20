import React from 'react';
import {
  Sparkles, Library, Notebook, BookOpen, Bike, BrainCircuit,
  MessageSquare, Cloud, Calendar, LayoutTemplate, Smartphone,
  TrendingUp, GraduationCap, ArrowRight
} from 'lucide-react';

const TutorialTab = ({ onOpenFeedback, campusName }) => {
  const guides = [
    {
      title: '新手入門與安裝',
      icon: Smartphone,
      color: 'from-blue-500 to-cyan-500',
      shadow: 'shadow-blue-500/20',
      items: [
        { 
          label: '安裝 App 取得最佳體驗', 
          desc: '在 Safari 點擊「分享 ➜ 加入主畫面」，即可獲得全螢幕且穩定的通知體驗。',
          media: 'https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODFjNWExZTBkZThkZDUxMTEyYzc3YzQ3Y2ZhYWE4Y2JmZTk4MzZlNiZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/3o7TKsQ8gqj8r3qjYc/giphy.gif' // 🌟 這裡可以隨時替換為您自己錄製的真實教學 GIF
        },
        { label: '訪客與雲端', desc: '訪客模式資料安全存在本機；登入 Google 帳號則可自動開啟跨裝置備份。' }
      ]
    },
    {
      title: 'AI 智慧引擎',
      icon: BrainCircuit,
      color: 'from-purple-500 to-indigo-500',
      shadow: 'shadow-purple-500/20',
      items: [
        { label: '錯題本解析', desc: '在知識筆記上傳錯題照片，AI 將自動為您解析考點、詳細解法與常見陷阱。' },
        { label: '智能出題', desc: '單字庫與筆記區皆支援 AI 出題，自動根據您的資料生成專屬選擇題與拼寫測驗。' }
      ]
    },
    {
      title: '學習排程與課表',
      icon: Calendar,
      color: 'from-emerald-500 to-teal-500',
      shadow: 'shadow-emerald-500/20',
      items: [
        { label: '多校雲端同步', desc: '前往設定選擇學校與班級代碼，即可與全班同學共享雲端課表。' },
        { label: '快速調課', desc: '首頁課表區塊點擊「快速調課」，可一鍵將課程標記為自習，或輸入代課老師名稱。' }
      ]
    },
    {
      title: '單字與聯絡簿',
      icon: BookOpen,
      color: 'from-orange-500 to-amber-500',
      shadow: 'shadow-orange-500/20',
      items: [
        { label: '大腦記憶法', desc: '點擊單字庫卡片，AI 會為您生成諧音與字根字首的深度語源解析。' },
        { label: '電子聯絡簿', desc: '支援相機掃描黑板聯絡簿，自動擷取考試與作業，並於考前一晚推播提醒。' }
      ]
    },
    {
      title: '數據與擴充模組',
      icon: TrendingUp,
      color: 'from-pink-500 to-rose-500',
      shadow: 'shadow-pink-500/20',
      items: [
        { label: '成績與學分', desc: '視覺化的折線圖掌握成績趨勢，並可追蹤畢業學分達成進度。' },
        { label: 'YouBike 導覽', desc: '可於設定中一鍵開啟交通導覽功能，隨時追蹤校園周邊單車租借動態。' }
      ]
    },
    {
      title: '首頁排版自訂',
      icon: LayoutTemplate,
      color: 'from-slate-600 to-slate-800',
      shadow: 'shadow-slate-500/20',
      items: [
        { label: '拖曳排版', desc: '前往設定的「首頁排版設定」，可自由隱藏或上下拖曳番茄鐘、熱力圖等模組。' },
        { label: '自訂倒數', desc: '新增畢業典禮或大考倒數，並支援極簡、霓虹、櫻花等多種卡片主題。' }
      ]
    }
  ];

  return (
    <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade pb-12">
      {/* 🚀 Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[40px] p-8 md:p-10 text-white shadow-lg shadow-emerald-500/20 border border-white/20">
        <div className="relative z-10">
          <h2 className="text-[28px] md:text-[36px] font-black tracking-tight leading-tight mb-2">
            歡迎來到 GSAT Pro
          </h2>
          <p className="text-emerald-100 font-bold text-[14px] md:text-[16px] max-w-lg leading-relaxed">
            全台灣高中生專屬的新世代學習引擎。整合了雲端課表、AI 錯題解析與記憶單字庫，幫助您精準掌握學習節奏。
          </p>
        </div>
        <Sparkles className="absolute -right-6 -bottom-6 w-40 h-40 text-white opacity-10 rotate-12" />
      </div>

      {/* 🧩 Grid Layout for Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 px-1">
        {guides.map((guide, idx) => (
          <div key={idx} className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:-translate-y-1 transition-transform duration-500 flex flex-col h-full group">
            <div className="flex items-center gap-3 mb-5">
              <div className={`w-12 h-12 rounded-[20px] bg-gradient-to-br ${guide.color} shadow-lg ${guide.shadow} flex items-center justify-center text-white shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                <guide.icon size={22} />
              </div>
              <h3 className="text-[17px] font-black text-slate-800 dark:text-white">{guide.title}</h3>
            </div>
            <div className="flex-1 space-y-4">
              {guide.items.map((item, i) => (
                <div key={i} className="bg-white/60 dark:bg-black/20 p-4 rounded-[20px] border border-slate-100/50 dark:border-white/5">
                  <div className="text-[13px] font-black text-[var(--text-primary)] mb-1 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> {item.label}
                  </div>
                  <p className="text-[12px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed pl-3 border-l-2 border-slate-200 dark:border-slate-700 ml-0.5">
                    {item.desc}
                  </p>
                  {item.media && (
                    <div className="mt-4 ml-3 rounded-[16px] overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm relative group/media">
                      <img src={item.media} alt={item.label} className="w-full h-auto object-cover max-h-[160px] sm:max-h-[200px] group-hover/media:scale-105 transition-transform duration-700 ease-out" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-black dark:to-zinc-900 p-8 rounded-[36px] text-white shadow-2xl relative overflow-hidden group mx-1">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-[1500ms] ease-[cubic-bezier(0.23,1,0.32,1)]"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="font-black text-[20px] flex items-center gap-2 mb-2">
              <MessageSquare size={20} className="text-emerald-400" /> 還有未解的疑惑？
            </h3>
            <p className="text-[13px] font-bold text-slate-300">無論是遇到 Bug、想許願新功能，或單純想給開發團隊鼓勵，都歡迎告訴我們！</p>
          </div>
          <button
            onClick={onOpenFeedback}
            className="w-full md:w-auto shrink-0 px-8 py-4 bg-emerald-500 text-white rounded-[20px] font-black text-[14px] active:scale-95 transition-transform shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
          >
            回饋問題 / 功能請求
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default TutorialTab;