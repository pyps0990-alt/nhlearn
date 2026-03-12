import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Clock, BellRing, Calendar, RefreshCw,
  Image as ImageIcon, Trash2, MapPin, Plus,
  Globe, AlertCircle, BookText, Utensils, Bell,
  Sun, Moon, Coffee, ChevronRight
} from 'lucide-react';
import {
  INITIAL_WEEKLY_SCHEDULE, WEEKDAYS, ICON_MAP
} from '../utils/constants';
import { fetchAI } from '../utils/helpers';
// Firestore moved to App.jsx for global sync

// === 外部函式與常數 ===
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return { text: '早安', icon: Sun };
  if (h < 18) return { text: '午安', icon: Coffee };
  return { text: '晚安', icon: Moon };
};

// --- 快顯時鐘元件解決頻繁重繪問題 ---
const LiveClock = () => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-white text-[24px] font-black font-mono">
      {time.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
};

const ENCOURAGEMENTS = [
  "辛苦了！今天的學習非常有價值",
  "太棒了，離夢想又進了一步",
  "深呼吸，給努力的自己一個讚",
  "今日份的努力已打卡，好好休息吧",
  "學會休息，是為了走更長遠的路"
];


const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getSubjectIcon = (subjectName) => {
  if (!subjectName) return ICON_MAP.Library;
  if (subjectName.includes('國')) return ICON_MAP.BookText;
  if (subjectName.includes('英')) return ICON_MAP.Languages;
  if (subjectName.includes('數')) return ICON_MAP.Calculator;
  if (subjectName.includes('物')) return ICON_MAP.Zap;
  if (subjectName.includes('化')) return ICON_MAP.Beaker;
  if (subjectName.includes('生')) return ICON_MAP.Dna;
  if (subjectName.includes('地')) return ICON_MAP.Map;
  if (subjectName.includes('歷')) return ICON_MAP.History;
  if (subjectName.includes('公')) return ICON_MAP.Scale;
  if (subjectName.includes('訊')) return ICON_MAP.Cloud;
  if (subjectName.includes('自')) return ICON_MAP.Library;
  if (subjectName.includes('飯') || subjectName.includes('午')) return ICON_MAP.Utensils;
  return ICON_MAP.Library;
};

const getLinkIcon = (iconName) => {
  return ICON_MAP[iconName] || ICON_MAP.Globe;
};


// === 校園新聞 Widget 元件 ===
const SchoolNewsWidget = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 官網新聞首頁備用連結
  const NEWS_PAGE_URL = "https://www.nhsh.tp.edu.tw/content?a=T0RESU5qYzNPVE01TlRFPTBjVE0zRWpOeDRrVGludGVseQ==&c=T0RESU9ERXhNamsyTVRnPTNrek01RWpOeElrVGludGVseQ==";

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // 呼叫 Vercel 後端 API
        const response = await fetch('/api/getNews');

        if (!response.ok) throw new Error('無法取得資料');

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setNews(data);
          setError(false);
        } else {
          throw new Error('沒有資料');
        }
      } catch (err) {
        setError(true);
        setNews([
          { title: "目前無法取得最新公告，請點擊跳轉官網查看", date: "系統通知" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="bg-white dark:bg-white/5 p-6 rounded-[32px] shadow-sm border border-gray-100 dark:border-white/5 mt-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[16px] font-black text-slate-800 dark:text-gray-100 flex items-center gap-2">
          <MapPin className={error ? "text-orange-400 shrink-0" : "text-blue-500 shrink-0"} size={20} />
          {error ? "官網連線中" : "最新公告"}
        </h3>
        <a href={NEWS_PAGE_URL} target="_blank" rel="noreferrer" className="text-[12px] font-black text-blue-600 dark:text-blue-400 hover:underline">
          查看更多
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <RefreshCw size={20} className="text-gray-200 dark:text-gray-700 animate-spin shrink-0" />
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.link || NEWS_PAGE_URL}
              target="_blank"
              rel="noreferrer"
              className="block p-3.5 bg-gray-50/50 dark:bg-white/5 hover:bg-blue-50/50 dark:hover:bg-blue-500/10 border border-gray-100 dark:border-white/5 rounded-2xl transition-all duration-300 ease-spring group active:scale-[0.98] hover:-translate-y-1 hover:shadow-float relative z-10"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className={`text-[11px] font-black ${error ? 'text-orange-400' : 'text-blue-500/70 dark:text-blue-400/70'}`}>
                    {item.date}
                  </div>
                  {error ? (
                    <AlertCircle size={12} className="text-orange-300 shrink-0" />
                  ) : (
                    <Plus size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  )}
                </div>
                <div className="text-[13.5px] font-black text-slate-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {item.title}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// === 儀表板主元件 ===
const DashboardTab = ({ 
  weeklySchedule, setWeeklySchedule, subjects, triggerNotification, 
  customLinks, contactBook, isEditingSchedule, setIsEditingSchedule, classID,
  saveToFirestore, setSettingsOpen
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Dashboard 狀態 ---
  const [editDayTab, setEditDayTab] = useState(() => {
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 1 : today;
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  
  // 檢查是否有課表資料 (排除 INITIAL_WEEKLY_SCHEDULE 的預設值)
  const hasCloudData = useMemo(() => {
    if (!weeklySchedule) return false;
    return Object.values(weeklySchedule).some(dayArr => dayArr && dayArr.length > 0);
  }, [weeklySchedule]);

  const displaySchedule = previewSchedule || weeklySchedule;
  const isAfter4PM = currentTime.getHours() >= 16;

  // 定期更新時間
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 當編輯結束時自動儲存到雲端
  const prevIsEditing = React.useRef(isEditingSchedule);
  useEffect(() => {
    if (prevIsEditing.current === true && isEditingSchedule === false) {
      saveToFirestore(weeklySchedule);
    }
    prevIsEditing.current = isEditingSchedule;
  }, [isEditingSchedule, weeklySchedule, saveToFirestore]);

  const encouragement = useMemo(() => {
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return ENCOURAGEMENTS[Math.abs(hash) % ENCOURAGEMENTS.length];
  }, []);

  // --- 智慧日期與「20:00 預習」邏輯 ---
  const { targetDay, isTomorrowMode, displayDate, targetDateStr } = useMemo(() => {
    const now = new Date(currentTime);
    const hours = now.getHours();
    const isTomorrow = hours >= 20;
    
    let tDay = now.getDay();
    let display = new Date(now);
    
    if (isTomorrow) {
      tDay = (tDay + 1) % 7;
      display.setDate(display.getDate() + 1);
    }
    
    // 週末處理：若為週六 (6) 或週日 (0)，強化至週一 (1)
    if (tDay === 0 || tDay === 6) {
      const daysUntilMonday = tDay === 0 ? 1 : 2;
      tDay = 1;
      display.setDate(display.getDate() + daysUntilMonday);
    }
    
    return { 
      targetDay: tDay, 
      isTomorrowMode: isTomorrow, 
      displayDate: display.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }),
      targetDateStr: display.toISOString().split('T')[0]
    };
  }, [currentTime]);

  // --- 倒數計時邏輯 (Countdowns) ---
  const countdowns = useMemo(() => {
    const calculateDays = (targetDate) => {
      const diff = new Date(targetDate) - new Date(currentTime.getFullYear(), currentTime.getMonth(), currentTime.getDate());
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    return {
      gsat116: calculateDays('2027-01-20'),
      midterm2: calculateDays('2026-05-12')
    };
  }, [currentTime]);

  const { currentClass, currentProgress } = useMemo(() => {
    // 進度條與當前課程始終顯示「今天」的真實狀態，不受預習模式影響
    const realDay = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todayList = (weeklySchedule && weeklySchedule[realDay]) || [];
    let active = null;
    let prog = 0;
    let totalDuration = 0;
    let elapsedDuration = 0;

    for (let c of todayList) {
      const start = timeToMins(c.startTime);
      const end = timeToMins(c.endTime);
      const duration = end - start;
      if (duration > 0) {
        totalDuration += duration;
        if (currentMins >= end) {
          elapsedDuration += duration;
        } else if (currentMins >= start && currentMins < end) {
          active = c;
          elapsedDuration += (currentMins - start);
        }
      }
    }
    if (totalDuration > 0) prog = (elapsedDuration / totalDuration) * 100;
    else prog = 100;

    return { currentClass: active, currentProgress: prog };
  }, [currentTime, weeklySchedule]);

  const tomorrowsPrep = useMemo(() => {
    if (!contactBook) return [];
    const allEntries = Object.values(contactBook).flat();
    // 根據目標日期（可能是明天或下週一）過濾準備事項
    return allEntries.filter(entry => entry.homeworkDeadline === targetDateStr || entry.examDeadline === targetDateStr);
  }, [contactBook, targetDateStr]);

  const upcomingDaysSchedule = useMemo(() => {
    // 這裡是底部的排程列表，應反映 targetDay
    const schedules = [];
    const classes = (weeklySchedule && weeklySchedule[targetDay]) || [];
    if (classes.length > 0) {
      schedules.push({ 
        title: isTomorrowMode ? '明日預習模式' : '今日學習排程', 
        subtitle: displayDate,
        classes, 
        dayOffset: 0 
      });
    }
    return schedules;
  }, [targetDay, weeklySchedule, isTomorrowMode, displayDate]);

  const updateSchedule = (id, field, value) => {
    const target = previewSchedule || weeklySchedule;
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    setter(prev => ({
      ...prev,
      [editDayTab]: (prev[editDayTab] || []).map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const deleteSchedule = (id) => {
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    setter(prev => ({
      ...prev,
      [editDayTab]: (prev[editDayTab] || []).filter(item => item.id !== id)
    }));
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!localStorage.getItem('gsat_gemini_key') && !localStorage.getItem('gsat_openrouter_key')) {
      triggerNotification('設定未完成', '請先至設定綁定 API Key');
      return;
    }

    setUploadLoading(true);
    triggerNotification('讀取中', '正在解析課表照片...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise(resolve => {
        reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      const prompt = `請分析這張課表照片。請嚴格以 JSON 格式回傳（不可有任何其他 markdown 符號或文字）。格式必須為一個包含 7 個陣列的物件，代表星期一到星期日（1~6, 0代表星期日）：
      {
        "1": [{"startTime": "08:00", "endTime": "09:00", "subject": "國文", "location": "教室", "teacher": ""}],
        "2": [], "3": [], "4": [], "5": [], "6": [], "0": []
      }`;

      // 呼叫 AI 進行 OCR 辨識
      const summary = await fetchAI(prompt, {
        temperature: 0.1,
        responseJson: true,
        image: { mimeType: 'image/jpeg', data: base64Data }
      });

      if (!summary) throw new Error('AI 未回傳資料');

      // 提取 JSON 區塊
      const jsonMatch = summary.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('無法解析 JSON 格式');
      
      const parsedData = JSON.parse(jsonMatch[0].trim());
      const newSchedule = { ...INITIAL_WEEKLY_SCHEDULE };
      
      Object.keys(parsedData).forEach(dayKey => {
        const dayIndex = dayKey === '0' || dayKey === '7' ? 0 : parseInt(dayKey);
        if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
          newSchedule[dayIndex] = (parsedData[dayKey] || []).map((item, index) => ({
            id: Date.now() + dayIndex * 1000 + index,
            subject: item.subject || '未命名課程',
            startTime: item.startTime || '08:00',
            endTime: item.endTime || '09:00',
            location: item.location || '',
            teacher: item.teacher || '',
            items: ''
          }));
        }
      });

      setPreviewSchedule(newSchedule);
      setIsEditingSchedule(true);
      triggerNotification('解析完成 ✨', '請檢查結果後儲存！');
    } catch (error) {
      triggerNotification('處理失敗', '請確認照片清晰');
    } finally {
      setUploadLoading(false);
    }
  };


  const liveStatus = useMemo(() => {
    if (!displaySchedule) return null;
    const currentDay = currentTime.getDay();
    const today = displaySchedule[currentDay] || [];

    // 確保時間字串格式為穩定的 HH:MM，避免 toLocaleTimeString 因瀏覽器差異導致問題
    const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;

    const ongoing = today.find(item => item && item.startTime && item.endTime && nowStr >= item.startTime && nowStr < item.endTime);
    if (ongoing) {
      const parts = ongoing.endTime.split(':');
      if (parts.length === 2) {
        const [endH, endM] = parts.map(Number);
        const remaining = (endH * 60 + endM) - (currentTime.getHours() * 60 + currentTime.getMinutes());
        return { type: 'ongoing', item: ongoing, remaining };
      }
    }

    const next = today
      .filter(item => item && item.startTime && item.startTime > nowStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
    if (next) {
      const parts = next.startTime.split(':');
      if (parts.length === 2) {
        const [startH, startM] = parts.map(Number);
        const countdown = (startH * 60 + startM) - (currentTime.getHours() * 60 + currentTime.getMinutes());
        return { type: 'next', item: next, countdown };
      }
    }
    return null;
  }, [displaySchedule, currentTime]);

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade px-1">
      {/* 頂部歡迎區塊 */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-indigo-950 dark:via-emerald-950 dark:to-slate-950 rounded-[36px] p-6 md:p-8 text-slate-900 dark:text-white shadow-soft border border-emerald-100 dark:border-white/10 relative transition-all duration-scale hover:scale-[1.01] overflow-hidden glass-effect" style={{'--tw-text-opacity': '1'}}>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              {React.createElement(getGreeting().icon, { size: 32, className: "shrink-0", strokeWidth: 3 })}
              <span>{getGreeting().text}</span>
            </h2>
            <div className="flex flex-col items-end">
              <span className="text-emerald-800 dark:text-emerald-100/80 text-[11px] font-black opacity-80 uppercase tracking-widest">Current Time</span>
              <LiveClock />
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-end flex-wrap gap-x-4">
              <span className="text-emerald-800 dark:text-emerald-100/80 text-[13px] font-black opacity-90 tracking-widest uppercase">今日課程進度</span>
              <span className="text-emerald-900 dark:text-white text-[20px] font-black">{Math.round(currentProgress)}%</span>
            </div>
            <div className="h-2.5 bg-emerald-200/50 dark:bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-emerald-100/50 dark:border-white/5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out" 
                style={{ width: `${currentProgress}%` }} 
              />
            </div>
          </div>

          {/* 整合式課程動態 */}
          {(liveStatus || currentProgress >= 100) && (
            <div className="mt-6 bg-emerald-50/80 dark:bg-white/10 backdrop-blur-xl rounded-[24px] p-4 border border-emerald-200 dark:border-white/30 animate-fadeIn flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${ (liveStatus?.type === 'ongoing') ? 'bg-emerald-600 text-white animate-pulse-live' : (currentProgress >= 100 ? 'bg-orange-400 text-white' : 'bg-blue-400 text-white') }`}>
                  { (liveStatus?.type === 'ongoing') ? 
                    React.createElement(getSubjectIcon(liveStatus.item.subject), { size: 22, className: "shrink-0" }) : 
                    (currentProgress >= 100 ? React.createElement(ICON_MAP.Utensils, { size: 22, className: "shrink-0" }) : React.createElement(ICON_MAP.Clock, { size: 22, className: "shrink-0" })) 
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-600/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-emerald-700 dark:text-emerald-400">
                      { (liveStatus?.type === 'ongoing') ? 'Live Now' : (currentProgress >= 100 ? 'Finished' : 'Upcoming') }
                    </span>
                  </div>
                  <h4 className="text-[14px] font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                    {liveStatus?.item.rescheduled && <span className="text-sm">🔔</span>}
                    { currentProgress >= 100 ? '今日課程已全部結束' : liveStatus?.item.subject }
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-emerald-100/90 mt-0.5 opacity-90">
                    { currentProgress >= 100 ? encouragement : (liveStatus?.item.location || '教室環境') }
                  </p>
                </div>
              </div>
              {liveStatus && (
                <div className="flex flex-col items-end bg-emerald-600/10 dark:bg-black/10 px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-white/10">
                  <span className="text-[16px] font-black text-emerald-900 dark:text-white leading-none">{liveStatus.type === 'ongoing' ? liveStatus.remaining : liveStatus.countdown}</span>
                  <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-100 uppercase tracking-tighter mt-1">
                    {liveStatus.type === 'ongoing' ? 'MIN LEFT' : 'MINS TO'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 text-emerald-900 dark:text-white opacity-5 dark:opacity-10 w-40 h-40 pointer-events-none" />
      </div>





      {/* 學習排程區塊 */}
      <div id="schedule-section" className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[40px] border border-[var(--border-color)] shadow-soft relative overflow-hidden transition-all duration-500">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center shrink-0">
              <Calendar className="text-emerald-500 shrink-0" size={22} />
            </div>
            <div>
              <h3 className="text-[20px] font-black text-slate-900 dark:text-white">
                {isEditingSchedule ? '管理班級課表' : (isTomorrowMode ? '明日預習模式' : '今日學習排程')}
              </h3>
              {!isEditingSchedule && (
                <p className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-0.5">
                  {displayDate}
                </p>
              )}
            </div>
          </div>
          {isEditingSchedule && (
            <button 
              onClick={() => setIsEditingSchedule(false)} 
              className="px-5 py-2 bg-emerald-600 text-white rounded-2xl text-sm font-black active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
            >
              完成並儲存
            </button>
          )}
        </div>

        {isEditingSchedule ? (
          <div className="flex flex-col gap-4">
            {!previewSchedule && (
              <label className="border-2 border-dashed border-emerald-200 dark:border-emerald-900/30 rounded-3xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
                {uploadLoading ? <RefreshCw className="animate-spin text-emerald-500" size={32} /> : <ImageIcon className="text-emerald-400 group-hover:scale-110 transition-transform" size={32} />}
                <div className="text-center">
                  <span className="block text-emerald-600 dark:text-emerald-400 font-black text-lg">{uploadLoading ? 'AI 解析中...' : '上傳課表照片'}</span>
                  <span className="text-xs text-emerald-600/60 dark:text-emerald-400/40 font-bold">由 AI 自動辨識課程與時間</span>
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
            {previewSchedule && (
              <div className="flex gap-3">
                <button onClick={() => setPreviewSchedule(null)} className="flex-1 py-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl font-black active:scale-95 transition-all">放棄重測</button>
                <button onClick={() => { setWeeklySchedule(previewSchedule); setPreviewSchedule(null); setIsEditingSchedule(false); }} className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-emerald-500/20">儲存結果</button>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {WEEKDAYS.map(d => (
                <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-5 py-3 rounded-2xl font-black whitespace-nowrap transition-all ${editDayTab === d.id ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>{d.label}</button>
              ))}
            </div>
            <div className="space-y-4">
              {(displaySchedule[editDayTab] || []).map(item => (
                <div key={item.id} className="p-6 bg-gray-50 dark:bg-white/5 rounded-[32px] border border-gray-100 dark:border-white/5 relative group">
                  <input type="text" value={item.subject} onChange={e => updateSchedule(item.id, 'subject', e.target.value)} className="w-full bg-transparent font-black text-xl text-gray-900 dark:text-white outline-none mb-4" placeholder="課程名稱" />
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">授課教師</span>
                      <input type="text" value={item.teacher} onChange={e => updateSchedule(item.id, 'teacher', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-100 dark:border-white/5" placeholder="老師" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">上課地點</span>
                      <input type="text" value={item.location} onChange={e => updateSchedule(item.id, 'location', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-100 dark:border-white/5" placeholder="地點" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                    <Clock size={16} className="text-emerald-500" />
                    <div className="flex-1 flex items-center justify-between px-2">
                       <input type="time" value={item.startTime} onChange={e => updateSchedule(item.id, 'startTime', e.target.value)} className="bg-transparent font-mono font-bold text-gray-700 dark:text-gray-300 outline-none w-[70px]" />
                       <span className="text-gray-200 dark:text-gray-700">➜</span>
                       <input type="time" value={item.endTime} onChange={e => updateSchedule(item.id, 'endTime', e.target.value)} className="bg-transparent font-mono font-bold text-gray-700 dark:text-gray-300 outline-none w-[70px]" />
                    </div>
                  </div>
                  
                  {/* Rescheduled Toggle */}
                  <div className="mt-4 flex items-center justify-between px-2">
                    <span className="text-[12px] font-black text-gray-500 flex items-center gap-2">
                      <Bell size={14} className={item.rescheduled ? 'text-orange-500' : 'text-gray-300'} /> 調課通知模式
                    </span>
                    <button 
                      onClick={() => updateSchedule(item.id, 'rescheduled', !item.rescheduled)}
                      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none ${item.rescheduled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${item.rescheduled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <button onClick={() => deleteSchedule(item.id)} className="absolute top-4 right-4 text-red-400/50 hover:text-red-500 p-2 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={20} /></button>
                </div>
              ))}
              <button 
                onClick={() => setWeeklySchedule(prev => ({ ...prev, [editDayTab]: [...(prev[editDayTab] || []), { id: Date.now(), subject: '', startTime: '08:00', endTime: '09:00', location: '', teacher: '' }] }))} 
                className="w-full py-5 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[32px] text-gray-400 dark:text-gray-600 font-black hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:text-emerald-500 transition-all active:scale-[0.98]"
              >
                + 新增課程內容
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Timeline Vertical Line - Extending to full height */}
            <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent dark:from-emerald-500/30 dark:via-emerald-500/10 rounded-full" />
            
            <div className="space-y-10">
              {(!classID || !hasCloudData) && !isEditingSchedule ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-pulse-slow">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30">
                    <Calendar size={32} className="text-blue-500" />
                  </div>
                  <h4 className="text-[17px] font-black text-gray-900 dark:text-white mb-2">尚未建立班級課表</h4>
                  <p className="text-[13px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                    請點擊右上角「設定」進入班級設定進行初始化<br/>並同步雲端課表。
                  </p>
                  <button 
                    onClick={() => setSettingsOpen()}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-[14px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    前往設定分頁
                  </button>
                </div>
              ) : (
                <>
                  {upcomingDaysSchedule.length === 0 && <p className="text-gray-400 text-center py-6 font-bold">未來幾天沒有排程喔！</p>}
                  {upcomingDaysSchedule.map((group, gIdx) => ( group.dayOffset === 0 && (
                <div key={gIdx} className="space-y-6">
                  <div className="space-y-4">
                    {group.classes.map((item) => {
                      const isActive = currentClass?.id === item.id;
                      const IconComp = getSubjectIcon(item.subject);

                      return (
                        <div key={item.id} className="relative group">
                          {/* Timeline Node - Added Glow effect for active state */}
                          <div className={`absolute -left-[33px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[3px] transition-all duration-500 z-10 ${isActive ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-800 scale-125 neon-glow-emerald shadow-[0_0_15px_#10b981]' : 'bg-gray-300 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:border-emerald-500/50'}`} />
                          
                          {/* Pill Card - Refined padding, border and perfect rounding */}
                          <div className={`flex items-center gap-4 px-6 py-4 rounded-full border transition-all duration-500 ${isActive ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-white/20 shadow-[0_15px_40px_rgba(16,185,129,0.3)] scale-[1.03]' : item.rescheduled ? 'bg-orange-50/20 dark:bg-orange-950/20 border-orange-500/60 shadow-[0_0_20px_rgba(255,152,0,0.15)]' : 'bg-white dark:bg-white/10 shadow-sm dark:shadow-none border-gray-100 dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/10 hover:border-emerald-500/30'}`} style={item.rescheduled && !isActive ? { border: '2px solid #ff9800', boxShadow: '0 0 15px rgba(255, 152, 0, 0.3)' } : {}}>
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 transition-transform duration-500 ${isActive ? 'bg-white/20 scale-110' : item.rescheduled ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                              <IconComp size={22} className="shrink-0" />
                            </div>
                            
                            <div className="flex-1 flex items-center justify-between gap-4 overflow-hidden">
                              <div className="flex flex-col min-w-0">
                                <span className={`text-[15.5px] font-black truncate flex items-center gap-1.5 ${isActive ? 'text-white' : 'text-slate-800 dark:text-gray-100'}`}>
                                  {item.rescheduled && <span className="text-lg">🔔</span>}
                                  {item.subject}
                                </span>
                                <span className={`text-[11.5px] font-bold truncate transition-opacity ${isActive ? 'text-white/70' : 'text-slate-500 dark:text-gray-500 opacity-80'}`}>
                                  {item.teacher || '自主進度'} {item.location && ` @ ${item.location}`}
                                </span>
                              </div>
                              
                              {item.startTime !== item.endTime && (
                                <div className={`shrink-0 px-1 py-1 text-[11.5px] font-mono font-black transition-colors ${isActive ? 'text-white/90' : 'text-gray-400'}`}>
                                  {item.startTime} - {item.endTime}
                                </div>
                              )}
                            </div>

                            {isActive && (
                              <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                  )))}
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 外部連結 */}
      <div className="bg-white/40 dark:bg-slate-900/40 backdrop-blur-2xl p-6 md:p-8 rounded-[40px] border border-white/20 dark:border-white/5 shadow-soft">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center">
            <Globe className="text-blue-500" size={22} />
          </div>
          <h3 className="text-[20px] font-black text-gray-900 dark:text-white">外部連結</h3>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {customLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-3 p-5 bg-white/50 dark:bg-white/5 rounded-[28px] active:scale-95 transition-all duration-300 ease-spring border border-white/20 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 hover:-translate-y-1 hover:shadow-float group">
              <div className="p-3 bg-blue-500/10 rounded-2xl group-hover:scale-110 transition-transform duration-300 shrink-0">
                {React.createElement(getLinkIcon(link.icon), { size: 26, className: "text-blue-500 shrink-0" })}
              </div>
              <span className="text-[14px] font-black text-slate-800 dark:text-gray-200 text-center truncate w-full px-1">{link.title}</span>
            </a>
          ))}
        </div>
      </div>

      <SchoolNewsWidget />

      {/* 明日準備事項 */}
      {tomorrowsPrep.length > 0 && !isEditingSchedule && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-6 rounded-[36px] border border-orange-100 dark:border-orange-900/30 shadow-sm animate-pop-in">
          <h3 className="text-[16px] font-black text-orange-800 dark:text-orange-400 flex items-center gap-2 mb-4">
            <BellRing size={20} className="text-orange-500" /> 明日準備事項
          </h3>
          <div className="flex flex-col gap-3">
            {tomorrowsPrep.map((item) => (
              <div key={item.id} className="bg-white/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20 shadow-sm flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600 dark:text-orange-400">
                  {React.createElement(getSubjectIcon(item.subject), { size: 20 })}
                </div>
                <div>
                  <span className="text-[12px] font-black bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-lg mb-2 inline-block">{item.subject}</span>
                  {item.homeworkDeadline === targetDateStr && <p className="text-[14px] font-bold text-slate-800 dark:text-gray-200">📝 {item.homework}</p>}
                  {item.examDeadline === targetDateStr && <p className="text-[14px] font-bold text-slate-800 dark:text-gray-200 mt-1">💯 考試：{item.exam}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


    </div>
  );
};

export default DashboardTab;