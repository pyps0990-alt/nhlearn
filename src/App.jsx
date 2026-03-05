import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  BookOpen, Calendar, MessageSquare, Bell, Volume2, PenTool, 
  FileText, Library, Plus, Trash2, RefreshCw, Upload, 
  CheckCircle2, Clock, Smartphone, Sparkles, Settings, ArrowLeft, Save, Edit3, ChevronRight, BookPlus, Wand2, MonitorPlay, MapPin, User, Package, BrainCircuit
} from 'lucide-react';

// ============================================================================
// 📂 初始資料配置 (Initial Constants)
// ============================================================================

const INITIAL_WEEKLY_SCHEDULE = {
  1: [
    { id: 101, startTime: '08:00', endTime: '09:00', subject: '國文', location: '302 教室', teacher: '王老師', items: '國文講義' },
    { id: 102, startTime: '09:10', endTime: '10:00', subject: '英文', location: '語言中心', teacher: '陳老師', items: '雜誌、紅筆' },
    { id: 103, startTime: '10:10', endTime: '12:00', subject: '數學', location: '302 教室', teacher: '張老師', items: '圓規、直尺' },
    { id: 104, startTime: '13:00', endTime: '15:00', subject: '物理', location: '物理實驗室', teacher: '李老師', items: '實驗本' },
    { id: 105, startTime: '15:10', endTime: '17:00', subject: '自習', location: '圖書館', teacher: '自主學習', items: '各科筆記' },
  ],
  2: [
    { id: 201, startTime: '08:00', endTime: '10:00', subject: '物理', location: '302 教室', teacher: '李老師', items: '考卷 A' },
    { id: 202, startTime: '10:10', endTime: '12:00', subject: '化學', location: '化學教室', teacher: '林老師', items: '護目鏡' },
    { id: 203, startTime: '13:00', endTime: '16:00', subject: '數學', location: '大禮堂', teacher: '張老師', items: '2B 鉛筆' },
  ],
  3: [ { id: 301, startTime: '09:10', endTime: '12:00', subject: '生物', location: '生物教室', teacher: '何老師', items: '顯微鏡' } ],
  4: [
    { id: 401, startTime: '08:00', endTime: '10:00', subject: '歷史', location: '302 教室', teacher: '趙老師', items: '地圖冊' },
    { id: 402, startTime: '10:10', endTime: '12:00', subject: '地理', location: '302 教室', teacher: '黃老師', items: '課本' },
  ],
  5: [
    { id: 501, startTime: '08:00', endTime: '09:00', subject: '公民', location: '302 教室', teacher: '郭老師', items: '法條集' },
    { id: 502, startTime: '09:10', endTime: '12:00', subject: '數學', location: '302 教室', teacher: '張老師', items: '講義' },
  ],
  6: [], 0: []
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

// ============================================================================
// 📂 UI 子組件：通知橫幅 (重新設計 iOS 質感風格)
// ============================================================================

const IosNotification = ({ notification }) => {
  // 設定安全距離與避讓
  const safeTop = 'max(16px, env(safe-area-inset-top))';
  const topPos = `calc(${safeTop} + 10px)`;

  return (
    <div 
      className={`fixed left-4 right-4 z-[160] flex justify-center transition-all duration-[500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none`}
      style={{ 
        top: notification.show ? topPos : '-120px', 
        opacity: notification.show ? 1 : 0, 
        transform: notification.show ? 'scale(1)' : 'scale(0.95)' 
      }}
    >
      <div className="w-full max-w-[360px] bg-[#f8f8f9]/90 backdrop-blur-2xl p-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white/60 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 rounded-[8px] p-1.5 shadow-sm">
              <Bell size={14} className="text-white" />
            </div>
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

// ============================================================================
// 📂 核心邏輯組件：MainApp
// ============================================================================

const MainApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [apiKey, setApiKey] = useState(''); 
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [weeklySchedule, setWeeklySchedule] = useState(INITIAL_WEEKLY_SCHEDULE);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editDayTab, setEditDayTab] = useState(new Date().getDay() || 1);
  
  // 使用 Ref 追蹤已通知的項目，避免重複觸發
  const notifiedSet = useRef(new Set());

  const [notes, setNotes] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [newNote, setNewNote] = useState({ category: '課堂筆記', title: '', content: '' });
  const [vocabList, setVocabList] = useState([
    { id: 1, word: 'indispensable', pos: 'adj.', meaning: '不可或缺的', example: 'Water is indispensable for all forms of life. (水對所有生命形式都是不可或缺的。)' }
  ]);
  const [newVocab, setNewVocab] = useState({ word: '', pos: 'n. (名詞)', meaning: '', example: '' });

  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isGeneratingExample, setIsGeneratingExample] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [practiceData, setPracticeData] = useState(null);
  const [practiceType, setPracticeType] = useState('reading');

  // --- 通知系統 ---
  const triggerNotification = (title, message) => {
    setNotification({ show: true, title: String(title), message: String(message) });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 8000);
    
    if ("Notification" in window && Notification.permission === "granted" && document.visibilityState !== 'visible') {
      try { new Notification(String(title), { body: String(message) }); } catch(e) {}
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      triggerNotification('通知設定', '目前環境不支援原生推播，將自動使用 App 內建的橫幅通知。');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") triggerNotification('授權成功', '您將能收到背景推播提醒！');
      else triggerNotification('推播切換', '已拒絕系統通知，將改用內建橫幅顯示。');
    } catch (e) {
      triggerNotification('環境限制', '已為您自動切換為內建高品質橫幅通知。');
    }
  };

  const speakWord = (word) => { 
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(String(word));
      utterance.lang = 'en-US';
      utterance.rate = 0.85;
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

  // --- Gemini API ---
  const fetchGemini = async (prompt, isJson = false) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: isJson ? { responseMimeType: "application/json" } : undefined
      })
    };
    let retries = 3;
    while (retries > 0) {
      try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('API Error');
        const data = await response.json();
        let text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (isJson) text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        return text;
      } catch (e) {
        retries--;
        if (retries === 0) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  };

  const handleAiSummarize = async () => {
    if (!newNote.content) return;
    setIsSummarizing(true);
    try {
      const text = await fetchGemini(`請將以下筆記「重點摘要」並預測「學測考點」。使用繁體中文、列點顯示：\n\n${newNote.content}`);
      if (text) setNewNote(prev => ({ ...prev, content: text }));
    } catch (err) { triggerNotification('AI 失敗', '無法連接服務。'); } finally { setIsSummarizing(false); }
  };

  const handleGenerateExample = async () => {
    if (!newVocab.word) return;
    setIsGeneratingExample(true);
    try {
      const text = await fetchGemini(`請為單字「${newVocab.word}」生成符合學測難度的英文例句並附中譯。回傳純 JSON：{"example": "Sentence (Translation)"}`, true);
      const res = JSON.parse(text);
      setNewVocab(prev => ({ ...prev, example: res.example }));
    } catch (err) { triggerNotification('AI 解析失敗', '請手動輸入例句。'); } finally { setIsGeneratingExample(false); }
  };

  const generatePractice = async () => {
    setAiLoading(true); setPracticeData(null);
    try {
      const text = await fetchGemini(`模擬學測英文${practiceType === 'reading' ? '閱讀理解' : '綜合測驗'}題目。回傳純 JSON：{"title": "...", "article": "...", "questions": [{"q": "題目", "o": ["A)","B)","C)","D)"], "a": "答案", "e": "解析"}]}`, true);
      setPracticeData(JSON.parse(text));
    } catch (error) { triggerNotification('AI 失敗', '請重試。'); } finally { setAiLoading(false); }
  };

  // --- 生命週期與精確進度計算 ---
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
        
        if (diff === 5) {
          const notifKey = `${c.id}-${dateStr}-5min`;
          if (!notifiedSet.current.has(notifKey)) {
            notifiedSet.current.add(notifKey);
            triggerNotification(
              `🔔 準備上課：${String(c.subject)}`, 
              `📍 地點：${String(c.location || '未定')}\n👨‍🏫 老師：${String(c.teacher || '無')}`
            );
          }
        }
      });
    }, 5000); 
    
    return () => clearInterval(timer);
  }, [weeklySchedule]); 

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

  const updateSchedule = (id, field, value) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [editDayTab]: prev[editDayTab].map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };
  const deleteSchedule = (id) => {
    setWeeklySchedule(prev => ({
      ...prev,
      [editDayTab]: prev[editDayTab].filter(item => item.id !== id)
    }));
  };

  // ============================================================================
  // 📂 視圖渲染
  // ============================================================================

  const renderDashboard = () => (
    <div className="flex flex-col gap-5 w-full text-left animate-fadeIn px-1 md:px-0">
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[32px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex-shrink-0">
         <div className="relative z-10">
           <h2 className="text-3xl font-black mb-1.5 tracking-tight">早安，學習愉快！</h2>
           <p className="text-emerald-50 text-[11px] font-black tracking-widest uppercase opacity-90">Progress: {Math.round(currentProgress)}% | GSAT Pro</p>
           <button onClick={requestPushPermission} className="mt-5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white px-5 py-2.5 rounded-2xl text-[13px] font-black flex items-center gap-2 transition-all shadow-md active:scale-95">
             <Bell size={16} /> 開啟智慧推播授權
           </button>
         </div>
         <Sparkles className="absolute -right-4 -bottom-4 text-white opacity-10 w-40 h-40" />
      </div>

      <div className="bg-white p-5 rounded-[28px] shadow-sm border border-emerald-50 flex flex-col gap-3">
         <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-500 rounded-xl text-white"><BrainCircuit size={18} /></div>
            <h3 className="text-[15px] font-black text-gray-950 uppercase tracking-tight">Study Advisor</h3>
         </div>
         <p className="text-[14.5px] text-gray-700 font-bold leading-relaxed bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100/30 italic text-left">
            「{currentClass.subject === '無排程' ? '現在是自主時段，建議走動一下重整記憶！' : `目前正在上${String(currentClass.subject)}，請專注聽講並做好重點筆記。`}」
         </p>
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[36px] shadow-sm border border-gray-100 w-full">
        <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-500" size={24} />
            <h3 className="text-[19px] font-black text-gray-950 tracking-tighter">
              {isEditingSchedule ? '編輯週排程' : (isAfter4PM ? '16:00 預習模式' : '今日學習排程')}
            </h3>
          </div>
          <div className="flex gap-2">
            <button onClick={() => triggerNotification('通知測試', '這是一則精美的現代 iOS 通知橫幅，滑順彈出無遮擋！')} className="p-2 bg-emerald-50 text-emerald-600 rounded-[12px] active:scale-90"><Bell size={15}/></button>
            <button onClick={() => setIsEditingSchedule(!isEditingSchedule)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${isEditingSchedule ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
              <Edit3 size={15} /> {isEditingSchedule ? '完成' : '編輯'}
            </button>
          </div>
        </div>

        {isEditingSchedule ? (
          <div className="flex flex-col gap-4">
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
                    <button onClick={() => deleteSchedule(item.id)} className="p-3.5 bg-red-50 text-red-500 rounded-[20px] shadow-sm active:scale-90 transition-transform">
                      <Trash2 size={20} />
                    </button>
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
               <button onClick={() => setWeeklySchedule({...weeklySchedule, [editDayTab]: [...(weeklySchedule[editDayTab]||[]), {id:Date.now(), subject:'新課程', startTime:'08:00', endTime:'09:00', location: '', teacher: '', items: ''}]})} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-[28px] text-gray-500 text-[15px] font-black hover:bg-gray-50 transition-all">+ 新增排程</button>
             </div>
          </div>
        ) : (
          <div className="flex flex-col gap-8 w-full">
             <div className="flex flex-col gap-4 w-full text-left">
                {isAfter4PM && <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-widest border-l-4 border-emerald-500 pl-3">Today Remaining</h4>}
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
             
             {isAfter4PM && (
               <div className="flex flex-col gap-4 pt-6 border-t border-gray-100 w-full text-left">
                 <h4 className="text-[11px] font-black text-teal-600 uppercase tracking-widest border-l-4 border-teal-500 pl-3">Tomorrow Preview</h4>
                 {tomorrowClasses.map(item => (
                    <div key={item.id} className="flex flex-col p-5 rounded-[28px] bg-teal-50/60 border border-teal-100/50">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="px-3 py-1 rounded-xl text-[10px] font-black bg-teal-500 text-white uppercase">{String(item.subject)}</span>
                        <span className="text-[16px] font-black text-teal-950 truncate flex-1">{String(item.teacher || '預習範圍')}</span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[13px] text-teal-700 font-black px-1">
                        <Clock size={15} className="text-teal-500/70" /> {item.startTime} - {item.endTime}
                      </div>
                    </div>
                 ))}
               </div>
             )}
          </div>
        )}
      </div>
    </div>
  );

  const renderEnglish = () => (
    <div className="space-y-6 flex flex-col w-full text-left animate-fadeIn px-2 md:px-0">
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
               <button onClick={handleGenerateExample} disabled={isGeneratingExample || !newVocab.word} className="text-[11px] font-black flex items-center gap-1.5 text-white bg-emerald-500 px-4 py-2.5 rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-transform">
                 {isGeneratingExample ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />} AI 生成例句
               </button>
            </div>
            <textarea className="w-full bg-white rounded-[20px] p-4 text-[15px] font-bold text-gray-900 min-h-[100px] outline-none border border-gray-200" placeholder="點擊按鈕生成學測情境..." value={newVocab.example || ''} onChange={e=>setNewVocab({...newVocab, example:e.target.value})} />
          </div>
          <button onClick={handleSaveVocab} className="w-full bg-emerald-600 text-white py-4.5 rounded-[24px] font-black shadow-md active:scale-95 transition-all mt-2">儲存單字卡</button>
        </div>
      </div>
      
      <div className="flex flex-col gap-5">
        {vocabList.map(v => (
          <div key={v.id} className="p-6 bg-white rounded-[36px] shadow-sm border border-gray-100 relative overflow-hidden text-left hover:shadow-xl transition-all group">
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
    <div className="space-y-4 animate-fadeIn flex flex-col w-full text-left px-1">
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
                 <select className="w-1/3 bg-gray-50 border border-gray-200 rounded-xl px-2 text-[11px] font-black outline-none" value={newNote.category || ''} onChange={e=>setNewNote({...newNote, category:e.target.value})}>
                    {NOTE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                 </select>
                 <input type="text" className="w-2/3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 outline-none text-[13px] font-black focus:border-emerald-300" placeholder="標題..." value={newNote.title || ''} onChange={e=>setNewNote({...newNote, title:e.target.value})} />
              </div>
              <div className="flex justify-between items-end mt-1">
                 <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Smart Input</span>
                 <button onClick={handleAiSummarize} disabled={isSummarizing || !newNote.content} className="flex items-center gap-1.5 text-[10px] font-black bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg active:scale-95">
                    {isSummarizing ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />} AI 摘要考點
                 </button>
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
                <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-1.5 text-[10px] text-gray-400 font-black">
                  <Calendar size={12} /> {String(n.date)}
                </div>
             </div>
           ))}
        </div>
      </div>
    );
  };

  // --- 6. 整合渲染 ---
  
  let currentContent = null;
  if (activeTab === 'dashboard') currentContent = renderDashboard();
  else if (activeTab === 'english') currentContent = renderEnglish();
  else if (activeTab === 'notes') currentContent = selectedSubject ? renderNoteDetail() : renderNoteGrid();

  return (
    <div className="flex h-full bg-[#F7FBFA] font-sans overflow-hidden relative w-full flex-col">
      <IosNotification notification={notification} />

      {/* 捲動區域 */}
      <div 
        className="flex-1 overflow-y-auto scroll-smooth w-full px-4 pt-16 touch-pan-y" 
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="w-full pb-[140px] flex flex-col max-w-2xl mx-auto">
          {currentContent}
        </div>
      </div>

      {/* 底部固定導航列 */}
      <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-200 flex justify-around px-2 pt-3 pb-8 z-40 shadow-[0_-15px_40px_rgba(0,0,0,0.05)] rounded-t-[40px]">
        {[{ id:'dashboard', icon:Calendar, label:'日常' }, { id:'english', icon:Volume2, label:'英文' }, { id:'notes', icon:Library, label:'筆記' }].map(item => (
          <button key={item.id} onClick={()=>{setActiveTab(item.id); setSelectedSubject(null);}} className={`flex flex-col items-center justify-center w-20 h-14 rounded-2xl transition-colors ${activeTab===item.id?'text-emerald-600':'text-gray-400'}`}>
            <div className={`p-2 rounded-full transition-colors ${activeTab===item.id?'bg-emerald-50':''}`}><item.icon size={22} className={activeTab===item.id?'fill-emerald-100/50':''} /></div>
            <span className="text-[10px] mt-1 font-black uppercase">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// 📂 App 入口：純 Web App 滿版模式
// ============================================================================

export default function App() {
  return (
    <div className="w-full h-[100dvh] bg-[#F7FBFA] flex items-center justify-center font-sans select-none overflow-hidden">
      <MainApp />

      <style dangerouslySetInnerHTML={{__html: `
        @supports (padding-bottom: env(safe-area-inset-bottom)) { 
          .pb-safe { padding-bottom: max(2rem, env(safe-area-inset-bottom)); } 
        }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .font-black { font-weight: 900 !important; }
        * { -webkit-tap-highlight-color: transparent; }
      `}} />
    </div>
  );
}