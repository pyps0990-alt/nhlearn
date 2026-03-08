import React, { useState } from 'react';
import { 
  BrainCircuit, X, CheckCircle2, Library, Edit3, Trash2, Plus, 
  ArrowLeft, Wand2, RefreshCw, Upload, Sparkles, Save, Calendar, 
  FolderPlus, FileText, ChevronLeft 
} from 'lucide-react';
import { NOTE_CATEGORIES } from '../utils/constants';
import { fetchAI } from '../utils/helpers';

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
      <div className="w-full max-w-[450px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
              <div className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 shadow-inner">
                <p className="text-[17px] font-black text-gray-900 leading-relaxed text-center">{q.question}</p>
              </div>
              <div className="flex flex-col gap-3">
                {q.options.map((opt, idx) => {
                  let statusClass = "bg-white border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50";
                  if (selectedAnswer === idx) {
                    statusClass = isCorrect ? "bg-emerald-500 text-white border-emerald-500 scale-[1.02] shadow-lg shadow-emerald-500/30" : "bg-red-500 text-white border-red-500 scale-[1.02] shadow-lg shadow-red-500/30";
                  } else if (selectedAnswer !== null && idx === q.answerIndex) {
                    statusClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                  }
                  return (
                    <button key={idx} onClick={() => handleAnswer(idx)} disabled={selectedAnswer !== null} className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center gap-3 ${statusClass}`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black ${selectedAnswer === idx ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>{String.fromCharCode(65 + idx)}</span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-6 animate-fadeIn">
              <div className="p-6 bg-emerald-50 rounded-full"><CheckCircle2 size={80} className="text-emerald-500" /></div>
              <div>
                <h4 className="text-3xl font-black text-gray-900 mb-2">測驗結束！</h4>
                <div className="text-5xl font-black text-emerald-600 mt-2">{score} <span className="text-xl text-gray-400">/ {quizData.length}</span></div>
              </div>
              <button onClick={onClose} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg">回到筆記</button>
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
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', icon: '📘', color: 'text-emerald-600' });

  const handleAddSubject = () => {
    if (!newSub.name) return;
    if (subjects.find(s => s.name === newSub.name)) { triggerNotification('重複科目', '該科目已存在！'); return; }
    setSubjects(prev => [...prev, { ...newSub }]);
    setNewSub({ name: '', icon: '📘', color: 'text-emerald-600' });
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
    if (!localStorage.getItem('gsat_gemini_key')) { triggerNotification('未設定金鑰', '請先綁定 Gemini API Key'); return; }
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
    if (isGoogleConnected) handleBackupToDrive(noteToSave);
  };

  const handleDeleteNote = async (id) => {
    const note = notes.find(n => n.id === id);
    if (window.confirm(`確定要刪除「${note.title}」嗎？`)) {
      setNotes(prev => prev.filter(n => n.id !== id));
      if (isGoogleConnected) handleDeleteFromDrive(note);
    }
  };

  const handleAiSummarize = async () => {
    if (!localStorage.getItem('gsat_gemini_key')) { triggerNotification('未設定金鑰', '請先綁定 Gemini API Key'); return; }
    setIsProcessingAI(true);
    try {
      const aiImages = attachments.filter(a => a.type === 'image').slice(0, 5).map(a => ({ mimeType: a.data.split(';')[0].split(':')[1] || 'image/jpeg', data: a.data.split(',')[1] }));
      const summary = await fetchAI(`摘要這份筆記：\n${newNote.content}`, { temperature: 0.3, images: aiImages });
      setNewNote(prev => ({ ...prev, content: `【AI 重點整理】\n${summary}\n\n---\n${prev.content}` }));
    } catch (e) { triggerNotification('AI 失敗', '無法產生摘要'); }
    finally { setIsProcessingAI(false); }
  };

  const handleBackupToDrive = async (note) => {
    if (!isGoogleConnected || !window.gapi?.client?.drive) { triggerNotification('未登入', '請先登入 Google'); return; }
    setIsUploadingDrive(true);
    try {
      // Simplification of the drive logic for brevity, keeping core functionality
      const fileMetadata = { name: `${note.title}.txt`, mimeType: 'text/plain' };
      const fileContent = `標題: ${note.title}\n內容: ${note.content}`;
      // In a real scenario, we'd handle folder creation here as in the original code
      triggerNotification('雲端備份中', `同步「${note.title}」...`);
      // Simulating API call for now to keep the code clean, but original had complex multipart logic
      // We will preserve the complex logic in the final output if needed, but for now let's use a placeholder for brevity if it's too long
      // Actually per rules I should give actual code. I will include the full drive logic.
      
      const rootFolderRes = await window.gapi.client.drive.files.list({ q: "name='GSAT Pro 筆記' and mimeType='application/vnd.google-apps.folder' and trashed=false" });
      let rootId = rootFolderRes.result.files[0]?.id || (await window.gapi.client.drive.files.create({ resource: { name: 'GSAT Pro 筆記', mimeType: 'application/vnd.google-apps.folder' } })).result.id;
      const subFolderRes = await window.gapi.client.drive.files.list({ q: `name='${note.subject}' and '${rootId}' in parents and trashed=false` });
      let subId = subFolderRes.result.files[0]?.id || (await window.gapi.client.drive.files.create({ resource: { name: note.subject, mimeType: 'application/vnd.google-apps.folder', parents: [rootId] } })).result.id;
      
      const boundary = '-------314159265358979323846';
      const multipartBody = `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify({ name: `${note.title}.txt`, parents: [subId] })}\r\n--${boundary}\r\nContent-Type: text/plain\r\n\r\n${fileContent}\r\n--${boundary}--`;
      await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', { method: 'POST', headers: { 'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: multipartBody });
      triggerNotification('同步成功 ☁️', `「${note.title}」已存入 Drive。`);
    } catch (e) { triggerNotification('備份失敗', '請重新登入'); }
    finally { setIsUploadingDrive(false); }
  };

  const handleDeleteFromDrive = async (note) => {
    if (!isGoogleConnected || !window.gapi?.client?.drive) return;
    try {
      const q = `name='${note.title}.txt' and trashed=false`;
      const res = await window.gapi.client.drive.files.list({ q });
      const fileId = res.result.files[0]?.id;
      if (fileId) {
        await window.gapi.client.drive.files.delete({ fileId });
        triggerNotification('雲端同步', `已從 Drive 移除「${note.title}」`);
      }
    } catch (e) { console.error('Delete from Drive fail', e); }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setAttachments(prev => [...prev, { id: Date.now() + Math.random(), name: file.name, type: 'image', data: reader.result }]);
      reader.readAsDataURL(file);
    });
  };

  if (!selectedSubject) {
    return (
      <div className="space-y-6 flex flex-col w-full text-left mb-8">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-2.5"><Library size={28} /> 知識筆記</h2>
          <button onClick={() => setIsEditMode(!isEditMode)} className={`p-2.5 rounded-xl transition-all ${isEditMode ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500'}`}>{isEditMode ? <CheckCircle2 size={20} /> : <Edit3 size={20} />}</button>
        </div>
        {showAddSubject && (
          <div className="bg-white/80 p-5 rounded-[32px] border border-white/60 shadow-soft animate-slide-up-fade flex flex-col gap-3">
            <h4 className="text-[14px] font-black text-gray-800 flex items-center gap-2">
              <FolderPlus size={16} className="text-emerald-500" /> 新增科目
            </h4>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="圖示"
                  className="w-16 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-center text-xl outline-none focus:border-emerald-400"
                  value={newSub.icon}
                  onChange={e => setNewSub({ ...newSub, icon: e.target.value })}
                />
                <input
                  type="text"
                  placeholder="科目名稱"
                  className="flex-1 p-3 bg-gray-50 border border-gray-200 rounded-2xl text-sm font-bold outline-none focus:border-emerald-400"
                  value={newSub.name}
                  onChange={e => setNewSub({ ...newSub, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleAddSubject()}
                />
              </div>
              <div className="flex flex-wrap gap-2 p-1">
                {['📘', '📕', '📗', '📙', '📓', '🎨', '🧪', '📏', '💻', '🇬🇧', '🌍', '⏳', '💡', '✍️', '🏀', '🎵'].map(emoji => (
                  <button 
                    key={emoji} 
                    onClick={() => setNewSub({ ...newSub, icon: emoji })}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${newSub.icon === emoji ? 'bg-emerald-100 scale-110 shadow-sm' : 'bg-gray-50 hover:bg-gray-100'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddSubject(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm active:scale-95">取消</button>
              <button onClick={handleAddSubject} className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-sm active:scale-95 shadow-sm">新增</button>
            </div>
          </div>

        )}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {subjects.map(s => (
            <div key={s.name} className="relative group animate-pop-in">
              <button onClick={() => !isEditMode && setSelectedSubject(s)} className={`relative w-full aspect-square bg-white shadow-soft rounded-[36px] flex flex-col items-center justify-center gap-3 transition-all ${isEditMode ? 'opacity-50 grayscale' : 'hover:-translate-y-1'}`}>
                <div className="text-4xl">{s.icon}</div>
                <span className="text-[15px] font-black">{s.name}</span>
              </button>
              {isEditMode && <button onClick={() => handleDeleteSubject(s.name)} className="absolute -top-1 -right-1 bg-red-500 text-white p-2 rounded-full"><Trash2 size={14} /></button>}
            </div>
          ))}
          <button onClick={() => setShowAddSubject(true)} className="aspect-square border-2 border-dashed border-gray-200 rounded-[36px] flex flex-col items-center justify-center text-gray-400 hover:text-emerald-500 transition-all"><Plus size={32} /></button>
        </div>
      </div>
    );
  }

  const sn = notes.filter(n => n.subject === selectedSubject?.name);
  return (
    <div className="space-y-5 flex flex-col w-full text-left mb-8 pb-10 relative animate-slide-up-fade">
      <QuizModal isOpen={isQuizOpen} onClose={() => setIsQuizOpen(false)} quizData={quizData} subject={selectedSubject?.name} />
      <div className="flex items-center justify-between border-b border-gray-100 pb-5">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedSubject(null)} className="p-3 bg-white/60 rounded-[20px] shadow-sm active:scale-95"><ArrowLeft size={20} /></button>
          <div><h2 className="text-[20px] font-black text-emerald-600">{selectedSubject?.name}</h2><p className="text-[12px] font-bold text-gray-400">{sn.length} 則筆記</p></div>
        </div>
        <button onClick={handleGenerateQuiz} disabled={isGeneratingQuiz || sn.length === 0} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[13px] font-black">{isGeneratingQuiz ? <RefreshCw className="animate-spin" size={16} /> : <Wand2 size={16} />} AI 出題</button>
      </div>
      <div className="bg-white/80 p-6 md:p-8 rounded-[36px] border border-white/60 shadow-soft space-y-4">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <select className="bg-gray-50 border border-gray-200 rounded-2xl px-3 py-3 sm:py-0 text-xs font-black outline-none h-auto sm:h-[56px]" value={newNote.category} onChange={e => setNewNote({ ...newNote, category: e.target.value })}>{NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
          <input type="text" className="flex-1 min-w-0 bg-white border border-gray-100 rounded-[20px] px-5 py-4 font-black outline-none focus:border-emerald-400" placeholder="標題..." value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
        </div>
        <textarea className="w-full bg-white border border-gray-100 rounded-[24px] p-5 font-bold min-h-[140px] outline-none focus:border-emerald-400" placeholder="內容..." value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} />
        <div className="flex items-center justify-between gap-3 pt-2">
           <div className="flex gap-2 flex-grow">
            <label className="flex-1 flex items-center justify-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 py-3.5 rounded-2xl cursor-pointer"><Upload size={18} /> 上傳 <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} /></label>
            <button onClick={handleAiSummarize} disabled={isProcessingAI} className="flex-1 flex items-center justify-center gap-2 text-xs font-black bg-indigo-50 text-indigo-700 py-3.5 rounded-2xl">{isProcessingAI ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />} AI 摘要</button>
           </div>
           <button onClick={handleSaveNote} className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center active:scale-95 transition-all"><Save size={24} /></button>
        </div>
      </div>
      <div className="space-y-4 mt-4">
        {sn.map(n => (
          <div key={n.id} className="p-6 bg-white/80 rounded-[32px] border border-white/60 shadow-soft group">
            <div className="flex justify-between items-start mb-4">
              <span className={`px-3 py-1.5 ${n.category === '錯題本' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-800'} rounded-lg text-[10px] font-black`}>{n.category}</span>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleBackupToDrive(n)} className="p-2 text-blue-500"><FolderPlus size={18} /></button>
                <button onClick={() => handleDeleteNote(n.id)} className="p-2 text-gray-300 hover:text-red-500"><Trash2 size={18} /></button>
              </div>
            </div>
            <h4 className="font-black text-gray-900 text-lg mb-2">{n.title}</h4>
            <p className="text-sm font-bold text-gray-700 whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotesTab;
