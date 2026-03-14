import React, { useState } from 'react';
import {
  BrainCircuit, X, CheckCircle2, Library, Edit3, Trash2, Plus,
  ArrowLeft, Wand2, RefreshCw, Upload, Sparkles, Save, Calendar,
  FolderPlus, FileText, ChevronLeft, Book, BookOpen, FlaskConical,
  Palette, Languages, Globe, Timer, Lightbulb, PenTool, Trophy, Music, Layout
} from 'lucide-react';
import { NOTE_CATEGORIES } from '../utils/constants';
import { fetchAI } from '../utils/helpers';

// 1. 補上缺失的圖標映射表，解決黑屏與圖標顯示問題
const ICON_MAP = {
  '📘': Book, '📕': BookOpen, '📗': FlaskConical, '📙': Palette, '📓': Languages, 
  '🎨': Palette, '🧪': FlaskConical, '📏': PenTool, '💻': Layout, 
  '🇬🇧': Globe, '🌍': Globe, '⏳': Timer, '💡': Lightbulb, 
  '✍️': PenTool, '🏀': Trophy, '🎵': Music
};

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
      <div className="w-full max-w-[450px] bg-[var(--bg-surface)] rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-[var(--border-color)]">
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
                  let statusClass = "bg-[var(--bg-surface)] border-[var(--border-color)] text-[var(--text-primary)] hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-500/10";
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

const NotesTab = ({ notes, setNotes, subjects, setSubjects, selectedSubject, setSelectedSubject, triggerNotification, isGoogleConnected }) => {
  const [newNote, setNewNote] = useState({ category: '課堂筆記', title: '', content: '' });
  const [attachments, setAttachments] = useState([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', icon: '📘', color: 'emerald' });

  // ----------------邏輯函式保持不變 (handleAddSubject, handleDeleteNote 等)----------------
  const handleAddSubject = () => {
    if (!newSub.name) return;
    if (subjects.find(s => s.name === newSub.name)) { triggerNotification('重複科目', '該科目已存在！'); return; }
    setSubjects(prev => [...prev, { ...newSub }]);
    setNewSub({ name: '', icon: '📘', color: 'emerald' });
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
    const geminiKey = localStorage.getItem('gsat_gemini_key');
    if (!geminiKey) { triggerNotification('未設定金鑰', '請先綁定 Gemini API Key'); return; }
    const subjectNotes = notes.filter(n => n.subject === selectedSubject?.name);
    if (subjectNotes.length === 0) { triggerNotification('筆記不足', '請先新增筆記內容'); return; }
    setIsGeneratingQuiz(true);
    try {
      const combinedContent = subjectNotes.map(n => `標題: ${n.title}\n內容: ${n.content}`).join('\n\n---\n\n');
      const prompt = `請根據以下筆記內容，設計 3 題選擇題。JSON 陣列格式回傳：[{"question": "問題", "options": ["A", "B", "C", "D"], "answerIndex": 0}]\n\n${combinedContent}`;
      const summary = await fetchAI(prompt, { temperature: 0.7, responseJson: true });
      setQuizData(JSON.parse(summary.replace(/```json/gi, '').replace(/```/g, '').trim()));
      setIsQuizOpen(true);
    } catch (e) { triggerNotification('出題失敗', '請稍後再試'); }
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
    if (!localStorage.getItem('gsat_gemini_key')) { triggerNotification('未設定金鑰', '請先綁定 Gemini API Key'); return; }
    setIsProcessingAI(true);
    try {
      const summary = await fetchAI(`摘要這份筆記：\n${newNote.content}`, { temperature: 0.3 });
      setNewNote(prev => ({ ...prev, content: `【AI 重點整理】\n${summary}\n\n---\n${prev.content}` }));
    } catch (e) { triggerNotification('AI 失敗', '無法產生摘要'); }
    finally { setIsProcessingAI(false); }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setAttachments(prev => [...prev, { id: Date.now() + Math.random(), name: file.name, type: 'image', data: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  // ----------------渲染邏輯修正 (重要：分離選單與筆記內容)----------------

  if (!selectedSubject) {
    return (
      <div className="space-y-8 flex flex-col w-full text-left mb-12">
        <div className="flex justify-between items-center px-2">
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
            <Library size={28} className="shrink-0 neon-glow-emerald" /> 知識筆記
          </h2>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-3.5 rounded-[20px] transition-all active:scale-[0.95] duration-500 ease-spring-smooth ${isEditMode ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 rotate-12' : 'bg-[var(--bg-surface)] text-slate-500 border border-[var(--border-color)] shadow-sm hover:shadow-md hover:-translate-y-0.5 glass-effect'}`}
          >
            {isEditMode ? <CheckCircle2 size={20} /> : <Edit3 size={20} />}
          </button>
        </div>

        {showAddSubject && (
          <div className="bg-[var(--bg-surface)] p-5 rounded-[32px] border border-[var(--border-color)] shadow-soft animate-slide-up-fade flex flex-col gap-3">
            <h4 className="text-[14px] font-black text-[var(--text-primary)] flex items-center gap-2">
              <FolderPlus size={16} className="text-emerald-500" /> 新增科目
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="圖示"
                  className="w-16 p-3 bg-slate-50 dark:bg-white/5 border border-[var(--border-color)] rounded-2xl text-center text-xl outline-none"
                  value={newSub.icon}
                  readOnly
                />
                <input
                  type="text"
                  placeholder="科目名稱"
                  className="flex-1 p-3 bg-slate-50 dark:bg-white/5 border border-[var(--border-color)] rounded-2xl text-sm font-bold outline-none focus:border-emerald-400"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                />
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {Object.keys(ICON_MAP).map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => setNewSub({ ...newSub, icon: emoji })}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${newSub.icon === emoji ? 'bg-emerald-100 dark:bg-emerald-500/20 scale-110 shadow-sm' : 'bg-slate-50 dark:bg-white/5 hover:bg-slate-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
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
            const IconComp = ICON_MAP[s.icon] || Library;
            return (
              <div key={s.name} className="relative group animate-pop-in">
                <button
                  onClick={() => !isEditMode && setSelectedSubject(s)}
                  className={`relative w-full aspect-square bg-[var(--bg-surface)] shadow-soft border border-[var(--border-color)] rounded-[40px] flex flex-col items-center justify-center gap-4 transition-all duration-500 ease-spring-smooth glass-effect ${isEditMode ? 'opacity-50 grayscale scale-[0.98]' : 'hover:shadow-float hover:-translate-y-2 active:scale-[0.95] hover:bg-white/80 dark:hover:bg-white/10'}`}
                >
                  <div className="text-emerald-500 transform group-hover:scale-110 transition-transform duration-500">
                    <IconComp size={48} className="shrink-0" />
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
          <button onClick={() => setShowAddSubject(true)} className="aspect-square border-2 border-dashed border-[var(--border-color)] rounded-[40px] flex flex-col items-center justify-center text-slate-400 hover:text-emerald-500 hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 transition-all duration-500 ease-spring-smooth active:scale-[0.95] group"><Plus size={36} className="group-hover:scale-125 transition-transform duration-500 ease-spring-bouncy" /></button>
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
          <button onClick={() => setSelectedSubject(null)} className="p-4 bg-[var(--bg-surface)] rounded-[24px] shadow-sm hover:shadow-md active:scale-95 border border-[var(--border-color)] transition-all duration-300 ease-spring glass-effect"><ArrowLeft size={22} className="text-slate-600 dark:text-gray-300" /></button>
          <div>
            <h2 className="text-[24px] font-black text-emerald-600 tracking-tight">{selectedSubject?.name}</h2>
            <p className="text-[12px] font-bold text-slate-400">{sn.length} 則筆記</p>
          </div>
        </div>
        <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || sn.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[13px] font-black active:scale-95 shadow-lg">
          {isGeneratingQuiz ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />} AI 出題
        </button>
      </div>

      <div className="bg-[var(--bg-surface)] p-6 md:p-8 rounded-[40px] border border-[var(--border-color)] shadow-soft space-y-5 glass-effect hover:shadow-float transition-all duration-500 ease-spring-smooth">
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
          <div key={n.id} className="p-7 bg-[var(--bg-surface)] rounded-[40px] border border-[var(--border-color)] shadow-soft hover:shadow-float hover:-translate-y-1 transition-all duration-500 ease-spring-smooth group glass-effect">
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