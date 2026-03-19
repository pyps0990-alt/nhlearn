import React, { useState } from 'react';
import {
  BrainCircuit, X, CheckCircle2, Library, Edit3, Trash2, Plus,
  ArrowLeft, Wand2, RefreshCw, Upload, Sparkles, Save, Calendar,
  FolderPlus, FileText, ChevronLeft, Book, BookOpen, FlaskConical,
  Palette, Languages, Globe, Timer, Lightbulb, PenTool, Trophy, Music, Layout, BookMarked, Target
} from 'lucide-react';
import { NOTE_CATEGORIES, ICON_MAP } from '../../utils/constants';
import { fetchAI } from '../../utils/helpers';

const SUBJECT_ICONS = [
  'BookText', 'Languages', 'Calculator', 'Zap', 'Beaker', 'Dna',
  'History', 'Map', 'Scale', 'Library', 'Globe', 'GraduationCap',
  'Music', 'Palette', 'Trophy', 'Laptop', 'PenTool', 'Lightbulb'
];

const COLOR_CLASSES = [
  { key: 'emerald', hex: 'bg-emerald-500' },
  { key: 'blue', hex: 'bg-blue-500' },
  { key: 'rose', hex: 'bg-rose-500' },
  { key: 'amber', hex: 'bg-amber-500' },
  { key: 'purple', hex: 'bg-purple-500' },
  { key: 'indigo', hex: 'bg-indigo-500' },
  { key: 'slate', hex: 'bg-slate-500' }
];

const QuizModal = ({ isOpen, onClose, quizData, subject }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  if (!isOpen || !quizData || quizData.length === 0) return null;

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const correct = index === quizData[currentQuestion].answerIndex;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentQuestion < quizData.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  const q = quizData[currentQuestion];

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-[450px] bg-white/70 dark:bg-zinc-800/70 backdrop-blur-3xl backdrop-saturate-200 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_24px_64px_rgba(0,0,0,0.2)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_24px_64px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col max-h-[90vh] border border-white/60 dark:border-white/10">
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2 tracking-tight"><BrainCircuit size={24} /> AI 隨堂測驗</h3>
            <p className="text-[12px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{subject} • 第 {currentQuestion + 1}/{quizData.length} 題</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!showResult ? (
            <>
              <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-[28px] border border-[var(--border-color)] shadow-inner">
                <p className="text-[17px] font-black text-[var(--text-primary)] leading-relaxed text-center">{q.question}</p>
              </div>
              <div className="flex flex-col gap-3">
                {q.options.map((opt, idx) => {
                  let statusClass = "bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border-white/60 dark:border-white/10 text-[var(--text-primary)] hover:border-emerald-200 hover:bg-emerald-50/80 dark:hover:bg-emerald-500/20";
                  if (selectedAnswer === idx) {
                    statusClass = isCorrect ? "bg-emerald-500 text-white border-emerald-500 scale-[1.02] shadow-lg shadow-emerald-500/30" : "bg-red-500 text-white border-red-500 scale-[1.02] shadow-lg shadow-red-500/30";
                  } else if (selectedAnswer !== null && idx === q.answerIndex) {
                    statusClass = "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200";
                  }
                  return (
                    <button key={idx} onClick={() => handleAnswer(idx)} disabled={selectedAnswer !== null} className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center gap-3 active:scale-95 ${statusClass}`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black ${selectedAnswer === idx ? 'bg-white/20' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>{String.fromCharCode(65 + idx)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-6 animate-fadeIn">
              <div className="p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-full"><CheckCircle2 size={80} className="text-emerald-500" /></div>
              <div>
                <h4 className="text-3xl font-black text-[var(--text-primary)] mb-2">測驗結束！</h4>
                <div className="text-5xl font-black text-emerald-600 mt-2">{score} <span className="text-xl text-slate-400">/ {quizData.length}</span></div>
              </div>
              <button onClick={onClose} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95">回到筆記</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 輔助函式：確保向下相容舊版 Emoji，同時支援新版 Lucide 圖標
const renderSubjectIcon = (iconVal, size = 48) => {
  if (ICON_MAP[iconVal]) {
    const IconComp = ICON_MAP[iconVal];
    return <IconComp size={size} className="shrink-0" />;
  }
  if (typeof iconVal === 'string' && /\p{Emoji}/u.test(iconVal)) {
    return <span style={{ fontSize: `${size * 0.8}px` }} className="leading-none select-none">{iconVal}</span>;
  }
  return <BookMarked size={size} className="shrink-0" />;
};

const NotesTab = ({ notes, setNotes, subjects, setSubjects, selectedSubject, setSelectedSubject, triggerNotification, isGoogleConnected }) => {
  const [newNote, setNewNote] = useState({ category: '課堂筆記', title: '', content: '' });
  const [attachments, setAttachments] = useState([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', icon: 'BookText', color: 'emerald' });

  // ----------------邏輯函式保持不變 (handleAddSubject, handleDeleteNote 等)----------------
  const handleAddSubject = () => {
    if (!newSub.name) return;
    if (subjects.find(s => s.name === newSub.name)) { triggerNotification('重複科目', '該科目已存在！'); return; }
    setSubjects(prev => [...prev, { ...newSub }]);
    setNewSub({ name: '', icon: 'BookText', color: 'emerald' });
    setShowAddSubject(false);
    triggerNotification('新增成功', `已新增科目：${newSub.name}`);
  };

  const handleDeleteSubject = (name) => {
    if (window.confirm(`確定要刪除「${name}」及其關聯內容嗎？`)) {
      setSubjects(prev => prev.filter(s => s.name !== name));
      setNotes(prev => prev.filter(n => n.subject === name));
      triggerNotification('已刪除', `已移除科目：${name}`);
    }
  };

  const handleGenerateQuiz = async () => {
    const subjectNotes = notes.filter(n => n.subject === selectedSubject?.name);
    if (subjectNotes.length === 0) { triggerNotification('筆記不足', '請先新增筆記內容'); return; }
    setIsGeneratingQuiz(true);
    try {
      const combinedContent = subjectNotes.map(n => `標題: ${n.title}\n內容: ${n.content}`).join('\n\n---\n\n');
      const prompt = `請根據以下筆記內容，設計 3 題選擇題。JSON 陣列格式回傳：[{"question": "問題", "options": ["A", "B", "C", "D"], "answerIndex": 0}]\n\n${combinedContent}`;
      const summary = await fetchAI(prompt, { temperature: 0.7, responseJson: true });
      setQuizData(JSON.parse(summary.replace(/```json/gi, '').replace(/```/g, '').trim()));
      setIsQuizOpen(true);
    } catch (e) { triggerNotification('出題失敗', 'AI 伺服器連線失敗'); }
    finally { setIsGeneratingQuiz(false); }
  };

  const handleSaveNote = () => {
    if (!newNote.title || (!newNote.content && attachments.length === 0)) return;
    const noteToSave = { id: Date.now(), subject: selectedSubject?.name || '未知', ...newNote, attachments, date: new Date().toLocaleDateString() };
    setNotes(prev => [noteToSave, ...prev]);
    setNewNote({ category: '課堂筆記', title: '', content: '' });
    setAttachments([]);
    triggerNotification('儲存成功', `已儲存至「${selectedSubject?.name}」。`);
  };

  const handleDeleteNote = async (id) => {
    const note = notes.find(n => n.id === id);
    if (window.confirm(`確定要刪除「${note.title}」嗎？`)) {
      setNotes(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleAiSummarize = async () => {
    setIsProcessingAI(true);
    try {
      const summary = await fetchAI(`摘要這份筆記：\n${newNote.content}`, { temperature: 0.3 });
      setNewNote(prev => ({ ...prev, content: `【AI 重點整理】\n${summary}\n\n---\n${prev.content}` }));
    } catch (e) { triggerNotification('AI 失敗', 'AI 伺服器連線失敗'); }
    finally { setIsProcessingAI(false); }
  };

  // 🚀 全新功能：錯題本專屬 AI 視覺深度分析
  const handleAiMistakeAnalysis = async () => {
    const imgAttachment = attachments.find(a => a.type && a.type.startsWith('image/'));
    if (!imgAttachment) { triggerNotification('缺少圖片', '請先上傳錯題照片'); return; }

    setIsProcessingAI(true);
    triggerNotification('AI 分析中', '正在深入解析錯題，請稍候...');
    try {
      // 取出 base64 資料段
      const base64Data = imgAttachment.data.split(',')[1];
      const prompt = `你是一位專業的高中家教。請分析這張錯題照片，並嚴格使用以下 Markdown 結構回傳（不需問候語）：\n### 📝 題目辨識\n(完整辨識照片中的題目文字)\n### 🎯 核心考點\n(點出這題在考什麼觀念或公式)\n### 💡 詳細解法\n(一步一步教導如何解題)\n### ⚠️ 常見陷阱\n(學生為什麼會寫錯？哪裡容易粗心？)\n### 🔄 舉一反三\n(出一題類似的簡單小問題，並附上解答)`;
      
      const analysis = await fetchAI(prompt, { temperature: 0.2, image: { mimeType: imgAttachment.type, data: base64Data } });
      setNewNote(prev => ({ ...prev, content: prev.content ? `${prev.content}\n\n${analysis}` : analysis }));
      triggerNotification('解析成功', '已自動填入詳細解法與考點！');
    } catch (e) {
      triggerNotification('AI 失敗', 'AI 伺服器連線失敗');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      // 確保保存完整的 mimeType，供 Gemini Vision API 使用
      reader.onloadend = () => setAttachments(prev => [...prev, { id: Date.now() + Math.random(), name: file.name, type: file.type || 'image/jpeg', data: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  // ----------------渲染邏輯修正 (重要：分離選單與筆記內容)----------------

  if (!selectedSubject) {
    return (
      <div className="space-y-8 flex flex-col w-full text-left mb-12">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
            <BookMarked size={28} className="shrink-0 neon-glow-emerald" /> 知識筆記
          </h2>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-3.5 rounded-[20px] transition-all active:scale-[0.95] duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isEditMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 rotate-12' : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-[24px] text-slate-500 border border-white/60 dark:border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.08)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-0.5'}`}
          >
            {isEditMode ? <CheckCircle2 size={20} /> : <Edit3 size={20} />}
          </button>
        </div>

        {showAddSubject && (
          <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-5 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] animate-slide-up-fade flex flex-col gap-3">
            <h4 className="text-[14px] font-black text-[var(--text-primary)] flex items-center gap-2">
              <FolderPlus size={16} className="text-emerald-500" /> 新增科目
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-2xl flex items-center justify-center text-emerald-500 shadow-inner">
                  {renderSubjectIcon(newSub.icon, 28)}
                </div>
                <input
                  type="text"
                  placeholder="科目名稱"
                  className="flex-1 p-4 bg-slate-50 dark:bg-white/5 border border-[var(--border-color)] rounded-2xl text-sm font-bold outline-none focus:border-emerald-400"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                />
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">選擇圖示</span>
                <div className="grid grid-cols-6 sm:grid-cols-9 gap-2 p-1">
                  {SUBJECT_ICONS.map(iconName => {
                    const IconComp = ICON_MAP[iconName] || BookMarked;
                    return (
                      <button
                        key={iconName}
                        onClick={() => setNewSub({ ...newSub, icon: iconName })}
                        className={`aspect-square flex items-center justify-center rounded-xl transition-all active:scale-90 ${newSub.icon === iconName ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 scale-110 shadow-sm ring-2 ring-emerald-500/30' : 'bg-slate-50 dark:bg-white/5 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                      >
                        <IconComp size={20} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">科目標籤顏色</span>
                <div className="flex flex-wrap gap-2 p-1">
                  {COLOR_CLASSES.map(c => (
                    <button key={c.key} onClick={() => setNewSub({ ...newSub, color: c.key })}
                      className={`w-7 h-7 rounded-full ${c.hex} transition-all active:scale-90 ${newSub.color === c.key ? 'ring-4 ring-offset-2 ring-emerald-200 dark:ring-emerald-500/50 scale-110' : 'opacity-70 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddSubject(false)} className="flex-1 py-3 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-gray-400 rounded-2xl font-black text-sm active:scale-95">取消</button>
              <button onClick={handleAddSubject} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm active:scale-95 shadow-sm">新增</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {subjects.map(s => {
            return (
              <div key={s.name} className="relative group animate-pop-in">
                <button
                  onClick={() => !isEditMode && setSelectedSubject(s)}
                  className={`relative w-full aspect-square bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 rounded-[40px] flex flex-col items-center justify-center gap-4 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${isEditMode ? 'opacity-50 grayscale scale-[0.98]' : 'hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-2 active:scale-[0.95] hover:bg-white/60 dark:hover:bg-white/10'}`}
                >
                  <div className="text-emerald-500 transform group-hover:scale-110 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]">
                    {renderSubjectIcon(s.icon, 48)}
                  </div>
                  <span className="text-[16px] font-black text-[var(--text-primary)] tracking-wide">{s.name}</span>
                </button>
                {isEditMode && (
                  <button
                    onClick={() => handleDeleteSubject(s.name)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-125 z-10"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}
          <button onClick={() => setShowAddSubject(true)} className="aspect-square border-2 border-dashed border-[var(--border-color)] rounded-[40px] flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.95] group"><Plus size={36} className="group-hover:scale-125 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" /></button>
        </div>
      </div>
    );
  }

  // 當選擇了科目後，渲染筆記清單
  const sn = notes.filter(n => n.subject === selectedSubject?.name);

  return (
    <div className="space-y-8 flex flex-col w-full text-left mb-12 pb-10 relative animate-slide-up-fade">
      <QuizModal isOpen={isQuizOpen} onClose={() => setIsQuizOpen(false)} quizData={quizData} subject={selectedSubject?.name} />
      <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-6 px-2">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedSubject(null)} className="p-4 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 rounded-[24px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_32px_rgba(0,0,0,0.3)] active:scale-[0.95] border border-white/60 dark:border-white/10 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]"><ArrowLeft size={22} className="text-slate-600 dark:text-gray-300" /></button>
          <div>
            <h2 className="text-[24px] font-black text-emerald-600 tracking-tight">{selectedSubject?.name}</h2>
            <p className="text-[12px] font-bold text-slate-400">{sn.length} 則筆記</p>
          </div>
        </div>
        <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || sn.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[13px] font-black active:scale-95 shadow-lg">
          {isGeneratingQuiz ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />} AI 出題
        </button>
      </div>

      <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] space-y-5 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <select className="bg-slate-50 dark:bg-white/5 border border-[var(--border-color)] rounded-2xl px-3 py-4 text-xs font-black text-[var(--text-primary)] outline-none" value={newNote.category} onChange={e => setNewNote({ ...newNote, category: e.target.value })}>
            {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="text" className="flex-1 bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[20px] px-5 py-4 font-black text-[var(--text-primary)] outline-none focus:border-emerald-400" placeholder="標題..." value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
        </div>
        <textarea className="w-full bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] p-5 font-bold text-[var(--text-primary)] min-h-[140px] outline-none focus:border-emerald-400" placeholder="內容..." value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} />
        <div className="flex items-center justify-between gap-3 pt-2">
          <div className="flex gap-2 flex-grow">
            <label className="flex-1 flex items-center justify-center gap-2 text-xs font-black text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 py-3.5 rounded-2xl cursor-pointer active:scale-95 transition-transform">
              <Upload size={18} /> 上傳 <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
            <button onClick={handleAiSummarize} disabled={isProcessingAI} className="flex-1 flex items-center justify-center gap-2 text-xs font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 py-3.5 rounded-2xl active:scale-95">
              {isProcessingAI ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />} AI 摘要
            </button>
          </div>
          <button onClick={handleSaveNote} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center active:scale-95 shadow-lg shadow-emerald-500/20"><Save size={24} /></button>
        </div>
      </div>

      <div className="space-y-4 mt-4">
        {sn.map(n => (
          <div key={n.id} className="p-7 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] group">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1.5 ${n.category === '錯題本' ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400' : 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400'} rounded-lg text-[10px] font-black`}>{n.category}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleDeleteNote(n.id)} className="p-2 text-slate-300 hover:text-red-500 active:scale-125 transition-all"><Trash2 size={18} /></button>
              </div>
            </div>
            <h4 className="font-black text-[var(--text-primary)] text-lg mb-2">{n.title}</h4>
            <p className="text-sm font-bold text-slate-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesTab;