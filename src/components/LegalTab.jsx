import React, { useState } from 'react';
import { ShieldCheck, FileText, ChevronLeft, Scale, Lock, Globe, Eye } from 'lucide-react';

const LegalTab = ({ onBack }) => {
  const [view, setView] = useState('menu'); // 'menu', 'privacy', 'terms'

  const lastUpdated = "2024年3月8日";

  const renderPrivacy = () => (
    <div className="space-y-6 animate-slide-up-fade">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
          <Eye size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">隱私權政策</h3>
          <p className="text-[12px] font-bold text-gray-400">最後更新：{lastUpdated}</p>
        </div>
      </div>

      <div className="space-y-4 text-[14px] text-gray-600 leading-relaxed font-bold">
        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            1. 資料收集與使用
          </h4>
          <p>GSAT Pro (以下簡稱「本程式」) 收集以下資料以提供核心功能：</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li><span className="text-emerald-600">Google 帳戶資訊：</span> 當您連接 Google 時，我們會讀取您的名稱、電子郵件及大頭貼，僅用於顯示個人化介面及驗證管理員權限。</li>
            <li><span className="text-emerald-600">Google Drive 權限：</span> 若您啟用雲端備份，本程式會在您的雲端硬碟建立專屬資料夾，用於備份筆記與設定。我們不會讀取您硬碟中非本程式建立的其他檔案。</li>
            <li><span className="text-emerald-600">本地儲存 (LocalStorage)：</span> 您的課表、聯絡簿及單字紀錄預設存於您的瀏覽器中。</li>
          </ul>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            2. 裝置權限說明
          </h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-emerald-600">定位權限：</span> 僅用於計算「附近 YouBike 站點」的距離，定位點不會被上傳至任何伺服器。</li>
            <li><span className="text-emerald-600">通知權限：</span> 用於發送上課前 5 分鐘提醒、作業催繳及考試預告。</li>
          </ul>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            3. 第三方服務與 AI
          </h4>
          <p>當您使用「AI 單字分析」或「智慧課表解析」時，您輸入的文字/圖片會傳送至 <span className="text-purple-600">Google Gemini API</span> 處理。我們建議不要在 AI 功能中輸入過於私人的資訊。</p>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-emerald-500 rounded-full"></span>
            4. 資料刪除
          </h4>
          <p>您可以隨時於設定中清除本地資料。若需刪除雲端備份，請至您的 Google Drive 刪除本程式相關資料夾。</p>
        </section>
      </div>
    </div>
  );

  const renderTerms = () => (
    <div className="space-y-6 animate-slide-up-fade">
      <div className="flex items-center gap-4 mb-2">
        <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600">
          <Scale size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-900">服務條款</h3>
          <p className="text-[12px] font-bold text-gray-400">最後更新：{lastUpdated}</p>
        </div>
      </div>

      <div className="space-y-4 text-[14px] text-gray-600 leading-relaxed font-bold">
        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            1. 服務宗旨
          </h4>
          <p>GSAT Pro 旨在協助學生更有效地管理學習生活。本程式由開發者個人維護，並非學校官方強制軟體。</p>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            2. 使用限制
          </h4>
          <p>使用者不得利用本程式進行任何違法活動、惡意破解伺服器或干擾其他使用者。若發現有影響系統穩定之行為，管理員有權限制該帳號存取權限。</p>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            3. 免責聲明
          </h4>
          <ul className="list-disc pl-5 space-y-2">
            <li><span className="text-blue-600">AI 準確性：</span> AI 生成的單字定義及例句僅供參考，請務必搭配權威辭典服用。</li>
            <li><span className="text-blue-600">資料遺失：</span> 雖有備份功能，但不保證 100% 資料安全。重要資料建議進行額外外部存檔。</li>
            <li><span className="text-blue-600">服務中斷：</span> 因 API 額度限制或維護導致的短暫停用，開發團隊不負賠償責任。</li>
          </ul>
        </section>

        <section>
          <h4 className="text-gray-950 font-black flex items-center gap-2 mb-2">
            <span className="w-1.5 h-4 bg-blue-500 rounded-full"></span>
            4. 條款修改
          </h4>
          <p>本團隊保留隨時修改本條款之權利，修改後將於程式內部公告。繼續使用本服務即代表您同意最新版條款。</p>
        </section>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 flex flex-col w-full text-left mb-8">
      {/* 頂部導航 */}
      <div className="flex items-center gap-4">
        {view !== 'menu' && (
          <button 
            onClick={() => setView('menu')}
            className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 active:scale-90 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <h2 className="text-2xl font-black text-gray-900">
          {view === 'menu' ? '法律資訊與服務' : view === 'privacy' ? '隱私保護' : '使用規範'}
        </h2>
      </div>

      {view === 'menu' ? (
        <div className="grid grid-cols-1 gap-4 animate-slide-up-fade">
          <button 
            onClick={() => setView('privacy')}
            className="group bg-white p-6 rounded-[32px] border border-white/60 shadow-soft hover:shadow-float transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} />
              </div>
              <div>
                <div className="text-[17px] font-black text-gray-900">隱私權政策</div>
                <div className="text-[12px] font-bold text-gray-400">瞭解我們如何保護您的數據</div>
              </div>
            </div>
            <ChevronLeft size={20} className="text-gray-300 rotate-180" />
          </button>

          <button 
            onClick={() => setView('terms')}
            className="group bg-white p-6 rounded-[32px] border border-white/60 shadow-soft hover:shadow-float transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                <FileText size={24} />
              </div>
              <div>
                <div className="text-[17px] font-black text-gray-900">服務條款</div>
                <div className="text-[12px] font-bold text-gray-400">使用 GSAT Pro 的權利與義務</div>
              </div>
            </div>
            <ChevronLeft size={20} className="text-gray-300 rotate-180" />
          </button>

          <div className="bg-gray-50/80 p-6 rounded-[32px] border border-gray-100 mt-4">
            <h4 className="text-[14px] font-black text-gray-800 mb-2 flex items-center gap-2">
              <Globe size={16} className="text-gray-400" /> 資料合規性
            </h4>
            <p className="text-[12px] font-bold text-gray-500 leading-relaxed">
              本程式嚴格遵守 Google API 使用者數據政策，所有機敏權限皆經過明確告知與授權。我們致力於打造一個安全、透明的學習環境。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-8 rounded-[36px] border border-white/60 shadow-soft max-h-[70vh] overflow-y-auto scrollbar-hide">
          {view === 'privacy' ? renderPrivacy() : renderTerms()}
        </div>
      )}
    </div>
  );
};

export default LegalTab;
