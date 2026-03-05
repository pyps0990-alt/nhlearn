import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, Calendar, MessageSquare, Bell, Volume2, PenTool, 
  FileText, Library, Plus, Trash2, RefreshCw, Upload, 
  CheckCircle2, Clock, Smartphone, Sparkles, Settings, ArrowLeft, Save, Edit3, ChevronRight, BookPlus, Wand2, MonitorPlay, MapPin, User, Package, BrainCircuit, Image as ImageIcon
} from 'lucide-react';

const INITIAL_WEEKLY_SCHEDULE = {
  1: [{ id: 101, startTime: '08:00', endTime: '09:00', subject: '國文', location: '302 教室', teacher: '王老師', items: '國文講義' }],
  2: [], 3: [], 4: [], 5: [], 6: [], 0: []
};

const WEEKDAYS = [
  { id: 1, label: '一' }, { id: 2, label: '二' }, { id: 3, label: '三' }, 
  { id: 4, label: '四' }, { id: 5, label: '五' }, { id: 6, label: '六' }, { id: 0, label: '日' }
];

const SUBJECTS_LIST = [
  { name: '國文', icon: '📝', color: 'text-red-600' },
  { name: '英文', icon: '🔤', color: 'text-blue-600' },
  { name: '數學', icon: '📐', color: 'text-orange-600' },
  { name: '物理', icon: '⚡', color: 'text-purple-600' },
  { name: '化學', icon: '🧪', color: 'text-cyan-600' },
  { name: '生物', icon: '🧬', color: 'text-green-600' },
  { name: '歷史', icon: '📜', color: 'text-amber-600' },
  { name: '地理', icon: '🗺️', color: 'text-emerald-600' },
  { name: '公民', icon: '⚖️', color: 'text-indigo-600' },
  { name: '自習', icon: '📚', color: 'text-gray-600' }
];

const POS_OPTIONS = ['n. (名詞)', 'v. (動詞)', 'adj. (形容詞)', 'adv. (副詞)', 'prep. (介系詞)', 'phr. (片語)'];
const NOTE_CATEGORIES = ['課堂筆記', '錯題本', '重點摘要', '考前衝刺'];

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const IosNotification = ({ notification }) => {
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
            <span className="text-[13px] text-gray-700 font-bold tracking-wider uppercase">GSAT PRO</span>
          </div>
          <span className="text-[11px] text-gray-400 font-medium tracking-widest uppercase">Now</span>
        </div>
        <div className="px-1 pb-1 mt-1">
          <div className="text-[16px] font-black text-gray-950 leading-tight mb-1.5">{String(notification?.title || '')}</div>
          <div className="text-[14px] font-bold text-gray-600 leading-relaxed whitespace-pre-line">{String(notification?.message || '')}</div>
        </div>
      </div>
    </div>
  );
};

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    const saved = localStorage.getItem('gsat_schedule');
    return saved ? JSON.parse(saved) : INITIAL_WEEKLY_SCHEDULE;
  });
  
  const [vocabList, setVocabList] = useState(() => {
    const saved = localStorage.getItem('gsat_vocab');
    return saved ? JSON.parse(saved) : [{ id: 1, word: 'indispensable', pos: 'adj.', meaning: '不可或缺的', example: 'Water is indispensable for all forms of life.' }];
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('gsat_notes');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('gsat_schedule', JSON.stringify(weeklySchedule)); }, [weeklySchedule]);
  useEffect(() => { localStorage.setItem('gsat_vocab', JSON.stringify(vocabList)); }, [vocabList]);
  useEffect(() => { localStorage.setItem('gsat_notes', JSON.stringify(notes)); }, [notes]);

  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editDayTab, setEditDayTab] = useState(new Date().getDay() || 1);
  const [uploadLoading, setUploadLoading] = useState(false);

  const [selectedSubject, setSelectedSubject] = useState(null);
  const [newNote, setNewNote] = useState({ category: '課堂筆記', title: '', content: '' });
  const [newVocab, setNewVocab] = useState({ word: '', pos: 'n. (名詞)', meaning: '', example: '' });

  const notifiedSet = useRef(new Set());

  // --- 🔔 通知系統與權限 ---
  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      triggerNotification('系統提示', '此瀏覽器不支援桌面通知功能。請確認不是在 LINE 或 IG 內建瀏覽器開啟。');
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      triggerNotification('授權成功 🎉', '您現在可以接收上課前 5 分鐘的提醒了！');
    } else {
      triggerNotification('權限未開啟', '請在瀏覽器設定中允許通知，或將網頁加入主畫面。');
    }
  };

  const triggerNotification = (title, message) => {
    setNotification({ show: true, title: String(title), message: String(message) });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 6000);

    if ("Notification" in window && Notification.permission === "granted") {
      try { 
        new Notification(String(title), { body: String(message), icon: '/favicon.ico' }); 
      } catch(e) {
        console.error("推播失敗", e);
      }
    }
  };

  const testPushNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification("測試成功！", { body: "這是一則來自 GSAT Pro 的系統原生推播！" });
      triggerNotification("測試成功", "系統推播功能運作正常！");
    } else {
      requestPushPermission();
    }
  };

  // 背景定時器 (每5秒檢查一次時間)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);
      
      const day = now.getDay();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const dateStr = now.toDateString();
      
      (weeklySchedule[day] || []).forEach(c => {
        if (!c.startTime) return;
        const startMins = timeToMins(c.startTime);
        const diff = startMins - currentMins;
        
        // 上課前 5 分鐘準時提醒
        if (diff === 5) {
          const notifKey = `${c.id}-${dateStr}-5min`;
          if (!notifiedSet.current.has(notifKey)) {
            notifiedSet.current.add(notifKey);
            triggerNotification(`🔔 準備上課：${String(c.subject)}`, `📍 地點：${String(c.location || '未定')}\n👨‍🏫 老師：${String(c.teacher || '無')}`);
          }
        }
      });
    }, 5000); 
    return () => clearInterval(timer);
  }, [weeklySchedule]);

  // --- 圖片壓縮 ---
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200; 
          let scaleSize = 1;
          if (img.width > MAX_WIDTH) scaleSize = MAX_WIDTH / img.width;
          
          canvas.width = img.width * scaleSize;
          canvas.height = img.height * scaleSize;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas to Blob failed'));
            resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.7);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // --- Webhook 上傳 ---
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    triggerNotification('讀取中', '正在優化照片並傳送給 AI，請稍候...');
    
    try {
      let fileToUpload = file;
      if (file.type.startsWith('image/')) {
        fileToUpload = await compressImage(file);
      }

      const formData = new FormData();
      formData.append('file', fileToUpload);

      // 替換為你在 n8n 中的 Webhook 網址
      const N8N_WEBHOOK_URL = 'https://nhmccyj-ai-agent.hf.space/webhook/04645141-372f-4e56-8731-bc124a7aad7e'; 
      const response = await fetch(N8N_WEBHOOK_URL, { method: 'POST', body: formData });
      
      if (!response.ok) throw new Error('伺服器無回應');
      
      let rawData = await response.json(); 
      let data = rawData;

      if (data && data.content) data = data.content;
      else if (data && data.text) data = data.text;

      if (typeof data === 'string') {
        const cleanString = data.replace(/```json/gi, '').replace(/```/g, '').trim();
        data = JSON.parse(cleanString);
      }

      if (!Array.isArray(data)) throw new Error("AI 回傳的格式錯誤");
      
      const newClasses = data.map((item, index) => {
        const times = item.time ? item.time.split('~') : ['00:00', '00:00'];
        return {
          id: Date.now() + index,
          startTime: times[0]?.trim() || '',
          endTime: times[1]?.trim() || '',
          subject: item.subject || '未命名課程',
          location: item.location || '',
          teacher: '',
          items: ''
        };
      });

      setWeeklySchedule(prev => ({ ...prev, [editDayTab]: newClasses }));
      triggerNotification('上傳成功 🎉', 'AI 已將課表自動對齊至當前星期！');
    } catch (error) {
      console.error('上傳失敗:', error);
      triggerNotification('處理失敗', '請確認伺服器已喚醒且圖片清晰。');
    } finally {
      setUploadLoading(false);
      event.target.value = null; 
    }
  };

  const updateSchedule = (id, field, value) => {
    setWeeklySchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].map(item => item.id === id ? { ...item, [field]: value } : item) }));
  };
  
  const deleteSchedule = (id) => {
    setWeeklySchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].filter(item => item.id !== id) }));
  };

  const { currentClass, currentProgress, todayClasses, tomorrowClasses, isAfter4PM } = useMemo(() => {
    const day = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todayList = weeklySchedule[day] || [];
    const tomorrowList = weeklySchedule[(day + 1) % 7] || [];
    let active = { subject: '無排程', topic: '休息時間' };
    let prog = 0;
    
    for (let c of todayList) {
      const start = timeToMins(c.startTime);
      const end = timeToMins(c.endTime);
      if (currentMins >= start && currentMins < end) {
        active = c;
        prog = ((currentMins - start) / (end - start)) * 100;
        break;
      }
    }
    return { currentClass: active, currentProgress: prog, todayClasses: todayList, tomorrowClasses: tomorrowList, isAfter4PM: currentTime.getHours() >= 16 };
  }, [currentTime, weeklySchedule]);

  const speakWord = (word) => { 
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(word));
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSaveVocab = () => {
    if (!newVocab.word || !newVocab.meaning) return;
    setVocabList(prev => [{ id: Date.now(), ...newVocab }, ...prev]);
    setNewVocab({ word: '', pos: 'n. (名詞)', meaning: '', example: '' });
  };
  const handleDeleteVocab = (id) => setVocabList(prev => prev.filter(v => v.id !== id));

  const handleSaveNote = () => {
    if (!newNote.title || !newNote.content) return;
    setNotes(prev => [{ id: Date.now(), subject: String(selectedSubject?.name || '未知'), ...newNote, date: new Date().toLocaleDateString() }, ...prev]);
    setNewNote({ category: '課堂筆記', title: '', content: '' });
  };
  const handleDeleteNote = (id) => setNotes(prev => prev.filter(n => n.id !== id));
  const handleGenerateExample = () => setNewVocab(prev => ({ ...prev, example: `This is an example sentence for ${prev.word}.` }));
  const handleAiSummarize = () => setNewNote(prev => ({ ...prev, content: `【重點整理】\n1. ...\n\n---\n${prev.content}` }));

  const renderDashboard = () => (
    <div className="flex flex-col gap-5 w-full text-left animate-fadeIn">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[32px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex-shrink-0">
         <div className="relative z-10">
           <h2 className="text-3xl font-black mb-1.5 tracking-tight">早安，學習愉快！</h2>
           <p className="text-emerald-50 text-[11px] font-black tracking-widest uppercase opacity-90">Progress: {Math.round(currentProgress)}% | GSAT Pro</p>
           
           <div className="flex gap-2 mt-5">
             <button onClick={requestPushPermission} className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl text-[12px] font-black flex items-center gap-2 transition-all shadow-md active:scale-95">
               <Bell size={14} /> 授權通知
             </button>
             <button onClick={testPushNotification} className="bg-emerald-800/40 hover:bg-emerald-800/60 backdrop-blur-sm text-white px-4 py-2.5 rounded-2xl text-[12px] font-black flex items-center gap-2 transition-all shadow-md active:scale-95 border border-white/10">
               <Sparkles size={14} /> 測試推播
             </button>
           </div>
         </div>
         <Sparkles className="absolute -right-4 -bottom-4 text-white opacity-10 w-40 h-40" />
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[36px] shadow-sm border border-gray-100 w-full">
        <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-500" size={24} />
            <h3 className="text-[19px] font-black text-gray-950 tracking-tighter">
              {isEditingSchedule ? '編輯週排程' : (isAfter4PM ? '16:00 預習模式' : '今日學習排程')}
            </h3>
          </div>
          <button onClick={() => setIsEditingSchedule(!isEditingSchedule)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${isEditingSchedule ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
            <Edit3 size={15} /> {isEditingSchedule ? '完成' : '編輯'}
          </button>
        </div>

        {isEditingSchedule ? (
          <div className="flex flex-col gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-5 flex flex-col gap-3 relative overflow-hidden">
              <div className="flex items-center gap-2">
                <BrainCircuit className="text-emerald-600" size={20} />
                <h4 className="font-black text-emerald-900 text-[15px]">AI 智能匯入課表</h4>
              </div>
              <p className="text-emerald-700 text-[13px] font-bold">上傳學校發的課表照片，AI 會自動為你填入教室與時段！</p>
              
              <label className="bg-white border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer rounded-2xl py-4 flex flex-col items-center justify-center gap-2">
                {uploadLoading ? <RefreshCw className="animate-spin text-emerald-500" size={24} /> : <ImageIcon className="text-emerald-400" size={24} />}
                <span className="text-emerald-600 text-[14px] font-black">{uploadLoading ? 'AI 正在處理並壓縮圖片...' : '點擊上傳照片 / PDF'}</span>
                <input type="file" accept="image/*,.pdf" className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />
              </label>
            </div>

             <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {WEEKDAYS.map(d => (
                  <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-5 py-3 rounded-2xl text-[14px] font-black flex-shrink-0 transition-all ${editDayTab === d.id ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500'}`}>{d.label}</button>
                ))}
             </div>
             
             <div className="flex flex-col gap-5">
               {(weeklySchedule[editDayTab] || []).map(item => (
                <div key={item.id} className="p-5 bg-white rounded-[32px] border border-gray-100 flex flex-col gap-4 shadow-sm relative focus-within:border-emerald-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                      <BookOpen size={18} className="text-emerald-500 flex-shrink-0" />
                      <input type="text" value={item.subject || ''} onChange={(e) => updateSchedule(item.id, 'subject', e.target.value)} className="w-full bg-transparent text-[16px] font-black text-emerald-900 outline-none" placeholder="科目名稱" />
                    </div>
                    <button onClick={() => deleteSchedule(item.id)} className="p-3.5 bg-red-50 text-red-500 rounded-[20px] shadow-sm active:scale-90 transition-transform"><Trash2 size={20} /></button>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                    <User size={18} className="text-emerald-500 flex-shrink-0" />
                    <input type="text" value={item.teacher || ''} onChange={(e) => updateSchedule(item.id, 'teacher', e.target.value)} className="w-full bg-transparent text-[15px] font-bold text-gray-800 outline-none" placeholder="授課老師" />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                    <MapPin size={18} className="text-emerald-500 flex-shrink-0" />
                    <input type="text" value={item.location || ''} onChange={(e) => updateSchedule(item.id, 'location', e.target.value)} className="w-full bg-transparent text-[15px] font-bold text-gray-800 outline-none" placeholder="上課教室" />
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                    <Clock size={18} className="text-emerald-500 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                       <input type="time" value={item.startTime || ''} onChange={(e) => updateSchedule(item.id, 'startTime', e.target.value)} className="flex-1 bg-transparent text-[15px] font-black font-mono outline-none text-center" />
                       <span className="text-gray-400 font-bold">-</span>
                       <input type="time" value={item.endTime || ''} onChange={(e) => updateSchedule(item.id, 'endTime', e.target.value)} className="flex-1 bg-transparent text-[15px] font-black font-mono outline-none text-center" />
                    </div>
                  </div>
                </div>
               ))}
               
               <button onClick={() => setWeeklySchedule({...weeklySchedule, [editDayTab]: [...(weeklySchedule[editDayTab]||[]), {id:Date.now(), subject:'新課程', startTime:'08:00', endTime:'09:00', location: '', teacher: '', items: ''}]})} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-[28px] text-gray-500 text-[15px] font-black hover:bg-gray-50 transition-all flex justify-center items-center gap-2">
                 <Plus size={18} /> 手動新增排程
               </button>

             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full text-left">
             {todayClasses.length === 0 && <div className="text-center py-12 bg-gray-50 rounded-[28px] text-gray-400 font-bold text-[15px]">今日進度已圓滿達成 🎉</div>}
             {todayClasses.map(item => {
               const isActive = currentClass?.id === item.id;
               const isPast = timeToMins(item.endTime) < (currentTime.getHours()*60 + currentTime.getMinutes());
               return (
                 <div key={item.id} className={`flex flex-col p-5 md:p-6 rounded-[32px] border transition-all ${isActive ? 'bg-emerald-50 border-emerald-200 shadow-lg' : 'bg-gray-50 border-transparent'} ${isPast ? 'opacity-40 grayscale-[0.4]' : ''}`}>
                   <div className="flex items-center gap-3 mb-4">
                     <span className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${isActive ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>{String(item.subject)}</span>
                     <span className={`text-[18px] font-black truncate flex-1 text-left ${isActive ? 'text-emerald-950' : 'text-gray-900'}`}>{String(item.teacher || '自主進度')}</span>
                   </div>
                   <div className="grid grid-cols-2 gap-y-3.5">
                     <div className={`flex items-center gap-2 font-mono text-[13px] font-black ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                       <Clock size={16} className={isActive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'} /> {item.startTime} - {item.endTime}
                     </div>
                     <div className="flex items-center gap-2 text-[13px] text-gray-800 font-black truncate"><MapPin size={16} className="text-gray-400" /> {String(item.location || '未定地點')}</div>
                   </div>
                 </div>
               );
             })}
          </div>
        )}
      </div>
    </div>
  );

  const renderEnglish = () => (
    <div className="space-y-6 flex flex-col w-full text-left animate-fadeIn">
      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 px-1"><BookOpen className="text-emerald-500" size={28} /> 英文單字特訓</h2>
      <div className="bg-white p-6 rounded-[36px] shadow-sm border border-gray-100">
        <h3 className="text-[15px] font-black text-gray-800 mb-5 flex items-center gap-2"><BookPlus size={18} className="text-emerald-500" /> 擴充單字庫</h3>
        <div className="flex flex-col gap-4">
          <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-[22px] px-5 py-4 outline-none text-[15px] font-black focus:bg-white focus:border-emerald-300 transition-all" placeholder="單字 (Word)" value={newVocab.word || ''} onChange={e=>setNewVocab({...newVocab, word:e.target.value})} />
          <div className="flex gap-3">
            <select className="w-1/3 bg-gray-50 border border-gray-100 rounded-[22px] px-3 py-4 text-[13px] font-black outline-none" value={newVocab.pos || ''} onChange={e=>setNewVocab({...newVocab, pos:e.target.value})}>
               {POS_OPTIONS.map(o=><option key={o} value={o}>{o.split(' ')[0]}</option>)}
            </select>
            <input type="text" className="w-2/3 bg-gray-50 border border-gray-100 rounded-[22px] px-4 py-4 outline-none text-[14px] font-black focus:bg-white focus:border-emerald-300 transition-all" placeholder="繁體中譯" value={newVocab.meaning || ''} onChange={e=>setNewVocab({...newVocab, meaning:e.target.value})} />
          </div>
          <div className="bg-emerald-50/50 p-5 rounded-[26px] border border-emerald-100 mt-2">
            <div className="flex justify-between items-center mb-4">
               <span className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">AI Engine</span>
               <button onClick={handleGenerateExample} className="text-[11px] font-black flex items-center gap-1.5 text-white bg-emerald-500 px-4 py-2.5 rounded-xl shadow-md active:scale-95 transition-transform"><Wand2 size={14} /> AI 產生例句</button>
            </div>
            <textarea className="w-full bg-white rounded-[20px] p-4 text-[15px] font-bold text-gray-900 min-h-[100px] outline-none border border-gray-200" placeholder="點擊按鈕生成學測情境..." value={newVocab.example || ''} onChange={e=>setNewVocab({...newVocab, example:e.target.value})} />
          </div>
          <button onClick={handleSaveVocab} className="w-full bg-emerald-600 text-white py-4 rounded-[24px] font-black shadow-md active:scale-95 transition-all mt-2">儲存單字卡</button>
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {vocabList.map(v => (
          <div key={v.id} className="p-6 bg-white rounded-[36px] shadow-sm border border-gray-100 relative overflow-hidden text-left hover:shadow-xl transition-all">
             <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-4">
                   <span className="text-2xl font-black text-emerald-950">{String(v.word)}</span>
                   <span className="text-[10px] font-black px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-lg uppercase">{String(v.pos).split(' ')[0]}</span>
                </div>
                <div className="flex gap-2">
                   <button onClick={()=>speakWord(v.word)} className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl active:scale-90 transition-transform"><Volume2 size={18} /></button>
                   <button onClick={()=>handleDeleteVocab(v.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl active:scale-90 transition-transform"><Trash2 size={18} /></button>
                </div>
             </div>
             <p className="text-[16px] font-black text-gray-800 mb-4">{String(v.meaning)}</p>
             {v.example && <div className="text-[14.5px] font-bold text-gray-600 leading-relaxed italic bg-gray-50 p-4.5 rounded-[24px] border-l-[6px] border-emerald-400">{String(v.example)}</div>}
          </div>
        ))}
      </div>
    </div>
  );

  const renderNoteGrid = () => (
    <div className="space-y-4 animate-fadeIn flex flex-col w-full text-left">
      <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 px-1 mb-4"><Library className="text-emerald-500" size={24} /> 知識庫總覽</h2>
      <div className="grid grid-cols-2 gap-3">
        {SUBJECTS_LIST.map(s => (
          <button key={s.name} onClick={()=>setSelectedSubject(s)} className="aspect-square bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 active:scale-95 transition-transform">
             <div className="text-4xl">{s.icon}</div>
             <span className="text-[13px] font-black text-gray-900">{s.name}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const renderNoteDetail = () => {
    const sn = notes.filter(n=>n.subject === selectedSubject?.name);
    return (
      <div className="space-y-4 animate-fadeIn flex flex-col w-full text-left">
        <div className="flex items-center gap-3 border-b border-gray-200 pb-4 px-1">
           <button onClick={()=>setSelectedSubject(null)} className="p-2 bg-white rounded-xl shadow-sm text-gray-600 active:scale-90"><ArrowLeft size={20} /></button>
           <div className="flex items-center gap-2">
              <span className="text-3xl">{selectedSubject?.icon}</span>
              <h2 className="text-lg font-black text-gray-950">{selectedSubject?.name} 筆記</h2>
           </div>
        </div>
        <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
           <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                 <select className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl px-2 text-[11px] font-black outline-none" value={newNote.category || ''} onChange={e=>setNewNote({...newNote, category:e.target.value})}>{NOTE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}</select>
                 <input type="text" className="w-2/3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-[13px] font-black focus:border-emerald-300" placeholder="標題..." value={newNote.title || ''} onChange={e=>setNewNote({...newNote, title:e.target.value})} />
              </div>
              <div className="flex justify-between items-end mt-1">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Smart Input</span>
                 <button onClick={handleAiSummarize} className="flex items-center gap-1.5 text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg active:scale-95"><Sparkles size={12} /> AI 摘要考點</button>
              </div>
              <textarea className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-[13px] font-bold text-gray-900 min-h-[160px] outline-none focus:bg-white focus:border-emerald-300" placeholder="貼上隨手抄錄的筆記..." value={newNote.content || ''} onChange={e=>setNewNote({...newNote, content:e.target.value})} />
              <button onClick={handleSaveNote} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-black shadow-md active:scale-95 mt-1 flex justify-center items-center gap-2">儲存筆記 <Save size={16} /></button>
           </div>
        </div>
        <div className="flex flex-col gap-4 mt-2">
           {sn.map(n=>(
             <div key={n.id} className="p-5 bg-white rounded-3xl shadow-sm border border-gray-100 relative text-left">
                <div className="flex justify-between items-start mb-3">
                   <span className="px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg text-[9px] font-black uppercase">{String(n.category)}</span>
                   <button onClick={()=>handleDeleteNote(n.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
                </div>
                <h4 className="font-black text-gray-950 text-[16px] mb-3 leading-tight">{String(n.title)}</h4>
                <p className="text-[13.5px] font-bold text-gray-700 whitespace-pre-wrap leading-relaxed">{String(n.content)}</p>
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-[10px] text-gray-400 font-black"><Calendar size={12} /> {String(n.date)}</div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  let currentContent = renderDashboard();
  if (activeTab === 'english') currentContent = renderEnglish();
  if (activeTab === 'notes') currentContent = selectedSubject ? renderNoteDetail() : renderNoteGrid();

  return (
    <>
      <IosNotification notification={notification} />
      <div className="flex-1 overflow-y-auto scroll-smooth w-full px-4 pt-10 pb-[120px] touch-pan-y scrollbar-hide">
        {currentContent}
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 flex justify-around px-2 pt-3 pb-8 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] rounded-t-[40px]">
        {[{ id:'dashboard', icon:Calendar, label:'日常' }, { id:'english', icon:Volume2, label:'英文' }, { id:'notes', icon:Library, label:'筆記' }].map(item => (
          <button key={item.id} onClick={()=>{setActiveTab(item.id); setSelectedSubject(null);}} className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab===item.id?'text-emerald-600':'text-gray-400'}`}>
            <div className={`p-2 rounded-full transition-colors ${activeTab===item.id?'bg-emerald-50':''}`}><item.icon size={22} className={activeTab===item.id?'fill-emerald-100/50':''} /></div>
            <span className="text-[10px] mt-1 font-black uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

export default function App() {
  return (
    <div className="w-full min-h-[100dvh] bg-[#F7FBFA] flex justify-center font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{__html: `
        body, html { margin: 0; padding: 0; background-color: #F7FBFA; width: 100%; overscroll-behavior-y: none; }
        .main-container { width: 100%; max-width: 600px; margin: 0 auto; position: relative; height: 100dvh; background-color: #F7FBFA; box-shadow: 0 0 30px rgba(0,0,0,0.03); display: flex; flex-direction: column; }
        @supports (padding-bottom: env(safe-area-inset-bottom)) { .pb-safe { padding-bottom: max(2rem, env(safe-area-inset-bottom)); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .font-black { font-weight: 900 !important; }
        * { -webkit-tap-highlight-color: transparent; }
      `}} />
      <div className="main-container">
        <MainApp />
      </div>
    </div>
  );
}