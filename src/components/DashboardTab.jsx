import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles, Clock, BellRing, Calendar, RefreshCw,
  Image as ImageIcon, Trash2, MapPin, Plus,
  Globe, AlertCircle, BookText, Utensils
} from 'lucide-react';
import {
  INITIAL_WEEKLY_SCHEDULE, WEEKDAYS, ICON_MAP
} from '../utils/constants';
import { fetchAI } from '../utils/helpers';

// === 外部函式與常數 ===
const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return '早安 ☀️';
  if (h < 18) return '午安 ☕';
  return '晚安 🌙';
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
  "辛苦了！今天的學習非常有價值 🚀",
  "太棒了，離夢想又進了一步 ✨",
  "深呼吸，給努力的自己一個讚 👍",
  "今日份的努力已打卡，好好休息吧 🛌",
  "學會休息，是為了走更長遠的路 🌿"
];


const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
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
        console.error("即時新聞載入失敗:", err);
        setError(true);
        // 錯誤時顯示一組引導 UI
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
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mt-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[16px] font-black text-gray-800 flex items-center gap-2">
          <MapPin className={error ? "text-orange-400" : "text-blue-500"} size={20} />
          {error ? "官網連線中" : "最新公告"}
        </h3>
        <a href={NEWS_PAGE_URL} target="_blank" rel="noreferrer" className="text-[12px] font-black text-blue-600 hover:underline">
          查看更多
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <RefreshCw size={20} className="text-gray-200 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.link || NEWS_PAGE_URL}
              target="_blank"
              rel="noreferrer"
              className="block p-3.5 bg-gray-50/50 hover:bg-blue-50/50 border border-gray-100 rounded-2xl transition-all duration-300 ease-spring group active:scale-[0.98] hover:-translate-y-1 hover:shadow-float relative z-10 bg-white/60 backdrop-blur-md"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className={`text-[11px] font-black ${error ? 'text-orange-400' : 'text-blue-500/70'}`}>
                    {item.date}
                  </div>
                  {error ? (
                    <AlertCircle size={12} className="text-orange-300" />
                  ) : (
                    <Plus size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
                  )}
                </div>
                <div className="text-[13.5px] font-black text-gray-800 group-hover:text-blue-700 transition-colors leading-snug">
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
const DashboardTab = ({ weeklySchedule, setWeeklySchedule, subjects, triggerNotification, customLinks, contactBook }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const getSubjectIcon = (name) => {
    const s = subjects.find(s => s.name === name);
    if (!s) return ICON_MAP.BookText;
    return ICON_MAP[s.icon] || ICON_MAP.BookText;
  };

  const getLinkIcon = (iconName) => {
    return ICON_MAP[iconName] || ICON_MAP.Globe;
  };

  // 每分鐘更新一次主狀態即可，秒數由 LiveClock 負責
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editDayTab, setEditDayTab] = useState(new Date().getDay());
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const displaySchedule = previewSchedule || weeklySchedule;
  const isAfter4PM = currentTime.getHours() >= 16;

  const encouragement = useMemo(() => {
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return ENCOURAGEMENTS[Math.abs(hash) % ENCOURAGEMENTS.length];
  }, []);

  const { currentClass, currentProgress } = useMemo(() => {
    const day = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todayList = (weeklySchedule && weeklySchedule[day]) || [];
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

  const tomorrowStr = useMemo(() => {
    const d = new Date(currentTime);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [currentTime]);

  const tomorrowsPrep = useMemo(() => {
    if (!contactBook) return [];
    const allEntries = Object.values(contactBook).flat();
    return allEntries.filter(entry => entry.homeworkDeadline === tomorrowStr || entry.examDeadline === tomorrowStr);
  }, [contactBook, tomorrowStr]);

  const upcomingDaysSchedule = useMemo(() => {
    const schedules = [];
    const today = currentTime.getDay();
    for (let i = 0; i < 3; i++) {
      const targetDayText = i === 0 ? '今日' : i === 1 ? '明日' : '後天';
      const targetDayIndex = (today + i) % 7;
      const classes = (weeklySchedule && weeklySchedule[targetDayIndex]) || [];
      if (classes.length > 0) {
        schedules.push({ title: targetDayText, classes, dayOffset: i });
      }
    }
    return schedules;
  }, [currentTime, weeklySchedule]);

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
      <div className="bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[36px] p-6 md:p-8 text-white shadow-soft border border-white/20 relative transition-all duration-scale hover:scale-[1.01] overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-black">{getGreeting()}</h2>
            <div className="flex flex-col items-end">
              <span className="text-emerald-50 text-[11px] font-black opacity-80 uppercase tracking-widest">Current Time</span>
              <LiveClock />
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end flex-wrap gap-x-4">
              <span className="text-emerald-50 text-[12px] font-black opacity-90">今日課程進度</span>
              <span className="text-white text-[18px] font-black animate-bounce-soft">{Math.round(currentProgress)}%</span>
            </div>
            <div className="progress-bar-track overflow-hidden">
              <div className="progress-bar-fill" style={{ width: `${currentProgress}%` }} />
            </div>
          </div>

          {/* 整合式課程動態 */}
          {(liveStatus || currentProgress >= 100) && (
            <div className="mt-6 bg-white/20 backdrop-blur-xl rounded-[24px] p-4 border border-white/30 animate-fadeIn flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${ (liveStatus?.type === 'ongoing') ? 'bg-white text-emerald-600 animate-pulse-live' : (currentProgress >= 100 ? 'bg-orange-400 text-white' : 'bg-blue-400 text-white') }`}>
                  { (liveStatus?.type === 'ongoing') ? 
                    React.createElement(getSubjectIcon(liveStatus.item.subject), { size: 22 }) : 
                    (currentProgress >= 100 ? React.createElement(ICON_MAP.Utensils, { size: 22 }) : React.createElement(ICON_MAP.Clock, { size: 22 })) 
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-black uppercase tracking-widest bg-black/10 px-1.5 py-0.5 rounded">
                      { (liveStatus?.type === 'ongoing') ? 'Live Now' : (currentProgress >= 100 ? 'Finished' : 'Upcoming') }
                    </span>
                  </div>
                  <h4 className="text-[14px] font-black text-white leading-tight">
                    { currentProgress >= 100 ? '今日課程已全部結束' : liveStatus?.item.subject }
                  </h4>
                  <p className="text-[11px] font-bold text-emerald-50 mt-0.5 opacity-90">
                    { currentProgress >= 100 ? encouragement : (liveStatus?.item.location || '教室') }
                  </p>
                </div>
              </div>
              {liveStatus && (
                <div className="flex flex-col items-end bg-black/10 px-3 py-1.5 rounded-xl border border-white/10">
                  <span className="text-[16px] font-black text-white leading-none">{liveStatus.type === 'ongoing' ? liveStatus.remaining : liveStatus.countdown}</span>
                  <span className="text-[8px] font-black text-emerald-100 uppercase tracking-tighter mt-1">
                    {liveStatus.type === 'ongoing' ? 'MIN LEFT' : 'MINS TO'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 text-white opacity-10 w-40 h-40 pointer-events-none" />
      </div>

      <SchoolNewsWidget />

      {/* 明日準備事項 */}
      {tomorrowsPrep.length > 0 && !isEditingSchedule && (
        <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-[36px] border border-orange-100 shadow-sm animate-pop-in">
          <h3 className="text-[16px] font-black text-orange-800 flex items-center gap-2 mb-4">
            <BellRing size={20} className="text-orange-500" /> 明日準備事項
          </h3>
          <div className="flex flex-col gap-3">
            {tomorrowsPrep.map((item) => (
              <div key={item.id} className="bg-white/70 p-4 rounded-2xl border border-orange-100 shadow-sm flex items-start gap-3">
                <div className="p-2 bg-orange-100 rounded-xl text-orange-600">
                  {React.createElement(getSubjectIcon(item.subject), { size: 20 })}
                </div>
                <div>
                  <span className="text-[12px] font-black bg-orange-100 text-orange-700 px-2 py-0.5 rounded-lg mb-2 inline-block">{item.subject}</span>
                  {item.homeworkDeadline === tomorrowStr && <p className="text-[14px] font-bold text-gray-800">📝 {item.homework}</p>}
                  {item.examDeadline === tomorrowStr && <p className="text-[14px] font-bold text-gray-800 mt-1">💯 考試：{item.exam}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 學習排程區塊 */}
      <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-8 rounded-[36px] border border-white/60 shadow-soft">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-500" size={24} />
            <h3 className="text-[19px] font-black text-emerald-600">
              {isEditingSchedule ? '編輯排程' : (isAfter4PM ? '16:00 預習模式' : '今日學習排程')}
            </h3>
          </div>
          <button onClick={() => setIsEditingSchedule(!isEditingSchedule)} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-black active:scale-95 transition-all">
            {isEditingSchedule ? '完成' : '編輯'}
          </button>
        </div>

        {isEditingSchedule ? (
          <div className="flex flex-col gap-4">
            {!previewSchedule && (
              <label className="border-2 border-dashed border-emerald-200 rounded-2xl p-6 flex flex-col items-center gap-2 cursor-pointer hover:bg-emerald-50 transition-all">
                {uploadLoading ? <RefreshCw className="animate-spin text-emerald-500" /> : <ImageIcon className="text-emerald-400" />}
                <span className="text-emerald-600 font-black">{uploadLoading ? 'AI 解析中...' : '點擊上傳課表照片'}</span>
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            )}
            {previewSchedule && (
              <div className="flex gap-2">
                <button onClick={() => setPreviewSchedule(null)} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black">放棄</button>
                <button onClick={() => { setWeeklySchedule(previewSchedule); setPreviewSchedule(null); setIsEditingSchedule(false); }} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black">一鍵儲存</button>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {WEEKDAYS.map(d => (
                <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-5 py-3 rounded-xl font-black whitespace-nowrap ${editDayTab === d.id ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{d.label}</button>
              ))}
            </div>
            <div className="space-y-4">
              {(displaySchedule[editDayTab] || []).map(item => (
                <div key={item.id} className="p-5 bg-gray-50 rounded-3xl border border-gray-100 relative">
                  <input type="text" value={item.subject} onChange={e => updateSchedule(item.id, 'subject', e.target.value)} className="w-full bg-transparent font-black text-lg outline-none mb-3" placeholder="課程名稱" />
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input type="text" value={item.teacher} onChange={e => updateSchedule(item.id, 'teacher', e.target.value)} className="p-2.5 bg-white rounded-xl text-sm font-bold border border-gray-100" placeholder="老師" />
                    <input type="text" value={item.location} onChange={e => updateSchedule(item.id, 'location', e.target.value)} className="p-2.5 bg-white rounded-xl text-sm font-bold border border-gray-100" placeholder="地點" />
                  </div>
                  <div className="flex items-center gap-2 bg-white p-2.5 rounded-xl border border-gray-100">
                    <Clock size={16} className="text-gray-400" />
                    <input type="time" value={item.startTime} onChange={e => updateSchedule(item.id, 'startTime', e.target.value)} className="bg-transparent font-mono outline-none flex-1 text-center" />
                    <span className="text-gray-300">-</span>
                    <input type="time" value={item.endTime} onChange={e => updateSchedule(item.id, 'endTime', e.target.value)} className="bg-transparent font-mono outline-none flex-1 text-center" />
                  </div>
                  <button onClick={() => deleteSchedule(item.id)} className="absolute top-4 right-4 text-red-400 p-2"><Trash2 size={18} /></button>
                </div>
              ))}
              <button onClick={() => setWeeklySchedule(prev => ({ ...prev, [editDayTab]: [...(prev[editDayTab] || []), { id: Date.now(), subject: '', startTime: '08:00', endTime: '09:00', location: '', teacher: '' }] }))} className="w-full py-4 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-black">+ 新增課程</button>
            </div>
          </div>
        )
          :
          (
            <div className="space-y-6">
              {upcomingDaysSchedule.length === 0 && <p className="text-gray-400 text-center py-6 font-bold">未來幾天沒有排程喔！</p>}
              {upcomingDaysSchedule.map((group, gIdx) => (
                <div key={gIdx} className="space-y-4">
                  <h4 className="text-sm font-black text-emerald-800 border-l-4 border-emerald-500 pl-3">{group.title}排程</h4>
                  <div className="space-y-4">
                    {group.classes.map((item) => {
                      const isActive = group.dayOffset === 0 && currentClass?.id === item.id;
                      const subjectIcon = '📚';

                      return (
                        <div key={item.id} className={`p-6 rounded-[32px] border transition-all duration-500 relative overflow-hidden ${isActive ? 'bg-white border-emerald-500 shadow-[0_15px_40px_rgba(16,185,129,0.15)] scale-[1.03] z-10' : 'bg-white/60 border-white/50 shadow-sm opacity-90 hover:scale-[1.01]'}`}>
                          {isActive && (
                            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-black px-4 py-1.5 rounded-bl-2xl flex items-center gap-2 shadow-lg animate-fadeIn z-20">
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                              </span>
                              進行中
                            </div>
                          )}
                          {isActive && <div className="absolute inset-0 bg-emerald-50/30 animate-pulse pointer-events-none" />}
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner ${isActive ? 'bg-emerald-50 animate-bounce-soft' : 'bg-gray-50'}`}>
                              {subjectIcon}
                            </div>
                            <div>
                              <div className={`text-xl font-black ${isActive ? 'text-emerald-600' : 'text-gray-900'}`}>{item.subject}</div>
                              <div className="text-sm font-bold text-gray-400">{item.teacher || '自主進度'}</div>
                            </div>
                          </div>
                          <div className={`flex justify-between items-center p-3 rounded-2xl transition-colors ${isActive ? 'bg-emerald-50/50' : 'bg-gray-50/50'}`}>
                            <div className={`flex items-center gap-2 font-mono text-sm font-black ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                              <Clock size={16} /> {item.startTime} - {item.endTime}
                            </div>
                            {item.location && (
                              <div className={`text-xs font-black px-3 py-1 rounded-full ${isActive ? 'bg-emerald-600 text-white shadow-sm' : 'bg-emerald-50 text-emerald-600'}`}>
                                {item.location}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>

      {/* 外部連結 */}
      <div className="bg-white/80 backdrop-blur-2xl p-5 md:p-6 rounded-[36px] shadow-soft border border-white/60 flex flex-col gap-4 mb-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[17px] font-black text-gray-950 flex items-center gap-2">
            <Globe className="text-emerald-500" size={20} /> 外部連結
          </h3>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {customLinks.map((link) => (
            <a key={link.id} href={link.url} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-2xl active:scale-95 transition-all duration-300 ease-spring border border-gray-100 hover:bg-emerald-50 hover:border-emerald-100 hover:-translate-y-1 hover:shadow-float">
              {React.createElement(getLinkIcon(link.icon), { size: 24, className: "text-emerald-500" })}
              <span className="text-[13px] font-black text-gray-700 text-center truncate w-full px-1">{link.title}</span>
            </a>
          ))}
        </div>
      </div>


    </div>
  );
};

export default DashboardTab;