import React, { useState } from 'react';
import {
  Notebook, ChevronLeft, ChevronRight, Plus, CheckCircle2,
  Trash2, BookOpen, Calendar, ChevronDown
} from 'lucide-react';
import { WEEKDAYS, ICON_MAP } from '../utils/constants';

const ContactBookTab = ({ contactBook, setContactBook, subjects }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntry, setNewEntry] = useState({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', homeworkDeadline: '', examDeadline: '' });

  const getFormattedDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAYS[d.getDay()].label})`;
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleAddEntry = () => {
    if (!newEntry.homework && !newEntry.exam) return;
    const currentEntries = contactBook[selectedDate] || [];
    const updatedEntries = [...currentEntries, { id: Date.now(), ...newEntry }];
    setContactBook(prev => ({ ...prev, [selectedDate]: updatedEntries }));
    setNewEntry({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '', homeworkDeadline: '', examDeadline: '' });
  };

  const handleDeleteEntry = (id) => {
    const updatedEntries = (contactBook[selectedDate] || []).filter(item => item.id !== id);
    setContactBook(prev => ({ ...prev, [selectedDate]: updatedEntries }));
  };

  const entriesForDate = contactBook[selectedDate] || [];

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade mb-8 pb-10">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-3">
          <Notebook size={28} className="shrink-0 neon-glow-emerald" /> 電子聯絡簿
        </h2>
        <p className="text-[13px] font-bold text-slate-500 ml-9">紀錄每日作業與重要考試內容</p>
      </div>

      <div className="bg-[var(--bg-surface)] p-4 rounded-[36px] shadow-soft border border-[var(--border-color)] flex items-center justify-between transition-all duration-500 hover:shadow-float glass-effect">
        <button onClick={() => changeDate(-1)} className="p-4 bg-slate-50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-[24px] active:scale-90 text-slate-600 dark:text-gray-300 transition-all duration-300 shadow-sm border border-slate-200 dark:border-white/10 shrink-0">
          <ChevronLeft size={20} className="shrink-0" />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">SELECTED DATE</span>
          <span className="text-[17px] font-black text-slate-900 dark:text-white">{getFormattedDate(selectedDate)}</span>
        </div>
        <button onClick={() => changeDate(1)} className="p-4 bg-slate-50 dark:bg-white/10 hover:bg-white dark:hover:bg-white/20 rounded-[24px] active:scale-90 text-slate-600 dark:text-gray-300 transition-all duration-300 shadow-sm border border-slate-200 dark:border-white/10 shrink-0">
          <ChevronRight size={20} className="shrink-0" />
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[36px] shadow-soft border border-[var(--border-color)] overflow-hidden relative group transition-all duration-500 hover:shadow-float glass-effect">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 dark:bg-emerald-500/10 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-125 transition-transform duration-1000"></div>
        <h3 className="text-[14px] font-black text-[var(--text-primary)] mb-4 flex items-center gap-2 relative z-10">
          <Plus size={18} className="text-emerald-500 shrink-0" /> 新增事項
        </h3>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="relative">
            <select
              className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] px-5 py-4 text-[15px] font-black outline-none focus:border-emerald-300 focus:bg-white/80 transition-all shadow-sm hover:shadow-md appearance-none"
              value={newEntry.subject}
              onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })}
            >
              {subjects.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
            </select>
            <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none shrink-0" />
          </div>

          <div className="flex flex-col gap-3">
            <div className="relative">
              <textarea
                className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] px-5 py-4 text-[14px] font-bold outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/20 focus:bg-white/90 transition-all duration-300 min-h-[100px] shadow-sm hover:shadow-md"
                placeholder="📝 今日指派作業 (例如：完成習作 P.10-15)"
                value={newEntry.homework}
                onChange={e => setNewEntry({ ...newEntry, homework: e.target.value })}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-emerald-50/90 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-white/10 shadow-sm">
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
                className="w-full bg-white/50 backdrop-blur-md border border-white/60 rounded-[24px] px-5 py-4 text-[14px] font-bold outline-none focus:border-red-400 focus:ring-4 focus:ring-red-400/20 focus:bg-white/90 transition-all duration-300 min-h-[100px] shadow-sm hover:shadow-md"
                placeholder="💯 明日考試內容 (例如：第一課默寫)"
                value={newEntry.exam}
                onChange={e => setNewEntry({ ...newEntry, exam: e.target.value })}
              />
              <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-red-50/90 dark:bg-black/20 px-3 py-1.5 rounded-xl border border-red-200/50 dark:border-white/10 shadow-sm">
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

          <button onClick={handleAddEntry} className="w-full bg-gray-900 hover:bg-black text-white py-4 rounded-[24px] font-black shadow-neo active:scale-90 transition-all duration-300 ease-out mt-2 flex items-center justify-center gap-2 hover:-translate-y-1">
            加入聯絡簿 <CheckCircle2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 mb-1">今日清單</h3>
        {entriesForDate.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-3xl shadow-sm text-gray-200">
              <BookOpen size={32} />
            </div>
            <p className="text-gray-400 font-bold text-[14px]">這天目前沒有任何紀錄 ✨</p>
          </div>
        ) : (
          entriesForDate.map((entry, idx) => {
            const subjectInfo = subjects.find(s => s.name === entry.subject) || { icon: '📝', color: 'text-gray-500' };
            return (
              <div key={entry.id} style={{ animationDelay: `${idx * 80}ms`, animationFillMode: 'both' }} className="group p-6 bg-[var(--bg-surface)] rounded-[32px] shadow-soft border border-[var(--border-color)] relative text-left hover:shadow-float transition-all duration-500 animate-slide-up-fade hover:-translate-y-1 glass-effect">
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
                          <div className="text-[11px] font-black text-red-600 uppercase tracking-widest">考試</div>
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
