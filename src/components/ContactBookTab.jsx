import React, { useState, useRef } from 'react';
import {
  Notebook, ChevronLeft, ChevronRight, Plus, CheckCircle2,
  Trash2, BookOpen, Calendar, ChevronDown, Camera, Loader2, Bell,
  LayoutGrid, List
} from 'lucide-react';
import { WEEKDAYS, ICON_MAP } from '../utils/constants';
import { fetchAI } from '../utils/helpers';
import toast from 'react-hot-toast';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';

const ContactBookTab = ({ contactBook, setContactBook, subjects, isAdmin, saveContactBookToFirestore, classID }) => {
  if (!contactBook || !subjects) return (
    <div className="flex items-center justify-center p-20">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
    </div>
  );

  // 考試類型與顏色對應表
  const EXAM_TYPES = {
    '小考': { color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400' },
    '段考': { color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
    '模擬考': { color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
    '複習考': { color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
    '其他': { color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
  };

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntry, setNewEntry] = useState({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', examType: '小考', homeworkDeadline: '', examDeadline: '' });
  const [isParsing, setIsParsing] = useState(false);
  const [sendPush, setSendPush] = useState(true); // 是否發送雲端通知
  const [viewMode, setViewMode] = useState('calendar'); // 'list' | 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const addFormRef = useRef(null); // 用於快速跳轉至新增表單

  const triggerNotification = (title, message) => {
    toast.success(`${title}: ${message}`);
  };

  const getFormattedDate = (dateStr) => {
    const d = new Date(dateStr);
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    return `${d.getMonth() + 1}月${d.getDate()}日 (${days[d.getDay()]})`;
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleAddEntry = async () => {
    if (!newEntry.homework && !newEntry.exam) {
      alert('請輸入作業或考試內容！');
      return;
    }

    // Validation: Check duplicate
    const currentEntries = contactBook[selectedDate] || [];
    const isDuplicate = currentEntries.some(entry =>
      entry.subject === newEntry.subject &&
      entry.homework === newEntry.homework &&
      entry.exam === newEntry.exam
    );

    if (isDuplicate) {
      alert('聯絡簿中已有完全相同的內容囉！請確認是否重複輸入。');
      return;
    }

    // Validation: Check deadline
    const today = new Date().toISOString().split('T')[0];
    if ((newEntry.homeworkDeadline && newEntry.homeworkDeadline < today) ||
      (newEntry.examDeadline && newEntry.examDeadline < today)) {
      if (!window.confirm('截止日期似乎已經過了，確定要新增嗎？')) return;
    }

    const updatedEntries = [...currentEntries, { id: Date.now(), ...newEntry }];
    const newContactBook = { ...contactBook, [selectedDate]: updatedEntries };

    setContactBook(newContactBook);
    await saveContactBookToFirestore(newContactBook);

    // 發送雲端推播通知 (如果開啟且有綁定班級)
    if (sendPush && classID) {
      try {
        const noticeTitle = `新增${newEntry.homework ? '作業' : '考試'}：${newEntry.subject}`;
        const noticeContent = [newEntry.homework ? `📝 ${newEntry.homework}` : '', newEntry.exam ? `💯 ${newEntry.exam}` : ''].filter(Boolean).join(' | ');
        await addDoc(collection(db, 'classes', classID, 'notices'), {
          title: noticeTitle,
          content: noticeContent,
          type: newEntry.homework ? 'homework' : 'exam',
          timestamp: Date.now()
        });
        toast.success('已同步推送通知給全班同學！');
      } catch (e) {
        console.error("推播通知失敗", e);
      }
    }

    setNewEntry({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', examType: '小考', homeworkDeadline: '', examDeadline: '' });
  };

  const handleDeleteEntry = async (id) => {
    if (!window.confirm('確定要刪除這項記錄嗎？')) return;
    const updatedEntries = (contactBook[selectedDate] || []).filter(item => item.id !== id);
    const newContactBook = { ...contactBook, [selectedDate]: updatedEntries };

    setContactBook(newContactBook);
    await saveContactBookToFirestore(newContactBook);
  };

  const handleAIParse = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result;
        const prompt = `你是一位專業的中文學生助理。請從這張聯絡簿照片中提取資訊，並以 JSON 格式回傳：
        {
          "subject": "科目名稱",
          "homework": "作業內容",
          "exam": "考試內容",
          "examType": "考試類型(小考/段考/模擬考/複習考/其他)",
          "homeworkDeadline": "YYYY-MM-DD",
          "examDeadline": "YYYY-MM-DD"
        }
        科目請務必從以下清單中選擇最接近的一個：${subjects.map(s => s.name).join(', ')}。
        如果沒有相關資訊則欄位留空。`;

        const result = await fetchAI(prompt, {
          image: {
            mimeType: file.type, data: base64Image.split(',')[1]
          }
        });
        try {
          // Remove markdown formatting if AI includes it
          const jsonStr = result.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(jsonStr);
          setNewEntry(prev => ({
            ...prev,
            subject: subjects.find(s => s.name === parsed.subject)?.name || prev.subject,
            homework: parsed.homework || '',
            exam: parsed.exam || '',
            examType: EXAM_TYPES[parsed.examType] ? parsed.examType : '小考',
            homeworkDeadline: parsed.homeworkDeadline || '',
            examDeadline: parsed.examDeadline || ''
          }));
          alert('AI 辨識完成！請校準內容後點擊同步。');
        } catch (err) {
          console.error('AI 解析失敗:', result);
          alert('AI 解析格式錯誤，請手動調整。');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('辨識失敗，請重試。');
    } finally {
      setIsParsing(false);
    }
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().split('T')[0];

    const blanks = Array.from({ length: firstDay }, (_, i) => i);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    return (
      <div className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[40px] shadow-soft border border-[var(--border-color)] glass-effect animate-slide-up-fade relative overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className="p-3.5 bg-slate-100/50 dark:bg-white/5 rounded-[20px] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95 shadow-sm">
            <ChevronLeft size={20} className="text-slate-600 dark:text-gray-300" />
          </button>
          <h3 className="text-[20px] font-black text-[var(--text-primary)] tracking-widest">
            {year} 年 {month + 1} 月
          </h3>
          <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className="p-3.5 bg-slate-100/50 dark:bg-white/5 rounded-[20px] hover:bg-slate-200 dark:hover:bg-white/10 transition-colors active:scale-95 shadow-sm">
            <ChevronRight size={20} className="text-slate-600 dark:text-gray-300" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-2 md:gap-3 mb-3">
          {['日', '一', '二', '三', '四', '五', '六'].map(d => (
            <div key={d} className="text-center text-[13px] font-black text-slate-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2 md:gap-3">
          {blanks.map(b => <div key={`blank-${b}`} className="aspect-square rounded-[20px] bg-slate-50/30 dark:bg-white/5 opacity-30" />)}
          {days.map(d => {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;
            const dayEntries = contactBook[dateStr] || [];
            const hasHw = dayEntries.some(e => e.homework);
            const hasExam = dayEntries.some(e => e.exam);

            const handleDateClick = () => {
              setSelectedDate(dateStr);
              // 延遲一點確保狀態更新後，平滑捲動至新增表單
              setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
            };

            return (
              <button key={d} onClick={handleDateClick} className={`relative aspect-square rounded-[20px] md:rounded-[24px] flex flex-col items-center pt-2 md:pt-2.5 transition-all duration-300 overflow-hidden ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-110 z-10' : isToday ? 'bg-emerald-50 dark:bg-emerald-500/20 border-2 border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-transparent hover:shadow-sm'}`}>
                <span className={`text-[15px] md:text-[17px] font-black leading-none ${isSelected ? 'text-white' : hasExam ? 'text-red-500 dark:text-red-400' : isToday ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'}`}>{d}</span>
                <div className="mt-auto mb-1.5 w-full px-1.5 flex flex-col gap-0.5 items-center pointer-events-none">
                  {dayEntries.slice(0, 2).map((entry, idx) => {
                    const badgeColor = entry.exam ? (EXAM_TYPES[entry.examType || '小考']?.color || EXAM_TYPES['小考'].color) : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400';
                    return (
                      <div key={idx} className={`w-full truncate text-[8px] md:text-[9px] font-bold px-1 py-0.5 rounded-[4px] shadow-sm text-center ${isSelected ? 'bg-white/20 text-white' : badgeColor}`}>
                        {entry.subject}
                      </div>
                    );
                  })}
                  {dayEntries.length > 2 && <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? 'bg-white' : 'bg-slate-400 dark:bg-slate-500'}`}></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const entriesForDate = contactBook[selectedDate] || [];

  return (
    <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade mb-12 pb-10">
      <div className="flex flex-col gap-3 px-2">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
            <Notebook size={28} className="shrink-0 neon-glow-emerald" /> 電子聯絡簿
          </h2>
          <div className="flex bg-slate-100/80 dark:bg-white/5 p-1 rounded-xl border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'list' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><List size={16} /></button>
            <button onClick={() => setViewMode('calendar')} className={`p-2 rounded-lg transition-all duration-300 ${viewMode === 'calendar' ? 'bg-white dark:bg-slate-800 shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}><LayoutGrid size={16} /></button>
          </div>
        </div>
        <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 ml-10 mt-1">紀錄每日作業與重要考試內容，AI 將自動為您排程</p>
      </div>

      {viewMode === 'list' ? (
        <div className="bg-[var(--bg-surface)] p-4 rounded-[36px] shadow-soft border border-[var(--border-color)] flex items-center justify-between transition-all duration-500 hover:shadow-float glass-effect animate-slide-up-fade">
          <button onClick={() => changeDate(-1)} className="p-4 bg-slate-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[24px] active:scale-[0.95] text-slate-600 dark:text-gray-300 transition-all duration-500 ease-spring-smooth shadow-sm border border-slate-200/50 dark:border-white/5 shrink-0">
            <ChevronLeft size={20} className="shrink-0" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">SELECTED DATE</span>
            <span className="text-[17px] font-black text-slate-900 dark:text-white">{getFormattedDate(selectedDate)}</span>
          </div>
          <button onClick={() => changeDate(1)} className="p-4 bg-slate-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[24px] active:scale-[0.95] text-slate-600 dark:text-gray-300 transition-all duration-500 ease-spring-smooth shadow-sm border border-slate-200/50 dark:border-white/5 shrink-0">
            <ChevronRight size={20} className="shrink-0" />
          </button>
        </div>
      ) : (
        renderCalendar()
      )}

      {/* 新增區塊 - 開放全班編輯 */}
      <div ref={addFormRef} className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[36px] shadow-soft border border-[var(--border-color)] overflow-hidden relative group transition-all duration-500 hover:shadow-float glass-effect">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-125 transition-transform duration-1000"></div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 relative z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
              <Plus size={20} className="shrink-0" />
            </div>
            <h3 className="text-[18px] font-black text-[var(--text-primary)]">新增事項</h3>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:flex-none">
              <select className="w-full md:w-40 bg-white/60 dark:bg-black/20 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-[18px] px-4 py-3 text-[14px] font-black outline-none focus:border-emerald-400 transition-all shadow-sm appearance-none text-[var(--text-primary)]" value={newEntry.subject} onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })}>
                {subjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
            </div>
            <div className="relative shrink-0">
              <input type="file" accept="image/*" onChange={handleAIParse} className="absolute inset-0 opacity-0 cursor-pointer z-10" disabled={isParsing} />
              <button className={`flex items-center justify-center gap-2 px-4 py-3 rounded-[18px] text-[13px] font-black transition-all border shadow-sm ${isParsing ? 'bg-slate-100 border-slate-200 text-slate-400' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 active:scale-95'}`}>
                {isParsing ? <Loader2 size={16} className="animate-spin" /> : <Camera size={16} />}
                {isParsing ? '辨識中' : '圖片導入'}
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-5 relative z-10">
          <div className="flex flex-col gap-4">
            <div className="relative">
              <textarea
                className="w-full bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-color)] rounded-[28px] px-6 py-5 text-[15px] font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 min-h-[120px] shadow-sm hover:shadow-md text-[var(--text-primary)] resize-none"
                placeholder="📝 今日指派作業 (例如：完成習作 P.10-15)"
                value={newEntry.homework}
                onChange={e => setNewEntry({ ...newEntry, homework: e.target.value })}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 rounded-[16px] border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm backdrop-blur-md">
                <Calendar size={14} className="text-emerald-600 dark:text-emerald-400" />
                <input
                  type="date"
                  value={newEntry.homeworkDeadline}
                  onChange={e => setNewEntry({ ...newEntry, homeworkDeadline: e.target.value })}
                  className="bg-transparent text-[11px] font-black outline-none text-emerald-800 dark:text-emerald-400 tracking-wider appearance-none"
                />
              </div>
            </div>

            <div className="relative">
              <textarea
                className="w-full bg-[var(--bg-surface)] backdrop-blur-md border border-[var(--border-color)] rounded-[28px] px-6 py-5 text-[15px] font-bold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all duration-300 min-h-[120px] shadow-sm hover:shadow-md text-[var(--text-primary)] resize-none"
                placeholder="💯 明日考試內容 (例如：第一課默寫)"
                value={newEntry.exam}
                onChange={e => setNewEntry({ ...newEntry, exam: e.target.value })}
              />
              <div className="absolute right-4 top-4">
                <select
                  value={newEntry.examType}
                  onChange={e => setNewEntry({ ...newEntry, examType: e.target.value })}
                  className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-black px-2.5 py-1.5 rounded-lg outline-none cursor-pointer border border-slate-200 dark:border-slate-700 shadow-sm appearance-none"
                >
                  {Object.keys(EXAM_TYPES).map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-red-50 dark:bg-red-950/40 px-4 py-2 rounded-[16px] border border-red-200/50 dark:border-red-500/20 shadow-sm backdrop-blur-md">
                <Calendar size={14} className="text-red-600 dark:text-red-400" />
                <input
                  type="date"
                  value={newEntry.examDeadline}
                  onChange={e => setNewEntry({ ...newEntry, examDeadline: e.target.value })}
                  className="bg-transparent text-[11px] font-black outline-none text-red-800 dark:text-red-400 tracking-wider appearance-none"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
            <label className={`flex-1 flex items-center gap-3 px-5 py-4 rounded-[20px] cursor-pointer transition-colors border ${sendPush ? 'bg-orange-50/50 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/30' : 'bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/5'}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${sendPush ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                <Bell size={18} className={sendPush ? 'animate-bounce-soft' : ''} />
              </div>
              <div className="flex flex-col">
                <span className={`text-[14px] font-black ${sendPush ? 'text-orange-700 dark:text-orange-400' : 'text-slate-500 dark:text-slate-400'}`}>發送推播通知</span>
                <span className="text-[11px] font-bold text-slate-400">提醒全班同學（需綁定班級代碼）</span>
              </div>
              <input type="checkbox" className="hidden" checked={sendPush} onChange={e => setSendPush(e.target.checked)} />
            </label>
            <button onClick={handleAddEntry} className="w-full sm:w-auto px-8 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-[16px] shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all duration-500 flex items-center justify-center gap-2 hover:-translate-y-0.5">
              儲存與同步 <CheckCircle2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3 mb-2 mt-4 px-1">
          <h3 className="text-[18px] font-black text-[var(--text-primary)] flex items-center gap-2">
            <Calendar size={20} className="text-emerald-500" />
            {getFormattedDate(selectedDate)} 的清單
          </h3>
          <span className="text-[12px] font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">{entriesForDate.length} 項</span>
        </div>
        {entriesForDate.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-3xl shadow-sm text-gray-200">
              <BookOpen size={32} />
            </div>
            <p className="text-gray-400 font-bold text-[14px]">這天目前沒有任何紀錄 ✨</p>
          </div>
        ) : (
          (contactBook[selectedDate] || []).map((entry, idx) => {
            if (!entry) return null;
            const subjectInfo = subjects.find(s => s.name === entry.subject) || { icon: '📝', color: 'text-gray-500' };
            return (
              <div key={entry.id || idx} className="bg-[var(--bg-surface)] glass-effect p-7 rounded-[40px] border border-[var(--border-color)] shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-500 ease-spring-smooth relative group animate-pop-in">
                <div className="flex justify-between items-center mb-4 border-b border-[var(--border-color)] pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${subjectInfo.color.replace('text', 'bg-').replace('500', '50')} dark:bg-emerald-500/10 flex items-center justify-center text-xl shrink-0`}>
                      {React.createElement(ICON_MAP[subjectInfo.icon] || ICON_MAP.BookText, { size: 20, className: `${subjectInfo.color} shrink-0` })}
                    </div>
                    <span className="text-[16px] font-black text-[var(--text-primary)]">{entry.subject}</span>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {entry.homework && (
                    <div className="flex gap-4 group/item">
                      <div className="w-1 bg-emerald-500 rounded-full"></div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">作業</div>
                          {entry.homeworkDeadline && (
                            <div className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border border-emerald-100">
                              <Calendar size={10} /> 截止：{entry.homeworkDeadline}
                            </div>
                          )}
                        </div>
                        <p className="text-[15px] font-bold text-gray-700 leading-relaxed min-h-[24px]">{entry.homework}</p>
                      </div>
                    </div>
                  )}
                  {entry.exam && (
                    <div className="flex gap-4 group/item">
                      <div className="w-1 bg-red-500 rounded-full"></div>
                      <div className="flex-1 py-1">
                        <div className="flex items-center justify-between mb-1">
                          <div className="text-[11px] font-black text-red-600 uppercase tracking-widest flex items-center gap-2">
                            考試
                            <span className={`px-1.5 py-0.5 rounded-[6px] text-[9px] shadow-sm ${EXAM_TYPES[entry.examType || '小考']?.color || EXAM_TYPES['小考'].color}`}>{entry.examType || '小考'}</span>
                          </div>
                          {entry.examDeadline && (
                            <div className="text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border border-red-100">
                              <Calendar size={10} /> 日期：{entry.examDeadline}
                            </div>
                          )}
                        </div>
                        <p className="text-[15px] font-bold text-gray-700 leading-relaxed min-h-[24px]">{entry.exam}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ContactBookTab;
