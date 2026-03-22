import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, Plus, Upload, Brain, Trophy, Search, Trash2, Check, X,
  RefreshCw, Sparkles, Shuffle, PenTool, CheckCircle2, XCircle, Heart, School,
  FileSpreadsheet, Bug, Terminal, ChevronDown, ChevronUp, ChevronRight, Wand2, Volume2,
  FileText, BarChart2, Flame, Clock, TrendingUp, Share2, Book, Zap, AlertCircle, Tag, Frown, Meh, Smile, Award, Globe, Lock, SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import { db } from '../../config/firebase';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, where, orderBy, writeBatch, serverTimestamp,
  getDocs, limit, startAfter
} from 'firebase/firestore';

import { fetchAI, normalizePOS, processWordDecomposition, calculateSRSWeight } from '../../utils/helpers';

const GAS_URL = import.meta.env.VITE_GAS_VOCAB_URL;

// ─── Schema Helpers (相容新舊資料結構) ──────────────────────────────────────
export const getMeanings = (w) => {
  if (!w) return [];
  if (w.meanings && Array.isArray(w.meanings) && w.meanings.length > 0) {
    return w.meanings.map(m => ({ ...m, pos: normalizePOS(m.pos) }));
  }
  const pos = w.partOfSpeech || w.pos || 'n.';
  return [{ pos: normalizePOS(pos), meaning: w.meaning || w.chinese || '' }];
};
export const getPrimaryMeaning = (w) => getMeanings(w).map(m => m.meaning).join(' / ');

// ─── 校務單字結構助手 ──────────────────────────────────────────────────────────
export const getBookDocId = (gradeRaw, semester) => {
  const gNum = parseInt(gradeRaw.replace(/\D/g, ''), 10) || 1;
  const sNum = semester === 'up' ? 1 : 2;
  const bNum = (gNum - 1) * 2 + sNum;
  return `B${bNum}_G${gNum}S${sNum}`;
};

export const getStageStr = (sNum) => {
  if (Number(sNum) === 1) return '第1次段考';
  if (Number(sNum) === 2) return '第2次段考';
  return '期末考';
};

// ─── 形態解析助手 (Morphology Parser) ───────────────────────────────────────
// 統一解析 AI 回傳的 [單字構造拆解] 內容，供標籤提取與 UI 渲染共用
export const parseMorphology = (analysis) => {
  if (!analysis || analysis.startsWith('ERROR:')) return { breakdown: null, tags: [] };

  const match = analysis.match(/\[?單字構造拆解\]?([\s\S]*?)(?=###|$)/i);
  if (!match) return { breakdown: null, tags: [] };

  const content = match[1].trim();
  const lines = content.includes('\n') ? content.split('\n') : [content];
  const tags = [];
  const breakdownMap = new Map(); // 使用 Map 來避免重複並方便合併

  lines.forEach(line => {
    const cleanLine = line.replace(/\*/g, '').trim();
    if (!cleanLine || cleanLine.startsWith('(')) return; // 略過範例說明括號

    // 支援「A + B + C」或單獨一行「A: ...」
    const parts = cleanLine.includes('+') ? cleanLine.split('+') : [cleanLine];

    parts.forEach(p => {
      const trimmed = p.replace(/^[-•]\s*/, '').trim(); // 移除列表符號
      if (!trimmed) return;

      const colonIdx = trimmed.indexOf(':') > -1 ? trimmed.indexOf(':') : trimmed.indexOf('：');
      if (colonIdx === -1) return;

      const rawLabel = trimmed.substring(0, colonIdx).trim();
      const rest = trimmed.substring(colonIdx + 1).trim();

      let value = rest;
      let meaning = '';

      // 提取括號中的意思
      const mMatch = rest.match(/[(（](.*?)[)）]/);
      if (mMatch) {
        meaning = mMatch[1].trim();
        value = rest.replace(/[(（].*?[)）]/, '').trim();
      }

      // 嚴格過濾：字根/字首/字尾值只能是英文字母
      value = value.replace(/[^a-zA-Z\-]/g, '').replace(/-/g, '').toLowerCase();

      // 正規化標籤 (Prefix, Root, Suffix)
      let normLabel = 'Suffix';
      if (rawLabel.match(/prefix|字首|前綴/i)) normLabel = 'Prefix';
      else if (rawLabel.match(/root|字根|詞根/i)) normLabel = 'Root';
      else if (rawLabel.match(/suffix|字尾|後綴/i)) normLabel = 'Suffix';
      else normLabel = rawLabel;

      if (value) {
        const tagValue = value.replace(/[^a-zA-Z]/g, '').toLowerCase();
        if (normLabel !== 'Part' && tagValue) tags.push(`${normLabel.toLowerCase()}:${tagValue}`);

        // 存入 Map，同一個 label 只取第一個出現的正則化結果
        if (!breakdownMap.has(normLabel)) {
          breakdownMap.set(normLabel, { label: normLabel, value, meaning });
        }
      }
    });
  });

  const finalBreakdown = Array.from(breakdownMap.values());
  const extractedFields = {};
  finalBreakdown.forEach(p => {
    const key = p.label.toLowerCase();
    extractedFields[key] = p.value;
    extractedFields[`${key}Meaning`] = p.meaning;
  });

  return { breakdown: finalBreakdown.length > 0 ? finalBreakdown : null, tags: Array.from(new Set(tags)), ...extractedFields };
};

// ─── SRS Algorithm (SM-2 simplified) ────────────────────────────────────────
const calculateNextReview = (word, quality, weight = 1.0) => {
  let { interval = 1, easeFactor = 2.5, repetitions = 0 } = word;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);

    // 🚀 權重調整：字根越罕見，權重越高，間隔越短 (複習頻率增加)
    interval = Math.max(1, Math.round(interval / weight));
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval);

  return { ...word, interval, easeFactor, repetitions, nextReview: nextReview.toISOString(), lastResult: quality >= 3 ? 'correct' : 'wrong' };
};

// ─── Storage helpers (Firestore 遷移中，保留部分作為備援) ──────────────────────
const STORAGE_KEY = 'gsat_vocab_words';
// 舊的本地儲存邏輯將被 Firestore 實時監聽取代

// ─── Sub-tab definitions ─────────────────────────────────────────────────────
const SUB_TABS = [
  { id: 'bank', label: '單字庫', icon: BookOpen },
  { id: 'review', label: '今日複習', icon: Brain },
  { id: 'quiz', label: '測驗', icon: Trophy },
  { id: 'import', label: '匯入', icon: Upload },
];

// ─── 煙火紙片特效元件 ─────────────────────────────────────────────────────────
const Confetti = ({ score, total }) => {
  const pct = score / total;
  if (pct < 0.5) return null; // 不及格不灑紙花
  const isPerfect = pct >= 0.8;
  const colors = isPerfect ? ['#10b981', '#34d399', '#fcd34d', '#fbbf24', '#60a5fa'] : ['#f59e0b', '#fbbf24', '#f87171'];
  const particleCount = isPerfect ? 60 : 25;

  const particles = Array.from({ length: particleCount }).map((_, i) => ({
    id: i,
    left: Math.random() * 100 + '%',
    animationDuration: (Math.random() * 2 + 1.5) + 's',
    animationDelay: (Math.random() * 0.5) + 's',
    color: colors[Math.floor(Math.random() * colors.length)],
    size: (Math.random() * 8 + 6) + 'px',
    shape: Math.random() > 0.5 ? '50%' : '2px' // 圓形或方形紙片
  }));

  return <div className="absolute inset-0 pointer-events-none overflow-hidden z-50 rounded-[48px]">{particles.map(p => <div key={p.id} className="absolute -top-10 animate-confetti-fall" style={{ left: p.left, width: p.size, height: p.size, backgroundColor: p.color, animationDuration: p.animationDuration, animationDelay: p.animationDelay, borderRadius: p.shape }} />)}</div>;
};

// ─── 學習統計全屏視窗 ────────────────────────────────────────────────────────
const StatsModal = ({ isOpen, onClose, stats }) => {
  if (!isOpen) return null;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayStats = stats[todayStr] || { words: 0, time: 0 };
  const todayMin = Math.floor(todayStats.time / 60);

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-900 w-[320px] rounded-[36px] p-6 shadow-2xl border border-slate-100 dark:border-white/10 animate-pop-in text-center" onClick={e => e.stopPropagation()}>
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600 dark:text-emerald-400">
          <Clock size={32} />
        </div>
        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6">今日學習數據</h3>
        <div className="flex gap-4 mb-6">
          <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            <div className="text-3xl font-black text-emerald-500 mb-1">{todayMin}</div>
            <div className="text-[11px] font-bold text-slate-400">專注分鐘</div>
          </div>
          <div className="flex-1 bg-slate-50 dark:bg-white/5 rounded-2xl p-4 border border-slate-100 dark:border-white/5">
            <div className="text-3xl font-black text-blue-500 mb-1">{todayStats.words}</div>
            <div className="text-[11px] font-bold text-slate-400">複習單字</div>
          </div>
        </div>
        <button onClick={onClose} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black active:scale-95 transition-all shadow-md">
          繼續努力
        </button>
      </div>
    </div>
  );
};

// ─── 單字詳情全屏視窗 (Word Detail Overlay) ──────────────────────────────────
const WordDetailOverlay = ({
  word, analysis, isAnalyzing, handleAiAnalyze, onClose, updateWord,
  triggerNotification, currentSet, addWords, isSaved, onSave,
  playVoice, accent, isAdmin, user,
  setSearch, setFilterPos, setFilterTag, setFilterTagMeaning, setCurrentSet
}) => {
  const [isClosing, setIsClosing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editMeanings, setEditMeanings] = useState(() => getMeanings(word));
  const [generatingExampleIdx, setGeneratingExampleIdx] = useState(null);
  const generatedRef = useRef(new Set()); // 紀錄已觸發生成的 idx

  useEffect(() => {
    setEditMeanings(getMeanings(word));
  }, [word]);

  // 🚀 維基共編模式：開放所有使用者 (包含訪客) 編輯與貢獻單字內容
  const canEdit = true;

  // 🚀 核心修復：立即給予視覺回饋，並延遲 DOM 的卸載，徹底解決手機端卡頓感
  const handleClose = useCallback((e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isClosing) return;
    setIsClosing(true);
    // 🚀 核心修復：立即恢復背景滾動，不需要等退場動畫結束
    document.body.style.overflow = '';
    document.body.style.height = '';

    if (window.speechSynthesis) window.speechSynthesis.cancel(); // 立即停止發音，不拖泥帶水
    setTimeout(() => {
      onClose();
    }, 200); // 給予 200ms 的退場動畫時間
  }, [isClosing, onClose]);

  // 🚀 核心需求：邏輯拆解渲染 (使用 processWordDecomposition)
  const decomposition = useMemo(() => {
    // 確保即時反映正在生成的 AI 解析
    const morphology = parseMorphology(analysis || word.aiAnalysis);
    return processWordDecomposition({ ...word, ...morphology });
  }, [word, analysis]);

  // 防呆：鎖定背景滾動、支援 ESC 鍵關閉，避免與底層元件衝突
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // 防止底層滾動衝突
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleClose]);

  // 🚀 學習狀態切換邏輯 (已學 / 未學)
  const handleToggleLearned = (status) => {
    // 狀態會自動觸發 updateWord 存入個人雲端資料庫
    updateWord(word.id, { learned: status });
    triggerNotification('狀態已更新', status ? '已標記為已學' : '已標記為未學', 'success');
    // 移除 handleClose()，讓使用者可以繼續閱讀或聽發音
  };

  // 🚀 AI 專屬例句生成邏輯
  const handleGenerateExample = useCallback(async (idx, m) => {
    // 1. 每日次數限制檢查
    const today = new Date().toISOString().split('T')[0];
    const usageStr = localStorage.getItem('gsat_ai_example_usage');
    let usage = { date: today, count: 0 };
    if (usageStr) {
      try {
        const parsed = JSON.parse(usageStr);
        if (parsed.date === today) usage = parsed;
      } catch (e) { }
    }

    if (usage.count >= 50) {
      triggerNotification('次數已達上限', '每日最多自動生成 50 次例句，請明天再來喔！', 'error');
      return;
    }

    setGeneratingExampleIdx(idx);
    try {
      const prompt = `你是一個專業的高中英文老師。請為單字 "${word.word}" (詞性：${m.pos}, 意思：${m.meaning}) 寫一句符合台灣高中生(學測)程度的英文例句，並附上繁體中文翻譯。
【重要標記要求】：
請在 "example" 欄位中，使用 <mark> 標籤將該單字（含時態或單複數變化）標示出來。
請在 "exampleChinese" 欄位中，使用 <mark> 標籤將對應的中文意思標示出來。
請嚴格以 JSON 格式回傳，不要有任何 Markdown 或其他文字：
{"example": "I bought a <mark>book</mark>.", "exampleChinese": "我買了一本<mark>書</mark>。"}`;
      const res = await fetchAI(prompt, { temperature: 0.7 });
      if (res) {
        const match = res.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          const newMeanings = [...getMeanings(word)];
          newMeanings[idx] = {
            ...newMeanings[idx], example: parsed.example, exampleChinese: parsed.exampleChinese,
            exampleAuthor: user?.displayName || '熱心同學', exampleAuthorId: user?.uid || 'guest'
          };
          updateWord(word.id, { meanings: newMeanings });

          // 2. 扣除次數
          usage.count += 1;
          localStorage.setItem('gsat_ai_example_usage', JSON.stringify(usage));

          triggerNotification('生成成功', `已為您加入專屬例句 (今日剩餘 ${50 - usage.count} 次)`);
        } else {
          throw new Error('無法解析 AI 回應');
        }
      }
    } catch (e) {
      console.error(e);
      triggerNotification('生成失敗', 'AI 伺服器連線異常', 'error');
    } finally {
      setGeneratingExampleIdx(null);
    }
  }, [word, updateWord, triggerNotification, user]);

  // 🚀 全局共用字庫貢獻功能
  const handleContributeToGlobal = async () => {
    if (!word) return;
    try {
      const globalWord = {
        ...word,
        source: 'Global',
        contributedBy: user?.displayName || '熱心同學',
        contributedAt: new Date().toISOString()
      };
      await addWords([globalWord], '6000_words', false);
      triggerNotification('貢獻成功', '感謝您的分享！這個單字現在可以被所有人看見了。', 'success');
    } catch (e) {
      triggerNotification('貢獻失敗', '權限不足或連線異常', 'error');
    }
  };

  if (!word) return null;

  const { breakdown } = parseMorphology(analysis);
  const cleanAnalysis = analysis && !analysis.startsWith('ERROR:') ? analysis.replace(/###\s*\[?單字構造拆解\]?[\s\S]*?(?=###|$)/i, '').trim() : '';

  return createPortal(
    <div className={`fixed inset-0 z-[2000] flex items-center justify-center bg-black/80 backdrop-blur-xl transition-opacity duration-200 ${isClosing ? 'opacity-0 pointer-events-none' : 'animate-fadeIn'}`} onClick={handleClose}>
      <div
        className={`bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full h-[100dvh] md:h-[90vh] md:max-w-4xl md:rounded-[48px] shadow-2xl border border-white/20 overflow-hidden flex flex-col transition-all duration-200 ${isClosing ? 'scale-[0.98] opacity-0 translate-y-4 md:translate-y-0' : 'animate-pop-in'}`}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          /* Markdown 專屬美化排版 */
          .highlighter p { margin-bottom: 0.75rem; }
          .highlighter p:last-child { margin-bottom: 0; }
          .highlighter ul { list-style-type: disc; padding-left: 1.25rem; margin-bottom: 0.75rem; }
          .highlighter li { margin-bottom: 0.25rem; }
          .highlighter h3 { 
            font-size: 1.05rem; font-weight: 900; margin-top: 1.5rem; margin-bottom: 0.5rem; 
            color: #8b5cf6; display: flex; align-items: center; gap: 0.35rem;
          }
          .dark .highlighter h3 { color: #a78bfa; }
          .highlighter h3::before {
            content: ''; display: inline-block; width: 6px; height: 6px; 
            border-radius: 50%; background-color: currentColor;
          }
          /* 重點螢光筆效果 */
          .highlighter strong {
            background: linear-gradient(120deg, #fef08a 0%, #fef08a 100%);
            background-repeat: no-repeat;
            background-size: 100% 0.35em;
            background-position: 0 92%;
            padding: 0 2px; border-radius: 2px; font-weight: 900; color: inherit;
          }
          .dark .highlighter strong {
            background: linear-gradient(120deg, rgba(251, 191, 36, 0.25) 0%, rgba(251, 191, 36, 0.25) 100%);
            color: #fde047; /* 在深色模式下，將字體改為亮黃色，搭配微光底線，大幅提升質感 */
          }
          /* 例句單字高亮標示 */
          mark {
            background-color: rgba(16, 185, 129, 0.15);
            color: inherit;
            padding: 0 0.2em;
            border-radius: 0.2em;
            font-weight: 900;
          }
          .dark mark {
            background-color: rgba(16, 185, 129, 0.25);
            color: #34d399;
          }
        `}</style>
        {/* Header */}
        <div className="px-6 md:px-8 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-8 pb-4 flex justify-between items-start shrink-0 w-full">
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <h2 className="text-[36px] md:text-[44px] font-black text-slate-900 dark:text-white tracking-tighter leading-none break-words whitespace-normal">{word.word}</h2>
            {isEditing ? (
              <div className="flex flex-col gap-2 mt-3 animate-fadeIn">
                {editMeanings.map((m, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl text-sm font-bold w-24 outline-none focus:border-emerald-400 text-[var(--text-primary)] transition-colors" value={m.pos} onChange={e => { const newM = [...editMeanings]; newM[idx].pos = e.target.value; setEditMeanings(newM); }} placeholder="詞性" />
                    <input className="bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 px-3 py-2 rounded-xl text-sm font-bold flex-1 outline-none focus:border-emerald-400 text-[var(--text-primary)] transition-colors" value={m.meaning} onChange={e => { const newM = [...editMeanings]; newM[idx].meaning = e.target.value; setEditMeanings(newM); }} placeholder="中文解釋" />
                    {editMeanings.length > 1 && (
                      <button onClick={() => setEditMeanings(editMeanings.filter((_, i) => i !== idx))} className="p-2 text-rose-400 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEditMeanings([...editMeanings, { pos: 'n.', meaning: '' }])} className="text-emerald-500 hover:bg-emerald-50 dark:hover:bg-white/5 text-[12px] font-bold self-start px-3 py-1.5 rounded-lg mt-1 transition-colors">+ 新增其他詞性解釋</button>

                <div className="flex gap-2 mt-1">
                  <button onClick={() => { setIsEditing(false); setEditMeanings(getMeanings(word)); }} className="px-4 py-2 bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black transition-colors active:scale-95">取消</button>
                  <button onClick={() => {
                    const cleanMeanings = editMeanings.filter(m => m.meaning.trim() !== '');
                    if (cleanMeanings.length === 0) return toast.error('請至少保留一個解釋');
                    updateWord(word.id, { meanings: cleanMeanings });
                    triggerNotification('修改成功', '單字資訊已更新');
                    setIsEditing(false);
                  }} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black shadow-md active:scale-95 transition-all">儲存變更</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5 mt-2 flex-wrap">
                  <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[12px] font-black text-slate-500 border border-slate-200/50 dark:border-white/5 shadow-sm">Level {word.level || '1'}</span>

                  {/* 發音按鈕優化：加入小喇叭與 Hover 浮動效果 */}
                  <div className="h-4 w-[1px] bg-slate-200 dark:bg-white/10 mx-1"></div>
                  <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, 'US'); }} className="group px-3 py-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl text-[12px] font-black hover:bg-blue-100 dark:hover:bg-blue-500/20 hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1.5 active:scale-95 border border-blue-100/50 dark:border-blue-500/20">
                    <Volume2 size={14} className="group-hover:scale-110 transition-transform" /> 🇺🇸 US
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, 'UK'); }} className="group px-3 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl text-[12px] font-black hover:bg-rose-100 dark:hover:bg-rose-500/20 hover:-translate-y-0.5 transition-all shadow-sm flex items-center gap-1.5 active:scale-95 border border-rose-100/50 dark:border-rose-500/20">
                    <Volume2 size={14} className="group-hover:scale-110 transition-transform" /> 🇬🇧 UK
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, accent || 'US', 0.4); }} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-black hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm flex items-center gap-1 active:scale-95" title="慢速發音">🐢 慢速</button>

                  {canEdit && (
                    <button onClick={(e) => { e.stopPropagation(); setIsEditing(true); setEditMeanings(getMeanings(word)); }} className="ml-1 p-1.5 text-slate-400 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all active:scale-90" title="編輯單字">
                      <PenTool size={14} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            {currentSet !== 'Personal' && (
              <button
                onClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  if (isSaved) return;
                  if (onSave) onSave();
                  addWords([word], 'Personal', false);
                }}
                className={`p-3 md:p-4 rounded-full transition-all duration-300 active:scale-90 shadow-sm flex items-center justify-center ${isSaved ? 'bg-rose-500 text-white shadow-rose-500/30 scale-105' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100'}`}
                title="加入個人收藏"
              >
                <Heart size={26} className={isSaved ? 'fill-current animate-heart-burst' : ''} />
              </button>
            )}
            <button onClick={handleClose} className="p-3 md:p-4 bg-slate-200/80 dark:bg-white/20 rounded-full text-slate-700 dark:text-white hover:text-slate-900 dark:hover:text-emerald-400 transition-all active:scale-90 flex items-center justify-center touch-manipulation shrink-0 hover:bg-slate-300 dark:hover:bg-white/30 shadow-md border border-slate-300 dark:border-white/30 backdrop-blur-md" title="關閉視窗">
              <X size={28} strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-[calc(3rem+env(safe-area-inset-bottom))] space-y-8 custom-scrollbar">
          {/* 1. 視覺化拆解圖 (支援 Prefix, Root, Suffix, Connector) */}
          {decomposition && (
            <div className="p-4 md:p-8 bg-gradient-to-br from-slate-50 to-white dark:from-white/5 dark:to-transparent rounded-[24px] md:rounded-[40px] border border-slate-100 dark:border-white/5 relative overflow-hidden group shadow-sm">
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-1 md:gap-6 pt-2">
                {decomposition.length > 0 ? (
                  decomposition.map((p, i) => {
                    let colorConfig = {
                      gradient: 'from-slate-200 to-slate-400 dark:from-slate-600 dark:to-slate-800',
                      border: 'border-slate-300 dark:border-slate-500',
                      borderB: 'border-slate-400 dark:border-slate-700',
                      studBg: 'bg-slate-300 dark:bg-slate-600',
                      text: 'text-slate-700 dark:text-slate-200',
                      label: 'text-slate-400'
                    };

                    if (p.type === 'Prefix') {
                      colorConfig = { gradient: 'from-amber-300 to-amber-500 dark:from-amber-500 dark:to-amber-700', border: 'border-amber-400 dark:border-amber-600', borderB: 'border-amber-600 dark:border-amber-900', studBg: 'bg-amber-400 dark:bg-amber-600', text: 'text-white', label: 'text-amber-500' };
                    } else if (p.type === 'Root') {
                      colorConfig = { gradient: 'from-emerald-400 to-emerald-600 dark:from-emerald-600 dark:to-emerald-800', border: 'border-emerald-500 dark:border-emerald-700', borderB: 'border-emerald-700 dark:border-emerald-900', studBg: 'bg-emerald-500 dark:bg-emerald-700', text: 'text-white', label: 'text-emerald-500' };
                    } else if (p.type === 'Suffix') {
                      colorConfig = { gradient: 'from-sky-400 to-sky-600 dark:from-sky-600 dark:to-sky-800', border: 'border-sky-500 dark:border-sky-700', borderB: 'border-sky-700 dark:border-sky-900', studBg: 'bg-sky-500 dark:bg-sky-700', text: 'text-white', label: 'text-sky-500' };
                    }

                    return (
                      <div key={i} className="flex items-center gap-1.5 md:gap-4 group/part relative z-10 w-fit">
                        <button
                          onClick={() => {
                            const cleanValue = p.text.replace(/[^a-zA-Z]/g, '').toLowerCase();
                            if (!cleanValue || p.type === 'connector') return;
                            const tag = `${p.type.toLowerCase()}:${cleanValue}`;
                            setFilterTag(tag);
                            setFilterTagMeaning(p.meaning || '');
                            setFilterPos('all');
                            setSearch('');
                            triggerNotification('字根家族', `尋找包含 "${cleanValue}" 的所有單字`);
                            handleClose();
                          }}
                          className="flex flex-col items-center group-hover/part:-translate-y-2 transition-transform duration-300 mt-3"
                          title={p.type !== 'connector' ? `點擊查看 "${p.text}" 家族單字` : ''}
                        >
                          <span className={`text-[10px] md:text-[12px] font-black uppercase tracking-[0.2em] mb-2 md:mb-3 transition-all group-hover/part:scale-110 drop-shadow-sm ${colorConfig.label}`}>
                            {p.type || 'Part'}
                          </span>

                          {/* 3D Lego Brick */}
                          <div className={`relative px-3 py-2 md:px-8 md:py-5 rounded-lg md:rounded-2xl border-x-2 border-t-2 border-b-4 md:border-b-[10px] bg-gradient-to-b ${colorConfig.gradient} ${colorConfig.border} border-b-${colorConfig.borderB} shadow-[inset_0_2px_4px_rgba(255,255,255,0.6),0_8px_16px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_2px_4px_rgba(255,255,255,0.2),0_8px_16px_rgba(0,0,0,0.3)] active:border-b-2 active:translate-y-[2px] md:active:translate-y-[8px] transition-all duration-200 group-hover/part:rotate-[2deg] group-hover/part:scale-105 flex items-center justify-center min-w-[48px] md:min-w-[90px] h-10 md:h-16 shrink-0 max-w-[120px] md:max-w-none`}>

                            {/* 🌟 Lego Studs (凸起) - 呈現立體塑膠感 */}
                            <div className="absolute -top-[5px] md:-top-[7px] left-1/2 -translate-x-1/2 flex gap-3 md:gap-5">
                              <div className={`w-3.5 md:w-5 h-1.5 md:h-2 rounded-t-sm md:rounded-t-md ${colorConfig.studBg} border-x-2 border-t-2 border-b-0 ${colorConfig.border} shadow-[inset_0_2px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_2px_1px_rgba(255,255,255,0.2)]`}></div>
                              <div className={`w-3.5 md:w-5 h-1.5 md:h-2 rounded-t-sm md:rounded-t-md ${colorConfig.studBg} border-x-2 border-t-2 border-b-0 ${colorConfig.border} shadow-[inset_0_2px_1px_rgba(255,255,255,0.6)] dark:shadow-[inset_0_2px_1px_rgba(255,255,255,0.2)]`}></div>
                            </div>

                            {/* 白色高光遮罩 (提升塑膠立體感) */}
                            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 dark:bg-white/5 rounded-t-xl pointer-events-none"></div>

                            {/* 文字發光/清晰度處理 */}
                            <span className={`relative z-10 text-[14px] md:text-[28px] font-black tracking-wider ${colorConfig.text} drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] truncate`}>
                              {p.text}
                            </span>
                          </div>

                          {/* 下方中文註解 (根據要求移除，移至專屬頁面標頭) */}
                        </button>

                        {/* 連接加號 */}
                        {i < decomposition.length - 1 && (
                          <span className="text-lg md:text-3xl font-black text-slate-300 dark:text-white/20 mt-4 md:mt-10 shrink-0">+</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-4 text-center w-full">
                    <p className="text-slate-400 font-bold italic">尚無拆解資訊，點擊右上角 ✨ 生成 🚀</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 雙欄核心排版 7:3 */}
          <div className="grid md:grid-cols-[1fr_320px] gap-8 items-start">

            {/* 左側：主學習區 */}
            <div className="space-y-6">

              {/* 詞性與解釋渲染區 (從頂部移下來) */}
              {!isEditing && (
                <div className="space-y-5">
                  {getMeanings(word).map((m, i) => (
                    <div key={i} className="bg-slate-50/50 dark:bg-white/5 p-5 md:p-6 rounded-[28px] border border-slate-100/80 dark:border-white/5 transition-all hover:shadow-md hover:bg-white dark:hover:bg-white/10 group">
                      <div className="flex items-start gap-4">
                        <span className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-xl font-black text-sm uppercase tracking-widest mt-0.5 shadow-sm">{m.pos}</span>
                        <div className="space-y-3">
                          <h3 className="text-[22px] md:text-[26px] font-bold text-slate-800 dark:text-white leading-snug">{m.meaning}</h3>

                          {/* 🚀 動態 AI 例句區塊 */}
                          {m.example ? (
                            <div className="pl-4 border-l-2 border-emerald-200 dark:border-emerald-500/30 space-y-1.5 mt-4 opacity-90 hover:opacity-100 transition-opacity relative group/example pr-8">
                              <p className="text-[15.5px] font-bold text-slate-700 dark:text-slate-300 font-serif italic leading-relaxed" dangerouslySetInnerHTML={{ __html: `"${m.example}"` }}></p>
                              <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400" dangerouslySetInnerHTML={{ __html: m.exampleChinese }}></p>
                              {m.exampleAuthor && (
                                <div className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 mt-1.5 flex items-center gap-1">
                                  <Award size={10} className="text-amber-500" />
                                  例句貢獻者：{m.exampleAuthor}
                                </div>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); playVoice(m.example.replace(/<\/?mark>/g, ''), accent); }}
                                className="absolute right-0 top-1 p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all active:scale-90"
                                title="朗讀例句"
                              >
                                <Volume2 size={16} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleGenerateExample(i, m);
                              }}
                              disabled={generatingExampleIdx === i}
                              className="mt-3 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg text-[12px] font-black hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-colors disabled:opacity-50 w-fit active:scale-95 border border-emerald-100 dark:border-emerald-500/20 shadow-sm"
                            >
                              {generatingExampleIdx === i ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
                              {generatingExampleIdx === i ? '生成中...' : '✨ 生成 AI 專屬例句'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* AI 語源解析區 */}
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center justify-between gap-2">
                <span className="flex items-center gap-2"><Sparkles size={20} className="text-yellow-500" /> 深度語源解析</span>
                {analysis && !analysis.startsWith('ERROR:') && isAdmin && (
                  <button onClick={() => handleAiAnalyze(word.id, word.word)} disabled={isAnalyzing} className="px-2.5 py-1.5 bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-emerald-500 rounded-xl transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 text-[11px] font-black shadow-sm">
                    <RefreshCw size={14} className={isAnalyzing ? 'animate-spin' : ''} /> 重新生成
                  </button>
                )}
              </h3>
              {word.aiAnalysisAuthor && (
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 -mt-4 mb-3 pl-1">
                  <Award size={12} className="text-amber-500" />
                  解析貢獻者：<span className="text-amber-600 dark:text-amber-400">{word.aiAnalysisAuthor}</span>
                </div>
              )}
              {analysis && !analysis.startsWith('ERROR:') ? (
                <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 highlighter bg-purple-50/30 dark:bg-purple-900/5 p-6 md:p-8 rounded-[32px] border border-purple-100/50 dark:border-purple-500/10">
                  {cleanAnalysis.split(/(?=###)/g).map((sec, idx) => {
                    if (sec.trim().startsWith('###') && sec.includes('大腦記憶法')) {
                      return (
                        <div key={idx} className="my-6 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-amber-200/50 dark:border-amber-500/20 rounded-[28px] shadow-sm relative overflow-hidden group">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
                          <h4 className="flex items-center gap-2 text-[16px] text-amber-600 dark:text-amber-400 font-black mb-3 relative z-10">
                            <Brain size={20} className="text-amber-500" /> AI 大腦記憶法
                          </h4>
                          <div className="text-[14.5px] font-bold text-amber-900/80 dark:text-amber-200/80 leading-relaxed relative z-10 highlighter">
                            <ReactMarkdown>{sec.replace(/###\s*\[?大腦記憶法\]?/, '').trim()}</ReactMarkdown>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div key={idx} className="mb-5 last:mb-0">
                        <ReactMarkdown>{sec}</ReactMarkdown>
                      </div>
                    );
                  })}
                </div>
              ) : analysis && analysis.startsWith('ERROR:') ? (
                <div className="p-10 border-2 border-dashed border-rose-200 dark:border-rose-500/20 rounded-[32px] text-center space-y-4 bg-rose-50/50 dark:bg-rose-500/5">
                  <div className="w-16 h-16 bg-rose-100 dark:bg-rose-500/10 rounded-full flex items-center justify-center mx-auto text-rose-500 shadow-inner">
                    <XCircle size={32} />
                  </div>
                  <p className="text-rose-600 dark:text-rose-400 font-bold">{analysis.replace('ERROR:', '')}</p>
                  <button onClick={() => handleAiAnalyze(word.id, word.word)} className="mt-4 px-8 py-4 bg-rose-500 hover:bg-rose-400 text-white rounded-[24px] font-black shadow-lg shadow-rose-500/30 active:scale-95 transition-all flex items-center gap-2 mx-auto">
                    <RefreshCw size={18} /> 重新嘗試解析
                  </button>
                </div>
              ) : isAnalyzing ? (
                <div className="p-10 border-2 border-dashed border-purple-200 dark:border-purple-500/20 rounded-[32px] text-center space-y-4 bg-purple-50/50 dark:bg-purple-500/5">
                  <RefreshCw size={32} className="animate-spin text-purple-500 mx-auto" />
                  <p className="text-purple-600 dark:text-purple-400 font-bold animate-pulse">正在為您編寫專屬大腦記憶法與解析...</p>
                </div>
              ) : (
                /* 優化：未解析時的橫幅 Banner */
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 bg-purple-50/80 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-500/30 rounded-[28px] gap-4 shadow-sm group hover:shadow-md transition-all">
                  <div className="flex items-center gap-4 text-left w-full sm:w-auto">
                    <div className="w-12 h-12 bg-white dark:bg-black/20 rounded-2xl flex items-center justify-center text-purple-500 shadow-sm shrink-0 group-hover:scale-110 transition-transform">
                      <Brain size={24} />
                    </div>
                    <div>
                      <p className="text-[15px] font-black text-purple-900 dark:text-purple-200">想知道這個字是怎麼來的嗎？</p>
                      <p className="text-[12px] font-bold text-purple-600/70 dark:text-purple-400/70">解鎖字根字首與專屬諧音記憶法</p>
                    </div>
                  </div>
                  <button onClick={() => handleAiAnalyze(word.id, word.word)} className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white rounded-[18px] font-black shadow-lg shadow-purple-500/30 active:scale-95 transition-all whitespace-nowrap text-[14px]">✨ 一鍵生成</button>
                </div>
              )}
            </div>

            {/* 右側：個人管理區 Sidebar (沿用淡薄荷綠設計) */}
            <div className="bg-emerald-50/50 dark:bg-emerald-500/5 rounded-[32px] border border-emerald-100/80 dark:border-emerald-500/10 p-5 md:p-6 flex flex-col gap-6 sticky top-8 shadow-sm">

              {/* Spaced Repetition (學習回饋出口) */}
              <div>
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[13px] uppercase mb-4 tracking-widest">
                  <Trophy size={16} /> 學習回饋
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => handleToggleLearned(true)} className={`py-4 rounded-[20px] font-black text-[13px] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${word.learned ? 'bg-emerald-500 text-white border-emerald-500 shadow-emerald-500/30' : 'bg-white/60 dark:bg-black/20 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 hover:text-emerald-600'}`}>
                    <CheckCircle2 size={24} className={word.learned ? 'text-white' : ''} />
                    已學
                  </button>
                  <button onClick={() => handleToggleLearned(false)} className={`py-4 rounded-[20px] font-black text-[13px] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 shadow-sm border ${word.learned === false || word.learned === undefined ? 'bg-slate-500 text-white border-slate-500 shadow-slate-500/30' : 'bg-white/60 dark:bg-black/20 text-slate-500 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-700'}`}>
                    <BookOpen size={24} className={word.learned === false || word.learned === undefined ? 'text-white' : ''} />
                    未學
                  </button>
                </div>
              </div>

              {/* Personal Notes (無邊界文字輸入框) */}
              <div className="flex flex-col flex-1">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[13px] uppercase mb-3 tracking-widest">
                  <PenTool size={16} /> 專屬筆記
                </div>
                <textarea
                  defaultValue={word.notes || ''}
                  onBlur={(e) => { if (e.target.value !== word.notes) { updateWord(word.id, { notes: e.target.value }); triggerNotification('筆記已儲存', '自動同步成功'); } }}
                  placeholder="寫下你的諧音聯想、錯誤訂正或延伸筆記..."
                  className="w-full min-h-[160px] bg-white/60 dark:bg-black/20 border border-emerald-200/50 dark:border-emerald-500/20 rounded-[20px] p-4 text-[14px] font-bold text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all resize-none shadow-inner placeholder:text-slate-400/60 leading-relaxed"
                ></textarea>
              </div>

              {/* 🚀 新增：貢獻至共用字庫按鈕 */}
              {currentSet !== '6000_words' && (
                <button
                  onClick={handleContributeToGlobal}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-[20px] font-black text-[13px] shadow-lg shadow-orange-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <Globe size={18} /> 貢獻至雲端共用字庫
                </button>
              )}
            </div>
          </div>

          {/* 手機版底部專屬返回按鈕 (讓使用者滑到底部時可快速退出) */}
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5 md:hidden flex flex-col">
            <button onClick={handleClose} className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-[20px] font-black text-[15px] active:scale-95 transition-all shadow-sm touch-manipulation">
              返回單字列表
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function VocabularyTab({ user, isAdmin, schoolId, gradeId }) {
  const [words, setWords] = useState([]); // 從 Firestore 動態載入
  const [subTab, setSubTab] = useState('bank');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(''); // 新增防抖搜尋狀態
  const [filterPos, setFilterPos] = useState('all');
  const [filterLevel, setFilterLevel] = useState('all'); // 新增：級別篩選 (1-4)
  const [filterLearned, setFilterLearned] = useState('all'); // 新增：已學/未學篩選狀態
  const [isSyncing, setIsSyncing] = useState(false);
  const [userWords, setUserWords] = useState([]); // 個人學習進度
  const [currentSet, setCurrentSet] = useState('6000_words'); // 目前選擇的單字庫來源
  const [campusGrade, setCampusGrade] = useState(() => {
    let g = gradeId || localStorage.getItem('gsat_grade_id') || 'grade_1';
    if (g && !g.includes('_') && g.startsWith('grade')) g = g.replace('grade', 'grade_');
    return g;
  });

  // 🚀 自動同步：當使用者設定變更時，自動更新單字庫年級
  useEffect(() => {
    if (gradeId) {
      let normalized = gradeId;
      if (normalized && !normalized.includes('_') && normalized.startsWith('grade')) {
        normalized = normalized.replace('grade', 'grade_');
      }
      setCampusGrade(normalized);
    }
  }, [gradeId]);

  const [campusSemester, setCampusSemester] = useState('up');
  const [campusStage, setCampusStage] = useState('stage_1');

  const [showStatsModal, setShowStatsModal] = useState(false);
  const [detailedWordId, setDetailedWordId] = useState(null);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [aiAnalysisData, setAiAnalysisData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // 新增：加載狀態
  const [notification, setNotification] = useState(null);
  const [accent, setAccent] = useState('US'); // 預設口音 (US / UK)
  const [dbError, setDbError] = useState(''); // 記錄資料庫連線或權限錯誤
  const [sourcesVisibility, setSourcesVisibility] = useState({ school: true, teacher: true }); // 新增：來源可見性狀態

  // 🌟 共用手動拖動 (Drag to Scroll) 邏輯
  const scrollRefTabs = useRef(null);
  const scrollRefSet = useRef(null);
  const [dragState, setDragState] = useState({ isDragging: false, startX: 0, scrollLeft: 0, ref: null });
  const onDragStart = (e, ref) => {
    setDragState({ isDragging: true, startX: e.pageX - ref.current.offsetLeft, scrollLeft: ref.current.scrollLeft, ref });
  };
  const onDragMove = (e) => {
    if (!dragState.isDragging || !dragState.ref) return;
    e.preventDefault();
    dragState.ref.current.scrollLeft = dragState.scrollLeft - (e.pageX - dragState.ref.current.offsetLeft - dragState.startX) * 2;
  };

  // --- 防抖搜尋機制 (Debounce Search) ---
  // 等待使用者停止輸入 400 毫秒後，才真正觸發搜尋，大幅減少 Firebase 讀取次數與卡頓
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(timer);
  }, [search]);

  // 🚀 優化：自動檢查「學校單字」與「教師推薦」是否存在資料
  // 若資料庫為空，則自動隱藏該來源按鈕，提升使用者體驗
  useEffect(() => {
    if (!db || !schoolId) return;

    const checkSources = async () => {
      // 🚀 優化：若是 .edu.tw 帳號或管理員，不論資料庫是否為空，都應顯示來源按鈕以便管理與新增
      const isPrivileged = isAdmin || user?.email?.endsWith('.edu.tw');
      try {
        const bookId = getBookDocId(campusGrade, campusSemester);
        const campusPath = collection(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab');
        const campusSnap = await getDocs(query(campusPath, limit(1)));
        setSourcesVisibility(prev => ({ ...prev, school: isPrivileged || !campusSnap.empty }));
      } catch (e) {
        setSourcesVisibility(prev => ({ ...prev, school: isPrivileged }));
        console.error("Check sources error:", e);
      }
    };

    logDebug('INFO', '執行 checkSources');
    checkSources();
  }, [db, schoolId, campusGrade, campusSemester, campusStage, user?.email, isAdmin]);


  // --- 通知系統 ---
  const triggerNotification = useCallback((title, message, type = 'success') => {
    setNotification({ title, message, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // --- 學習統計邏輯 ---
  const [stats, setStats] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_vocab_stats')) || {}; }
    catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('gsat_vocab_stats', JSON.stringify(stats));
  }, [stats]);

  const updateStats = useCallback((type, amount = 1) => {
    const today = new Date().toISOString().split('T')[0];
    setStats(prev => {
      const todayStats = prev[today] || { words: 0, time: 0 };
      return { ...prev, [today]: { ...todayStats, [type]: todayStats[type] + amount } };
    });
  }, []);

  // 背景學習計時器：只要停留在測驗或複習畫面，每秒累加 1 秒鐘
  useEffect(() => {
    if (subTab === 'review' || subTab === 'quiz') {
      const timer = setInterval(() => updateStats('time', 10), 10000); // 🚀 效能優化：每 10 秒批次更新，避免 localStorage 寫入癱瘓主執行緒
      return () => clearInterval(timer);
    }
  }, [subTab, updateStats]);

  const incrementWordCount = useCallback(() => {
    updateStats('words', 1);
  }, [updateStats]);

  // Debug 模式狀態
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [debugLogs, setDebugLogs] = useState([]);
  const [isLogOpen, setIsLogOpen] = useState(true);

  // 寫入 Log 的輔助函式
  const logDebug = useCallback((type, title, data) => {
    const time = new Date().toLocaleTimeString();
    console.log(`[${type}] ${title}`, data);
    setDebugLogs(prev => [{ time, type, title, data }, ...prev].slice(0, 50)); // 只保留最新 50 筆
  }, []);

  // 提前載入並緩存語音庫
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // 🔊 原生語音引擎優化：智慧選擇自然音色
  const playVoice = useCallback((text, targetAccent = 'US', rate = 0.9) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const langCode = targetAccent === 'UK' ? 'en-GB' : 'en-US';
    utterance.lang = langCode;
    utterance.rate = rate; // 支援動態語速 (一般 0.9，慢速 0.4)

    const voices = window.speechSynthesis.getVoices();
    const preferredVoices = voices.filter(v => v.lang.startsWith(langCode) || v.lang.replace('_', '-').startsWith(langCode));
    // 優先挑選自然且無機器感的語音模型
    const bestVoice = preferredVoices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Natural') || v.name.includes('Karen')) || preferredVoices[0];
    if (bestVoice) utterance.voice = bestVoice;
    window.speechSynthesis.speak(utterance);
  }, []);

  const [lastVisible, setLastVisible] = useState(null); // 分頁用

  // 🚀 Firestore 實時監聽：個人學習進度 (SM-2 狀態)
  useEffect(() => {
    if (!user?.uid) {
      // 🚀 關鍵修復：訪客模式時，載入本機進度
      const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
      setUserWords(localData);
      return;
    }
    if (!db) return;

    // 新架構：個人學習進度/錯題本
    const q = query(collection(db, 'Users', user.uid, 'PersonalVocab'));
    const unsub = onSnapshot(q, (snapshot) => {
      const progressData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUserWords(progressData);
      logDebug('INFO', '已從雲端同步個人進度', { count: progressData.length });
    });

    return () => unsub();
  }, [user?.uid, logDebug]);

  // 🚀 Firestore 載入邏輯：優化分頁與搜尋
  useEffect(() => {
    if (!db) return;

    // 🔥 雙模載入邏輯
    const isPersonalGuest = currentSet === 'Personal' && !user?.uid;

    if (isPersonalGuest) {
      logDebug('INFO', '正在載入本地個人收藏 (訪客模式)');
      try {
        const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
        // 模擬搜尋 (本地搜尋改用 includes 比較直覺)
        const filteredLocal = debouncedSearch.trim()
          ? localData.filter(w => w.word.toLowerCase().includes(debouncedSearch.trim().toLowerCase()))
          : localData;
        setWords(filteredLocal);
        setLastVisible(null); // 本地模式不支援分頁載入更多
        setDbError('');
        return;
      } catch (e) {
        console.error("Local storage error:", e);
        setWords([]);
        return;
      }
    }

    let q;
    let vocabRef;
    if (currentSet === 'Personal') {
      vocabRef = collection(db, 'Users', user.uid, 'PersonalVocab');
    } else if (currentSet === 'Campus') {
      if (!user) {
        setDbError('「校園單字」功能僅限登入使用者，請先登入。');
        setWords([]);
        setIsLoading(false);
        return;
      }
      if (!schoolId) {
        setDbError('請先至設定頁面選擇您的學校');
        setWords([]);
        setIsLoading(false);
        return;
      }
      const bookId = getBookDocId(campusGrade, campusSemester);
      vocabRef = collection(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab');
    } else {

      // 🌍 6000 核心單字庫 (改存放於 Schools/taiwan/FreeVocab)
      vocabRef = collection(db, 'Schools', 'taiwan', 'FreeVocab');
    }

    // 🚀 Firebase 雲端原生搜尋：符合實作指令規定的前綴搜尋與級別篩選
    const searchStr = debouncedSearch.trim().toLowerCase();
    if (searchStr || filterLevel !== 'all') {
      let constraints = [vocabRef];

      if (searchStr) {
        constraints.push(where('word', '>=', searchStr));
        constraints.push(where('word', '<=', searchStr + '\uf8ff'));
      }

      if (currentSet === 'Campus') {
        const stageNum = parseInt(campusStage.replace('stage_', ''), 10);
        constraints.push(where('examStage', '==', getStageStr(stageNum)));
      }

      if (filterLevel !== 'all') {
        constraints.push(where('level', '==', Number(filterLevel)));
      }

      constraints.push(orderBy(searchStr ? 'word' : '__name__', 'asc'));
      constraints.push(limit(20));
      q = query(...constraints);
    } else {
      if (currentSet === 'Campus') {
        const stageNum = parseInt(campusStage.replace('stage_', ''), 10);
        q = query(vocabRef, where('examStage', '==', getStageStr(stageNum)), orderBy('__name__', 'asc'), limit(20));
      } else {
        q = query(vocabRef, orderBy('__name__', 'asc'), limit(20));
      }
    }

    setIsLoading(true);
    if (currentSet === 'Campus') {
      const bookId = getBookDocId(campusGrade, campusSemester);
      logDebug('DEBUG', '校務單字路徑追查', { path: `Schools/${schoolId}/Grades/${campusGrade}/GradeVocab/${bookId}/Vocab`, stage: campusStage, schoolId });
    }
    const unsub = onSnapshot(q, (snapshot) => {
      if (currentSet === 'Campus' && snapshot.empty) {
        logDebug('WARNING', '校務單字：Firestore 回傳為空 (snapshot.empty)');
      }
      const mainData = snapshot.docs.map(doc => {
        const data = doc.data();
        let word = data.word || doc.id;
        let meanings = getMeanings(data);

        // 🚀 詞性修正攔截：處理 "alike a", "jump v" 等連寫格式
        const posMatch = word.match(/^(.*?)\s+([a-z]+\.?)$/i);
        if (posMatch) {
          const cleanWord = posMatch[1].trim();
          const detectedPos = posMatch[2].trim();
          // 如果 detectedPos 像是一個詞性縮寫，則進行修正
          if (['n', 'v', 'adj', 'adv', 'prep', 'conj', 'phr', 'n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.', 'phr.'].includes(detectedPos.toLowerCase())) {
            word = cleanWord;
            const normalizedPos = normalizePOS(detectedPos);
            // 只有當 meanings 裡沒有這個詞性時才更新或覆蓋
            if (meanings.length === 1 && (meanings[0].pos === 'n.' || meanings[0].pos === detectedPos)) {
              meanings = [{ ...meanings[0], pos: normalizedPos }];
            }
          }
        }

        return { id: doc.id, ...data, word, meanings };
      });
      setWords(mainData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setDbError('');
      setIsLoading(false);
      logDebug('INFO', `已加載來源: ${currentSet}`, { count: mainData.length, mode: searchStr ? 'Search' : 'Initial' });
    }, (error) => {
      setIsLoading(false);
      logDebug('ERROR', '載入單字庫失敗', error.message);
      if (error.code === 'permission-denied') {
        setDbError('權限不足：請確認您已登入，且資料庫安全規則設定正確。');
        if (currentSet === 'Campus') {
          // 若是校園單字因權限或無資料阻擋，則不顯示報錯橫幅，讓畫面自然呈現「目前沒有單字」
          setDbError('');
        } else {
          setDbError('權限不足：請確認您已登入，且資料庫安全規則設定正確。');
        }
      } else {
        setDbError(`載入失敗：${error.message}`);
      }
      setWords([]); // 清空以避免無限載入
    });

    return () => unsub();
  }, [debouncedSearch, currentSet, filterLevel, campusGrade, campusSemester, campusStage, logDebug, user?.uid, schoolId]);


  // 加載更多 (效能優化)
  const loadMoreWords = useCallback(async () => {
    if (!db || !lastVisible || debouncedSearch.trim()) return; // 搜尋模式下暫不啟用無窮下拉
    if (currentSet === 'Personal' && !user?.uid) return;

    let vocabRef;
    if (currentSet === 'Personal') {
      vocabRef = collection(db, 'Users', user.uid, 'PersonalVocab');
    } else if (currentSet === 'Campus') {
      if (!schoolId) return;
      const bookId = getBookDocId(campusGrade, campusSemester);
      vocabRef = collection(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab');
    } else {

      vocabRef = collection(db, 'Schools', 'taiwan', 'FreeVocab');
    }

    const searchStr = debouncedSearch.trim().toLowerCase();
    let constraints = [vocabRef, orderBy(searchStr ? 'word' : '__name__', 'asc'), startAfter(lastVisible), limit(20)];
    if (searchStr) {
      constraints.push(where('word', '>=', searchStr));
      constraints.push(where('word', '<=', searchStr + '\uf8ff'));
    }
    if (filterLevel !== 'all') {
      constraints.push(where('level', '==', Number(filterLevel)));
    }
    if (currentSet === 'Campus') {
      const stageNum = parseInt(campusStage.replace('stage_', ''), 10);
      constraints.push(where('examStage', '==', getStageStr(stageNum)));
    }
    const q = query(...constraints);
    try {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        setWords(prev => {
          const existingIds = new Set(prev.map(w => w.id));
          const moreData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(w => !existingIds.has(w.id));

          if (moreData.length > 0) {
            logDebug('INFO', '已加載更多單字', { count: moreData.length });
            return [...prev, ...moreData];
          }
          return prev;
        });
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      }
    } catch (error) {
      logDebug('ERROR', '載入更多單字失敗', error.message);
    }
  }, [lastVisible, debouncedSearch, currentSet, campusGrade, campusSemester, campusStage, logDebug, user?.uid]);


  // 🚀 智慧合併單字與個人進度 (防止舊版個人資料覆蓋全域最新解析)
  const mergedWords = useMemo(() => {
    const progressMap = new Map(userWords.map(p => [String(p.word || '').toLowerCase(), p]));
    const resultMap = new Map(); // 用於最終去重，Key 為單字小寫

    words.forEach(w => {
      const wordKey = String(w.word || '').toLowerCase();
      const progress = progressMap.get(wordKey);
      if (progress) progressMap.delete(wordKey); // 移除已匹配的

      let mergedObj = { ...w };
      if (progress) {
        // 允許進度覆蓋的欄位 (SRS 與個人專屬筆記)
        const overrideKeys = ['interval', 'easeFactor', 'repetitions', 'nextReview', 'lastResult', 'learned', 'notes', 'tags'];
        overrideKeys.forEach(k => {
          if (progress[k] !== undefined) mergedObj[k] = progress[k];
        });

        // 智慧合併 meanings：避免舊版 Personal 蓋掉新的 Global 多詞性結構，但保留 Personal 生成的例句
        if (!mergedObj.meanings || mergedObj.meanings.length === 0) {
          if (progress.meanings && progress.meanings.length > 0) mergedObj.meanings = progress.meanings;
        } else if (progress.meanings && progress.meanings.length > 0) {
          mergedObj.meanings = mergedObj.meanings.map(gMeaning => {
            const pMeaning = progress.meanings.find(pm => pm.pos === gMeaning.pos && pm.meaning === gMeaning.meaning);
            if (pMeaning && pMeaning.example && !gMeaning.example) {
              return { ...gMeaning, example: pMeaning.example, exampleChinese: pMeaning.exampleChinese, exampleAuthor: pMeaning.exampleAuthor };
            }
            return gMeaning;
          });
        }

        // 智慧合併 aiAnalysis：確保不被舊版的空白或錯誤解析蓋掉
        if (progress.aiAnalysis && !progress.aiAnalysis.startsWith('ERROR:') && !mergedObj.aiAnalysis) {
          mergedObj.aiAnalysis = progress.aiAnalysis;
          mergedObj.aiAnalysisAuthor = progress.aiAnalysisAuthor;
        }
      }

      // 🚀 終極去重：如果 resultMap 已經有這個字了，就跳過（以先出現的為準，通常是 Words 裡的）
      if (!resultMap.has(wordKey)) {
        resultMap.set(wordKey, mergedObj);
      }
    });

    // 只有在「個人收藏」頁面，才需要把剩餘的個人進度單字全部補上
    if (currentSet === 'Personal') {
      progressMap.forEach((p, wordKey) => {
        if (!resultMap.has(wordKey)) {
          resultMap.set(wordKey, { ...p, source: 'Personal' });
        }
      });
    }

    return Array.from(resultMap.values());
  }, [words, userWords, currentSet]);

  // 🚀 字根出現頻率統計 (用於 SRS 智慧權重)
  const commonalityMap = useMemo(() => {
    const map = {};
    mergedWords.forEach(w => {
      if (w.root) {
        const root = w.root.toLowerCase();
        map[root] = (map[root] || 0) + 1;
      }
    });
    return map;
  }, [mergedWords]);

  const pushToGAS = useCallback(async (newWord) => {
    const payload = {
      action: 'addRecord',
      serialNumber: Date.now(),
      level: newWord.level || 1,
      word: newWord.word,
      pos: newWord.partOfSpeech || 'n.',
      chinese: newWord.meaning,
      type: newWord.source || '個人'
    };

    logDebug('FETCH', '準備新增單字到 GAS', payload);

    try {
      const response = await fetch(GAS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      logDebug('SUCCESS', '新增單字回應', result);
    } catch (err) {
      logDebug('ERROR', '新增單字同步 GAS 失敗', err.message);
    }
  }, [logDebug]);

  // Handle GAS Sync (Pull)
  const syncFromGAS = useCallback(async (showToast = false) => {
    setIsSyncing(true);
    logDebug('INFO', '開始同步 GAS', { sheets: ['record', 'nhsh-english-6000'] });

    try {
      const sheets = ['record', 'nhsh-english-6000'];
      const fetches = sheets.map(async (sheetName) => {
        const url = `${GAS_URL}?action=readSheet&sheet=${encodeURIComponent(sheetName)}`;
        try {
          const res = await fetch(url);
          const json = await res.json();
          return json.success && json.data ? json.data : [];
        } catch (e) {
          return [];
        }
      });

      const results = await Promise.all(fetches);
      const allData = results.flat();

      if (allData.length > 0 && isAdmin) {
        // 🚀 分批寫入，突破 Firebase 每次 500 筆的上限限制
        const chunks = [];
        for (let i = 0; i < allData.length; i += 400) {
          chunks.push(allData.slice(i, i + 400));
        }

        const grouped = {};
        for (const chunk of chunks) {
          chunk.forEach((item, i) => {
            const wordVal = String(item['單字'] || item['word'] || '').trim();
            if (!wordVal) return;
            const lower = wordVal.toLowerCase();
            if (!grouped[lower]) {
              grouped[lower] = {
                word: wordVal, level: Number(item['級別'] || item['level']) || 1, type: '官方內建',
                shared: true, serialNumber: Number(item['流水號'] || item['編號']) || Date.now() + i, meanings: []
              };
            }
            grouped[lower].meanings.push({
              pos: String(item['屬性'] || item['pos'] || 'n.').trim(),
              meaning: String(item['中文'] || item['chinese'] || '').trim()
            });
          });
        }

        const finalData = Object.values(grouped);
        const finalChunks = [];
        for (let i = 0; i < finalData.length; i += 400) finalChunks.push(finalData.slice(i, i + 400));

        for (const fChunk of finalChunks) {
          const batch = writeBatch(db);
          fChunk.forEach(wObj => {
            const safeDocId = String(wObj.word).toLowerCase().replace(/\//g, '_');
            const ref = doc(db, 'Schools', 'taiwan', 'FreeVocab', safeDocId);
            const uniqueMeanings = []; const seen = new Set();
            wObj.meanings.forEach(m => { const key = `${m.pos}-${m.meaning}`; if (!seen.has(key)) { seen.add(key); uniqueMeanings.push(m); } });
            batch.set(ref, {
              word: wObj.word, level: wObj.level, type: wObj.type, shared: wObj.shared,
              serialNumber: wObj.serialNumber, meanings: uniqueMeanings, updatedAt: serverTimestamp()
            }, { merge: true });
          });
          await batch.commit();
        }

        logDebug('SUCCESS', `已從 GAS 同步 ${allData.length} 筆單字至 vocab 庫`);
        if (showToast) alert(`同步成功！已更新 ${allData.length} 個單字`);
      }
    } catch (err) {
      logDebug('ERROR', '同步失敗', err.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isAdmin, logDebug]);

  const todayReview = useMemo(() => {
    const now = new Date().toISOString();
    return mergedWords.filter(w => !w.nextReview || w.nextReview <= now);
  }, [mergedWords]);

  const updateWord = useCallback(async (id, updates) => {
    const isGuest = !user?.uid;
    const wordObj = mergedWords.find(w => w.id === id);
    if (!wordObj) return;

    // 🚀 智慧分流：區分「SRS 個人進度」與「全域內容 (共編)」
    const isSrsUpdate = 'interval' in updates || 'notes' in updates || 'repetitions' in updates || 'easeFactor' in updates || 'nextReview' in updates || 'lastResult' in updates || 'learned' in updates;
    const isGlobalUpdate = currentSet !== 'Personal' && !isSrsUpdate;

    // 🚀 終極安全防護：無論單字來源，一律強制轉小寫並把斜線替換為底線，徹底解決 a/an 崩潰問題
    const safeId = String(wordObj.word).toLowerCase().replace(/\//g, '_');

    if (isGlobalUpdate) {
      // 🌍 全域更新：所有使用者(含訪客)的 AI 解析、例句、詞性解釋，直接寫入公用資料庫
      let ref;
      if (currentSet === 'Campus') {
        const bookId = getBookDocId(campusGrade, campusSemester);
        ref = doc(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab', safeId);
      } else {
        ref = doc(db, 'Schools', 'taiwan', 'FreeVocab', safeId);
      }


      await setDoc(ref, {
        ...updates,
        word: wordObj.word,
        updatedAt: serverTimestamp()
      }, { merge: true });

      logDebug('INFO', '已貢獻全域單字內容', { word: wordObj.word });
    } else {
      // 👤 個人更新：學習進度、忘記/秒答、專屬筆記
      if (isGuest) {
        const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
        const index = localData.findIndex(w => String(w.word).toLowerCase() === String(wordObj.word).toLowerCase());
        if (index !== -1) {
          localData[index] = { ...localData[index], ...updates, updatedAt: Date.now() };
        } else {
          localData.push({ ...wordObj, ...updates, id: 'local_' + Date.now() + Math.random(), updatedAt: Date.now(), source: 'Personal' });
        }
        localStorage.setItem('gsat_local_vocab', JSON.stringify(localData));
        setUserWords([...localData]);
        if (currentSet === 'Personal') setWords([...localData]);
        return;
      }

      const ref = doc(db, 'Users', user.uid, 'PersonalVocab', safeId);
      await setDoc(ref, {
        ...updates,
        word: wordObj.word,
        updatedAt: serverTimestamp()
      }, { merge: true });

      logDebug('INFO', '已更新個人進度/筆記', { word: wordObj.word });
    }

    // 🚀 核心修復：雙重同步機制
    // 如果是 AI 解析更新且使用者已登入，且剛才不是個人更新，則額外強制備份一份到個人庫
    // 確保在手機端/權限不足時，使用者依然能看到自己產生的解析內容
    if (!isGuest && isGlobalUpdate && ('aiAnalysis' in updates)) {
      try {
        const personalRef = doc(db, 'Users', user.uid, 'PersonalVocab', safeId);
        await setDoc(personalRef, {
          ...updates,
          word: wordObj.word,
          updatedAt: serverTimestamp()
        }, { merge: true });
        logDebug('INFO', '解析內容已同步備份至個人空間', { word: wordObj.word });
      } catch (e) {
        console.warn("個人備份失敗:", e.message);
      }
    }
  }, [user?.uid, user?.email, isAdmin, currentSet, schoolId, campusGrade, campusSemester, campusStage, mergedWords, logDebug]);

  const deleteWord = useCallback(async (id) => {
    if (!user?.uid) return;
    try {
      const wordObj = mergedWords.find(w => w.id === id);
      if (wordObj) {
        const isGuest = !user?.uid;
        if (isGuest) {
          const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
          const newData = localData.filter(w => w.id !== id && w.word.toLowerCase() !== wordObj.word.toLowerCase());
          localStorage.setItem('gsat_local_vocab', JSON.stringify(newData));
          if (currentSet === 'Personal') setWords(newData);
          return;
        }

        if (!isAdmin && currentSet !== 'Personal' && !user?.email?.endsWith('.edu.tw')) {
          alert("您只能刪除「個人收藏」中的單字喔！");
          return;
        }
        // 🚀 強制校正 ID：確保刪除邏輯使用的 ID 與儲存時一致 (全小寫且無斜線)
        const safeId = String(wordObj.word).toLowerCase().replace(/\//g, '_');

        const ref = currentSet === 'Personal'
          ? doc(db, 'Users', user.uid, 'PersonalVocab', safeId)
          : currentSet === 'Campus'
            ? (() => {
              const bookId = getBookDocId(campusGrade, campusSemester);
              return doc(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab', safeId);
            })()
            : doc(db, 'Schools', 'taiwan', 'FreeVocab', safeId);

        await deleteDoc(ref);

        // 🚀 同步更新本地 state
        if (currentSet === 'Personal') {
          setWords(prev => prev.filter(w => w.id !== id && w.word.toLowerCase() !== wordObj.word.toLowerCase()));
          setUserWords(prev => prev.filter(w => w.word.toLowerCase() !== wordObj.word.toLowerCase()));
        }

        logDebug('SUCCESS', '已從雲端刪除單字', { word: wordObj.word, set: currentSet });
        triggerNotification('刪除成功', `已將「${wordObj.word}」從庫中移除`);
      }
    } catch (e) {
      logDebug('ERROR', '刪除失敗', e.message);
      triggerNotification('刪除失敗', e.message, 'error');
    }
  }, [user?.uid, isAdmin, mergedWords, logDebug, currentSet, schoolId, campusGrade, campusSemester, campusStage]);


const addWords = useCallback(async (newWords, targetSet = currentSet, shouldPush = true) => {
  if (!db) return;
  const isGuest = !user?.uid;

  if (isGuest && targetSet === 'Personal') {
    const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
    const updated = [...localData];
    newWords.forEach(w => {
      const wordVal = (w.word || '').trim();
      if (!wordVal) return;
      if (!updated.some(x => x.word.toLowerCase() === wordVal.toLowerCase())) {
        updated.push({
          id: 'local_' + Date.now() + Math.random(),
          ...w,
          createdAt: Date.now(),
          source: 'Personal'
        });
      }
    });
    localStorage.setItem('gsat_local_vocab', JSON.stringify(updated));
    if (currentSet === 'Personal') setWords(updated);
    logDebug('SUCCESS', `已新增 ${newWords.length} 筆單字至本地收藏 (訪客)`);
    return;
  }

  if (targetSet === 'Teacher Picks' && !schoolId) { triggerNotification('錯誤', '請先設定學校', 'error'); return; }
  if (targetSet === 'Campus' && (!schoolId || !gradeId)) { triggerNotification('錯誤', '請先設定學校與年級', 'error'); return; }
  if (targetSet === 'Campus' && !isAdmin && !user?.email?.endsWith('.edu.tw')) {
    triggerNotification('權限不足', '校務單字僅限教職員或校務帳號新增喔！', 'error');
    return;
  }

  // 🚀 群組化同一個單字，合併成陣列
  const grouped = {};
  newWords.forEach((w) => {
    const wordVal = String(w.word || '').trim();
    if (!wordVal) return;
    const lower = wordVal.toLowerCase();
    if (!grouped[lower]) {
      grouped[lower] = { ...w, word: wordVal, meanings: [], originalW: w };
    }
    if (w.meanings && Array.isArray(w.meanings)) grouped[lower].meanings.push(...w.meanings);
    else if (w.meaning || w.chinese) grouped[lower].meanings.push({ pos: String(w.partOfSpeech || w.pos || 'n.').trim(), meaning: String(w.meaning || w.chinese || '').trim() });
  });

  const finalData = Object.values(grouped);
  // 🚀 大量上傳分批保護機制
  const chunks = [];
  for (let i = 0; i < finalData.length; i += 400) {
    chunks.push(finalData.slice(i, i + 400));
  }

  for (let chunkIdx = 0; chunkIdx < chunks.length; chunkIdx++) {
    const chunk = chunks[chunkIdx];
    const batch = writeBatch(db);
    chunk.forEach((wObj, i) => {
      const wordVal = wObj.word;
      const safeDocId = String(wordVal).toLowerCase().replace(/\//g, '_'); // 防呆

      const ref = targetSet === 'Personal'
        ? doc(db, 'Users', user.uid, 'PersonalVocab', safeDocId)
        : targetSet === 'Campus'
          ? (() => {
            const bookId = getBookDocId(campusGrade, campusSemester);
            return doc(db, 'Schools', schoolId, 'Grades', campusGrade, 'GradeVocab', bookId, 'Vocab', safeDocId);
          })()
          : doc(db, 'Schools', 'taiwan', 'FreeVocab', safeDocId);

      const sn = Date.now() + (chunkIdx * 400) + i;

      const uniqueMeanings = []; const seen = new Set();
      wObj.meanings.forEach(m => { const key = `${m.pos}-${m.meaning}`; if (!seen.has(key)) { seen.add(key); uniqueMeanings.push(m); } });

      batch.set(ref, {
        word: wordVal,
        level: Number(wObj.level) || 1,
        type: targetSet === 'Personal' ? '個人' : (wObj.source || '社群貢獻'),
        shared: targetSet !== 'Personal',
        serialNumber: sn,
        tags: wObj.tags || [],
        meanings: uniqueMeanings,
        semester: targetSet === 'Campus' ? campusSemester : null,
        examStage: targetSet === 'Campus' ? getStageStr(campusStage.replace('stage_', '')) : null,
        userEmail: user.email || '',
        updatedAt: serverTimestamp(),
        createdAt: wObj.createdAt || serverTimestamp() // 保留舊有創建時間
      }, { merge: true });

      if (shouldPush && targetSet !== 'Personal') pushToGAS(wObj.originalW);
    });
    await batch.commit();
  }
  logDebug('SUCCESS', `已新增 ${newWords.length} 筆單字至 ${targetSet}`);
}, [user?.uid, user?.email, isAdmin, pushToGAS, logDebug, currentSet, schoolId, campusGrade, campusSemester, campusStage]);


const todayStr = new Date().toISOString().split('T')[0];
const todayMinutes = Math.floor((stats[todayStr]?.time || 0) / 60);

// IG 限動小卡匯出功能：改為匯出「今日學習數據」
const handleExportIG = useCallback(async () => {
  let currentStreak = 0;
  try {
    const statsData = JSON.parse(localStorage.getItem('gsat_vocab_stats')) || {};
    const tStr = new Date().toISOString().split('T')[0];
    let tempDate = new Date();
    while (true) {
      const dStr = tempDate.toISOString().split('T')[0];
      const s = statsData[dStr];
      if (s && (s.words > 0 || s.time > 0)) {
        currentStreak++;
        tempDate.setDate(tempDate.getDate() - 1);
      } else {
        if (dStr === tStr) tempDate.setDate(tempDate.getDate() - 1);
        else break;
      }
    }
  } catch (e) { }

  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');

  const grad = ctx.createLinearGradient(0, 0, 1080, 1920);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#064e3b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1080, 1920);

  ctx.beginPath(); ctx.arc(200, 300, 500, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.15)'; ctx.fill();
  ctx.beginPath(); ctx.arc(900, 1500, 600, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.15)'; ctx.fill();

  ctx.beginPath();
  ctx.roundRect(90, 400, 900, 1120, 60);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`GSAT PRO • 學習紀錄`, 540, 520);

  ctx.font = 'bold 160px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${currentStreak}`, 540, 780);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#34d399';
  ctx.fillText(`🔥 連續打卡天數`, 540, 880);

  const todayMin = Math.floor((stats[todayStr]?.time || 0) / 60);
  ctx.font = 'bold 160px sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${todayMin}`, 540, 1150);
  ctx.font = 'bold 50px sans-serif';
  ctx.fillStyle = '#60a5fa';
  ctx.fillText(`⏱️ 今日專注時數 (分鐘)`, 540, 1250);

  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fillText('持續累積，突破自我 🚀', 540, 1420);

  const link = document.createElement('a');
  link.download = `GSAT-Pro-Stats.jpg`;
  link.href = canvas.toDataURL('image/jpeg', 0.95);
  link.click();
}, []);

return (
  <div className="flex flex-col w-full h-full animate-fadeIn pb-8 space-y-4 relative overflow-x-hidden">
    {/* 利用 createPortal 將 Modal 抽離，避免受父層 transform 動畫影響導致版面錯位 */}
    {showStatsModal && createPortal(
      <StatsModal isOpen={showStatsModal} onClose={() => setShowStatsModal(false)} stats={stats} />,
      document.body
    )}

    {/* 注入答錯時的微震動動畫 */}
    <style>{`
        @keyframes vocab-shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-vocab-shake { animation: vocab-shake 0.4s ease-in-out; }

        @keyframes heart-burst {
          0% { transform: scale(1); }
          50% { transform: scale(1.35); }
          100% { transform: scale(1); }
        }
        .animate-heart-burst { animation: heart-burst 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }

        /* 例句單字高亮標示共用樣式 */
        mark {
          background-color: rgba(16, 185, 129, 0.15);
          color: inherit;
          padding: 0 0.2em;
          border-radius: 0.2em;
          font-weight: 900;
        }
        .dark mark {
          background-color: rgba(16, 185, 129, 0.25);
          color: #34d399;
        }

        /* 骨架屏動畫 (Skeleton Screen) */
        @keyframes skeleton-loading {
          0% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .skeleton {
          background: linear-gradient(90deg, rgba(226,232,240,0.5) 25%, rgba(241,245,249,0.8) 50%, rgba(226,232,240,0.5) 75%);
          background-size: 200% 100%;
          animation: skeleton-loading 1.5s infinite;
        }
        .dark .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.05) 75%);
          background-size: 200% 100%;
        }

        /* 🚀 頂級通知專用動畫 */
        @keyframes progress-shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        .animate-progress-shrink { animation: progress-shrink 3s linear forwards; }

        @keyframes bounce-soft {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.15); }
        }
        .animate-bounce-soft { animation: bounce-soft 0.8s ease-in-out infinite; }

        @keyframes slide-up-fade {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up-fade { animation: slide-up-fade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes slide-up-fade-center {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        .animate-slide-up-fade-center { animation: slide-up-fade-center 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }



        /* 波紋效果 (Ripple Effect) */
        .ripple-btn {
          position: relative;
          overflow: hidden;
        }
        .ripple-btn::after {
          content: "";
          display: block;
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
          background-repeat: no-repeat;
          background-position: 50%;
          transform: scale(10, 10);
          opacity: 0;
          transition: transform .5s, opacity 1s;
        }
        .ripple-btn:active::after {
          transform: scale(0, 0);
          opacity: .3;
          transition: 0s;
        }
      `}</style>
    {/* Header (Sticky) */}
    <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md pt-2 px-1">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <BookOpen size={24} className="shrink-0" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">單字特訓</h2>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-slate-400">{mergedWords.length} 個單字 · {todayReview.length} 個待複習</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 學習時數膠囊按鈕 */}
          <button onClick={() => setShowStatsModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl font-black text-[12px] active:scale-95 transition-all border border-emerald-200/50 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-sm">
            <Clock size={14} className="shrink-0" /> <span className="hidden sm:inline">今日 </span>{todayMinutes}m
          </button>
          <button onClick={handleExportIG} className="flex items-center justify-center p-2 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl active:scale-95 transition-all shadow-sm border border-emerald-200/50 dark:border-emerald-500/20 hover:bg-emerald-200 dark:hover:bg-emerald-500/20" title="分享至 IG 限時動態">
            <Share2 size={16} />
          </button>

          <button onClick={() => setIsDebugMode(!isDebugMode)} className={`hidden sm:block p-2 rounded-xl transition-all ${isDebugMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'}`} title="切換偵錯模式"><Bug size={16} /></button>
        </div>
      </div>

      {/* 錯誤提示 (Sticky Notice) */}
      {dbError && (
        <div className="mt-2 p-3 bg-red-100/80 dark:bg-red-900/40 backdrop-blur-lg border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center gap-3 animate-slide-up-fade shadow-lg mx-1">
          <AlertCircle size={18} className="text-red-500 shrink-0" />
          <span className="text-[13px] font-black text-red-700 dark:text-red-300 min-w-0 break-words leading-tight">{dbError}</span>
          <button onClick={() => setDbError('')} className="ml-auto p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
            <X size={14} className="text-red-400" />
          </button>
        </div>
      )}
    </div>

    {/* Sub-tabs */}
    <div className="px-1 mb-2">
      <div
        ref={scrollRefTabs}
        onMouseDown={e => onDragStart(e, scrollRefTabs)} onMouseLeave={() => setDragState({ ...dragState, isDragging: false })} onMouseUp={() => setDragState({ ...dragState, isDragging: false })} onMouseMove={onDragMove}
        className={`relative flex gap-2 overflow-x-auto scrollbar-hide bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[24px] backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-inner select-none ${dragState.isDragging && dragState.ref === scrollRefTabs ? 'cursor-grabbing' : 'cursor-grab'}`}
      >
        {/* 魔術背景膠囊 */}
        <div
          className="absolute top-1.5 bottom-1.5 bg-white dark:bg-slate-700 rounded-[20px] shadow-sm border border-slate-100 dark:border-slate-600 transition-all duration-[500ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
          style={{
            width: `calc((100% - 12px) / ${SUB_TABS.length})`,
            transform: `translateX(calc(${SUB_TABS.findIndex(t => t.id === subTab)} * 100%))`
          }}
        />
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`relative z-10 flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-3 rounded-[20px] font-black text-[12px] whitespace-nowrap transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] ${subTab === tab.id
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/5'
              }`}
          >
            <tab.icon size={16} className={subTab === tab.id ? 'animate-bounce-soft' : ''} />
            {tab.label}
            {tab.id === 'review' && todayReview.length > 0 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ml-1 transition-colors ${subTab === tab.id ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20' : 'bg-slate-300/50 text-slate-600'}`}>{todayReview.length}</span>
            )}
          </button>
        ))}
      </div>
    </div>

    {/* Content */}
    <div key={subTab} className="animate-tab-enter flex-1 overflow-y-auto overflow-x-hidden" onScroll={(e) => {

      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
      if (scrollHeight - scrollTop <= clientHeight + 100) {
        loadMoreWords();
      }
    }}>
      {subTab === 'bank' && (
        <WordBank
          words={mergedWords}
          search={search}
          setSearch={setSearch}
          updateWord={updateWord}
          deleteWord={deleteWord}
          addWords={addWords}
          currentSet={currentSet}
          setCurrentSet={setCurrentSet}
          isAdmin={isAdmin}
          handleExportIG={handleExportIG}
          detailedWordId={detailedWordId}
          setDetailedWordId={setDetailedWordId}
          analyzingIds={analyzingIds}
          aiAnalysisData={aiAnalysisData}
          setAiAnalysisData={setAiAnalysisData}
          setAnalyzingIds={setAnalyzingIds}
          filterPos={filterPos}
          setFilterPos={setFilterPos}
          filterLearned={filterLearned}
          setFilterLearned={setFilterLearned}
          filterLevel={filterLevel}
          setFilterLevel={setFilterLevel}
          isLoading={isLoading}
          sourcesVisibility={sourcesVisibility}
          triggerNotification={triggerNotification}
          playVoice={playVoice}
          accent={accent}
          setAccent={setAccent}
          dbError={dbError}
          campusGrade={campusGrade}
          setCampusGrade={setCampusGrade}
          campusSemester={campusSemester}
          setCampusSemester={setCampusSemester}
          campusStage={campusStage}
          setCampusStage={setCampusStage}

          user={user}
          schoolId={schoolId}
          gradeId={gradeId}
          logDebug={logDebug}
        />
      )}
      {subTab === 'review' && <ReviewMode words={todayReview} updateWord={updateWord} incrementWordCount={incrementWordCount} playVoice={playVoice} accent={accent} commonalityMap={commonalityMap} />}
      {subTab === 'quiz' && <QuizMode words={mergedWords} updateWord={updateWord} setWords={setWords} incrementWordCount={incrementWordCount} playVoice={playVoice} accent={accent} addWords={addWords} triggerNotification={triggerNotification} commonalityMap={commonalityMap} />}
      {subTab === 'import' && <ImportTab addWords={addWords} syncFromGAS={syncFromGAS} isSyncing={isSyncing} isAdmin={isAdmin} currentSet={currentSet} />}
    </div>

    {/* Debug Panel (Fixed to bottom if active) */}
    {isDebugMode && (
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900 text-green-400 font-mono text-xs z-50 shadow-2xl border-t border-slate-700 max-h-[50vh] flex flex-col">
        <div className="flex items-center justify-between p-2 bg-slate-800 border-b border-slate-700 cursor-pointer" onClick={() => setIsLogOpen(!isLogOpen)}>
          <div className="flex items-center gap-2 text-slate-300 font-bold">
            <Terminal size={14} /> 系統偵錯日誌 (Debug Logs)
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); setDebugLogs([]); }} className="text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-700 text-[10px]">清空</button>
            {isLogOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronUp size={16} className="text-slate-400" />}
          </div>
        </div>
        {isLogOpen && (
          <div className="p-2 overflow-y-auto flex-1 space-y-2 bg-slate-950/50 p-3">
            {debugLogs.length === 0 ? (
              <p className="text-slate-500 italic">等待操作中...</p>
            ) : (
              debugLogs.map((log, idx) => (
                <div key={idx} className="border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500">[{log.time}]</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${log.type === 'ERROR' ? 'bg-rose-500/20 text-rose-400' :
                      log.type === 'SUCCESS' ? 'bg-emerald-500/20 text-emerald-400' :
                        log.type === 'FETCH' ? 'bg-blue-500/20 text-blue-400' :
                          'bg-slate-700 text-slate-300'
                      }`}>{log.type}</span>
                    <span className="font-bold text-slate-200">{log.title}</span>
                  </div>
                  {log.data && (
                    <pre className="text-[10px] text-green-300 overflow-x-auto whitespace-pre-wrap bg-slate-900 p-2 rounded">
                      {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    )}

    {/* 🚀 頂級通知元件 (Premium Toast Notification) - Portal 至 Root 確保定位準確 */}
    {notification && createPortal(
      <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[9999] animate-toast-pop-up filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)] select-none pointer-events-none w-[90%] max-w-md">
        <div className={`
            relative px-5 py-4 md:px-8 md:py-5 rounded-[32px] 
            border backdrop-blur-2xl flex items-center gap-4 md:gap-6
            ${notification.type === 'error'
            ? 'bg-rose-50/90 border-rose-200/50 text-rose-700 dark:bg-rose-950/80 dark:border-rose-500/30'
            : 'bg-white/90 border-emerald-200/50 text-emerald-800 dark:bg-zinc-900/90 dark:border-emerald-500/30'
          }
            shadow-2xl
          `}>
          {/* 動態發光背景 */}
          <div className={`absolute -inset-4 rounded-[40px] opacity-20 blur-2xl -z-10 ${notification.type === 'error' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>

          <div className={`
              flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-2xl shadow-inner shrink-0
              ${notification.type === 'error' ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-500' : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500'}
            `}>
            {notification.type === 'error' ? <XCircle size={24} /> : <CheckCircle2 size={24} className="animate-bounce-soft" />}
          </div>

          <div className="flex flex-col min-w-0">
            <div className="text-[15px] md:text-[17px] font-black tracking-tight leading-none mb-1 text-slate-900 dark:text-white truncate">
              {notification.title}
            </div>
            <div className="text-[12px] md:text-[13px] font-bold text-slate-500 dark:text-slate-400 opacity-90 leading-tight">
              {notification.message}
            </div>
          </div>

          {/* 隱藏裝飾用的底端進度條 */}
          <div className="absolute bottom-0 left-8 right-8 h-1 bg-slate-100/50 dark:bg-white/5 rounded-full overflow-hidden mb-[-2px]">
            <div className={`h-full animate-progress-shrink ${notification.type === 'error' ? 'bg-rose-400' : 'bg-emerald-400'}`}></div>
          </div>
        </div>
      </div>,
      document.body
    )}
  </div>
);
}


// ═══════════════════════════════════════════════════════════════════════════════
// WORD CARD (Optimized for Mobile Performance)
// ═══════════════════════════════════════════════════════════════════════════════
const WordCard = React.memo(({
  word, idx, currentSet, savedWords, setSavedWords, addWords,
  setDetailedWordId, handleSpeak, playVoice, accent, posColors,
  isBatchMode, selectedBatch, setSelectedBatch, deleteWord, isAdmin
}) => {
  const currentMeanings = getMeanings(word);
  const safeId = word.id;

  return (
    <div
      style={{ animationDelay: `${Math.min(idx * 40, 600)}ms` }}
      className="group flex flex-col bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[32px] overflow-hidden transition-all duration-500 shadow-sm hover:shadow-xl hover:-translate-y-1.5 active:scale-[0.97] animate-fadeIn transform-gpu"
    >
      <div
        className="flex items-center gap-5 px-6 py-[22px] cursor-pointer relative"
        onClick={() => {
          handleSpeak(null, word.word);
          setDetailedWordId(word.id);
        }}
      >
        {isBatchMode && (
          <div className="shrink-0 mr-1 animate-pop-in">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const next = new Set(selectedBatch);
                if (next.has(safeId)) next.delete(safeId);
                else next.add(safeId);
                setSelectedBatch(next);
              }}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedBatch.has(safeId) ? 'bg-indigo-500 border-indigo-500 text-white scale-110 shadow-lg' : 'border-slate-300 dark:border-slate-600'}`}
            >
              {selectedBatch.has(safeId) && <Check size={14} strokeWidth={3} />}
            </button>
          </div>
        )}
        <div className="flex-1 min-w-0 relative z-10 space-y-2">
          {/* Header: Word + Favorite */}
          <div className="flex items-center justify-between">
            <span className="text-[24px] font-black text-slate-900 dark:text-white tracking-tight">
              {word.word}
            </span>
            <div className="flex items-center gap-1 sm:gap-2 text-slate-300">
              {currentSet !== 'Personal' ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (savedWords.has(safeId)) return;
                    setSavedWords(prev => new Set(prev).add(safeId));
                    addWords([word], 'Personal', false);
                  }}
                  className={`p-2 rounded-full transition-all active:scale-90 ${savedWords.has(safeId) ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-slate-300 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                >
                  <Heart size={22} className={savedWords.has(safeId) ? 'fill-current animate-heart-burst' : ''} />
                </button>
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`確定要刪除「${word.word}」嗎？`)) {
                      deleteWord(safeId);
                    }
                  }}
                  className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-full transition-all active:scale-90"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Badges: Tags + Audio */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border flex items-center gap-1 ${word.learned ? 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-500/10' : 'text-rose-600 bg-rose-50 border-rose-200 dark:text-rose-400 dark:bg-rose-500/10'}`}>
              {word.learned ? <CheckCircle2 size={11} strokeWidth={2.5} /> : <BookOpen size={11} strokeWidth={2.5} />}
              {word.learned ? '已學' : '未學'}
            </span>
            {Array.from(new Set(currentMeanings.flatMap(m => (m.pos || '').split(/[,/、\s]+/).map(p => p.trim().toLowerCase()).filter(Boolean)))).map((pos, i) => (
              <span key={i} className={`text-[10px] font-black px-2 py-0.5 rounded-lg border leading-none ${posColors[pos] || 'text-gray-500 bg-gray-500/10 border-gray-100'}`}>
                {pos}
              </span>
            ))}
            {word.tags?.map(t => (
              <span key={t} className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">#{t}</span>
            ))}
            <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, accent); }} className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-100 dark:bg-white/5 rounded-xl transition-all">
              <Volume2 size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, accent, 0.4); }} className="p-1.5 bg-amber-50 dark:bg-amber-500/10 rounded-xl transition-all active:scale-90">🐢</button>
          </div>

          {/* Meanings - Polysemy Display */}
          <div className="space-y-1.5 mt-2">
            {Object.entries(currentMeanings.reduce((acc, current) => {
              const { pos, meaning } = current;
              const key = pos || 'n.';
              if (!acc[key]) acc[key] = [];
              if (meaning) acc[key].push(meaning);
              return acc;
            }, {})).map(([posStr, meanings], i) => (
              <div key={posStr} className="flex items-baseline gap-2 pl-1 group/meaning">
                <div className="flex items-baseline shrink-0 w-max min-w-[32px]">
                  {posStr.split(/[,/、\s]+/).filter(Boolean).map((p, idx, arr) => {
                    const normPos = normalizePOS(p);
                    return (
                      <React.Fragment key={idx}>
                        <span className={`text-[11px] font-black uppercase ${posColors[normPos]?.split(' ')[0] || 'text-slate-400'}`}>
                          {p}
                        </span>
                        {idx < arr.length - 1 && <span className="text-[11px] font-black text-slate-300 mx-0.5">/</span>}
                      </React.Fragment>
                    );
                  })}
                </div>
                <p className="text-[14px] font-bold text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                  {meanings.join(', ')}
                </p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 pt-3 mt-1 text-[10px] font-bold text-slate-400 border-t border-slate-100/50 dark:border-white/5">
            <span className="flex items-center gap-1"><Tag size={10} /> {word.level || '1'} 級</span>
            {word.serialNumber && <span>#{word.serialNumber}</span>}
            {word.updatedAt && (
              <span className="ml-auto opacity-60">
                {new Date(word.updatedAt?.seconds * 1000 || word.updatedAt).toLocaleDateString('zh-TW')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════════
// WORD BANK
// ═══════════════════════════════════════════════════════════════════════════════
const WordBank = ({
  words, search, setSearch, updateWord, deleteWord, addWords,
  currentSet, setCurrentSet, isAdmin, handleExportIG,
  detailedWordId, setDetailedWordId, analyzingIds, aiAnalysisData,
  setAiAnalysisData, setAnalyzingIds, filterPos, setFilterPos,
  filterLearned, setFilterLearned,
  triggerNotification, playVoice, accent, setAccent, dbError,
  campusGrade, setCampusGrade,
  campusSemester, setCampusSemester,
  campusStage, setCampusStage,

  user, schoolId, gradeId,
  filterLevel, setFilterLevel,
  isLoading, sourcesVisibility,
  logDebug
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeanings, setNewMeanings] = useState([{ pos: 'n.', meaning: '' }]);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [newTags, setNewTags] = useState(''); // 新增標籤輸入狀態

  const [filterTag, setFilterTag] = useState('all');
  const [filterTagMeaning, setFilterTagMeaning] = useState('');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(new Set());
  const [showFilters, setShowFilters] = useState(true);

  // 記錄本次 session 已經點擊加入收藏的單字 ID，用於即時顯示動畫與狀態
  const [savedWords, setSavedWords] = useState(new Set());

  // 🌟 單字庫專屬的拖動 (Drag to Scroll) 邏輯
  const scrollRefSet = useRef(null);
  const [dragState, setDragState] = useState({ isDragging: false, startX: 0, scrollLeft: 0 });
  const onDragStart = (e) => {
    setDragState({ isDragging: true, startX: e.pageX - scrollRefSet.current.offsetLeft, scrollLeft: scrollRefSet.current.scrollLeft });
  };
  const onDragMove = (e) => {
    if (!dragState.isDragging) return;
    e.preventDefault();
    scrollRefSet.current.scrollLeft = dragState.scrollLeft - (e.pageX - scrollRefSet.current.offsetLeft - dragState.startX) * 2;
  };

  // 動態萃取所有不重複的標籤及其意義 (從 aiAnalysis 中反查)
  const ObjectMaps = useMemo(() => {
    const tagsSet = new Set();
    const tag2Meaning = new Map();
    const meaning2Tags = new Map();

    words.forEach(w => {
      if (w.tags && Array.isArray(w.tags)) w.tags.forEach(t => tagsSet.add(t));

      // 若單字已存在 AI 解析，從中萃取字首/字根/字尾的意思
      if (w.aiAnalysis && !w.aiAnalysis.startsWith('ERROR')) {
        const { breakdown } = parseMorphology(w.aiAnalysis);
        if (breakdown) {
          breakdown.forEach(p => {
            const cleanValue = p.value.replace(/[^a-zA-Z]/g, '').toLowerCase();
            const tag = `${p.label.toLowerCase()}:${cleanValue}`;
            if (p.meaning) {
              // 清理多餘的括號以便精準分組 (例如: "前/預先")
              const m = p.meaning.replace(/[(（].*?[)）]/g, '').trim();
              if (!tag2Meaning.has(tag)) tag2Meaning.set(tag, m);
              if (!meaning2Tags.has(m)) meaning2Tags.set(m, new Set());
              meaning2Tags.get(m).add(tag);
            }
          });
        }
      }
    });
    return {
      availableTags: Array.from(tagsSet).sort(),
      tagMeaningMap: tag2Meaning,
      meaningToTagsMap: meaning2Tags
    };
  }, [words]);

  const { availableTags, tagMeaningMap, meaningToTagsMap } = ObjectMaps;

  const filtered = useMemo(() => {
    let list = words;
    const searchStr = search.trim().toLowerCase();

    // 🚀 本地搜尋增強：同時比對英文單字與中文含意
    if (searchStr) {
      list = list.filter(w =>
        (w.word || '').toLowerCase().includes(searchStr) ||
        getMeanings(w).some(m => (m.meaning || '').toLowerCase().includes(searchStr))
      );
    }

    if (filterPos !== 'all') list = list.filter(w => getMeanings(w).some(m => (m.pos || '').toLowerCase().includes(filterPos.toLowerCase())));

    // 🚀 強化版標籤篩選：若點選的字根與其他字根意義相同 (如 dic/dict)，合併顯示與篩選
    if (filterTag !== 'all') {
      const currentMeaning = tagMeaningMap.get(filterTag) || filterTagMeaning;
      // 找出所有意義相同的標籤群組 ( synonyms )
      const tagsGroup = currentMeaning && meaningToTagsMap.has(currentMeaning)
        ? Array.from(meaningToTagsMap.get(currentMeaning))
        : [filterTag];

      list = list.filter(w => w.tags && tagsGroup.some(t => w.tags.includes(t)));
    }

    // 🚀 已學/未學篩選
    if (filterLearned === 'learned') {
      list = list.filter(w => w.learned === true);
    } else if (filterLearned === 'unlearned') {
      list = list.filter(w => w.learned !== true);
    }

    // 🚀 級別篩選
    if (filterLevel !== 'all') {
      list = list.filter(w => String(w.level) === filterLevel);
    }

    return list;
  }, [words, search, filterPos, filterTag, filterLearned, filterLevel]);

  const handleAiAnalyze = async (id, word) => {
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const targetWord = words.find(w => w.id === id); // 改用 words (其為傳入的 mergedWords) 確保包含個人收藏
      const meaningsStr = targetWord ? getMeanings(targetWord).map(m => `(${m.pos}) ${m.meaning}`).join(', ') : '';

      const prompt = `你是一位專業的英文語源學老師與記憶專家。請針對單字 "${word}" ${meaningsStr ? `(包含常見意思：${meaningsStr}) ` : ''}提供結構化解析。
請務必遵守以下規範：
1. **單字拆解**：請在開頭以 Prefix, Root, Suffix 格式拆解單字。
2. **一字多義與多詞性**：若該單字有多種詞性或截然不同的重要意思，請務必詳細列出。
3. **重點標記**：在解析內容中使用 **粗體** 標註核心關鍵字。
4. **結構化區段**：請嚴格按照順序使用以下 ### 標題。

   ### [單字構造拆解]
   (格式範例: **Prefix**: un- (不) + **Root**: break (打破) + **Suffix**: -able (能夠)。若無字首字尾請寫 **Root**: word (意思))
   ### [一字多義與多詞性]
   (條列式說明單字的不同詞性與對應意義，包含常見的衍生用法)
   ### [大腦記憶法]
   (提供生動好記的諧音、聯想或故事記憶法)
   ### [語源與字根詳解]
   (解說歷史來源與字根演變)
   ### [實戰例句與搭配詞]
   (針對主要詞性提供 2 個進階例句，以及必考搭配詞)

請用親切的繁體中文撰寫，排版清晰條理分明，直接回傳 Markdown 內容，不要有任何問候語。`;

      const response = await fetchAI(prompt);
      if (!response) throw new Error('API 回傳為空');

      // 1. 立即更新本地快取 (確保使用者立刻看到內容)
      setAiAnalysisData(prev => ({ ...prev, [id]: response }));

      // 🔍 🚀 統一形態解析並提取標籤 (Prefix, Root, Suffix) 與結構化數據
      const { tags: generatedTags, breakdown } = parseMorphology(response);
      const existingTags = targetWord?.tags || [];
      const mergedTags = Array.from(new Set([...existingTags, ...generatedTags]));

      const cleanV = (v) => v ? v.replace(/^-|-$/g, '').trim() : ''; // 清除前後連字號
      const prefix = cleanV(breakdown?.find(p => p.label === 'Prefix')?.value);
      const root = cleanV(breakdown?.find(p => p.label === 'Root')?.value);
      const suffix = cleanV(breakdown?.find(p => p.label === 'Suffix')?.value);

      // 2. 嘗試同步至雲端 (獨立 try-catch，避免同步失敗毀掉已生成的內容)
      try {
        const existingAnalysis = targetWord.aiAnalysis;
        // 如果是管理者或是目前沒有有效解析，才進行雲端寫入
        if (isAdmin || !existingAnalysis || existingAnalysis.startsWith('ERROR:')) {
          await updateWord(id, {
            aiAnalysis: response,
            aiAnalysisAuthor: user?.displayName || '熱心同學',
            aiAnalysisAuthorId: user?.uid || 'guest',
            tags: mergedTags,
            prefix,
            root,
            suffix
          });
          logDebug('SUCCESS', 'AI 解析與拆解已自動同步至雲端庫', { word: response.substring(0, 20) + '...' });
        }
      } catch (saveErr) {
        console.warn('⚠️ 雲端備份失敗 (權限限制):', saveErr.message);
        logDebug('WARNING', '寫入權限受限，解析內容僅暫存於本次視窗', { error: saveErr.message });
      }

      // 觸發全局通知
      if (generatedTags.length > 0) {
        triggerNotification('解析完成', `已自動標記: ${generatedTags.join(', ')}`);
      }
    } catch (e) {
      console.error('❌ AI 生成失敗:', e);
      setAiAnalysisData(prev => ({ ...prev, [id]: `ERROR:AI 生成失敗: ${e.message}` }));
      triggerNotification('解析失敗', 'AI 伺服器連線失敗', 'error');
    } finally {
      setAnalyzingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  const handleAiAutoFill = async () => {
    if (!newWord.trim()) return triggerNotification('請先輸入單字', '需要輸入單字才能進行 AI 填入', 'error');

    setIsAutoFilling(true);
    try {
      const prompt = `你是一個專業的高中英文老師。請提供單字 "${newWord.trim()}" 的所有常見中文解釋與對應詞性。
  請嚴格以 JSON 陣列格式回傳，不要有任何 Markdown 或其他文字：
  [{"meaning": "繁體中文解釋", "pos": "詞性縮寫(務必帶點，如 n./v./adj./adv./prep./conj./abbr./phr.)"}]`;

      const response = await fetchAI(prompt);
      if (response) {
        const match = response.match(/\[[\s\S]*\]/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setNewMeanings(parsed.map(p => ({
              pos: normalizePOS(p.pos),
              meaning: p.meaning || ''
            })));
          }
          triggerNotification('AI 填入成功', '已自動帶入解釋與詞性');
        } else {
          throw new Error('無法解析格式');
        }
      } else {
        throw new Error('API 無回應');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('自動填入失敗', 'AI 伺服器連線失敗，請稍後再試', 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleManualAdd = () => {
    const validMeanings = newMeanings.filter(m => m.meaning.trim() !== '');
    if (!newWord.trim() || validMeanings.length === 0) {
      alert('請輸入單字與至少一個解釋');
      return;
    }
    const tagsArray = newTags.split(/[,，\s]+/).filter(t => t.trim() !== ''); // 支援空格或逗號分隔
    const wordObj = { word: newWord.trim(), meanings: validMeanings, level: 1, source: 'Personal', tags: tagsArray };
    const target = isAdmin ? currentSet : 'Personal';
    addWords([wordObj], target, false);
    if (!isAdmin && currentSet !== 'Personal') setCurrentSet('Personal');
    setNewWord(''); setNewMeanings([{ pos: 'n.', meaning: '' }]); setNewTags('');
    setShowAdd(false);
  };

  // 批次操作函式
  const handleBatchDelete = () => {
    if (selectedBatch.size === 0) return;
    if (!window.confirm(`確定要刪除選中的 ${selectedBatch.size} 個單字嗎？`)) return;
    selectedBatch.forEach(id => deleteWord(id));
    setSelectedBatch(new Set());
    setIsBatchMode(false);
    triggerNotification('批次刪除', `已成功刪除 ${selectedBatch.size} 個單字`);
  };

  const handleBatchSave = () => {
    if (selectedBatch.size === 0) return;
    const wordsToSave = words.filter(w => selectedBatch.has(w.id));
    addWords(wordsToSave, 'Personal', false);
    setSelectedBatch(new Set());
    setIsBatchMode(false);
    triggerNotification('批次收藏', `已將 ${wordsToSave.length} 個單字加入個人收藏`);
  };

  const handleSpeak = (e, text) => {
    if (e) e.stopPropagation();
    playVoice(text, accent);
  };

  const posColors = {
    'n.': 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10 border-blue-100 dark:border-blue-500/20',
    'v.': 'text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20',
    'adj.': 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
    'adv.': 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20',
    'prep.': 'text-teal-600 bg-teal-50 dark:text-teal-400 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20',
    'conj.': 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20',
    'pron.': 'text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20',
    'int.': 'text-pink-600 bg-pink-50 dark:text-pink-400 dark:bg-pink-500/10 border-pink-100 dark:border-pink-500/20',
    'phr.': 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20',
    'abbr.': 'text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10 border-gray-100 dark:border-gray-500/20',
  };

  const posList = useMemo(() => {
    const posSet = new Set(['all']);
    words.forEach(w => getMeanings(w).forEach(m => {
      if (m.pos) {
        m.pos.split(/[,/、\s]+/).forEach(p => {
          let pt = p.trim().toLowerCase();
          if (pt && !pt.endsWith('.')) pt += '.';
          if (pt) posSet.add(pt);
        });
      }
    }));
    return Array.from(posSet).sort((a, b) => a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b));
  }, [words]);

  return (
    <div className="space-y-4">
      {/* 1. 單字來源切換 (精簡佈局 & 動態顯示) */}
      <div className="flex flex-wrap gap-2 px-1">
        {[
          { id: '6000_words', label: '6000字庫', icon: <BookOpen size={14} /> },
          { id: 'Campus', label: '校務單字', icon: <School size={14} /> },
          { id: 'Personal', label: '個人收藏', icon: <Heart size={14} /> }
        ].map(set => (
          <button key={set.id}
            onClick={() => {
              if (set.id === 'Campus' && !user) {
                triggerNotification('權限受限', '「校園單字」僅限登入使用者，請先登入。', 'error');
                return;
              }
              setCurrentSet(set.id);
            }}
            className={`flex-1 min-w-[80px] sm:min-w-[120px] flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] font-black text-[12px] transition-all duration-500 ease-spring-smooth active:scale-90 shadow-sm border ${currentSet === set.id ? 'bg-slate-900 dark:bg-zinc-800 text-white border-transparent shadow-lg shadow-slate-900/20' : 'bg-white/40 dark:bg-zinc-900/40 text-slate-500 dark:text-gray-400 border-white/60 dark:border-white/10 hover:bg-white/60 dark:hover:bg-white/10 hover:translate-y-[-1px]'} ${(set.id === 'Campus' && !user) ? 'opacity-70 grayscale-[0.5]' : ''}`}>
            <span className={`transition-transform duration-500 ${currentSet === set.id ? 'scale-110 rotate-12' : ''}`}>{set.icon}</span>
            {set.label}
            {set.id === 'Campus' && !user && <Lock size={12} className="ml-0.5 text-slate-400 dark:text-slate-500" />}
          </button>
        ))}
      </div>

      {/* 校務/校園單字的細分選擇 (段考、學期) */}
      {currentSet === 'Campus' && (
        <div className="animate-fadeIn px-1 mt-1">
          {!user ? (
            <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-6 flex flex-col items-center justify-center gap-2 text-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400">
                <Lock size={20} />
              </div>
              <p className="text-[13px] font-black text-slate-500 dark:text-slate-400">內容已鎖定</p>
              <p className="text-[11px] font-bold text-slate-400">請先登入後方可切換年級與範圍</p>
            </div>
          ) : (
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-white/5 p-2.5 space-y-2">
              {/* 第一排：年級 + 學期 */}
              <div className="flex items-center gap-2">
                <div className="flex flex-1 bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl">
                  {[1, 2, 3].map(g => (
                    <button key={g} onClick={() => setCampusGrade(`grade_${g}`)}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] font-black text-center transition-all ${campusGrade === `grade_${g}` ? 'bg-white dark:bg-zinc-700 text-emerald-600 shadow-sm' : 'text-slate-400'}`}>
                      高{g === 1 ? '一' : g === 2 ? '二' : '三'}
                    </button>
                  ))}
                </div>
                <div className="w-px h-5 bg-slate-200 dark:bg-white/10 shrink-0" />
                <div className="flex bg-slate-100 dark:bg-white/5 p-0.5 rounded-xl">
                  {['up', 'down'].map(s => (
                    <button key={s} onClick={() => setCampusSemester(s)}
                      className={`px-3 py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap transition-all ${campusSemester === s ? 'bg-white dark:bg-zinc-700 text-blue-600 shadow-sm' : 'text-slate-400'}`}>
                      {s === 'up' ? '上學期' : '下學期'}
                    </button>
                  ))}
                </div>
              </div>
              {/* 第二排：段考 */}
              <div className="flex gap-1.5">
                {[1, 2, 3].map(s => (
                  <button key={s} onClick={() => setCampusStage(`stage_${s}`)}
                    className={`flex-1 py-2 rounded-xl text-[11px] font-black text-center transition-all ${campusStage === `stage_${s}` ? 'bg-indigo-500 text-white shadow-sm' : 'bg-slate-100 dark:bg-white/5 text-slate-400'}`}>
                    {s === 1 ? '第一段' : s === 2 ? '第二段' : '期末考'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}



      {/* 2. 搜尋 + 動作合併列 */}
      <div className="flex items-center gap-1.5 px-1 relative z-20">
        <div className="flex-1 flex items-center gap-1.5 flex-wrap bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border border-white/40 dark:border-white/10 rounded-[18px] px-2.5 py-1.5 shadow-inner focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all">
          {/* 隨機按鈕 */}
          <button onClick={() => { if (words.length === 0) return; const randomWord = words[Math.floor(Math.random() * words.length)]; setSearch(randomWord.word); }}
            className="p-1.5 rounded-lg text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all active:scale-90 shrink-0" title="隨機單字">
            <Shuffle size={15} />
          </button>

          {/* 字根/標籤過濾 Chip (內嵌在搜尋框內) */}
          {filterTag !== 'all' && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black whitespace-nowrap shrink-0 ${filterTag.startsWith('prefix') ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
              : filterTag.startsWith('root') ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'
                : filterTag.startsWith('suffix') ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                  : 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
              }`}>
              {filterTag.includes(':') ? (() => {
                const [type, val] = filterTag.split(':');
                return `${type === 'prefix' ? '前綴' : type === 'root' ? '字根' : '後綴'}: ${val}`;
              })() : filterTag}
              <button onClick={() => { setFilterTag('all'); setFilterTagMeaning(''); }} className="ml-0.5 hover:text-red-500 transition-colors">
                <X size={10} />
              </button>
            </span>
          )}

          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder={filterTag !== 'all' ? '在篩選結果中搜尋...' : '搜尋單字...'}
            className="flex-1 min-w-[60px] bg-transparent text-[13px] font-bold text-[var(--text-primary)] outline-none placeholder:text-slate-400 py-0.5"
          />

          {/* 字根標籤下拉 */}
          {availableTags.length > 0 && (
            <div className="relative group">
              <button className={`p-1.5 rounded-lg transition-all ${filterTag !== 'all' ? 'bg-indigo-100 text-indigo-500 dark:bg-indigo-500/20' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Tag size={13} />
              </button>
              <div className="absolute right-0 top-full mt-1 w-[280px] max-h-[240px] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl p-2 z-50 hidden group-focus-within:block hover:block">
                <button onClick={() => { setFilterTag('all'); setFilterTagMeaning(''); }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black transition-all mb-0.5 ${filterTag === 'all' ? 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                  全部標籤
                </button>
                {availableTags.map(t => {
                  const isMorph = t.includes(':');
                  const [type, val] = isMorph ? t.split(':') : [null, t];
                  let label = t;
                  let dotColor = 'bg-amber-400';
                  if (isMorph) {
                    if (type === 'prefix') { label = `前綴: ${val}`; dotColor = 'bg-blue-400'; }
                    else if (type === 'root') { label = `字根: ${val}`; dotColor = 'bg-rose-400'; }
                    else if (type === 'suffix') { label = `後綴: ${val}`; dotColor = 'bg-emerald-400'; }
                  }
                  return (
                    <button key={t} onClick={() => setFilterTag(t)}
                      className={`w-full text-left px-3 py-2 rounded-xl text-[11px] font-black transition-all flex items-center gap-2 ${filterTag === t ? 'bg-slate-100 dark:bg-white/10 text-slate-800 dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5'}`}>
                      <span className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 口音切換 */}
          <button onClick={() => setAccent(a => a === 'US' ? 'UK' : 'US')}
            className="p-1 rounded-lg text-[13px] font-black text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all active:scale-90 shrink-0" title="切換口音">
            {accent === 'US' ? '🇺🇸' : '🇬🇧'}
          </button>
        </div>
      </div>

      {/* 動作按鈕列 */}
      <div className="flex gap-2 px-1">
        <button onClick={() => setShowAdd(!showAdd)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[14px] bg-white/40 dark:bg-zinc-900/40 border border-white/60 dark:border-white/10 active:scale-95 transition-all text-[11px] font-black ${showAdd ? 'text-slate-400' : 'text-emerald-500'}`}>
          <Plus size={14} className={showAdd ? 'rotate-45 transition-transform' : 'transition-transform'} /> 新增
        </button>
        <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedBatch(new Set()); }}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[14px] bg-white/40 dark:bg-zinc-900/40 border border-white/60 dark:border-white/10 active:scale-95 transition-all text-[11px] font-black ${isBatchMode ? 'text-indigo-500' : 'text-slate-400'}`}>
          <CheckCircle2 size={14} /> 批次
        </button>
        <button onClick={() => setShowFilters(!showFilters)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[14px] border active:scale-95 transition-all text-[11px] font-black relative ${showFilters || filterPos !== 'all' || filterLearned !== 'all' || filterLevel !== 'all'
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            : 'bg-white/40 dark:bg-zinc-900/40 border-white/60 dark:border-white/10 text-slate-400'}`}>
          <SlidersHorizontal size={14} /> {showFilters ? '收合' : '篩選'}
          {!showFilters && (filterPos !== 'all' || filterLearned !== 'all' || filterLevel !== 'all') && (
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white dark:border-zinc-900" />
          )}
        </button>
        {isBatchMode && (
          <button onClick={() => {
            if (selectedBatch.size === filtered.length) {
              setSelectedBatch(new Set());
            } else {
              setSelectedBatch(new Set(filtered.map(w => w.id)));
            }
          }} className="px-5 py-2.5 rounded-full text-[13px] font-black transition-all bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 border border-indigo-200 dark:border-indigo-500/20 active:scale-95 shadow-sm">
            {selectedBatch.size === filtered.length ? '取消全選' : '全選'}
          </button>
        )}
      </div>

      {/* 啟用中的篩選摘要 */}
      {(filterPos !== 'all' || filterLearned !== 'all' || filterLevel !== 'all') && (
        <div className="flex items-center gap-1.5 px-2 animate-fadeIn mb-2">
          <span className="text-[10px] font-black text-slate-400">篩選作用中：</span>
          <div className="flex flex-wrap gap-1.5">
            {filterPos !== 'all' && <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-md text-[10px] font-black">{filterPos}</span>}
            {filterLearned !== 'all' && <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 rounded-md text-[10px] font-black">{filterLearned === 'learned' ? '已學' : '未學'}</span>}
            {filterLevel !== 'all' && <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded-md text-[10px] font-black">L{filterLevel}</span>}
          </div>
          <button onClick={() => { setFilterPos('all'); setFilterLearned('all'); setFilterLevel('all'); }}
            className="ml-auto text-[10px] font-black text-rose-400 hover:text-rose-500 transition-colors active:scale-95 px-2 py-1">清除</button>
        </div>
      )}

      {/* 手動新增表單 */}
      {showAdd && (
        <div className="mx-1 p-6 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl rounded-[32px] border border-emerald-200 dark:border-emerald-500/20 shadow-xl animate-slide-up-fade">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2"><div className="w-2 h-6 bg-emerald-500 rounded-full" /> 手動新增單字</h3>
            <button onClick={() => setShowAdd(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input type="text" placeholder="單字 (例: perspective)" value={newWord} onChange={e => setNewWord(e.target.value)}
                className="w-full bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 text-[18px] font-black outline-none focus:border-emerald-400 transition-all text-[var(--text-primary)] pr-[110px]" />
              <button onClick={handleAiAutoFill} disabled={isAutoFilling || !newWord.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 rounded-[16px] text-[12px] font-black disabled:opacity-50">
                {isAutoFilling ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />} AI 填寫
              </button>
            </div>
            <div className="space-y-3">
              {newMeanings.map((m, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3">
                  <select value={m.pos} onChange={e => { const arr = [...newMeanings]; arr[idx].pos = e.target.value; setNewMeanings(arr); }}
                    className="w-full sm:w-[120px] bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[20px] px-4 py-3 font-black outline-none focus:border-emerald-400 transition-all text-[var(--text-primary)]">
                    <option value="n.">n. 名詞</option><option value="v.">v. 動詞</option><option value="adj.">adj. 形容詞</option><option value="adv.">adv. 副詞</option><option value="prep.">prep. 介系</option><option value="phr.">phr. 片語</option>
                  </select>
                  <div className="flex-1 flex gap-2">
                    <input type="text" placeholder="中文解釋" value={m.meaning} onChange={e => { const arr = [...newMeanings]; arr[idx].meaning = e.target.value; setNewMeanings(arr); }}
                      className="flex-1 bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[20px] px-6 py-3 font-black outline-none focus:border-emerald-400 transition-all text-[var(--text-primary)]" />
                    {newMeanings.length > 1 && <button onClick={() => setNewMeanings(newMeanings.filter((_, i) => i !== idx))} className="shrink-0 p-3 bg-rose-50 text-rose-500 rounded-xl"><Trash2 size={18} /></button>}
                  </div>
                </div>
              ))}
              <button onClick={() => setNewMeanings([...newMeanings, { pos: 'n.', meaning: '' }])} className="text-emerald-500 font-bold text-[13px] self-start px-2 py-1">+ 新增詞性解釋</button>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <input type="text" placeholder="標籤 (用空格分隔，例: L1 必修)" value={newTags} onChange={e => setNewTags(e.target.value)}
                className="flex-1 bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 font-black text-[14px] outline-none transition-all text-[var(--text-primary)]" />
              <button onClick={handleManualAdd} className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">確認儲存</button>
            </div>
          </div>
        </div>
      )}
      {/* 單字卡片列表網格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 pt-2 px-1 min-h-[400px]">
        {isLoading && filtered.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white/50 dark:bg-zinc-900/40 border border-white/60 dark:border-white/10 rounded-[32px] p-6 space-y-4 animate-pulse">
              <div className="w-1/2 h-8 bg-slate-100 dark:bg-zinc-800 rounded-xl" />
              <div className="flex gap-2"><div className="w-12 h-4 bg-slate-100 dark:bg-zinc-800 rounded-lg" /><div className="w-12 h-4 bg-slate-100 dark:bg-zinc-800 rounded-lg" /></div>
              <div className="space-y-2"><div className="w-full h-4 bg-slate-100 dark:bg-zinc-800 rounded-lg" /><div className="w-3/4 h-4 bg-slate-100 dark:bg-zinc-800 rounded-lg" /></div>
            </div>
          ))
        ) : filtered.length === 0 ? (
          <div className="col-span-full flex flex-col items-center py-24 opacity-50 text-center px-6 animate-fadeIn">
            <div className="w-24 h-24 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-6"><Search size={48} className="text-slate-300" /></div>
            <p className="font-black text-slate-500 dark:text-slate-400 text-lg mb-2">找不到相關單字</p>
            <p className="text-sm font-bold text-slate-400">目前設定的標籤或搜尋關鍵字無相符內容</p>
            <button onClick={() => { setSearch(''); setFilterTag('all'); setFilterPos('all'); setFilterLearned('all'); setFilterLevel('all'); }} className="mt-8 px-8 py-3 bg-indigo-500 text-white rounded-[22px] font-black text-sm active:scale-95 transition-all shadow-xl shadow-indigo-500/20">清除所有條件</button>
          </div>
        ) : (
          filtered.map((w, idx) => (
            <WordCard
              key={w.id}
              word={w}
              idx={idx}
              currentSet={currentSet}
              savedWords={savedWords}
              setSavedWords={setSavedWords}
              addWords={addWords}
              setDetailedWordId={setDetailedWordId}
              handleSpeak={handleSpeak}
              playVoice={playVoice}
              accent={accent}
              posColors={posColors}
              isBatchMode={isBatchMode}
              selectedBatch={selectedBatch}
              setSelectedBatch={setSelectedBatch}
              deleteWord={deleteWord}
              isAdmin={isAdmin}
            />
          ))
        )}
      </div>

      {/* 單字詳情彈窗 */}
      {detailedWordId && (
        <WordDetailOverlay
          word={filtered.find(w => w.id === detailedWordId) || words.find(w => w.id === detailedWordId)}
          analysis={aiAnalysisData[detailedWordId] || filtered.find(w => w.id === detailedWordId)?.aiAnalysis || words.find(w => w.id === detailedWordId)?.aiAnalysis}
          isAnalyzing={analyzingIds.has(detailedWordId)}
          handleAiAnalyze={handleAiAnalyze}
          currentSet={currentSet}
          isSaved={savedWords.has(detailedWordId)}
          onSave={() => setSavedWords(prev => new Set(prev).add(detailedWordId))}
          addWords={addWords}
          onClose={() => setDetailedWordId(null)}
          updateWord={updateWord}
          triggerNotification={triggerNotification}
          playVoice={playVoice}
          accent={accent}
          isAdmin={isAdmin}
          user={user}
          setSearch={setSearch}
          setFilterPos={setFilterPos}
          setFilterTag={setFilterTag}
          setFilterTagMeaning={setFilterTagMeaning}
          setCurrentSet={setCurrentSet}
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW MODE (Flashcards with SRS)
// ═══════════════════════════════════════════════════════════════════════════════
const ReviewMode = ({ words, updateWord, incrementWordCount, playVoice, accent, commonalityMap }) => {
  const [sessionWords, setSessionWords] = useState([]);
  const [initialized, setInitialized] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);
  const [startX, setStartX] = useState(null);
  const [offsetX, setOffsetX] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [results, setResults] = useState({ correct: 0, blurry: 0, wrong: 0 });
  const audioCtx = useRef(null);

  // --- 動畫用圓環狀態 ---
  const radius = 54;
  const stroke = 8;
  const circumference = 2 * Math.PI * radius;
  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  // 🚀 建立 Session Snapshot：避免複習過程中陣列長度縮水導致 Bug
  useEffect(() => {
    if (!initialized && words.length > 0) {
      setSessionWords([...words]);
      setInitialized(true);
    }
  }, [words, initialized]);

  // 觸發結算圓環動畫
  useEffect(() => {
    if (done) {
      const pct = Math.round((results.correct / sessionWords.length) * 100) || 0;
      const timeout = setTimeout(() => setAnimatedOffset(circumference - (pct / 100) * circumference), 150);
      return () => clearTimeout(timeout);
    } else {
      setAnimatedOffset(circumference);
    }
  }, [done, results.correct, sessionWords.length, circumference]);

  const playDing = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine'; // 880Hz 是清脆的 A5 音符
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
    } catch { }
  }, []);

  const playBuzzer = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; // 改用更柔和的三角波
      osc.frequency.setValueAtTime(250, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch { }
  }, []);

  // --- 防呆與空狀態處理 ---
  if (!initialized) {
    if (words.length === 0) {
      return (
        <div className="flex flex-col items-center py-20 text-center animate-slide-up-fade">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 size={40} className="text-emerald-500" />
          </div>
          <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">今日複習完成 🎉</h4>
          <p className="text-[13px] font-bold text-slate-400 max-w-[240px]">所有單字都已複習，明天再來！</p>
        </div>
      );
    }
    return null;
  }

  const current = sessionWords[idx];
  const currentMeanings = getMeanings(current);

  const handleRate = (quality) => {
    const weight = calculateSRSWeight(current, commonalityMap);
    const updated = calculateNextReview(current, quality, weight);
    updateWord(current.id, updated);
    setShowAnswer(false);
    incrementWordCount(); // 觸發單字統計

    if (quality === 5) {
      playDing();
      setShowConfetti(true);
      setResults(r => ({ ...r, correct: r.correct + 1 }));
      setTimeout(() => setShowConfetti(false), 1500); // 1.5秒後關閉紙花
    } else if (quality === 3) {
      setResults(r => ({ ...r, blurry: r.blurry + 1 }));
    } else if (quality === 1) {
      playBuzzer(); // 忘記時播放低沉音
      setResults(r => ({ ...r, wrong: r.wrong + 1 }));
    }

    if (idx + 1 >= sessionWords.length) setDone(true);
    else setIdx(idx + 1);
  };

  const handleDragStart = (clientX) => {
    if (!showAnswer) return;
    setStartX(clientX);
  };

  const handleDragMove = (clientX) => {
    if (!showAnswer || startX === null) return;
    setOffsetX(clientX - startX);
  };

  const handleDragEnd = () => {
    if (!showAnswer || startX === null) return;
    if (offsetX > 80) handleRate(5);
    else if (offsetX < -80) handleRate(1);
    setStartX(null);
    setOffsetX(0);
  };

  if (done) {
    const pct = Math.round((results.correct / sessionWords.length) * 100) || 0;
    return (
      <div className="flex flex-col items-center py-12 text-center animate-slide-up-fade relative">
        {pct >= 50 && <Confetti score={results.correct} total={sessionWords.length} />}

        {/* 環形進度圖表 */}
        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-slate-100 dark:text-white/5" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              strokeWidth={stroke} strokeLinecap="round"
              stroke={pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#f43f5e'}
              strokeDasharray={circumference}
              strokeDashoffset={animatedOffset}
              className="transition-all duration-[1500ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
            />
          </svg>
          <div className="absolute inset-3 rounded-full bg-white/50 dark:bg-black/20 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.2)] border border-white/50 dark:border-white/10 flex flex-col items-center justify-center pointer-events-none">
            <span className={`text-[36px] font-black tracking-tight leading-none ${pct >= 80 ? 'text-emerald-600 dark:text-emerald-400' : pct >= 50 ? 'text-amber-500' : 'text-rose-500'}`}>{pct}%</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">秒答率</span>
          </div>
        </div>

        <h4 className="text-xl font-black text-slate-800 dark:text-white mb-2">本輪複習完成！</h4>

        {/* 數據統計面板 */}
        <div className="flex gap-3 mb-8 mt-2 w-full max-w-xs px-2">
          <div className="flex-1 flex flex-col items-center bg-white/50 dark:bg-white/5 backdrop-blur-md p-3 rounded-[20px] border border-white/60 dark:border-white/10 shadow-sm">
            <div className="text-emerald-500 font-black text-xl mb-1">{results.correct}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">😎 秒答</div>
          </div>
          <div className="flex-1 flex flex-col items-center bg-white/50 dark:bg-white/5 backdrop-blur-md p-3 rounded-[20px] border border-white/60 dark:border-white/10 shadow-sm">
            <div className="text-amber-500 font-black text-xl mb-1">{results.blurry}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">🤔 模糊</div>
          </div>
          <div className="flex-1 flex flex-col items-center bg-white/50 dark:bg-white/5 backdrop-blur-md p-3 rounded-[20px] border border-white/60 dark:border-white/10 shadow-sm">
            <div className="text-rose-500 font-black text-xl mb-1">{results.wrong}</div>
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">😵 忘了</div>
          </div>
        </div>

        <button onClick={() => {
          setInitialized(false); // 重置快照，載入下一批單字
          setIdx(0);
          setDone(false);
          setResults({ correct: 0, blurry: 0, wrong: 0 });
        }}
          className="px-8 py-4 w-full max-w-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-emerald-500/20">繼續複習</button>
      </div>
    );
  }

  if (!current) return null; // Safe guard

  return (
    <div className="relative flex flex-col items-center py-4 space-y-8 px-2">
      {/* 答對時的撒花特效 */}
      {showConfetti && <Confetti score={1} total={1} />}

      {/* Progress */}
      <div className="w-full flex items-center gap-3 px-1">
        <span className="text-[11px] font-black text-slate-400">{idx + 1}/{sessionWords.length}</span>
        <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${((idx + 1) / sessionWords.length) * 100}%` }} />
        </div>
      </div>

      {/* 3D Flip Card Container */}
      <div
        onTouchStart={e => handleDragStart(e.touches[0].clientX)}
        onTouchMove={e => handleDragMove(e.touches[0].clientX)}
        onTouchEnd={handleDragEnd}
        onMouseDown={e => handleDragStart(e.clientX)}
        onMouseMove={e => handleDragMove(e.clientX)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
        style={{
          perspective: '1000px', // 建立 3D 空間透視點
          transform: startX !== null ? `translateX(${offsetX}px) rotate(${offsetX * 0.05}deg)` : 'none'
        }}
        className={`w-full min-h-[340px] cursor-pointer select-none ${startX === null ? 'transition-transform duration-700 ease-spring-bouncy' : ''} hover:-translate-y-2 transform-gpu will-change-transform`}
      >
        <div
          key={current.id} // 🔥 關鍵修復：強制讓每個單字的卡片都是獨立的 DOM，切換時動畫瞬間重置，絕不穿幫
          onClick={() => {
            if (!showAnswer) {
              setShowAnswer(true);
              playVoice(current.word, accent);
            }
          }}
          style={{
            transformStyle: 'preserve-3d', // 允許子元素在 3D 空間中翻轉
            transform: showAnswer ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
          className="relative w-full h-full min-h-[340px] transition-transform duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
        >
          {/* FRONT FACE (未翻面) */}
          <div
            style={{ backfaceVisibility: 'hidden' }}
            className="absolute inset-0 flex flex-col items-center justify-center p-10 rounded-[48px] bg-white/50 dark:bg-zinc-900/50 backdrop-blur-2xl backdrop-saturate-200 border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_40px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_40px_rgba(0,0,0,0.3)] overflow-hidden"
          >
            <span className="text-[42px] font-black text-slate-900 dark:text-white mb-4 text-center tracking-tight leading-tight pointer-events-none break-words whitespace-normal px-6 w-full">{current.word}</span>
            <div className="flex gap-2 flex-wrap justify-center pointer-events-none mb-6">
              {currentMeanings.map((m, i) => (
                <span key={i} className="text-[13px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg">{m.pos}</span>
              ))}
            </div>
            <p className="text-[13px] font-black text-slate-400 uppercase tracking-widest mt-4 flex items-center gap-2 pointer-events-none"><Sparkles size={14} /> 點擊翻面</p>
          </div>

          {/* BACK FACE (已翻面) */}
          <div
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            className="absolute inset-0 flex flex-col items-center justify-center p-10 rounded-[48px] bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200/50 dark:border-emerald-500/20 shadow-[0_20px_50px_rgba(16,185,129,0.2)] overflow-hidden"
          >
            {showAnswer && offsetX > 20 && <div className="absolute inset-0 bg-emerald-400/20 flex items-center justify-end p-8 transition-opacity duration-300 pointer-events-none"><span className="text-6xl drop-shadow-lg">😎</span></div>}
            {showAnswer && offsetX < -20 && <div className="absolute inset-0 bg-rose-400/20 flex items-center justify-start p-8 transition-opacity duration-300 pointer-events-none"><span className="text-6xl drop-shadow-lg">😵</span></div>}

            <div className="w-12 h-1 bg-emerald-200 dark:bg-emerald-500/30 rounded-full mb-6 pointer-events-none"></div>
            <div className="space-y-3 mb-4 pointer-events-none text-center px-4 max-h-[140px] overflow-y-auto custom-scrollbar">
              {currentMeanings.map((m, i) => (
                <div key={i} className="flex flex-col items-center">
                  <span className="text-[11px] font-black text-emerald-600/60 dark:text-emerald-400/60 mb-0.5">{m.pos}</span>
                  <p className="text-[20px] font-black text-emerald-700 dark:text-emerald-400 leading-snug break-words whitespace-normal">{m.meaning}</p>
                  {m.example && (
                    <div className="mt-1.5 space-y-0.5 w-full">
                      <p className="text-[13px] font-bold text-slate-500 dark:text-emerald-100/70 italic break-words whitespace-normal" dangerouslySetInnerHTML={{ __html: `"${m.example}"` }}></p>
                      <p className="text-[11px] font-bold text-slate-400 dark:text-emerald-200/50 break-words whitespace-normal" dangerouslySetInnerHTML={{ __html: m.exampleChinese }}></p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 發音控制區 */}
            <div className="flex items-center gap-4 my-2 pointer-events-auto">
              <button onClick={(e) => { e.stopPropagation(); playVoice(current.word, accent); }} className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full hover:scale-110 active:scale-90 transition-transform shadow-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20"><Volume2 size={24} /></button>
              <button onClick={(e) => { e.stopPropagation(); playVoice(current.word, accent, 0.4); }} className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full hover:scale-110 active:scale-90 transition-transform shadow-sm flex items-center justify-center border border-amber-200 dark:border-amber-500/20 text-xl">🐢</button>
            </div>

            {/* 顯示 AI 解析筆記 */}
            {current.notes && (
              <div className="mt-4 p-3 bg-white/40 dark:bg-black/20 rounded-2xl border border-emerald-200/50 max-w-[280px] max-h-[120px] overflow-y-auto text-left pointer-events-auto custom-scrollbar">
                <div className="text-[11px] leading-relaxed text-emerald-800 dark:text-emerald-200/80 prose-sm dark:prose-invert">
                  <ReactMarkdown>{current.notes}</ReactMarkdown>
                </div>
              </div>
            )}

            <p className="text-[11px] font-black text-slate-400/60 mt-auto pb-4 flex items-center gap-2 pointer-events-none">
              <span className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded">← 忘記</span>左右滑動<span className="bg-slate-200 dark:bg-white/10 px-2 py-1 rounded">記得 →</span>
            </p>
          </div>
        </div>
      </div>

      {/* Rating buttons */}
      {showAnswer && (
        <div className="flex gap-3 w-full animate-slide-up-fade">
          <button onClick={() => handleRate(1)} className="flex-1 py-5 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-[24px] font-black active:scale-[0.95] transition-all duration-300 border border-rose-200/50 dark:border-rose-500/20 shadow-sm hover:shadow-md">
            <span className="block text-[20px] mb-1">😵</span> 忘了
          </button>
          <button onClick={() => handleRate(3)} className="flex-1 py-5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-[24px] font-black active:scale-[0.95] transition-all duration-300 border border-amber-200/50 dark:border-amber-500/20 shadow-sm hover:shadow-md">
            <span className="block text-[20px] mb-1">🤔</span> 模糊
          </button>
          <button onClick={() => handleRate(5)} className="flex-1 py-5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-[24px] font-black active:scale-[0.95] transition-all duration-300 border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm hover:shadow-md">
            <span className="block text-[20px] mb-1">😎</span> 秒答
          </button>
        </div>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// QUIZ MODE (Multiple Choice + Spelling + Grammar)
// ═══════════════════════════════════════════════════════════════════════════════
const QuizMode = ({ words, updateWord, setWords, incrementWordCount, playVoice, accent, addWords, triggerNotification, commonalityMap }) => {
  const [quizType, setQuizType] = useState(null); // null | 'choice' | 'spell'
  const [questions, setQuestions] = useState([]);
  const [qIdx, setQIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [spellInput, setSpellInput] = useState('');
  const [showResult, setShowResult] = useState(false);
  const [spellFailed, setSpellFailed] = useState(false); // 控制拼寫強制訂正模式
  const [quizDone, setQuizDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingType, setLoadingType] = useState(null); // 'grammar' | 'cloze'
  const spellRef = useRef(null);
  const audioCtx = useRef(null);
  const [quizCount, setQuizCount] = useState(10); // 題數設定狀態
  const [wrongWords, setWrongWords] = useState([]); // 追蹤答錯的單字

  const playDing = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.6);
    } catch { }
  }, []);

  const playBuzzer = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const t = ctx.currentTime;
      // 🚀 優化：使用低頻鋸齒波模擬更自然的震動提示感，而非刺耳電子音
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'triangle'; // 改用 triangle 波形，聽起來較柔和
      osc.frequency.setValueAtTime(100, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.3);
      gain.gain.setValueAtTime(0.15, t);
      gain.gain.linearRampToValueAtTime(0.001, t + 0.3);
      osc.start(t); osc.stop(t + 0.3);
    } catch { }
  }, []);

  const playVictory = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const t = ctx.currentTime;
      const playNote = (freq, start, dur) => {
        const osc = ctx.createOscillator(); const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + dur);
        osc.start(start); osc.stop(start + dur);
      };
      // 播放 C5, E5, G5, C6 (破關和弦)
      playNote(523.25, t, 0.2);
      playNote(659.25, t + 0.15, 0.2);
      playNote(783.99, t + 0.3, 0.4);
      playNote(1046.50, t + 0.45, 0.6);
    } catch { }
  }, []);

  // 🌟 純前端手搓：加權隨機演算法 (Weighted Random Selection)
  // 完全本地運算，0 延遲，依據 SRS 熟練度動態調整抽題率
  const getWeightedShuffledWords = useCallback((wordsList) => {
    return [...wordsList].sort((a, b) => {
      const getWeight = (w) => {
        let weight = 10; // 基礎機率權重
        if (w.lastResult === 'wrong') weight += 50; // 剛答錯過的單字，抽中率暴增
        if (w.repetitions === 0 || w.repetitions === undefined) weight += 20; // 尚未熟練的新單字
        if (w.interval && w.interval > 3) weight = Math.max(1, weight - Math.min(w.interval, 9)); // 已經很熟的單字，大幅降低出現機率
        return weight;
      };
      // 數學原理：Math.random() ** (1 / weight)，權重越大，算出來的隨機分數越接近 1
      const scoreA = Math.pow(Math.random(), 1 / getWeight(a));
      const scoreB = Math.pow(Math.random(), 1 / getWeight(b));
      return scoreB - scoreA; // 降冪排列，分數高的排前面 (優先被抽中)
    });
  }, []);

  useEffect(() => {
    if (quizDone) playVictory();
  }, [quizDone, playVictory]);

  const generateChoiceQuiz = useCallback(() => {
    if (words.length < 4) return;
    const shuffled = getWeightedShuffledWords(words);
    const qs = shuffled.slice(0, Math.min(quizCount, words.length)).map(w => {
      const wrongOptions = words.filter(o => o.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const answerText = getPrimaryMeaning(w);
      const options = [...wrongOptions.map(o => getPrimaryMeaning(o)), answerText].sort(() => Math.random() - 0.5);
      return { word: w, options, answer: answerText };
    });
    setQuestions(qs);
    setQIdx(0); setScore(0); setSelected(null); setShowResult(false); setQuizDone(false);
    setWrongWords([]);
    setQuizType('choice');
  }, [words, quizCount, getWeightedShuffledWords]);

  const generateSpellQuiz = useCallback(() => {
    if (words.length < 1) return;
    const shuffled = getWeightedShuffledWords(words);
    const qs = shuffled.slice(0, Math.min(quizCount, words.length)).map(w => ({
      word: w, answer: w.word.toLowerCase()
    }));
    setQuestions(qs);
    setQIdx(0); setScore(0); setSpellInput(''); setShowResult(false); setQuizDone(false); setSpellFailed(false);
    setWrongWords([]);
    setQuizType('spell');
  }, [words, quizCount, getWeightedShuffledWords]);

  const handleChoiceAnswer = (opt) => {
    if (showResult) return;
    setSelected(opt);
    setShowResult(true);
    incrementWordCount(); // 觸發單字統計
    const isCorrect = opt === questions[qIdx].answer;
    if (isCorrect) {
      setScore(s => s + 1);
      playDing();
    } else {
      playBuzzer();
      setWrongWords(prev => prev.some(w => w.id === questions[qIdx].word.id) ? prev : [...prev, questions[qIdx].word]);
    }
    // Update SRS
    if (questions[qIdx].word) {
      const weight = calculateSRSWeight(questions[qIdx].word, commonalityMap);
      const updated = calculateNextReview(questions[qIdx].word, isCorrect ? 4 : 1, weight);
      setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
    }
    setTimeout(() => {
      if (qIdx + 1 >= questions.length) setQuizDone(true);
      else { setQIdx(q => q + 1); setSelected(null); setShowResult(false); }
    }, 1200);
  };

  const handleSpellSubmit = () => {
    const isCorrect = spellInput.trim().toLowerCase() === questions[qIdx].answer;

    if (isCorrect) {
      setShowResult(true);
      if (!spellFailed) {
        setScore(s => s + 1);
        incrementWordCount(); // 只有第一次答對才算單字數
        if (questions[qIdx].word) {
          const weight = calculateSRSWeight(questions[qIdx].word, commonalityMap);
          const updated = calculateNextReview(questions[qIdx].word, 4, weight);
          setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
        }
      }
      playDing();
      setTimeout(() => {
        if (qIdx + 1 >= questions.length) setQuizDone(true);
        else { setQIdx(q => q + 1); setSpellInput(''); setShowResult(false); setSpellFailed(false); setTimeout(() => spellRef.current?.focus(), 100); }
      }, 1500);
    } else {
      playBuzzer();
      if (!spellFailed) {
        setWrongWords(prev => prev.some(w => w.id === questions[qIdx].word.id) ? prev : [...prev, questions[qIdx].word]);
      }
      setSpellFailed(true);
      setSpellInput(''); // 清空輸入框強制重打
      if (!spellFailed && questions[qIdx].word) {
        const updated = calculateNextReview(questions[qIdx].word, 1);
        setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
      }
      setTimeout(() => spellRef.current?.focus(), 100);
    }
  };

  // ─── Menu ──────────────────────────────────────────────────────────────────
  if (!quizType) {
    return (
      <div className="space-y-4 py-4">
        {/* 題數設定區域 */}
        <div className="flex items-center justify-between bg-white/40 dark:bg-white/5 backdrop-blur-[24px] p-4 rounded-[28px] border border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(148,163,184,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)]">
          <span className="text-[14px] font-black text-[var(--text-primary)] ml-2 tracking-tight">測驗題數</span>
          <div className="flex gap-2 bg-slate-100/50 dark:bg-white/5 p-1 rounded-[20px] border border-slate-200/50 dark:border-white/5">
            {[10, 20, 30].map(n => (
              <button
                key={n}
                onClick={() => setQuizCount(n)}
                className={`px-4 py-2 rounded-[16px] text-[13px] font-black transition-all duration-300 ease-spring-smooth active:scale-95 ${quizCount === n ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/80 dark:hover:bg-white/10'}`}
              >
                {n} 題
              </button>
            ))}
          </div>
        </div>

        {words.length < 4 && (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-500/20 rounded-2xl p-4 text-[13px] font-bold text-amber-700 dark:text-amber-400">
            ⚠️ 至少需要 4 個單字才能開始選擇題測驗。目前有 {words.length} 個。
          </div>
        )}
        <button onClick={generateChoiceQuiz} disabled={words.length < 4}
          className="w-full flex items-center gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-[32px] border border-blue-100 dark:border-blue-500/20 active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-float disabled:opacity-40 group text-left">
          <div className="p-3 sm:p-4 bg-blue-500 rounded-2xl text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0"><Shuffle size={24} className="sm:w-7 sm:h-7" /></div>
          <div><span className="text-[15px] sm:text-[16px] font-black text-slate-800 dark:text-white block">選擇題模式</span><span className="text-[11px] sm:text-[12px] font-bold text-slate-400">看英文選中文，{quizCount} 題快速測驗</span></div>
        </button>
        <button onClick={generateSpellQuiz} disabled={words.length < 1}
          className="w-full flex items-center gap-4 sm:gap-5 p-5 sm:p-6 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 rounded-[32px] border border-purple-100 dark:border-purple-500/20 active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-float disabled:opacity-40 group text-left">
          <div className="p-3 sm:p-4 bg-purple-500 rounded-2xl text-white shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-3 transition-transform shrink-0"><PenTool size={24} className="sm:w-7 sm:h-7" /></div>
          <div><span className="text-[15px] sm:text-[16px] font-black text-slate-800 dark:text-white block">拼寫測驗</span><span className="text-[11px] sm:text-[12px] font-bold text-slate-400">看中文拼英文，{quizCount} 題訓練記憶</span></div>
        </button>
      </div>
    );
  }

  // ─── Quiz Done ─────────────────────────────────────────────────────────────
  if (quizDone) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="flex flex-col items-center py-12 text-center animate-slide-up-fade relative">
        {/* 已移除 Confetti 特效 */}
        <div className={`w-28 h-28 rounded-full flex items-center justify-center mb-6 shadow-inner border ${pct >= 80 ? 'bg-emerald-50 border-emerald-100 dark:bg-emerald-500/10' : pct >= 50 ? 'bg-amber-50 border-amber-100 dark:bg-amber-500/10' : 'bg-rose-50 border-rose-100 dark:bg-rose-500/10'}`}>
          <span className="text-[40px] font-black animate-bounce-soft">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</span>
        </div>
        <h4 className="text-2xl font-black text-slate-800 dark:text-white mb-1">{score}/{questions.length}</h4>
        <p className="text-[14px] font-bold text-slate-400 mb-8">
          {pct >= 80 ? '太強了！繼續保持！' : pct >= 50 ? '還不錯，再接再厲！' : '多練習幾次就會進步的！'}
        </p>

        {wrongWords.length > 0 && (
          <button onClick={() => {
            addWords(wrongWords, 'Personal', false);
            triggerNotification('收藏成功 🎉', `已將 ${wrongWords.length} 個答錯單字加入個人收藏！`);
            setWrongWords([]); // 避免重複點擊
          }} className="mb-4 w-full max-w-xs px-6 py-4 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-2xl font-black border border-orange-200 dark:border-orange-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm">
            <Heart size={18} /> 將 {wrongWords.length} 個錯題加入收藏
          </button>
        )}
        <div className="flex gap-3">
          <button onClick={() => setQuizType(null)} className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black active:scale-95 transition-all">返回</button>
          <button onClick={() => { setQIdx(0); setScore(0); setSelected(null); setShowResult(false); setQuizDone(false); setWrongWords([]); }}
            className="px-6 py-3 bg-emerald-500 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-emerald-500/20">再測一次</button>
        </div>
      </div>
    );
  }

  const q = questions[qIdx];

  // ─── Choice Quiz ───────────────────────────────────────────────────────────
  if (quizType === 'choice') {
    return (
      <div className="py-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setQuizType(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
          <span className="text-[11px] font-black text-slate-400">{qIdx + 1}/{questions.length}</span>
          <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="text-[13px] font-black text-emerald-500">✓ {score}</span>
        </div>
        <div className="text-center py-6 sm:py-8 bg-white/40 dark:bg-white/5 backdrop-blur-[24px] border border-white/50 dark:border-white/10 rounded-[32px] sm:rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(148,163,184,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] mb-5 sm:mb-6">
          <span className="text-[28px] sm:text-[36px] font-black text-slate-900 dark:text-white tracking-tight leading-tight">{q.word.word}</span>
          <div className="flex gap-2 justify-center mt-2 sm:mt-3">
            {getMeanings(q.word).map((m, i) => (
              <span key={i} className="text-[12px] sm:text-[13px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg inline-block">{m.pos}</span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          {q.options.map((opt, i) => {
            let cls = 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-white/60 dark:border-white/10 hover:border-blue-500/50 hover:bg-white/60 dark:hover:bg-white/10 hover:shadow-md';
            if (showResult) {
              if (opt === q.answer) cls = 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/30 scale-[1.02] z-10 relative';
              else if (opt === selected) cls = 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/30 scale-[1.02] z-10 relative animate-vocab-shake';
              else cls += ' opacity-40 scale-[0.98] pointer-events-none'; // 讓非正確答案淡出，聚焦正確答案
            }
            return (
              <button key={i} onClick={() => handleChoiceAnswer(opt)}
                className={`w-full text-left px-5 py-4 sm:px-6 sm:py-5 rounded-[20px] sm:rounded-[24px] border-2 font-bold text-[15px] sm:text-[16px] transition-all duration-300 ease-spring-smooth active:scale-[0.98] flex items-center break-words whitespace-normal ${cls}`}>
                <span className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[12px] sm:text-[13px] font-black mr-3 sm:mr-4 shrink-0 transition-colors ${showResult && (opt === q.answer || opt === selected) ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-white/10 text-slate-400'}`}>{String.fromCharCode(65 + i)}</span>
                <span className="flex-1">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── Spell Quiz ────────────────────────────────────────────────────────────
  if (quizType === 'spell') {
    return (
      <div className="py-4 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => setQuizType(null)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
          <span className="text-[11px] font-black text-slate-400">{qIdx + 1}/{questions.length}</span>
          <div className="flex-1 h-2 bg-[var(--border-color)] rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${((qIdx + 1) / questions.length) * 100}%` }} />
          </div>
          <span className="text-[13px] font-black text-emerald-500">✓ {score}</span>
        </div>
        <div className="text-center py-6 sm:py-10 bg-white/40 dark:bg-white/5 backdrop-blur-[24px] border border-white/50 dark:border-white/10 rounded-[32px] sm:rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(148,163,184,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] mb-5 sm:mb-6">
          <p className="text-[11px] sm:text-[12px] font-bold text-slate-400 mb-2 sm:mb-3 uppercase tracking-widest">請拼出以下中文的英文</p>
          <span className="text-[24px] sm:text-[32px] font-black text-slate-900 dark:text-white px-4 block leading-tight">{getPrimaryMeaning(q.word)}</span>
          <div className="flex gap-2 justify-center mt-2">
            {getMeanings(q.word).map((m, i) => (
              <span key={i} className="text-[12px] font-bold text-slate-400">({m.pos})</span>
            ))}
          </div>
        </div>
        <div className="space-y-3">
          <input ref={spellRef} autoFocus type="text" value={spellInput} onChange={e => setSpellInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (!showResult || spellFailed) && handleSpellSubmit()}
            disabled={showResult && !spellFailed}
            className={`w-full text-center text-[22px] sm:text-[24px] font-black py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] border-2 outline-none transition-all duration-300 tracking-widest ${showResult && !spellFailed
              ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]'
              : spellFailed
                ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-400 text-rose-600 dark:text-rose-400 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/20 placeholder:text-rose-300'
                : 'bg-white/40 dark:bg-white/5 backdrop-blur-[24px] border-white/50 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(148,163,184,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.03)] focus:bg-white/60 dark:focus:bg-white/10 focus:border-purple-500/50 focus:ring-4 focus:ring-purple-500/20 text-slate-900 dark:text-white'
              }`} placeholder={spellFailed ? "再試一次..." : "..."} />
          {spellFailed && (
            <div className="flex flex-col items-center gap-3 animate-slide-up-fade">
              <div className="bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 p-4 rounded-2xl border border-rose-200 dark:border-rose-500/20 text-center w-full shadow-sm mt-2">
                <span className="text-[12px] font-black uppercase tracking-widest opacity-80">正確答案</span>
                <div className="text-[28px] font-black tracking-widest mt-1 mb-1 select-all">{q.word.word}</div>
                <span className="text-[12px] font-bold opacity-80">請在上方輸入框親手打一次加深記憶！</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playVoice(q.word.word, accent, 0.4);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl text-[13px] font-black hover:bg-amber-100 dark:hover:bg-amber-500/30 transition-colors active:scale-95 shadow-sm"
              >
                🐢 聽聽慢速發音
              </button>
            </div>
          )}
          {(!showResult || spellFailed) && (
            <button onClick={handleSpellSubmit}
              className="w-full py-4 sm:py-5 bg-purple-500 hover:bg-purple-600 text-white rounded-[20px] sm:rounded-[24px] font-black text-[15px] sm:text-[16px] active:scale-[0.98] transition-all duration-300 ease-spring shadow-lg shadow-purple-500/30">
              確認
            </button>
          )}
        </div>
      </div>
    );
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORT TAB
// ═══════════════════════════════════════════════════════════════════════════════
const ImportTab = ({ addWords, syncFromGAS, isSyncing, isAdmin, currentSet }) => {
  const [importing, setImporting] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [aiScanning, setAiScanning] = useState(false);

  // 教師專用：AI 圖片轉單字組
  const handleAiScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isAdmin) return;

    setAiScanning(true);
    setResult(null);

    try {
      // 1. 圖片轉 Base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve) => {
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(file);
      });
      const base64Data = await base64Promise;

      // 2. 構建 Gemini Prompt
      const prompt = `你是一個專業的英文老師。請辨識這張圖片中的英文單字與中文解釋，並輸出為 JSON 陣列格式。
                      結構如下：
                      [{"word": "單字", "meanings": [{"pos": "詞性縮寫(n./v./adj./adv./prep./conj.)", "meaning": "中文解釋"}]}]
                      注意事項：
                      1. 只輸出 JSON 陣列，不要有其他文字。
                      2. 盡力確保拼寫正確。
                      3. 若同一個字有多個詞性與解釋，請合併在 meanings 陣列中。`;

      // 3. 調用內建 AI Proxy
      const text = await fetchAI(prompt, { image: { mimeType: file.type, data: base64Data } });

      if (text) {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]).map((w, i) => ({
            ...w,
            id: `ai-${Date.now()}-${i}`,
            level: 1,
            source: 'teacher-ai',
            nextReview: new Date().toISOString(),
            interval: 1, easeFactor: 2.5, repetitions: 0, lastResult: null
          }));
          setPreview(parsed);
          alert(`AI 成功辨識出 ${parsed.length} 個單字！請檢查預覽後匯入。`);
        } else {
          throw new Error('無法從 AI 回應中解析 JSON 資料');
        }
      }
    } catch (err) {
      console.error('AI Scan Error:', err);
      setResult({ error: `AI 辨識失敗: ${err.message}` });
    } finally {
      setAiScanning(false);
    }
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);

    try {
      const data = await file.arrayBuffer();
      const XLSX = await import('xlsx'); // 🚀 動態載入：只有在使用者真的上傳 Excel 時才下載這個巨大的套件
      const wb = XLSX.read(data);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      if (rows.length === 0) throw new Error('空的 Excel 檔案');

      // Auto-detect columns
      const cols = Object.keys(rows[0]).map(c => c.toLowerCase());
      const wordCol = Object.keys(rows[0]).find(c => /word|english|單字|英文/.test(c.toLowerCase()));
      const meaningCol = Object.keys(rows[0]).find(c => /meaning|chinese|中文|解釋|翻譯|定義/.test(c.toLowerCase()));
      const posCol = Object.keys(rows[0]).find(c => /pos|part|詞性/.test(c.toLowerCase()));
      const exCol = Object.keys(rows[0]).find(c => /example|例句|sentence/.test(c.toLowerCase()));

      if (!wordCol || !meaningCol) {
        // Fallback: assume first two columns are word, meaning
        const keys = Object.keys(rows[0]);
        if (keys.length >= 2) {
          const parsed = rows.map((r, i) => ({
            id: `excel-${Date.now()}-${i}`,
            word: String(r[keys[0]] || '').trim(),
            meaning: String(r[keys[1]] || '').trim(),
            partOfSpeech: keys.length >= 3 ? String(r[keys[2]] || 'n.').trim() : 'n.',
            example: '',
            level: 1,
            source: 'excel',
            nextReview: new Date().toISOString(),
            interval: 1, easeFactor: 2.5, repetitions: 0, lastResult: null
          })).filter(w => w.word && w.meaning);
          setPreview(parsed);
        } else {
          throw new Error('無法辨識欄位，請確認 Excel 至少有「英文單字」和「中文解釋」兩欄');
        }
      } else {
        const parsed = rows.map((r, i) => ({
          id: `excel-${Date.now()}-${i}`,
          word: String(r[wordCol] || '').trim(),
          meaning: String(r[meaningCol] || '').trim(),
          partOfSpeech: posCol ? String(r[posCol] || 'n.').trim() : 'n.',
          example: exCol ? String(r[exCol] || '').trim() : '',
          level: 1,
          source: 'excel',
          nextReview: new Date().toISOString(),
          interval: 1, easeFactor: 2.5, repetitions: 0, lastResult: null
        })).filter(w => w.word && w.meaning);
        setPreview(parsed);
      }
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = () => {
    if (!preview) return;
    // 🚨 避免大量 Excel 匯入時癱瘓 GAS，強制關閉 shouldPush (第三個參數設為 false)
    addWords(preview, isAdmin ? currentSet : 'Personal', false);
    setResult({ count: preview.length });
    setPreview(null);
  };

  return (
    <div className="space-y-6 py-4">
      {/* Teacher AI Section */}
      {isAdmin && (
        <div className="bg-gradient-to-br from-purple-500/10 to-indigo-500/10 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-[28px] p-6 border border-purple-200/50 dark:border-purple-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-xl text-white shadow-lg">
                <Sparkles size={20} className={aiScanning ? 'animate-pulse' : ''} />
              </div>
              <div>
                <span className="block text-slate-800 dark:text-white font-black text-[16px]">教師專用：AI 考卷掃描</span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">拍照單字表，自動轉為雲端單字組</span>
              </div>
            </div>
            <label className={`px-4 py-2 bg-purple-500 text-white rounded-xl font-black text-[12px] active:scale-95 transition-all shadow-lg shadow-purple-500/20 cursor-pointer ${aiScanning ? 'opacity-50 pointer-events-none' : ''}`}>
              {aiScanning ? '辨識中...' : '拍照上傳'}
              <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAiScan} disabled={aiScanning} />
            </label>
          </div>
          {aiScanning && (
            <div className="flex items-center gap-2 mt-2 text-[10px] font-bold text-purple-600 dark:text-purple-400">
              <RefreshCw size={12} className="animate-spin" />
              正在調用 Gemini 2.5 Pro 進行 OCR 辨識，請稍候...
            </div>
          )}
        </div>
      )}

      {/* Google Sheet Sync Section */}
      <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-[28px] p-6 border border-emerald-200/50 dark:border-emerald-500/20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500 rounded-xl text-white shadow-lg">
              <RefreshCw size={20} className={isSyncing ? 'animate-spin' : ''} />
            </div>
            <div>
              <span className="block text-slate-800 dark:text-white font-black text-[16px]">Google Sheet 同步</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-bold">與後端試算表保持資料一致</span>
            </div>
          </div>
          <button
            onClick={() => syncFromGAS(true)}
            disabled={isSyncing}
            className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[12px] active:scale-95 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
          >
            {isSyncing ? '同步中...' : '立即同步'}
          </button>
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-slate-200 dark:border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-xs font-black uppercase tracking-widest text-slate-400">
          <span className="bg-[#f8fafc] dark:bg-[#0f172a] px-3">或使用 Excel 匯入</span>
        </div>
      </div>

      {/* Upload area */}
      <label className="block cursor-pointer">
        <div className="border-2 border-dashed border-emerald-200 dark:border-emerald-900/30 rounded-[28px] p-10 flex flex-col items-center gap-4 hover:bg-emerald-50/30 dark:hover:bg-emerald-500/5 transition-all group">
          {importing ? (
            <RefreshCw className="animate-spin text-emerald-500" size={36} />
          ) : (
            <FileSpreadsheet className="text-emerald-400 group-hover:scale-110 transition-transform" size={36} />
          )}
          <div className="text-center">
            <span className="block text-emerald-600 dark:text-emerald-400 font-black text-[16px]">
              {importing ? '解析中…' : '上傳 Excel 檔案'}
            </span>
            <span className="text-[12px] text-emerald-600/60 dark:text-emerald-400/40 font-bold">
              支援 .xlsx · .xls · .csv
            </span>
          </div>
        </div>
        <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
      </label>

      {/* Format hint */}
      <div className="bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-200/50 dark:border-blue-500/20">
        <p className="text-[12px] font-black text-blue-600 dark:text-blue-400 mb-2">📋 Excel 格式說明</p>
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
          第一列為標題列，建議命名為：<br />
          <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-700 dark:text-blue-300">word</code>（英文單字）、
          <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-700 dark:text-blue-300">meaning</code>（中文解釋）、
          <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-700 dark:text-blue-300">pos</code>（詞性，選填）、
          <code className="bg-blue-100 dark:bg-blue-900/30 px-1 rounded text-blue-700 dark:text-blue-300">example</code>（例句，選填）<br />
          若無標題列，系統會自動以前兩欄作為「單字」和「解釋」。
        </p>
      </div>

      {/* Preview */}
      {preview && (
        <div className="animate-slide-up-fade space-y-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-[13px] font-black text-slate-800 dark:text-white">預覽：{preview.length} 個單字</span>
            <div className="flex gap-2">
              <button onClick={() => setPreview(null)} className="px-4 py-2 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-xl font-black text-[12px] active:scale-95 transition-all">取消</button>
              <button onClick={confirmImport} className="px-4 py-2 bg-emerald-500 text-white rounded-xl font-black text-[12px] active:scale-95 transition-all shadow-lg shadow-emerald-500/20">確認匯入</button>
            </div>
          </div>
          <div className="max-h-[300px] overflow-y-auto space-y-2 scrollbar-hide">
            {preview.slice(0, 20).map((w, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3 bg-white/50 dark:bg-white/5 rounded-2xl border border-white/20 dark:border-white/5">
                <span className="text-[14px] font-black text-slate-800 dark:text-white">{w.word}</span>
                <span className="text-[11px] font-bold text-slate-400">—</span>
                <span className="text-[13px] font-bold text-slate-500 dark:text-gray-400 truncate">{w.meaning}</span>
              </div>
            ))}
            {preview.length > 20 && <p className="text-center text-[12px] font-bold text-slate-400">⋯ 以及其他 {preview.length - 20} 個單字</p>}
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className={`rounded-2xl p-5 text-center animate-slide-up-fade ${result.error ? 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-500/20' : 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-500/20'}`}>
          {result.error ? (
            <p className="text-[14px] font-black text-rose-600 dark:text-rose-400">❌ {result.error}</p>
          ) : (
            <p className="text-[14px] font-black text-emerald-600 dark:text-emerald-400">✅ 成功匯入 {result.count} 個單字！</p>
          )}
        </div>
      )}
    </div>
  );
};
