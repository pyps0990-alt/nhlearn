import React, { useState } from 'react';
import { 
  Bell, ShieldCheck, Sparkles, GraduationCap, MapPin, CheckCircle2, 
  ChevronRight, Lock, Globe, MessageSquare, X 
} from 'lucide-react';

export const IosNotification = ({ notification }) => {
  const safeTop = 'max(16px, env(safe-area-inset-top))';
  const topPos = `calc(${safeTop} + 10px)`;

  return (
    <div
      className={`fixed left-0 right-0 z-[160] flex justify-center transition-all duration-[500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none px-4`}
      style={{ top: notification.show ? topPos : '-120px', opacity: notification.show ? 1 : 0, transform: notification.show ? 'scale(1)' : 'scale(0.95)' }}
    >
      <div className="w-full max-w-[360px] bg-[#f8f8f9]/95 backdrop-blur-2xl p-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white/60 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 rounded-[8px] p-1.5 shadow-sm"><Bell size={14} className="text-white" /></div>
            <span className="text-[12px] font-black text-gray-400 uppercase tracking-wider">GSAT PRO</span>
          </div>
          <span className="text-[12px] font-bold text-gray-400">現在</span>
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
        <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mb-6">
          <ShieldCheck className="text-emerald-600" size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-900 mb-3">{title}</h2>
        <div className="space-y-3 text-gray-500 text-sm font-bold leading-relaxed">
          <p>歡迎使用 GSAT Pro！我們重視您的隱私，特此聲明：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>定位權限僅用於尋找附近的 YouBike 站點。</li>
            <li>通知權限僅用於發送上課提醒與重要通知。</li>
            <li>所有資料僅存於您的裝置或私人 Google Drive。</li>
          </ul>
        </div>
      </div>
      <div className="p-8 pt-4">
        <button onClick={onAccept} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all text-lg">我已閱讀並同意</button>
      </div>
    </div>
  </div>
);

export const WelcomeScreen = ({ onFinishWelcome, requestPushPermission }) => {
  const [grantedLocation, setGrantedLocation] = useState(false);
  const [grantedNotif, setGrantedNotif] = useState(false);

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
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-fadeIn text-left">
      <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
        <div className="w-32 h-32 bg-emerald-500 rounded-[40px] flex items-center justify-center animate-bounce shadow-2xl">
          <Sparkles size={60} className="text-white" />
        </div>
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900">GSAT Pro</h1>
          <p className="text-gray-400 font-bold">您的個人化升學管家</p>
        </div>
        <div className="w-full space-y-4 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${grantedLocation ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 border border-gray-100'}`}><MapPin size={24} /></div>
            <div className="flex-1 text-[13px] font-black text-gray-800">定位權限<br/><span className="text-[11px] text-gray-400 font-bold">尋找附近 YouBike 站點</span></div>
            {!grantedLocation ? <button onClick={handleLocation} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl">開啟</button> : <CheckCircle2 size={24} className="text-emerald-500" />}
          </div>
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${grantedNotif ? 'bg-emerald-100 text-emerald-600' : 'bg-white text-gray-400 border border-gray-100'}`}><Bell size={24} /></div>
            <div className="flex-1 text-[13px] font-black text-gray-800">通知權限<br/><span className="text-[11px] text-gray-400 font-bold">重要日程與上課提醒</span></div>
            {!grantedNotif ? <button onClick={handleNotif} className="px-5 py-2.5 bg-emerald-600 text-white text-xs font-black rounded-xl">開啟</button> : <CheckCircle2 size={24} className="text-emerald-500" />}
          </div>
        </div>
        <button onClick={() => { localStorage.setItem('gsat_onboarding_done', 'true'); onFinishWelcome(); }} className="w-full bg-gray-900 text-white font-black py-4.5 rounded-[24px] shadow-2xl flex items-center justify-center gap-3">開始體驗 <ChevronRight size={24} /></button>
      </div>
    </div>
  );
};

export const AuthScreen = ({ onLogin }) => (
  <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center p-8 animate-fadeIn text-left">
    <div className="w-full max-w-sm space-y-8 flex flex-col items-center">
      <div className="w-24 h-24 bg-emerald-100 rounded-[32px] flex items-center justify-center shadow-inner mb-2 animate-pulse"><Lock className="text-emerald-600" size={48} /></div>
      <div className="text-center"><h2 className="text-3xl font-black text-gray-900">需要登入</h2><p className="text-gray-500 font-bold">請登入 Google 帳號以啟用雲端備份</p></div>
      <button onClick={onLogin} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 text-gray-700 font-black py-5 rounded-[24px] shadow-sm text-xl"><Globe size={28} className="text-blue-500" /> 使用 Google 登入</button>
      <p className="text-[12px] text-gray-400 font-bold text-center">我們會將您的筆記與自定義數據備份至 Google Drive，確保您的學習進度永不遺失。</p>
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
      <div className="bg-white rounded-[32px] w-full max-w-md p-6 shadow-2xl border border-white/60" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black flex items-center gap-2"><MessageSquare size={24} className="text-emerald-500" />意見回饋</h2>
          <button onClick={onClose} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
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
