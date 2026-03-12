import React, { useState } from 'react';
import { 
  Bell, ShieldCheck, Sparkles, GraduationCap, MapPin, CheckCircle2, 
  ChevronRight, Lock, Globe, MessageSquare, X, Share, PlusSquare, Smartphone
} from 'lucide-react';

export const IosNotification = ({ notification }) => {
  const safeTop = 'max(16px, env(safe-area-inset-top))';
  const topPos = `calc(${safeTop} + 10px)`;

  return (
    <div
      className={`fixed left-0 right-0 z-[160] flex justify-center transition-all duration-[500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none px-4`}
      style={{ top: notification.show ? topPos : '-120px', opacity: notification.show ? 1 : 0, transform: notification.show ? 'scale(1)' : 'scale(0.95)' }}
    >
      <div className="w-full max-w-[360px] bg-[#f8f8f9]/95 backdrop-blur-2xl p-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white/60 flex flex-col gap-1.5 pointer-events-auto transition-transform active:scale-95">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 rounded-[8px] p-1.5 shadow-sm shrink-0"><Bell size={14} className="text-white shrink-0" /></div>
            <span className="text-[12px] font-black text-slate-400 uppercase tracking-wider">GSAT PRO</span>
          </div>
          <span className="text-[12px] font-bold text-slate-400">現在</span>
        </div>
        <div className="px-1 pb-1 mt-0.5">
          <div className="text-[15px] font-black text-gray-950 leading-tight mb-1">{String(notification?.title || '')}</div>
          <div className="text-[13px] font-bold text-gray-600 leading-relaxed whitespace-pre-line">{String(notification?.message || '')}</div>
        </div>
      </div>
    </div>
  );
};

export const PrivacyModal = ({ onAccept, title = "隱私權聲明與使用條款" }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-emerald-950/40 backdrop-blur-md animate-fadeIn text-left">
    <div className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl border border-white/50 overflow-hidden">
      <div className="p-8 pb-4">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/10 rounded-3xl flex items-center justify-center mb-6 shrink-0 border border-transparent dark:border-white/10">
          <ShieldCheck className="text-emerald-600 shrink-0" size={32} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-3">{title}</h2>
        <div className="space-y-3 text-slate-500 font-bold leading-relaxed">
          <p>歡迎使用 GSAT Pro！我們重視您的隱私，特此聲明：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>定位權限僅用於尋找附近的 YouBike 站點。</li>
            <li>通知權限僅用於發送上課提醒與重要通知。</li>
            <li>所有資料僅存於您的裝置或私人 Google Drive。</li>
          </ul>
        </div>
      </div>
      <div className="p-8 pt-4">
        <button onClick={onAccept} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg hover:brightness-110 active:scale-95 transition-all text-lg">我已閱讀並同意</button>
      </div>
    </div>
  </div>
);

export const WelcomeScreen = ({ onFinishWelcome, requestPushPermission, isFirstTime }) => {
  const [grantedLocation, setGrantedLocation] = useState(false);
  const [grantedNotif, setGrantedNotif] = useState(false);
  const [agreed, setAgreed] = useState(false);

  const handleLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(() => setGrantedLocation(true), () => setGrantedLocation(true));
    }
  };

  const handleNotif = async () => {
    await requestPushPermission();
    setGrantedNotif(true);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-fadeIn text-left pt-[env(safe-area-inset-top)]">
      <div className="w-full max-w-sm space-y-6 flex flex-col items-center">
        <div className="w-24 h-24 bg-emerald-500 rounded-[32px] flex items-center justify-center animate-bounce-soft shadow-2xl shrink-0">
          <Sparkles size={48} className="text-white shrink-0 neon-glow-emerald" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-slate-900">歡迎來到 GSAT Pro</h1>
          <p className="text-slate-400 font-bold mt-1">讓我們開始這段學習旅程吧！</p>
        </div>

        <div className="w-full space-y-3 bg-slate-50 p-5 rounded-[28px] border border-slate-100">
          <h3 className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-1 px-1">權限設定</h3>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${grantedLocation ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 border border-slate-100'}`}><MapPin size={20} className="shrink-0" /></div>
            <div className="flex-1 text-[12px] font-black text-slate-800">定位<br/><span className="text-[10px] text-slate-400 font-bold">尋找附近的 YouBike</span></div>
            {!grantedLocation ? <button onClick={handleLocation} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg">開啟</button> : <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${grantedNotif ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-slate-400 border border-slate-100'}`}><Bell size={20} className="shrink-0" /></div>
            <div className="flex-1 text-[12px] font-black text-slate-800">通知<br/><span className="text-[10px] text-slate-400 font-bold">重要日程與提醒</span></div>
            {!grantedNotif ? <button onClick={handleNotif} className="px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg">開啟</button> : <CheckCircle2 size={20} className="text-emerald-500 shrink-0" />}
          </div>
        </div>

        {/* iOS 安裝導引 */}
        <div className="w-full bg-blue-50/50 p-5 rounded-[28px] border border-blue-100/50 space-y-3 animate-slide-up-fade">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone size={16} className="text-blue-600 shrink-0" />
            <h3 className="text-[12px] font-black text-blue-600 uppercase tracking-widest">iOS 安裝建議 (體驗最佳)</h3>
          </div>
          <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
            為了獲得如同 App 的全螢幕體驗與穩定通知：
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm">
              <Share size={16} className="text-blue-500 shrink-0" />
              <span className="text-[10px] font-black text-slate-700">1. 點擊分享</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-blue-100 shadow-sm">
              <PlusSquare size={16} className="text-blue-500 shrink-0" />
              <span className="text-[10px] font-black text-slate-700">2. 加入主畫面</span>
            </div>
          </div>
        </div>

        {isFirstTime && (
          <div className="w-full space-y-3 px-1">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} className="w-5 h-5 rounded-lg border-2 border-gray-200 text-emerald-500 focus:ring-emerald-500" />
              <div className="text-[13px] font-bold text-gray-500 group-hover:text-gray-700 transition-colors">
                我已閱讀並同意 
                <a href="/privacy.html" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-emerald-600 underline mx-1 hover:text-emerald-700">隱私權政策</a> 
                與 
                <a href="/terms.html" target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-emerald-600 underline mx-1 hover:text-emerald-700">服務條款</a>
              </div>
            </label>
          </div>
        )}

        <button 
          onClick={() => { 
            if (isFirstTime && !agreed) return alert('請先勾選同意條款');
            localStorage.setItem('gsat_legal_accepted', 'true');
            onFinishWelcome(); 
          }} 
          className={`w-full font-black py-4.5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3 transition-all ${(!isFirstTime || agreed) ? 'bg-gray-900 text-white scale-100' : 'bg-gray-200 text-gray-400 scale-95 cursor-not-allowed'}`}
        >
          {isFirstTime ? '同意並進入系統' : '開始使用'} <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export const AuthScreen = ({ onLogin, onSkip }) => (
  <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-fadeIn text-left pt-[env(safe-area-inset-top)]">
    <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
      <div className="w-24 h-24 bg-emerald-50 rounded-[32px] flex items-center justify-center shadow-inner mb-2 border border-emerald-100 shrink-0"><Lock className="text-emerald-600 shrink-0" size={40} /></div>
      <div className="text-center">
        <h2 className="text-3xl font-black text-slate-900">需要登入</h2>
        <p className="text-slate-500 font-bold mt-1 px-4">請連接 Google 帳號以啟用雲端備份與完整功能</p>
      </div>
      
      <div className="w-full space-y-3">
        <button onClick={onLogin} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-slate-100 text-slate-800 font-black py-5 rounded-[24px] shadow-sm text-xl active:scale-95 transition-all">
          <Globe size={28} className="text-blue-500 shrink-0" /> 使用 Google 登入
        </button>
        
        <button onClick={onSkip} className="w-full bg-slate-50 text-slate-600 font-bold py-4 rounded-[20px] text-sm active:scale-95 transition-all">
          無須登入直接體驗
        </button>
      </div>

      <div className="bg-orange-50/50 p-5 rounded-[24px] border border-orange-100/50">
        <p className="text-[12px] text-slate-500 font-bold leading-relaxed text-center">
          如果你想體驗但卻不想分享資訊，請點選「無須登入」開始使用。我們僅會將數據存於您的裝置中。
        </p>
      </div>
    </div>
  </div>
);

export const FeedbackModal = ({ isOpen, onClose }) => {
  const [type, setType] = useState('問題回饋');
  const [content, setContent] = useState('');
  if (!isOpen) return null;
  const handleSubmit = () => {
    if (!content.trim()) return alert('請填寫回饋內容');
    const subject = encodeURIComponent(`GSAT Pro - ${type}`);
    const body = encodeURIComponent(`分類：${type}\n\n我的回饋：\n${content}\n\n--- 來自 GSAT Pro APP ---`);
    window.location.href = `mailto:pyps0990@gmail.com?subject=${subject}&body=${body}`;
    onClose();
    setContent('');
  };
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-[32px] w-full max-w-md p-6 shadow-2xl border border-white/60 dark:border-white/10" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black flex items-center gap-2"><MessageSquare size={24} className="text-emerald-500 shrink-0" />意見回饋</h2>
          <button onClick={onClose} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500 shrink-0"><X size={20} className="shrink-0" /></button>
        </div>
        <div className="space-y-4">
          <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-3.5 font-bold outline-none"><option>問題回饋</option><option>功能建議</option><option>其他</option></select>
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="請描述您遇到的問題..." className="w-full h-32 bg-gray-50 border border-gray-200 rounded-2xl p-4 font-bold outline-none resize-none"></textarea>
          <button onClick={handleSubmit} className="w-full bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/30">傳送郵件</button>
        </div>
      </div>
    </div>
  );
};
