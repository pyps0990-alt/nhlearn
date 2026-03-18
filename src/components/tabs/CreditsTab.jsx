import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  GraduationCap, Plus, Trash2, Edit3, ChevronDown, ChevronUp, 
  CheckCircle2, AlertCircle, Award, BookOpen, 
  Layers, Target, ShieldCheck, Sparkles, PlusCircle
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

const SEMESTERS = [
  { id: '1-1', name: '高一上學期' },
  { id: '1-2', name: '高一下學期' },
  { id: '2-1', name: '高二上學期' },
  { id: '2-2', name: '高二下學期' },
  { id: '3-1', name: '高三上學期' },
  { id: '3-2', name: '高三下學期' },
];

const CREDIT_REQUIREMENTS = {
  total: 150,
  mandatory: 102,
  elective: 40,
};

export default function CreditsTab({ user, triggerNotification }) {
  const [data, setData] = useState({ semesters: [] });
  const [loading, setLoading] = useState(true);
  const [expandedSemesters, setExpandedSemesters] = useState(new Set(['1-1']));
  const [editingSubject, setEditingSubject] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetSemester, setTargetSemester] = useState('1-1');

  // Load data from Firestore
  useEffect(() => {
    if (!user?.uid) {
      // Guest mode: load from localStorage or initialize empty
      const local = localStorage.getItem('gsat_credits_local');
      if (local) {
        setData(JSON.parse(local));
      } else {
        setData({ semesters: SEMESTERS.map(s => ({ ...s, subjects: [] })) });
      }
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'Users', user.uid, 'Credits', 'main'), (snapshot) => {
      if (snapshot.exists()) {
        setData(snapshot.data());
      } else {
        setData({ semesters: SEMESTERS.map(s => ({ ...s, subjects: [] })) });
      }
      setLoading(false);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
      triggerNotification('連線失敗', '無法讀取雲端學分，切換至離線模式');
      setLoading(false);
    });
    return () => unsub();
  }, [user?.uid, triggerNotification]);

  // Save data
  const saveData = useCallback(async (newData) => {
    if (!user?.uid) {
      localStorage.setItem('gsat_credits_local', JSON.stringify(newData));
      return;
    }
    try {
      await setDoc(doc(db, 'Users', user.uid, 'Credits', 'main'), {
        ...newData,
        lastUpdated: serverTimestamp()
      });
    } catch (e) {
      console.error("Save credits error:", e);
      triggerNotification('存檔失敗', '無法同步至雲端');
    }
  }, [user?.uid, triggerNotification]);

  // Calculation Logic
  const stats = useMemo(() => {
    let totalEarned = 0;
    let mandatoryEarned = 0;
    let electiveEarned = 0;
    let totalAttempted = 0;

    data.semesters.forEach(s => {
      s.subjects.forEach(sub => {
        const credits = parseFloat(sub.credits) || 0;
        const grade = parseFloat(sub.grade) || 0;
        const isPassed = grade >= 60;
        
        totalAttempted += credits;
        if (isPassed) {
          totalEarned += credits;
          if (sub.type === 'mandatory') mandatoryEarned += credits;
          else electiveEarned += credits;
        }
      });
    });

    return {
      totalEarned,
      mandatoryEarned,
      electiveEarned,
      totalAttempted,
      progress: {
        total: Math.min(100, (totalEarned / CREDIT_REQUIREMENTS.total) * 100),
        mandatory: Math.min(100, (mandatoryEarned / CREDIT_REQUIREMENTS.mandatory) * 100),
        elective: Math.min(100, (electiveEarned / CREDIT_REQUIREMENTS.elective) * 100),
      }
    };
  }, [data]);

  const toggleSemester = (id) => {
    setExpandedSemesters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddSubject = (semesterId) => {
    setTargetSemester(semesterId);
    setEditingSubject({ name: '', credits: 2, type: 'mandatory', grade: 60 });
    setShowAddModal(true);
  };

  const handleSaveSubject = () => {
    if (!editingSubject.name || !editingSubject.credits) return;

    const newData = { ...data };
    const semIdx = newData.semesters.findIndex(s => s.id === targetSemester);
    
    if (editingSubject.id) {
      // Edit existing
      newData.semesters[semIdx].subjects = newData.semesters[semIdx].subjects.map(s => 
        s.id === editingSubject.id ? editingSubject : s
      );
    } else {
      // Add new
      const newSub = { ...editingSubject, id: Date.now().toString() };
      newData.semesters[semIdx].subjects.push(newSub);
    }

    setData(newData);
    saveData(newData);
    setShowAddModal(false);
    setEditingSubject(null);
    triggerNotification('設定成功', `已${editingSubject.id ? '更新' : '新增'}科目：${editingSubject.name}`);
  };

  const handleDeleteSubject = (semId, subId) => {
    if (!window.confirm('確定要刪除此科目嗎？')) return;
    const newData = { ...data };
    const semIdx = newData.semesters.findIndex(s => s.id === semId);
    newData.semesters[semIdx].subjects = newData.semesters[semIdx].subjects.filter(s => s.id !== subId);
    setData(newData);
    saveData(newData);
    triggerNotification('已刪除', '科目學分已移除');
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 animate-fadeIn">
      <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
      <p className="text-slate-400 font-bold">載入學分資料中...</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10 pb-20 animate-fadeIn px-2">
      {/* 🏆 Hero Summary Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-blue-500/10 dark:from-emerald-500/5 dark:to-blue-500/5 rounded-[40px] p-8 md:p-12 border border-white/20 dark:border-white/5">
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30">
              <Sparkles size={20} />
            </div>
            <h2 className="text-[24px] font-black tracking-tight text-slate-800 dark:text-white">學分達成進度</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <SummaryItem 
               icon={Award}
               title="總實得學分"
               current={stats.totalEarned}
               target={CREDIT_REQUIREMENTS.total}
               progress={stats.progress.total}
               color="emerald"
            />
            <SummaryItem 
               icon={ShieldCheck}
               title="必修學分"
               current={stats.mandatoryEarned}
               target={CREDIT_REQUIREMENTS.mandatory}
               progress={stats.progress.mandatory}
               color="blue"
            />
            <SummaryItem 
               icon={Layers}
               title="選修學分"
               current={stats.electiveEarned}
               target={CREDIT_REQUIREMENTS.elective}
               progress={stats.progress.elective}
               color="purple"
            />
          </div>
        </div>
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-400/10 blur-[100px] -mr-32 -mt-32 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 blur-[100px] -ml-32 -mb-32 rounded-full" />
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between px-4 mb-2">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-slate-400" />
            <span className="text-[14px] font-black text-slate-400 uppercase tracking-[0.2em]">學期紀錄詳細</span>
          </div>
          <button 
            onClick={() => {
              setTargetSemester('1-1');
              setEditingSubject({ name: '', credits: 2, type: 'mandatory', grade: 60 });
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 dark:bg-white text-white dark:text-slate-900 rounded-full text-[13px] font-black shadow-lg hover:scale-105 transition-all active:scale-95"
          >
            <PlusCircle size={16} /> 快速新增
          </button>
        </div>

        <div className="space-y-4">
          {data.semesters.map(semester => (
            <div key={semester.id} className={`group bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl rounded-[32px] border transition-all duration-500 ${expandedSemesters.has(semester.id) ? 'border-emerald-500/20 shadow-xl' : 'border-white/60 dark:border-white/5 shadow-sm'}`}>
              <button 
                onClick={() => toggleSemester(semester.id)}
                className="w-full flex items-center justify-between p-6 cursor-pointer"
              >
                <div className="flex items-center gap-5">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${expandedSemesters.has(semester.id) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 rotate-6' : 'bg-slate-100 dark:bg-white/5 text-slate-400 rotate-0 group-hover:bg-slate-200'}`}>
                    <GraduationCap size={24} />
                  </div>
                  <div className="text-left">
                    <h3 className="text-[18px] font-black text-slate-800 dark:text-white group-hover:translate-x-1 transition-transform">{semester.name}</h3>
                    <p className="text-[12px] font-bold text-slate-400 flex items-center gap-2 mt-0.5">
                      結算所得：<span className="text-emerald-500">{semester.subjects.reduce((acc, s) => acc + (s.grade >= 60 ? parseFloat(s.credits) : 0), 0)}</span> 學分
                    </p>
                  </div>
                </div>
                <div className={`p-2 rounded-xl bg-slate-50 dark:bg-white/5 text-slate-400 transition-all ${expandedSemesters.has(semester.id) ? 'rotate-180 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : ''}`}>
                  <ChevronDown size={20} />
                </div>
              </button>

              {expandedSemesters.has(semester.id) && (
                <div className="px-6 pb-6 space-y-3 animate-slide-up-fade">
                  {semester.subjects.length === 0 ? (
                    <div className="py-10 text-center border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[24px]">
                       <p className="text-[14px] font-bold text-slate-400">目前尚無資料</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {semester.subjects.map(subject => (
                        <div key={subject.id} className="relative p-5 bg-white/60 dark:bg-white/5 rounded-[24px] border border-transparent hover:border-emerald-500/20 transition-all group/sub">
                          <div className="flex justify-between items-start mb-3">
                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${subject.type === 'mandatory' ? 'bg-blue-500/10 text-blue-500' : 'bg-purple-500/10 text-purple-500'}`}>
                              {subject.type === 'mandatory' ? '部定/校定必修' : '選修課程'}
                            </span>
                            <div className="flex gap-1">
                              <button onClick={() => { setTargetSemester(semester.id); setEditingSubject(subject); setShowAddModal(true); }} className="p-1.5 text-slate-300 hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-all"><Edit3 size={14} /></button>
                              <button onClick={() => handleDeleteSubject(semester.id, subject.id)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          
                          <div className="flex items-end justify-between">
                            <div>
                              <h4 className="text-[16px] font-black text-slate-800 dark:text-slate-200">{subject.name}</h4>
                              <p className="text-[12px] font-bold text-slate-400">{subject.credits} 學分</p>
                            </div>
                            <div className="text-right">
                               <div className={`text-[20px] font-black ${subject.grade >= 60 ? 'text-emerald-500' : 'text-rose-500'}`}>
                                 {subject.grade}
                               </div>
                               <div className="flex items-center gap-1 justify-end">
                                 {subject.grade >= 60 ? <CheckCircle2 size={10} className="text-emerald-500" /> : <AlertCircle size={10} className="text-rose-500" />}
                                 <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{subject.grade >= 60 ? 'Credit Earned' : 'Not Earned'}</span>
                               </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <button 
                    onClick={() => { setTargetSemester(semester.id); setEditingSubject({ name: '', credits: 2, type: 'mandatory', grade: 60 }); setShowAddModal(true); }}
                    className="w-full py-4 bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[24px] flex items-center justify-center gap-2 text-slate-400 font-black hover:border-emerald-500/30 hover:text-emerald-500 transition-all active:scale-95"
                  >
                    <Plus size={18} /> 新增本學期科目
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* 📝 Premium Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 animate-fadeIn">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setShowAddModal(false)} />
          <div className="relative w-full max-sm:max-w-full max-w-sm bg-white dark:bg-slate-900 rounded-[48px] shadow-2xl overflow-hidden border border-white/20 dark:border-white/10 animate-pop-in">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-10 text-white text-center">
               <div className="w-16 h-16 bg-white/20 rounded-3xl mx-auto flex items-center justify-center mb-4">
                 <BookOpen size={32} />
               </div>
               <h3 className="text-[24px] font-black leading-tight mb-1">{editingSubject?.id ? '修改現有科目' : '新增學分紀錄'}</h3>
               <p className="text-emerald-100 font-bold opacity-80 uppercase tracking-widest text-[11px]">{SEMESTERS.find(s => s.id === targetSemester)?.name || targetSemester}</p>
            </div>
            
            <div className="p-10 space-y-7">
              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">選擇學期</label>
                <select 
                  className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black outline-none border border-transparent focus:border-emerald-500 transition-all appearance-none cursor-pointer"
                  value={targetSemester}
                  onChange={e => setTargetSemester(e.target.value)}
                >
                  {SEMESTERS.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">科目名稱</label>
                <input 
                  type="text" autoFocus
                  className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black outline-none border border-transparent focus:border-emerald-500 transition-all"
                  value={editingSubject?.name}
                  onChange={e => setEditingSubject({...editingSubject, name: e.target.value})}
                  placeholder="輸入科目，例如：微積分"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">學分數</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black outline-none border border-transparent focus:border-emerald-500"
                    value={editingSubject?.credits}
                    onChange={e => setEditingSubject({...editingSubject, credits: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">得分</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-100 dark:bg-white/5 rounded-2xl font-black outline-none border border-transparent focus:border-emerald-500"
                    value={editingSubject?.grade}
                    onChange={e => setEditingSubject({...editingSubject, grade: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">類別</label>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl">
                  {['mandatory', 'elective'].map(t => (
                    <button
                      key={t}
                      onClick={() => setEditingSubject({...editingSubject, type: t})}
                      className={`flex-1 py-3.5 rounded-xl font-black text-[13px] transition-all ${editingSubject?.type === t ? 'bg-white dark:bg-white/10 shadow-md text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}
                    >
                      {t === 'mandatory' ? '必修' : '選修'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowAddModal(false)} className="flex-1 py-4.5 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-[24px] font-black active:scale-95 transition-all">取消</button>
                <button onClick={handleSaveSubject} className="flex-1 py-4.5 bg-emerald-500 text-white rounded-[24px] font-black shadow-xl shadow-emerald-500/30 active:scale-95 transition-all">確認儲存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryItem({ icon: Icon, title, current, target, progress, color }) {
  const configs = {
    emerald: 'text-emerald-500 bg-emerald-500',
    blue: 'text-blue-500 bg-blue-500',
    purple: 'text-purple-500 bg-purple-500',
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Icon size={16} className={configs[color].split(' ')[0]} />
        <span className="text-[12px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[32px] font-black text-slate-800 dark:text-white leading-none">{current}</span>
        <span className="text-[14px] font-bold text-slate-400 leading-none">/ {target}</span>
      </div>
      <div className="relative w-full h-2 bg-slate-200/50 dark:bg-white/5 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full transition-all duration-1000 ease-spring-smooth ${configs[color].split(' ')[1]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center">
         <span className={`text-[10px] font-black uppercase tracking-tighter ${progress >= 100 ? 'text-emerald-500' : 'text-slate-400'}`}>
           {progress >= 100 ? 'Target Reached ✅' : `${Math.round(progress)}% Completed`}
         </span>
         {current < target && (
            <span className="text-[10px] font-black text-slate-300">-{target - current} left</span>
         )}
      </div>
    </div>
  );
}
