import React, { useState, useEffect, useRef } from 'react';
import {
  Notebook, ChevronLeft, ChevronRight, Plus, CheckCircle2,
  Trash2, BookOpen, Calendar, ChevronDown, Camera, Loader2, Bell,
  LayoutGrid, List
} from 'lucide-react';
import { WEEKDAYS, ICON_MAP } from '../../utils/constants';
import { fetchAI } from '../../utils/helpers';
import toast from 'react-hot-toast';
import { db } from '../../config/firebase'; // 確保路徑正確
import { collection, addDoc, onSnapshot, query, where, doc, setDoc, deleteDoc, serverTimestamp, writeBatch } from 'firebase/firestore';

const ContactBookTab = ({ contactBook, setContactBook, subjects, isAdmin, saveContactBookToFirestore, classID, user, schoolId, gradeId, navToSettings }) => {
  if (!schoolId || !gradeId || !classID) {
    return (
      <div className="flex flex-col items-center justify-center py-32 px-6 text-center animate-slide-up-fade">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-[28px] flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
          <Notebook size={36} className="text-emerald-500" />
        </div>
        <h4 className="text-[20px] font-black text-slate-900 dark:text-white mb-2">尚未綁定班級</h4>
        <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-8 max-w-[280px]">
          電子聯絡簿為全班共享的雲端空間。<br />請先前往設定頁面選擇您的「學校、年級」並輸入「班級代碼」。
        </p>
        <button onClick={() => navToSettings?.('academic')} className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-[15px] shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all">
          前往設定班級
        </button>
      </div>
    );
  }

  if (!contactBook || !subjects) return (
    <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
      <div className="relative flex items-center justify-center mb-6">
        <div className="absolute inset-0 border-[3px] border-emerald-500/10 dark:border-white/5 rounded-full"></div>
        <div className="w-14 h-14 border-[3px] border-transparent border-t-emerald-500 rounded-full animate-spin"></div>
        <div className="absolute w-8 h-8 border-[3px] border-transparent border-b-blue-500 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
      </div>
      <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Loading</span>
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

  const [selectedDate, setSelectedDate] = useState(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = new Date(now - offset).toISOString().slice(0, 10);
    return localISOTime;
  });
  const [newEntry, setNewEntry] = useState({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', examType: '小考', homeworkDeadline: '', examDeadline: '' });
  const [isParsing, setIsParsing] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'list' | 'calendar'
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const [collapsedSubjects, setCollapsedSubjects] = useState(new Set());
  const [completedIds, setCompletedIds] = useState(new Set());
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [expiredConfirmOpen, setExpiredConfirmOpen] = useState(false);

  // 🚀 全新邏輯：同步個人完成狀態
  useEffect(() => {
    if (!classID) return;
    if (!user?.uid) {
      // 訪客模式：從 localStorage 讀取
      try {
        const localCompleted = JSON.parse(localStorage.getItem(`gsat_completed_${classID}`) || '[]');
        setCompletedIds(new Set(localCompleted));
      } catch { setCompletedIds(new Set()); }
      return;
    }

    // 登入使用者：從 Firestore 讀取
    const completedRef = collection(db, 'Users', user.uid, 'CompletedAssignments');
    const q = query(completedRef, where('classId', '==', classID));
    const unsub = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => doc.id));
      setCompletedIds(ids);
    });
    return () => unsub();
  }, [user, classID]);

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

  const handleAddEntry = async (skipDateCheckOrEvent) => {
    const skipDateCheck = skipDateCheckOrEvent === true;
    if (!newEntry.homework && !newEntry.exam) {
      toast.error('請輸入作業或考試內容！');
      return;
    }

    // Validation: Check deadline
    const today = new Date().toISOString().split('T')[0];
    if (!skipDateCheck && ((newEntry.homeworkDeadline && newEntry.homeworkDeadline < today) ||
      (newEntry.examDeadline && newEntry.examDeadline < today))) {
      setExpiredConfirmOpen(true);
      return;
    }

    const newContactBook = { ...contactBook };
    let addedCount = 0;

    // 1. 處理作業 (分派至指定的 deadline 或選定的日期)
    if (newEntry.homework) {
      const hwDate = newEntry.homeworkDeadline || selectedDate;
      if (!newContactBook[hwDate]) newContactBook[hwDate] = [];

      const isDuplicate = newContactBook[hwDate].some(e => e.subject === newEntry.subject && e.homework === newEntry.homework);
      if (!isDuplicate) {
        newContactBook[hwDate].push({
          id: Date.now() + 1,
          subject: newEntry.subject,
          homework: newEntry.homework,
          homeworkDeadline: newEntry.homeworkDeadline
        });
        addedCount++;
      }
    }

    // 2. 處理考試 (分派至指定的 deadline 或選定的日期)
    if (newEntry.exam) {
      const examDate = newEntry.examDeadline || selectedDate;
      if (!newContactBook[examDate]) newContactBook[examDate] = [];

      const isDuplicate = newContactBook[examDate].some(e => e.subject === newEntry.subject && e.exam === newEntry.exam);
      if (!isDuplicate) {
        newContactBook[examDate].push({
          id: Date.now() + 2,
          subject: newEntry.subject,
          exam: newEntry.exam,
          examType: newEntry.examType,
          examDeadline: newEntry.examDeadline
        });
        addedCount++;
      }
    }

    if (addedCount === 0) {
      toast.error('聯絡簿中已有完全相同的內容囉！請確認是否重複輸入。');
      return;
    }

    setContactBook(newContactBook);

    setNewEntry({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', examType: '小考', homeworkDeadline: '', examDeadline: '' });

    try {
      await saveContactBookToFirestore(newContactBook);
      toast.success('新增成功並同步至雲端！');
    } catch (error) {
      if (error.message === 'GUEST_MODE') {
        toast.success('新增成功！(訪客模式已暫存於本機)');
      } else {
        toast.error('無法同步至雲端，已暫存於本機。請檢查權限或網路連線。');
      }
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    const id = deleteConfirmId;
    // 防止刪除後出現殘留，遍歷全部日期找出並過濾
    const newContactBook = { ...contactBook };
    Object.keys(newContactBook).forEach(date => {
      newContactBook[date] = newContactBook[date].filter(item => item.id !== id);
    });

    setContactBook(newContactBook);
    setDeleteConfirmId(null);

    try {
      await saveContactBookToFirestore(newContactBook);
      toast.success('刪除成功');
    } catch (error) {
      if (error.message === 'GUEST_MODE') {
        toast.success('刪除成功！(本機紀錄)');
      } else {
        toast.error('無法同步至雲端，本機紀錄已刪除。');
      }
    }
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
          toast.success('AI 辨識完成！請校準內容後點擊同步。');
        } catch (err) {
          console.error('AI 解析失敗:', result);
          toast.error('AI 解析格式錯誤，請手動調整。');
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('辨識失敗，請重試。');
    } finally {
      setIsParsing(false);
    }
  };

  // 🚀 全新邏輯：處理個人完成狀態 (支援批次)
  const handleToggleCompletionGroup = async (ids, allCurrentlyCompleted) => {
    const newCompletedIds = new Set(completedIds);
    if (allCurrentlyCompleted) {
      ids.forEach(id => newCompletedIds.delete(id));
    } else {
      ids.forEach(id => newCompletedIds.add(id));
    }
    setCompletedIds(newCompletedIds);

    if (user?.uid) {
      // 登入使用者：批次寫入 Firestore
      const batch = writeBatch(db);
      ids.forEach(id => {
        const ref = doc(db, 'Users', user.uid, 'CompletedAssignments', String(id));
        if (allCurrentlyCompleted) {
          batch.delete(ref);
        } else {
          batch.set(ref, { completedAt: serverTimestamp(), classId: classID });
        }
      });
      await batch.commit().catch(e => console.error("Completion batch error:", e));
    } else {
      // 訪客模式：寫入 localStorage
      localStorage.setItem(`gsat_completed_${classID}`, JSON.stringify(Array.from(newCompletedIds)));
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
      <div key="calendar-view" className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 animate-fadeIn relative overflow-hidden">
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

  // 將同一天的項目依據科目進行分組 (Group by Subject)
  const groupedEntries = entriesForDate.reduce((acc, entry) => {
    if (!acc[entry.subject]) {
      acc[entry.subject] = { subject: entry.subject, items: [] };
    }
    acc[entry.subject].items.push(entry);
    return acc;
  }, {});

  const handleToggleAllGroups = () => {
    const allSubjects = Object.keys(groupedEntries);
    if (collapsedSubjects.size === allSubjects.length) {
      setCollapsedSubjects(new Set()); // Expand all
    } else {
      setCollapsedSubjects(new Set(allSubjects)); // Collapse all
    }
  };

  const toggleGroup = (subject) => {
    setCollapsedSubjects(prev => {
      const next = new Set(prev);
      if (next.has(subject)) next.delete(subject);
      else next.add(subject);
      return next;
    });
  };

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
        <div key="list-view" className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-4 rounded-[36px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 flex items-center justify-between transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] animate-fadeIn">
          <button onClick={() => changeDate(-1)} className="p-4 bg-slate-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[24px] active:scale-[0.95] text-slate-600 dark:text-gray-300 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm border border-slate-200/50 dark:border-white/5 shrink-0">
            <ChevronLeft size={20} className="shrink-0" />
          </button>
          <div className="flex flex-col items-center relative cursor-pointer group/date" onClick={() => document.getElementById('list-date-picker')?.showPicker()}>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5 flex items-center gap-1.5">
              <Calendar size={10} className="text-emerald-500" />
              SELECTED DATE
            </span>
            <span className="text-[17px] font-black text-slate-900 dark:text-white group-hover/date:text-emerald-500 transition-colors">{getFormattedDate(selectedDate)}</span>
            <input
              id="list-date-picker"
              type="date"
              className="absolute inset-0 opacity-0 pointer-events-none"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
            />
          </div>
          <button onClick={() => changeDate(1)} className="p-4 bg-slate-100/50 dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 rounded-[24px] active:scale-[0.95] text-slate-600 dark:text-gray-300 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm border border-slate-200/50 dark:border-white/5 shrink-0">
            <ChevronRight size={20} className="shrink-0" />
          </button>
        </div>
      ) : (
        renderCalendar()
      )}

      {/* 新增區塊 - 開放全班編輯 */}
      <div ref={addFormRef} className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[36px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 overflow-hidden relative group transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)]">
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
                className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[28px] px-6 py-5 text-[15px] font-bold outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all duration-300 min-h-[120px] shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-[var(--text-primary)] resize-none"
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
                  className="bg-transparent text-[11px] font-black outline-none text-emerald-800 dark:text-emerald-400 tracking-wider"
                />
              </div>
            </div>

            <div className="relative">
              <textarea
                className="w-full bg-white/50 dark:bg-slate-800/50 backdrop-blur-xl border border-white/60 dark:border-white/10 rounded-[28px] px-6 py-5 text-[15px] font-bold outline-none focus:border-red-400 focus:ring-2 focus:ring-red-400/20 transition-all duration-300 min-h-[120px] shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] text-[var(--text-primary)] resize-none"
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
                  className="bg-transparent text-[11px] font-black outline-none text-red-800 dark:text-red-400 tracking-wider"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end mt-2">
            <button onClick={handleAddEntry} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-[15px] shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center gap-2 hover:-translate-y-0.5">
              儲存與同步 <CheckCircle2 size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2 mt-4 px-1">
          <div className="flex items-center gap-3">
            <h3 className="text-[18px] font-black text-[var(--text-primary)] flex items-center gap-2">
              <Calendar size={20} className="text-emerald-500" />
              {getFormattedDate(selectedDate)} 的清單
            </h3>
            <span className="text-[12px] font-bold text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-lg">{entriesForDate.length} 項</span>
          </div>
          {entriesForDate.length > 0 && (
            <button onClick={handleToggleAllGroups} className="text-[12px] font-black text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/10 dark:hover:bg-emerald-500/20 px-3 py-1.5 rounded-[12px] transition-colors flex items-center gap-1.5 active:scale-95 shadow-sm">
              {collapsedSubjects.size === Object.keys(groupedEntries).length ? '一鍵展開' : '一鍵收合'}
              <ChevronDown size={14} className={`transition-transform duration-300 ${collapsedSubjects.size === Object.keys(groupedEntries).length ? 'rotate-0' : 'rotate-180'}`} />
            </button>
          )}
        </div>
        {entriesForDate.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-3xl shadow-sm text-gray-200">
              <BookOpen size={32} className="text-slate-300" />
            </div>
            <p className="text-gray-400 font-bold text-[14px]">這天目前沒有任何紀錄 ✨</p>
          </div>
        ) : (
          Object.values(groupedEntries).map((group, idx) => {
            const subjectInfo = subjects.find(s => s.name === group.subject) || { icon: 'BookText', color: 'text-gray-500 bg-gray-50' };
            const allCompleted = group.items.length > 0 && group.items.every(item => completedIds.has(item.id));
            const isCollapsed = collapsedSubjects.has(group.subject);

            return (
              <div key={group.subject || idx} className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 p-7 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] relative group animate-pop-in">
                <div onClick={() => toggleGroup(group.subject)} className={`flex justify-between items-center cursor-pointer select-none group/header ${isCollapsed ? '' : 'mb-4 border-b border-[var(--border-color)] pb-4'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${subjectInfo.color.replace('text', 'bg-').replace('500', '50')} dark:bg-emerald-500/10 flex items-center justify-center text-xl shrink-0`}>
                      {React.createElement(ICON_MAP[subjectInfo.icon] || ICON_MAP.BookText, { size: 20, className: `${subjectInfo.color} shrink-0` })}
                    </div>
                    <span className="text-[16px] font-black text-[var(--text-primary)]">{group.subject}</span>
                    {isCollapsed && (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md ml-1">{group.items.length} 項</span>
                    )}
                  </div>
                  <div className="p-1.5 rounded-lg bg-slate-100/50 dark:bg-white/5 group-hover/header:bg-slate-200 dark:group-hover/header:bg-white/10 transition-colors">
                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`} />
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="animate-fadeIn">
                    <div className="flex flex-col gap-4">
                      {group.items.map((entry) => (
                        <div key={entry.id} className="relative group/item flex flex-col gap-4">
                          {entry.homework && (
                            <div className="flex gap-4">
                              <div className="w-1 bg-emerald-500 rounded-full shrink-0"></div>
                              <div className="flex-1 py-1">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest">作業</div>
                                  {entry.homeworkDeadline && (
                                    <div className="text-[10px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border border-emerald-100">
                                      <Calendar size={10} /> 截止：{entry.homeworkDeadline}
                                    </div>
                                  )}
                                </div>
                                <p className="text-[15px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed min-h-[24px] pr-8">{entry.homework}</p>
                              </div>
                            </div>
                          )}
                          {entry.exam && (
                            <div className="flex gap-4">
                              <div className="w-1 bg-red-500 rounded-full shrink-0"></div>
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
                                <p className="text-[15px] font-bold text-gray-700 dark:text-gray-300 leading-relaxed min-h-[24px] pr-8">{entry.exam}</p>
                              </div>
                            </div>
                          )}
                          <button onClick={() => setDeleteConfirmId(entry.id)} className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover/item:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all active:scale-90">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* 互動區塊：打勾確認收到 */}
                    <div className="mt-5 pt-4 border-t border-slate-200/50 dark:border-white/5 flex items-center justify-between">
                      <div className="text-[11px] font-bold text-slate-400">
                        {allCompleted ? '太棒了！今日進度已達成 🎉' : '記得完成今日進度喔 💪'}
                      </div>
                      <button onClick={() => handleToggleCompletionGroup(group.items.map(i => i.id), allCompleted)} className={`flex items-center gap-1.5 px-4 py-2 rounded-[16px] text-[12px] font-black transition-all active:scale-95 ${allCompleted ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                        <CheckCircle2 size={16} className={allCompleted ? 'text-white' : 'text-slate-400'} />
                        {allCompleted ? '已完成' : '標記完成'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 刪除確認 Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/10 transform transition-all animate-pop-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl">
                <Trash2 size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">確認刪除</h3>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mb-6">
              刪除後將無法復原，確定要移除這筆聯絡簿紀錄嗎？
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-3.5 rounded-2xl font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-3.5 rounded-2xl font-black bg-red-500 text-white shadow-lg shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all"
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 期限過期確認 Modal */}
      {expiredConfirmOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/10 transform transition-all animate-pop-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Calendar size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">日期已過期</h3>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mb-6">
              您設定的截止日期似乎已經過了，確定要繼續新增嗎？
            </p>
            <div className="flex gap-3">
              <button onClick={() => setExpiredConfirmOpen(false)} className="flex-1 py-3.5 rounded-2xl font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95">
                修改日期
              </button>
              <button onClick={() => { setExpiredConfirmOpen(false); handleAddEntry(true); }} className="flex-1 py-3.5 rounded-2xl font-black bg-amber-500 text-white shadow-lg shadow-amber-500/30 hover:bg-amber-600 active:scale-95 transition-all">
                確定新增
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactBookTab;
