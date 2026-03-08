
import sys

file_path = r'c:\Users\陳奕嘉\Desktop\學測工具\gsat-pro\src\App.jsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 1 is index 0
# We want to KEEP lines 1 to 2645 (indices 0 to 2644)
# We want to REPLACE lines 2646 to 2801 (indices 2645 to 2800)
# We want to KEEP from line 2802 onwards (indices 2801 to end)

clean_tutorial = """

// ================= 教學分頁 (TutorialTab) =================
const TutorialTab = () => {
  const sections = [
    {
      title: '🌟 快速開始',
      icon: 'Sparkles',
      color: 'text-amber-500',
      content: [
        { q: '第一次使用要注意什麼？', a: '請務必開啟「定位」與「通知」權限。定位能幫您找 YouBike，通知則會提醒您重要作業與課程。' },
        { q: '為什麼要登入 Google？', a: '登入後，您的筆記與設定會備份在雲端 Drive，換手機也不怕資料不見！' }
      ]
    },
    {
      title: '📖 單字特訓 (學習指南)',
      icon: 'BookOpen',
      color: 'text-emerald-500',
      content: [
        { q: '如何挑選適合的單字？', a: '點擊左上方的分級（Level 1-6），系統會自動載入該等級的常用單字。' },
        { q: '我想收藏單字怎麼做？', a: '點擊單字旁的「⭐ 星號」即可收藏，收藏後的單字會出現在「個人收藏」分頁中方便複習。' },
        { q: 'AI 查字功能怎麼用？', a: '在搜尋框輸入單字，點擊「AI 查字」，系統會解析其詳細用法、例句與同義字。' },
        { q: '在哪裡看學習紀錄？', a: '「歷史紀錄」會保存您所有查過的字與 AI 解析，您可以隨時點開舊紀錄重新朗讀。' }
      ]
    },
    {
      title: '📅 課表與日常',
      icon: 'LayoutDashboard',
      color: 'text-indigo-500',
      content: [
        { q: '主畫面有哪些內容？', a: '主畫面會顯示今日課表、倒數計時、明天作業提醒，以及學校官網的最新公告。' },
        { q: '如何修改我的課表？', a: '點擊右上角「⚙️ 設定」 -> 「系統設定與管理」，在此可輸入您的學校班級與自定義課表。' }
      ]
    },
    {
      title: '✍️ 知識筆記與 AI',
      icon: 'Library',
      color: 'text-blue-500',
      content: [
        { q: '如何快速整理重點？', a: '您可以上傳筆記照片。點擊「AI 摘要」，系統會自動將文字或照片內容整理成條列重點。' },
        { q: 'AI 隨堂測驗是什麼？', a: '系統會根據您的筆記內容，自動生成 3 題選擇題，幫您檢測是否已經掌握該科重點。' }
      ]
    },
    {
      title: '📝 電子聯絡簿',
      icon: 'Notebook',
      color: 'text-purple-500',
      content: [
        { q: '作業與考試紀錄', a: '點擊「+」新增紀錄。設定「截止日期」後，系統會在首頁根據剩餘天數自動提醒您。' }
      ]
    },
    {
      title: '🚲 交通與特約商店',
      icon: 'Bike',
      color: 'text-orange-500',
      content: [
        { q: 'YouBike 查询', a: '系統會自動搜尋附近站點。綠色是 2.0 車，橙色是電輔車。點擊「導航」即可規劃路線。' },
        { q: '特約商店優惠', a: '瀏覽所有合作商家清單。點擊卡片可查看專屬優惠內容，並提供一鍵地圖導航。' }
      ]
    }
  ];

  return (
    <div className="space-y-6 animate-slide-up-fade text-left max-w-2xl mx-auto pb-12 px-4 shadow-sm">
      <div className="text-center space-y-2 mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">新手使用指南</h2>
        <p className="text-gray-500 font-bold">簡單、直覺、為考生打造的 GSAT Pro</p>
      </div>

      <div className="space-y-5">
        {sections.map((sec, idx) => (
          <div key={idx} className="bg-white/80 backdrop-blur-2xl p-6 rounded-[36px] border border-white/60 shadow-soft hover:shadow-float transition-all duration-500">
            <div className="flex items-center gap-4 mb-6">
              <div className={`p-4 rounded-2xl bg-gray-50 ${sec.color}`}>
                {/* 這裡是 icon 元件渲染 */}
                <span className="text-2xl">{sec.title.split(' ')[0]}</span>
              </div>
              <h3 className="text-xl font-black text-gray-900">{sec.title}</h3>
            </div>
            
            <div className="space-y-6 text-left">
              {sec.content.map((item, i) => (
                <div key={i} className="space-y-2 group">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 shrink-0"></div>
                    <div className="text-[16px] font-black text-gray-800 leading-tight">{item.q}</div>
                  </div>
                  <div className="text-[14px] text-gray-500 font-bold leading-relaxed ml-4.5 pl-4 border-l-2 border-emerald-50 py-1 group-last:border-transparent">
                    {item.a}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-emerald-600 p-8 rounded-[40px] text-white space-y-4 shadow-xl shadow-emerald-600/20 relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
        <h3 className="text-xl font-black flex items-center gap-2 relative z-10">
          <MessageSquare size={24} /> 還有疑問嗎？
        </h3>
        <p className="text-emerald-50 font-bold text-sm leading-relaxed relative z-10">
          如果您對功能有任何想法，或需要技術支援，請點選「聯繫官方」。祝您學測順利、金榜題名！
        </p>
        <button className="bg-white text-emerald-700 font-black px-10 py-3.5 rounded-2xl active:scale-95 transition-all shadow-lg text-sm relative z-10">
          聯繫官方支援
        </button>
      </div>
    </div>
  );
};
"""

# 注意: clean_tutorial 裡面的 icon 部分我改成了 emoji 處理以簡化
new_lines = lines[0:2645] + [clean_tutorial] + lines[2801:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Successfully cleaned App.jsx")
