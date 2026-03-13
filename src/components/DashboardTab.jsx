import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Clock, BellRing, Calendar, RefreshCw,
  Image as ImageIcon, Trash2, MapPin, Plus,
  Globe, AlertCircle, BookText, Utensils, Bell,
  Sun, Moon, Coffee, ChevronRight, ArrowUpDown, Check
} from 'lucide-react';
import {
  INITIAL_WEEKLY_SCHEDULE, WEEKDAYS, ICON_MAP
} from '../utils/constants';
import { fetchAI } from '../utils/helpers';
// Firestore moved to App.jsx for global sync

// === 外部函式與常數 ===
const getGreeting = () => {
  const h = new Date().getHours();
  if (6 <= h && h < 12) return { text: '早安', icon: Sun };
  if (12 <= h && h < 16) return { text: '午安', icon: Coffee };
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

const EXAM_DATES = {
  gsat: "2027-01-16",
  midterm: "2026-03-24"
};

const getDaysLeft = (targetDate) => {
  const diff = new Date(targetDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};


const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};


const getLinkIcon = (iconName) => {
  return ICON_MAP[iconName] || ICON_MAP.Globe;
};

const getSubjectTheme = (subjectName, subjects) => {
  const s = subjects.find(sub => sub.name === subjectName) || { color: 'text-emerald-500' };
  const colorStr = s.color || 'text-emerald-500';
  const baseColor = colorStr.split('-')[1]; // e.g., 'red', 'blue'
  return {
    text: colorStr,
    bg: `bg-${baseColor}-500/10`,
    border: `border-${baseColor}-500/20`,
    shadow: `shadow-${baseColor}-500/10`,
    accent: `bg-${baseColor}-500`,
    glow: `neon-glow-${baseColor}`
  };
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
  isAdmin, weeklySchedule, setWeeklySchedule, subjects, triggerNotification,
  customLinks, contactBook, isEditingSchedule, setIsEditingSchedule, classID,
  saveToFirestore, setSettingsOpen, customCountdowns
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // --- Dashboard 狀態 ---
  const [editDayTab, setEditDayTab] = useState(() => {
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 1 : today;
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState([]); // Array of 2 IDs

  // 檢查是否有課表資料 (排除 INITIAL_WEEKLY_SCHEDULE 的預設值)
  const hasCloudData = useMemo(() => {
    if (!weeklySchedule) return false;
    return Object.values(weeklySchedule).some(dayArr => dayArr && dayArr.length > 0);
  }, [weeklySchedule]);

  const displaySchedule = previewSchedule || weeklySchedule;

  // 定期更新時間
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // 🔥 修復：當編輯結束時自動儲存到雲端，並強勢濾除 undefined
  const prevIsEditing = React.useRef(isEditingSchedule);
  useEffect(() => {
    if (prevIsEditing.current === true && isEditingSchedule === false) {
      // 確保將所有的 undefined 清除，防止 Firestore 報錯
      const cleanSchedule = JSON.parse(JSON.stringify(weeklySchedule || {}));
      saveToFirestore(cleanSchedule);
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
  const { targetDay, isTomorrowMode, displayDate, targetDateStr, isWeekendRest } = useMemo(() => {
    const now = new Date(currentTime);
    const day = now.getDay();
    const hours = now.getHours();
    
    // 計算今天最後一堂課的結束時間
    const todayClasses = (weeklySchedule && weeklySchedule[day]) || [];
    const lastClassMins = todayClasses.reduce((max, c) => Math.max(max, timeToMins(c.endTime)), 0);
    const currentMins = now.getHours() * 60 + now.getMinutes();

    // 假日休息判斷邏輯：
    // 1. 週五且課程已結束
    // 2. 週六全天
    // 3. 週日且未到 20:00
    const isFridayEnd = (day === 5 && currentMins >= lastClassMins && lastClassMins > 0);
    const isSaturday = (day === 6);
    const isSundayBefore8 = (day === 0 && hours < 20);
    const weekendRest = isFridayEnd || isSaturday || isSundayBefore8;

    let tDay = day;
    let display = new Date(now);
    let tomorrowMode = hours >= 20;

    if (tomorrowMode) {
      tDay = (tDay + 1) % 7;
      display.setDate(display.getDate() + 1);
    }

    // 若非週末休息，且目標日期是週末，自動跳轉到週一
    if (!weekendRest && (tDay === 0 || tDay === 6)) {
      const daysUntilMonday = tDay === 0 ? 1 : 2;
      tDay = 1;
      display.setDate(display.getDate() + daysUntilMonday);
    }

    return {
      targetDay: tDay,
      isTomorrowMode: tomorrowMode,
      displayDate: display.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }),
      targetDateStr: display.toISOString().split('T')[0],
      isWeekendRest: weekendRest
    };
  }, [currentTime, weeklySchedule]);

  // --- 💡 當前課程進度計算 ---
  const { currentClass, currentProgress, hasClassesToday } = useMemo(() => {
    const realDay = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todayList = (weeklySchedule && weeklySchedule[realDay]) || [];

    if (todayList.length === 0) {
      return { currentClass: null, currentProgress: 100, hasClassesToday: false };
    }

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
          elapsedDuration += duration; // 這堂課已結束
        } else if (currentMins >= start && currentMins < end) {
          active = c; // 正在進行中
          elapsedDuration += (currentMins - start);
        }
      }
    }
    if (totalDuration > 0) prog = (elapsedDuration / totalDuration) * 100;
    else prog = 100;

    return {
      currentClass: active,
      currentProgress: Math.min(100, Math.max(0, prog)), // 確保在 0~100 之間
      hasClassesToday: true
    };
  }, [currentTime, weeklySchedule]);

  const tomorrowsPrep = useMemo(() => {
    if (!contactBook) return [];
    const allEntries = Object.values(contactBook).flat();
    return allEntries.filter(entry => entry.homeworkDeadline === targetDateStr || entry.examDeadline === targetDateStr);
  }, [contactBook, targetDateStr]);

  const upcomingDaysSchedule = useMemo(() => {
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

      const summary = await fetchAI(prompt, {
        temperature: 0.1,
        responseJson: true,
        image: { mimeType: 'image/jpeg', data: base64Data }
      });

      if (!summary) throw new Error('AI 未回傳資料');

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
            rescheduled: false // 預設沒有被調課
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

  const handleSwap = async (id1, id2) => {
    const today = currentTime.getDay();
    const list = [...(weeklySchedule[today] || [])];
    const idx1 = list.findIndex(i => i.id === id1);

    if (idx1 === -1) return;

    if (id2 === 'absent') {
      const item = list[idx1];
      list[idx1] = {
        ...item,
        subject: '自習 (老師請假)',
        rescheduled: true
      };
      triggerNotification('標記成功 📝', `「${item.subject}」已變更為自習`);
    } else {
      const idx2 = list.findIndex(i => i.id === id2);
      if (idx2 === -1) return;

      // Swap course details but keep IDs and times
      const item1 = { ...list[idx1] };
      const item2 = { ...list[idx2] };

      list[idx1] = {
        ...list[idx1],
        subject: item2.subject,
        teacher: item2.teacher,
        location: item2.location,
        rescheduled: true
      };
      list[idx2] = {
        ...list[idx2],
        subject: item1.subject,
        teacher: item1.teacher,
        location: item1.location,
        rescheduled: true
      };
      triggerNotification('調課成功 ⚡', `已對調「${item1.subject}」與「${item2.subject}」並同步雲端`);
    }

    const newWeekly = { ...weeklySchedule, [today]: list };
    setWeeklySchedule(newWeekly);
    setIsSwapMode(false);
    setSelectedForSwap([]);

    // Sync to Firebase directly
    const cleanSchedule = JSON.parse(JSON.stringify(newWeekly));
    await saveToFirestore(cleanSchedule);
    triggerNotification('調課成功 ⚡', `已對調「${item1.subject}」與「${item2.subject}」並同步雲端`);
  };

  const toggleSwapSelect = (id) => {
    if (!isSwapMode) return;
    setSelectedForSwap(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      const next = [...prev, id];
      if (next.length === 2) {
        handleSwap(next[0], next[1]);
        return [];
      }
      return next;
    });
  };


  // --- 💡 升級版：全自動時間動態判斷 (支援跨日預測) ---
  const liveStatus = useMemo(() => {
    if (!displaySchedule) return null;
    const currentDay = currentTime.getDay();
    const today = displaySchedule[currentDay] || [];

    const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    // 1. 判斷是否有正在進行的課 (Ongoing)
    const ongoing = today.find(item => item && item.startTime && item.endTime && nowStr >= item.startTime && nowStr < item.endTime);
    if (ongoing) {
      const parts = ongoing.endTime.split(':');
      if (parts.length === 2) {
        const remaining = (Number(parts[0]) * 60 + Number(parts[1])) - currentMins;
        return { type: 'ongoing', item: ongoing, remaining, label: 'Live Now' };
      }
    }

    // 2. 判斷今天是否有下一堂課 (Next Today)
    const nextToday = today
      .filter(item => item && item.startTime && item.startTime > nowStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    if (nextToday) {
      const parts = nextToday.startTime.split(':');
      if (parts.length === 2) {
        const countdown = (Number(parts[0]) * 60 + Number(parts[1])) - currentMins;
        return { type: 'next', item: nextToday, countdown, label: 'Upcoming' };
      }
    }

    // 3. 跨日預測：今天課上完了，或是今天是週末，預測「下一個上課日」的第一堂課
    let nextDay = (currentDay + 1) % 7;
    let isWeekendJump = false;

    if (nextDay === 0 || nextDay === 6 || currentDay === 5) {
      nextDay = 1; // 如果明天是週末，或是今天是週五，直接跳到週一
      isWeekendJump = true;
    }

    const nextDayClasses = displaySchedule[nextDay] || [];
    const firstNextClass = nextDayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    if (firstNextClass) {
      return {
        type: 'tomorrow',
        item: firstNextClass,
        label: isWeekendJump ? '下週一首堂' : '明日首堂'
      };
    }

    return null;
  }, [displaySchedule, currentTime]);

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade px-1">
      {/* 頂部歡迎區塊 */}
      <div className="bg-gradient-to-br from-emerald-50 to-teal-100 dark:from-indigo-950 dark:via-emerald-950 dark:to-slate-950 rounded-[36px] p-6 md:p-8 text-slate-900 dark:text-white shadow-soft border border-emerald-100 dark:border-white/10 relative transition-all duration-scale hover:scale-[1.01] overflow-hidden glass-effect" style={{ '--tw-text-opacity': '1' }}>
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
              <span className="text-emerald-800 dark:text-emerald-100/80 text-[13px] font-black opacity-90 tracking-widest uppercase">
                {hasClassesToday ? '今日課程進度' : '今日無課程安排'}
              </span>
              <span className="text-emerald-900 dark:text-white text-[20px] font-black">{Math.round(currentProgress)}%</span>
            </div>
            <div className="h-2.5 bg-emerald-200/50 dark:bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-emerald-100/50 dark:border-white/5">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-out"
                style={{ width: `${currentProgress}%` }}
              />
            </div>
          </div>

          {/* 整合式課程動態 (包含跨日預測) */}
          {(liveStatus || currentProgress >= 100) && (
            <div className="mt-6 bg-emerald-50/60 dark:bg-white/5 backdrop-blur-2xl rounded-[24px] p-4 border border-emerald-200/50 dark:border-white/20 animate-fadeIn flex items-center justify-between shadow-glass">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${(liveStatus?.type === 'ongoing') ? 'bg-emerald-600' : (liveStatus?.type === 'tomorrow' ? 'bg-purple-500' : (currentProgress >= 100 ? 'bg-orange-400' : 'bg-blue-400'))}`}>
                  <Clock size={22} className="text-white shrink-0" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${liveStatus?.type === 'tomorrow' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'bg-emerald-600/10 dark:bg-white/10 text-emerald-700 dark:text-emerald-400'}`}>
                      {liveStatus ? liveStatus.label : 'Finished'}
                    </span>
                  </div>
                  <h4 className="text-[14px] font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                    {liveStatus?.item.rescheduled && <span className="text-sm" title="調課通知">🔔</span>}
                    {liveStatus ? liveStatus.item.subject : '今日課程已全部結束'}
                  </h4>
                  <p className="text-[11px] font-bold text-slate-500 dark:text-emerald-100/90 mt-0.5 opacity-90">
                    {liveStatus?.type === 'tomorrow' ? `${liveStatus.item.startTime} 開始上課` : (liveStatus ? (liveStatus.item.location || '教室環境') : encouragement)}
                  </p>
                </div>
              </div>
              {/* 右側時間顯示 (智慧切換：>30m 顯示時間, <=30m 顯示倒數) */}
              {liveStatus && liveStatus.type !== 'tomorrow' && (
                <div className="flex flex-col items-end bg-emerald-600/10 dark:bg-black/10 px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-white/10">
                  <span className="text-[16px] font-black text-emerald-900 dark:text-white leading-none">
                    {liveStatus.type === 'ongoing'
                      ? liveStatus.remaining
                      : (liveStatus.countdown > 30 ? liveStatus.item.startTime : liveStatus.countdown)
                    }
                  </span>
                  <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-100 uppercase tracking-tighter mt-1">
                    {liveStatus.type === 'ongoing'
                      ? 'MIN LEFT'
                      : (liveStatus.countdown > 30 ? 'START TIME' : 'MINS TO')
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 text-emerald-900 dark:text-white opacity-5 dark:opacity-10 w-40 h-40 pointer-events-none" />
      </div>

      {/* 自定義倒數區塊 */}
      <div className={`grid ${customCountdowns?.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
        {customCountdowns?.map((item, i) => {
          const days = getDaysLeft(item.date);
          const style = item.style || 'gradient';
          
          const styles = {
            simple: "bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 text-slate-800 dark:text-white",
            gradient: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
            neon: "bg-slate-900 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]"
          };

          return (
            <div key={item.id || i} className={`${styles[style] || styles.gradient} rounded-[32px] p-5 shadow-soft relative overflow-hidden group active:scale-[0.98] transition-all`}>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={16} className="opacity-80" />
                  <span className="text-[12px] font-black opacity-90 tracking-wider font-sans">{item.title}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] font-black leading-none">{Math.max(0, days)}</span>
                  <span className="text-[12px] font-bold opacity-70">Days</span>
                </div>
              </div>
              <Sparkles className="absolute -right-4 -bottom-4 w-20 h-20 opacity-10 group-hover:scale-125 transition-transform duration-700" />
            </div>
          );
        })}
      </div>

      {/* 學習排程區塊 */}
      <div id="schedule-section" className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[40px] border border-[var(--border-color)] shadow-soft relative overflow-hidden transition-all duration-500">
        {isWeekendRest && !isEditingSchedule ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
              <Sun className="text-emerald-500" size={40} />
            </div>
            <h4 className="text-[22px] font-black text-slate-900 dark:text-white mb-2">假日休息中 ✨</h4>
            <p className="text-slate-500 dark:text-gray-400 font-bold max-w-[200px]">辛苦了一週，好好充電！週晚 20:00 後顯示新課程。</p>
          </div>
        ) : isEditingSchedule ? (
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
                  <input type="text" value={item.subject || ''} onChange={e => updateSchedule(item.id, 'subject', e.target.value)} className="w-full bg-transparent font-black text-xl text-gray-900 dark:text-white outline-none mb-4" placeholder="課程名稱" />
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">授課教師</span>
                      <input type="text" value={item.teacher || ''} onChange={e => updateSchedule(item.id, 'teacher', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-100 dark:border-white/5" placeholder="老師" />
                    </div>
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">上課地點</span>
                      <input type="text" value={item.location || ''} onChange={e => updateSchedule(item.id, 'location', e.target.value)} className="w-full p-3 bg-white dark:bg-slate-800 rounded-xl text-sm font-bold border border-gray-100 dark:border-white/5" placeholder="地點" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-gray-100 dark:border-white/5">
                    <Clock size={16} className="text-emerald-500" />
                    <div className="flex-1 flex items-center justify-between px-2">
                      <input type="time" value={item.startTime || ''} onChange={e => updateSchedule(item.id, 'startTime', e.target.value)} className="bg-transparent font-mono font-bold text-gray-700 dark:text-gray-300 outline-none w-[70px]" />
                      <span className="text-gray-200 dark:text-gray-700">➜</span>
                      <input type="time" value={item.endTime || ''} onChange={e => updateSchedule(item.id, 'endTime', e.target.value)} className="bg-transparent font-mono font-bold text-gray-700 dark:text-gray-300 outline-none w-[70px]" />
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
                onClick={() => setWeeklySchedule(prev => ({ ...prev, [editDayTab]: [...(prev[editDayTab] || []), { id: Date.now(), subject: '', startTime: '08:00', endTime: '09:00', location: '', teacher: '', rescheduled: false }] }))}
                className="w-full py-5 border-2 border-dashed border-gray-100 dark:border-white/5 rounded-[32px] text-gray-400 dark:text-gray-600 font-black hover:border-emerald-200 dark:hover:border-emerald-900/30 hover:text-emerald-500 transition-all active:scale-[0.98]"
              >
                + 新增課程內容
              </button>
            </div>
          </div>
        ) : (
          <div className="relative pl-8">
            {/* Timeline Vertical Line */}
            <div className="absolute left-[3px] top-0 bottom-0 w-[2px] bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent dark:from-emerald-500/30 dark:via-emerald-500/10 rounded-full" />

            <div className="space-y-10">
              {(!classID || !hasCloudData) && !isEditingSchedule ? (
                <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-pulse-slow">
                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-3xl flex items-center justify-center mb-4 border border-blue-100 dark:border-blue-900/30">
                    <Calendar size={32} className="text-blue-500" />
                  </div>
                  <h4 className="text-[17px] font-black text-gray-900 dark:text-white mb-2">尚未建立班級課表</h4>
                  <p className="text-[13px] font-bold text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                    請點擊右上角「設定」進入班級設定進行初始化<br />並同步雲端課表。
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
                  {upcomingDaysSchedule.map((group, gIdx) => (group.dayOffset === 0 && (
                    <div key={gIdx} className="space-y-6">
                      <div className="space-y-4">
                        {(() => {
                          const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
                          const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                          const safeClasses = group?.classes || [];
                          const sortedClasses = [...safeClasses].sort((a, b) => {
                            const aStart = a?.startTime || '00:00';
                            const bStart = b?.startTime || '00:00';
                            return aStart.localeCompare(bStart);
                          });
                          const elements = [];
                          let nowMarkerPlaced = false;

                          sortedClasses.forEach((item, idx) => {
                            const startMins = timeToMins(item.startTime);
                            const endMins = timeToMins(item.endTime);
                            const prevEndMins = idx > 0 ? timeToMins(sortedClasses[idx - 1].endTime) : null;

                            // Insert Break
                            if (prevEndMins !== null && startMins > prevEndMins) {
                              const breakDuration = startMins - prevEndMins;

                              // Check if "Now" is during this break
                              if (!nowMarkerPlaced && currentMins >= prevEndMins && currentMins < startMins) {
                                elements.push({ type: 'now', id: `now-marker-${idx}` });
                                nowMarkerPlaced = true;
                              }

                              elements.push({
                                type: 'break',
                                id: `break-${idx}-${item.id || idx}`,
                                duration: breakDuration,
                                startTime: sortedClasses[idx - 1].endTime || '00:00',
                                endTime: item.startTime || '00:00'
                              });
                            }

                            // Check if "Now" is at the start of today or before first class
                            if (!nowMarkerPlaced && idx === 0 && currentMins < startMins) {
                              elements.push({ type: 'now', id: 'now-start' });
                              nowMarkerPlaced = true;
                            }

                            // Check if "Now" is during this class (handled by isActive styling, but we could add a marker too)
                            // For simplicity, we'll just style the card as active. 
                            // But if we want a line *inside* the class card, that's different.
                            // The user asked for "時間軸標示", which is usually a line on the vertical timeline.

                            elements.push({ type: 'class', ...item });

                            // Check if "Now" is right after this class
                            if (!nowMarkerPlaced && currentMins >= startMins && currentMins < endMins) {
                              // We don't push a separate 'now' element if it's DURING the class,
                              // but we mark it as placed so we don't put it in the next break erroneously.
                              nowMarkerPlaced = true;
                            }
                          });

                          // If now is after all classes
                          if (!nowMarkerPlaced && sortedClasses.length > 0 && currentMins >= timeToMins(sortedClasses[sortedClasses.length - 1].endTime)) {
                            elements.push({ type: 'now', id: 'now-end' });
                          }

                          return elements.map((el) => {
                            if (el.type === 'now') {
                              return (
                                <div key={el.id} className="relative flex items-center gap-4 py-2 my-1">
                                  <div className="absolute -left-[35px] w-4.5 h-4.5 bg-rose-500 rounded-full border-[3.5px] border-white dark:border-slate-900 shadow-[0_0_15px_rgba(244,63,94,0.8)] z-20 animate-pulse" />
                                  <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500/60 to-transparent relative">
                                    <span className="absolute -top-4 left-3 text-[10px] font-black text-rose-500 bg-rose-50/80 dark:bg-rose-950/40 px-2 py-0.5 rounded-full backdrop-blur-md border border-rose-200/50 dark:border-rose-500/20 tracking-tighter shadow-sm">現在時間</span>
                                  </div>
                                </div>
                              );
                            }

                            if (el.type === 'break') {
                              const isCurrentBreak = currentTime.getHours() * 60 + currentTime.getMinutes() >= timeToMins(el.startTime) && currentTime.getHours() * 60 + currentTime.getMinutes() < timeToMins(el.endTime);

                              if (!isCurrentBreak) return null;

                              return (
                                <div key={el.id} className={`relative group/break py-3 pr-2 transition-all duration-500 ${isCurrentBreak ? 'scale-[1.02] opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                                  {/* Break Indicator on Timeline */}
                                  <div className={`absolute -left-[30px] top-0 bottom-0 w-[4px] rounded-full transition-colors ${isCurrentBreak ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 'bg-gray-200 dark:bg-white/10'}`} />

                                  <div className={`ml-4 flex items-center gap-3 p-3 rounded-2xl border transition-all ${isCurrentBreak ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-500/20' : 'bg-transparent border-transparent'}`}>
                                    <div className={`h-[1px] w-6 border-t border-dashed transition-colors ${isCurrentBreak ? 'border-orange-400' : 'border-gray-300 dark:border-gray-600'}`} />
                                    <span className={`text-[12px] font-black flex items-center gap-2 ${isCurrentBreak ? 'text-orange-600 dark:text-orange-400 animate-pulse' : 'text-slate-400 dark:text-gray-500'}`}>
                                      ☕ 休息時間 {el.duration} 分鐘
                                    </span>
                                    <div className="h-[1px] flex-1 border-t border-dashed border-gray-300 dark:border-gray-600 opacity-50" />
                                  </div>
                                </div>
                              );
                            }

                            const item = el;
                            const isActive = currentClass?.id === item.id;

                            return (
                              <div key={item.id} className="relative group">
                                {/* Timeline Node */}
                                <div className={`absolute -left-[33px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[3px] transition-all duration-500 z-10 ${isActive ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-800 scale-125 neon-glow-emerald shadow-[0_0_15px_#10b981]' : 'bg-gray-300 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:border-emerald-500/50'}`} />

                                {/* Pill Card */}
                                <div
                                  onClick={() => toggleSwapSelect(item.id)}
                                  className={`flex items-center gap-4 px-6 py-4 rounded-full border transition-all duration-300 cursor-pointer active:scale-[0.96] hover:shadow-float backdrop-blur-md
                                   ${isActive ? 'bg-gradient-to-r from-emerald-500/90 to-teal-500/90 text-white border-white/30 shadow-[0_15px_40px_rgba(16,185,129,0.3)] scale-[1.05] backdrop-blur-xl ring-4 ring-emerald-500/20' :
                                      item.rescheduled ? 'bg-orange-50/30 dark:bg-orange-950/30 border-orange-500/60 shadow-[0_0_20px_rgba(255,152,0,0.15)] hover:scale-[1.01]' :
                                        `bg-white/70 dark:bg-white/5 shadow-sm dark:shadow-none border-gray-100 dark:border-white/10 hover:bg-gray-50/80 dark:hover:bg-white/10 hover:scale-[1.01] ${getSubjectTheme(item.subject, subjects).border} ${getSubjectTheme(item.subject, subjects).shadow}`}
                                   ${selectedForSwap.includes(item.id) ? 'border-orange-500 ring-4 ring-orange-500/20 scale-105' : ''}`}
                                  style={item.rescheduled && !isActive ? { border: '2px solid #ff9800', boxShadow: '0 0 15px rgba(255, 152, 0, 0.3)' } : {}}
                                >
                                  {selectedForSwap.length === 1 && selectedForSwap[0] === item.id && (
                                    <div className="flex gap-1 absolute -top-3 left-1/2 -translate-x-1/2 z-[20]">
                                      <button
                                        onClick={(e) => { e.stopPropagation(); handleSwap(item.id, 'absent'); }}
                                        className="bg-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 active:scale-90 transition-transform"
                                      >
                                        老師因故無法前往
                                      </button>
                                    </div>
                                  )}

                                  <div className="flex-1 flex items-center justify-between gap-4 overflow-hidden">
                                    <div className="flex flex-col min-w-0">
                                      <span className={`text-[18px] font-black truncate flex items-center gap-1.5 leading-tight ${isActive ? 'text-white' : 'text-slate-800 dark:text-gray-100'}`}>
                                        {item.rescheduled && <span className="text-xl" title="有調課變動">🔔</span>}
                                        {item.subject}
                                      </span>
                                      <span className={`text-[13px] font-bold truncate transition-opacity ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-gray-500 opacity-80'}`}>
                                        {item.teacher || '自主進度'} {item.location && ` @ ${item.location}`}
                                      </span>
                                    </div>

                                    {item.startTime !== item.endTime && (
                                      <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm'}`}>
                                        <span className="text-[15px] font-mono font-black">{item.startTime}</span>
                                        <span className={`text-[10px] opacity-40 ${isActive ? 'text-white' : 'text-emerald-500'}`}>➜</span>
                                        <span className="text-[13px] font-mono font-bold opacity-80">{item.endTime}</span>
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
                          });
                        })()}
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
          {customLinks.map((link, idx) => (
            <a key={link.id || `custom-link-${idx}`} href={link.url} target="_blank" rel="noreferrer"
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
            {tomorrowsPrep.map((item, idx) => (
              <div key={item.id || `prep-${idx}`} className="bg-white/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-orange-100 dark:border-orange-900/20 shadow-sm flex items-start gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/40 rounded-xl text-orange-600 dark:text-orange-400">
                  <Clock size={20} />
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