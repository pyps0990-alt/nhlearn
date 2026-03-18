import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    TrendingUp, Plus, Trash2, CheckCircle2, Award, Edit3, X, ChevronRight, Settings
} from 'lucide-react';
import { db } from '../../config/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';

const DEFAULT_SUBJECTS = [
    { id: 'chi', label: '國文', color: '#f43f5e' }, // rose-500
    { id: 'eng', label: '英文', color: '#3b82f6' }, // blue-500
    { id: 'mathA', label: '數A', color: '#f59e0b' }, // amber-500
    { id: 'mathB', label: '數B', color: '#eab308' }, // yellow-500
    { id: 'sci', label: '自然', color: '#10b981' }, // emerald-500
    { id: 'soc', label: '社會', color: '#8b5cf6' }, // purple-500
];
const DEFAULT_TYPES = ['模擬考', '段考', '複習考'];

export default function GradesTab({ user, triggerNotification }) {
    const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
    const [examTypes, setExamTypes] = useState(DEFAULT_TYPES);
    const [exams, setExams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [activeSubject, setActiveSubject] = useState('all');
    const [filterType, setFilterType] = useState('all');

    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [editingSubjects, setEditingSubjects] = useState([]);
    const [editingTypes, setEditingTypes] = useState([]);

    const [editingExam, setEditingExam] = useState({
        id: '', name: '', date: '', type: '', scores: {}
    });

    // 讀取 Firestore 資料
    useEffect(() => {
        if (!user?.uid) {
            const local = localStorage.getItem('gsat_grades_local');
            const localSubs = localStorage.getItem('gsat_grades_subjects');
            const localTypes = localStorage.getItem('gsat_grades_types');
            if (local) setExams(JSON.parse(local));
            if (localSubs) setSubjects(JSON.parse(localSubs));
            if (localTypes) setExamTypes(JSON.parse(localTypes));
            setLoading(false);
            return;
        }
        const unsub = onSnapshot(doc(db, 'Users', user.uid, 'Grades', 'main'), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const fetchedExams = data.exams || [];
                fetchedExams.sort((a, b) => new Date(a.date) - new Date(b.date)); // 依日期排序
                setExams(fetchedExams);
                if (data.subjects) setSubjects(data.subjects);
                if (data.examTypes) setExamTypes(data.examTypes);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [user?.uid]);

    const saveExams = async (newExams) => {
        newExams.sort((a, b) => new Date(a.date) - new Date(b.date));
        setExams(newExams);
        if (!user?.uid) {
            localStorage.setItem('gsat_grades_local', JSON.stringify(newExams));
            return;
        }
        try {
            await setDoc(doc(db, 'Users', user.uid, 'Grades', 'main'), {
                exams: newExams, updatedAt: serverTimestamp()
            }, { merge: true });
        } catch (e) {
            triggerNotification('錯誤', '儲存失敗');
        }
    };

    const handleSaveSettings = async () => {
        setSubjects(editingSubjects);
        setExamTypes(editingTypes);
        if (!user?.uid) {
            localStorage.setItem('gsat_grades_subjects', JSON.stringify(editingSubjects));
            localStorage.setItem('gsat_grades_types', JSON.stringify(editingTypes));
        } else {
            try {
                await setDoc(doc(db, 'Users', user.uid, 'Grades', 'main'), {
                    subjects: editingSubjects, examTypes: editingTypes, updatedAt: serverTimestamp()
                }, { merge: true });
            } catch (e) {
                triggerNotification('錯誤', '設定儲存失敗');
            }
        }
        setShowSettingsModal(false);
        triggerNotification('設定已儲存', '科目與考試類型已更新');
    };

    const handleSaveExam = () => {
        if (!editingExam.name || !editingExam.date) {
            triggerNotification('提示', '請填寫考試名稱與日期');
            return;
        }
        let newExams = [...exams];
        if (editingExam.id) {
            newExams = newExams.map(e => e.id === editingExam.id ? editingExam : e);
            triggerNotification('更新成功', '成績已更新');
        } else {
            newExams.push({ ...editingExam, id: Date.now().toString() });
            triggerNotification('新增成功', '已加入新成績');
        }
        saveExams(newExams);
        setShowAddModal(false);
    };

    const handleDeleteExam = (id) => {
        if (window.confirm('確定要刪除這筆成績紀錄嗎？')) {
            saveExams(exams.filter(e => e.id !== id));
            triggerNotification('已刪除', '紀錄已移除');
        }
    };

    // --- 純 SVG 動態折線圖核心邏輯 ---
    const chartData = useMemo(() => {
        const filteredExams = exams.filter(e => filterType === 'all' || e.type === filterType);
        if (filteredExams.length === 0) return null;

        const width = 800;
        const height = 300;
        const paddingX = 40;
        const paddingY = 40;
        const chartWidth = width - paddingX * 2;
        const chartHeight = height - paddingY * 2;

        // 動態偵測圖表應該用 15級分 還是 100分制
        let maxScore = 15;
        filteredExams.forEach(e => {
            Object.values(e.scores).forEach(s => {
                const val = parseFloat(s);
                if (!isNaN(val) && val > maxScore) maxScore = 100;
            });
        });

        const yLabels = maxScore === 100 ? [0, 20, 40, 60, 80, 100] : [0, 5, 10, 15];
        const spacingX = filteredExams.length > 1 ? chartWidth / (filteredExams.length - 1) : chartWidth;

        const lines = subjects.map(sub => {
            if (activeSubject !== 'all' && activeSubject !== sub.id) return null;

            const points = filteredExams.map((exam, index) => {
                const score = exam.scores ? parseFloat(exam.scores[sub.id]) : NaN;
                if (isNaN(score)) return null; // 未考該科
                const x = paddingX + index * spacingX;
                const y = paddingY + chartHeight - (score / maxScore) * chartHeight;
                return { x, y, score, examName: exam.name, type: exam.type };
            }).filter(p => p !== null);

            if (points.length === 0) return null;

            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            return { ...sub, points, pathD };
        }).filter(l => l !== null);

        return { width, height, paddingX, paddingY, chartHeight, spacingX, lines, maxScore, yLabels, filteredExams };
    }, [exams, activeSubject, filterType, subjects]);

    if (loading) return null;

    return (
        <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade mb-12 pb-10">
            <div className="flex justify-between items-center px-2">
                <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
                    <TrendingUp size={28} className="shrink-0 neon-glow-emerald" /> 成績趨勢
                </h2>
                <button
                    onClick={() => {
                        setEditingExam({ id: '', name: '', date: new Date().toISOString().split('T')[0], type: examTypes[0] || '未分類', scores: subjects.reduce((acc, sub) => ({ ...acc, [sub.id]: '' }), {}) });
                        setShowAddModal(true);
                    }}
                    className="bg-emerald-600 text-white px-5 py-2.5 rounded-2xl font-black text-[14px] flex items-center gap-2 active:scale-95 transition-all shadow-lg shadow-emerald-500/20"
                >
                    <Plus size={18} /> 新增成績
                </button>
            </div>

            {/* 圖表視覺區塊 */}
            <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)]">

                {/* 過濾器與設定中心 */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div className="flex flex-col gap-2 w-full min-w-0">
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            <button onClick={() => setFilterType('all')} className={`px-4 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-all ${filterType === 'all' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                                全部考試
                            </button>
                            {examTypes.map(t => (
                                <button key={t} onClick={() => setFilterType(t)} className={`px-4 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-all ${filterType === t ? 'bg-indigo-500 text-white shadow-md' : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                                    {t}
                                </button>
                            ))}
                        </div>
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                            <button onClick={() => setActiveSubject('all')} className={`px-4 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-all ${activeSubject === 'all' ? 'bg-slate-800 text-white dark:bg-white dark:text-slate-900 shadow-md' : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}>
                                全部科目
                            </button>
                            {subjects.map(sub => (
                                <button
                                    key={sub.id} onClick={() => setActiveSubject(sub.id)}
                                    style={{ backgroundColor: activeSubject === sub.id ? sub.color : '', color: activeSubject === sub.id ? '#fff' : '' }}
                                    className={`px-4 py-2 rounded-xl text-[12px] font-black whitespace-nowrap transition-all ${activeSubject === sub.id ? 'shadow-md shadow-[currentColor]/30' : 'bg-slate-100/50 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                >
                                    {sub.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <button onClick={() => {
                        setEditingSubjects([...subjects]);
                        setEditingTypes([...examTypes]);
                        setShowSettingsModal(true);
                    }} className="p-3 bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-white/20 transition-all shrink-0">
                        <Settings size={20} />
                    </button>
                </div>

                {/* SVG 手刻折線圖 */}
                {!chartData ? (
                    <div className="h-[250px] flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                        <Award size={40} className="text-slate-300 mb-2" />
                        <p className="text-slate-400 font-bold text-sm">此分類下目前沒有成績紀錄</p>
                    </div>
                ) : (
                    <div className="w-full overflow-x-auto scrollbar-hide py-4">
                        <div className="min-w-[500px]">
                            <svg viewBox={`0 0 ${chartData.width} ${chartData.height}`} className="w-full h-auto drop-shadow-md">
                                {/* 背景格線與 Y 軸標籤 */}
                                {chartData.yLabels.map(level => {
                                    const y = chartData.paddingY + chartData.chartHeight - (level / chartData.maxScore) * chartData.chartHeight;
                                    return (
                                        <g key={level}>
                                            <line x1={chartData.paddingX} y1={y} x2={chartData.width - chartData.paddingX} y2={y} stroke="currentColor" className="text-slate-200 dark:text-white/5" strokeWidth="1" strokeDasharray="4 4" />
                                            <text x={chartData.paddingX - 10} y={y + 4} fill="currentColor" className="text-slate-400 text-[12px] font-bold font-sans" textAnchor="end">{level}</text>
                                        </g>
                                    );
                                })}

                                {/* X 軸考試名稱 */}
                                {chartData.filteredExams.map((exam, i) => (
                                    <text key={i} x={chartData.paddingX + i * chartData.spacingX} y={chartData.height - 10} fill="currentColor" className="text-slate-500 dark:text-slate-400 text-[12px] font-black font-sans" textAnchor="middle">
                                        {exam.name}
                                    </text>
                                ))}

                                {/* 畫折線與資料點 */}
                                {chartData.lines.map(line => (
                                    <g key={line.id} className="transition-all duration-700 ease-spring-smooth">
                                        <path d={line.pathD} fill="none" stroke={line.color} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 4px 6px ${line.color}40)` }} className="animate-path-draw" />
                                        {line.points.map((p, i) => (
                                            <g key={i} className="group/point">
                                                <circle cx={p.x} cy={p.y} r="5" fill={line.color} stroke="#fff" strokeWidth="2" className="transition-all duration-300 hover:r-[8]" />
                                                {/* Hover Tooltip (純 SVG 實作) */}
                                                <g className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200 pointer-events-none">
                                                    <rect x={p.x - 30} y={p.y - 35} width="60" height="24" rx="8" fill={line.color} />
                                                    <text x={p.x} y={p.y - 18} fill="#fff" fontSize="12" fontWeight="bold" textAnchor="middle">{p.score}</text>
                                                </g>
                                            </g>
                                        ))}
                                    </g>
                                ))}
                            </svg>
                        </div>
                    </div>
                )}
            </div>

            {/* 歷史紀錄清單 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.map(exam => (
                    <div key={exam.id} className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-sm flex flex-col transition-all hover:shadow-md hover:-translate-y-1">
                        <div className="flex justify-between items-start mb-4 border-b border-slate-100 dark:border-white/5 pb-4">
                            <div>
                                <h4 className="text-[18px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    {exam.name}
                                    <span className="text-[10px] bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md">{exam.type || '未分類'}</span>
                                </h4>
                                <p className="text-[12px] font-bold text-slate-400">{exam.date}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => { setEditingExam(exam); setShowAddModal(true); }} className="p-2 text-slate-400 hover:text-emerald-500 bg-slate-50 dark:bg-white/5 rounded-xl transition-all"><Edit3 size={16} /></button>
                                <button onClick={() => handleDeleteExam(exam.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-50 dark:bg-white/5 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {subjects.map(sub => (
                                exam.scores && exam.scores[sub.id] !== undefined && exam.scores[sub.id] !== '' && (
                                    <div key={sub.id} className="flex flex-col items-center bg-slate-50 dark:bg-white/5 p-2.5 rounded-[16px]">
                                        <span className="text-[11px] font-black text-slate-500 mb-1">{sub.label}</span>
                                        <span className="text-[18px] font-black" style={{ color: sub.color }}>{exam.scores[sub.id]}</span>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 新增/編輯彈窗 */}
            {showAddModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowAddModal(false)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative z-10 animate-pop-in border border-white/20 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white">{editingExam.id ? '編輯成績' : '新增模擬考成績'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[11px] font-black text-slate-400 uppercase ml-2">考試名稱</label>
                                <input type="text" value={editingExam.name} onChange={e => setEditingExam({ ...editingExam, name: e.target.value })} placeholder="例如：全模第一次" className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 rounded-2xl mt-1 text-[15px] font-bold outline-none focus:border-emerald-500 text-[var(--text-primary)]" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase ml-2">考試日期</label>
                                    <input type="date" value={editingExam.date} onChange={e => setEditingExam({ ...editingExam, date: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 rounded-2xl mt-1 text-[15px] font-bold outline-none focus:border-emerald-500 text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-black text-slate-400 uppercase ml-2">考試類型</label>
                                    <select value={editingExam.type || ''} onChange={e => setEditingExam({ ...editingExam, type: e.target.value })} className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-4 rounded-2xl mt-1 text-[15px] font-bold outline-none focus:border-emerald-500 text-[var(--text-primary)] appearance-none">
                                        {examTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                        <option value="未分類">未分類</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                {subjects.map(sub => (
                                    <div key={sub.id}>
                                        <label className="text-[11px] font-black text-slate-400 ml-2">{sub.label}級分</label>
                                        <input
                                            type="number" min="0" max="100" step="0.1"
                                            value={editingExam.scores ? editingExam.scores[sub.id] || '' : ''}
                                            onChange={e => setEditingExam({ ...editingExam, scores: { ...editingExam.scores, [sub.id]: e.target.value } })}
                                            placeholder="分數或級分"
                                            className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 p-3.5 rounded-2xl mt-1 text-[15px] font-bold outline-none focus:border-emerald-500 text-center text-[var(--text-primary)]"
                                        />
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleSaveExam} className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl mt-4 active:scale-95 transition-transform shadow-lg shadow-emerald-500/30">
                                儲存紀錄
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* ⚙️ 專屬設定彈窗：自訂科目與類型 */}
            {showSettingsModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fadeIn" onClick={() => setShowSettingsModal(false)} />
                    <div className="bg-white dark:bg-slate-900 rounded-[40px] p-8 w-full max-w-sm shadow-2xl relative z-10 animate-pop-in border border-white/20 dark:border-white/10">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2"><Settings size={20} /> 自訂科目與類型</h3>
                            <button onClick={() => setShowSettingsModal(false)} className="p-2 bg-slate-100 dark:bg-white/10 rounded-full text-slate-500"><X size={20} /></button>
                        </div>

                        <div className="space-y-6 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                            {/* 考試類型設定 */}
                            <div>
                                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 block">考試類型</label>
                                <div className="space-y-2">
                                    {editingTypes.map((t, i) => (
                                        <div key={i} className="flex gap-2">
                                            <input value={t} onChange={e => {
                                                const newT = [...editingTypes]; newT[i] = e.target.value; setEditingTypes(newT);
                                            }} className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-indigo-400 text-[var(--text-primary)]" />
                                            <button onClick={() => setEditingTypes(editingTypes.filter((_, idx) => idx !== i))} className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setEditingTypes([...editingTypes, '新類型'])} className="text-indigo-600 dark:text-indigo-400 text-sm font-bold flex items-center gap-1 mt-2 p-2 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"><Plus size={16} /> 新增類型</button>
                                </div>
                            </div>

                            {/* 科目設定 */}
                            <div>
                                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest mb-3 block">科目與圖表代表色</label>
                                <div className="space-y-2">
                                    {editingSubjects.map((s, i) => (
                                        <div key={s.id} className="flex gap-2 items-center">
                                            <input type="color" value={s.color} onChange={e => {
                                                const newS = [...editingSubjects]; newS[i].color = e.target.value; setEditingSubjects(newS);
                                            }} className="w-11 h-11 rounded-xl cursor-pointer border-0 bg-transparent p-0 shrink-0" />
                                            <input value={s.label} onChange={e => {
                                                const newS = [...editingSubjects]; newS[i].label = e.target.value; setEditingSubjects(newS);
                                            }} className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 p-3 rounded-xl text-sm font-bold outline-none focus:border-emerald-400 text-[var(--text-primary)]" />
                                            <button onClick={() => setEditingSubjects(editingSubjects.filter((_, idx) => idx !== i))} className="p-3 text-rose-500 bg-rose-50 dark:bg-rose-500/10 rounded-xl hover:bg-rose-100"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => setEditingSubjects([...editingSubjects, { id: Date.now().toString(), label: '新科目', color: '#10b981' }])} className="text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center gap-1 mt-2 p-2 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"><Plus size={16} /> 新增科目</button>
                                </div>
                            </div>
                        </div>

                        <button onClick={handleSaveSettings} className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-black py-4 rounded-2xl mt-6 active:scale-95 transition-transform shadow-lg">
                            儲存設定
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}