import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpen, Plus, Upload, Brain, Trophy, Search, Trash2, Check, X,
  RefreshCw, Sparkles, Shuffle, PenTool, CheckCircle2, XCircle, Heart,
  FileSpreadsheet, Bug, Terminal, ChevronDown, ChevronUp, ChevronRight, Wand2, Volume2,
  FileText, BarChart2, Flame, Clock, TrendingUp, Share2, Book, Zap, AlertCircle, Tag
} from 'lucide-react';
import * as XLSX from 'xlsx';
import ReactMarkdown from 'react-markdown';
import { db } from '../../config/firebase';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, where, orderBy, writeBatch, serverTimestamp,
  getDocs, limit, startAfter
} from 'firebase/firestore';

import { fetchAI } from '../../utils/helpers';

const GAS_URL = import.meta.env.VITE_GAS_VOCAB_URL || 'https://script.google.com/macros/s/AKfycbwjcbklWLkoeC-q_dCiiu0fNSbk7ePDt0bVUQh11O_EuR1_uAAahPClKxHI90eAqgUc/exec';

// ─── SRS Algorithm (SM-2 simplified) ────────────────────────────────────────
const calculateNextReview = (word, quality) => {
  let { interval = 1, easeFactor = 2.5, repetitions = 0 } = word;

  if (quality >= 3) {
    if (repetitions === 0) interval = 1;
    else if (repetitions === 1) interval = 3;
    else interval = Math.round(interval * easeFactor);
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
const WordDetailOverlay = ({ word, analysis, isAnalyzing, handleAiAnalyze, onClose, updateWord, triggerNotification, currentSet, addWords, isSaved, onSave, playVoice, accent }) => {
  // 防呆：鎖定背景滾動、支援 ESC 鍵關閉，避免與底層元件衝突
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden'; // 防止底層滾動衝突
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  if (!word) return null;

  // 輔助函式：解析拆解字串
  const getBreakdown = () => {
    if (!analysis || analysis.startsWith('ERROR:')) return null;
    const match = analysis.match(/\[單字構造拆解\]([\s\S]*?)(?=###|$)/i);
    if (!match) return null;

    const lines = match[1].trim().split('\n');
    // 尋找包含 "+" 號的行作為解析目標，避免抓到 AI 的說明文字
    const targetLine = lines.find(l => l.includes('+')) || lines[0];
    if (!targetLine) return null;

    const parts = targetLine.split('+').map(p => {
      // 增加容錯：支援全形/半形的冒號與括號，以及不穩定的空格
      const info = p.match(/\*\*(.*?)\*\*\s*[:：]\s*(.*?)\s*[(（](.*?)[)）]/);
      if (!info) return { label: '', value: p.trim().replace(/\*/g, ''), meaning: '' };
      return { label: info[1].trim(), value: info[2].trim(), meaning: info[3].trim() };
    });
    return parts;
  };

  const breakdown = getBreakdown();
  const cleanAnalysis = analysis && !analysis.startsWith('ERROR:') ? analysis.replace(/###\s*\[單字構造拆解\][\s\S]*?(?=###|$)/i, '').trim() : '';

  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-fadeIn" onClick={onClose}>
      <div
        className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl w-full h-[100dvh] md:h-[90vh] md:max-w-4xl md:rounded-[48px] shadow-2xl border border-white/20 overflow-hidden flex flex-col animate-pop-in"
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
        `}</style>
        {/* Header */}
        <div className="px-6 md:px-8 pt-[calc(1.5rem+env(safe-area-inset-top))] md:pt-8 pb-4 flex justify-between items-start shrink-0 w-full">
          <div className="space-y-1 min-w-0 flex-1 pr-4">
            <h2 className="text-[36px] md:text-[44px] font-black text-slate-900 dark:text-white tracking-tighter leading-none break-words whitespace-normal">{word.word}</h2>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-full text-[12px] font-black text-slate-500 uppercase">{word.partOfSpeech || word.pos}</span>
              <span className="text-slate-400 text-[12px] font-bold">Level {word.level || '1'}</span>
              <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, 'US'); }} className="ml-2 px-2.5 py-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg text-[11px] font-black hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-all shadow-sm flex items-center gap-1 active:scale-95">🇺🇸 US</button>
              <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, 'UK'); }} className="px-2.5 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg text-[11px] font-black hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all shadow-sm flex items-center gap-1 active:scale-95">🇬🇧 UK</button>
              <button onClick={(e) => { e.stopPropagation(); playVoice(word.word, accent || 'US', 0.4); }} className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-lg text-[11px] font-black hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-all shadow-sm flex items-center gap-1 active:scale-95" title="慢速發音">🐢 慢速</button>
            </div>
            <p className="text-[20px] font-bold text-slate-600 dark:text-slate-300 mt-2">{word.meaning || word.chinese}</p>
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
                className={`p-2.5 md:p-3 rounded-full transition-all active:scale-90 shadow-sm flex items-center justify-center ${isSaved ? 'bg-rose-500 text-white shadow-rose-500/30' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 hover:bg-rose-100'}`}
                title="加入個人收藏"
              >
                <Heart size={24} className={isSaved ? 'fill-current animate-heart-burst' : ''} />
              </button>
            )}
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="p-2.5 md:p-3 bg-slate-100 dark:bg-white/5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white transition-all active:scale-90 flex items-center justify-center touch-manipulation shrink-0" title="關閉視窗">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-[calc(3rem+env(safe-area-inset-bottom))] space-y-8 custom-scrollbar">
          {/* 1. 視覺化拆解圖 (有解析時才顯示) */}
          {analysis && !analysis.startsWith('ERROR:') && (
            <div className="p-8 bg-gradient-to-br from-slate-50 to-white dark:from-white/5 dark:to-transparent rounded-[40px] border border-slate-100 dark:border-white/5 relative overflow-hidden group">
              <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 md:gap-6">
                {breakdown ? breakdown.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 group/part">
                    <div className="flex flex-col items-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest mb-2 transition-all group-hover/part:scale-110 ${p.label === 'Prefix' ? 'text-blue-400' : p.label === 'Root' ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {p.label || 'Part'}
                      </span>
                      <div className={`px-6 py-4 rounded-3xl border-2 transition-all duration-500 scale-105 shadow-lg ${p.label === 'Prefix' ? 'bg-blue-50/50 border-blue-200 text-blue-600 dark:bg-blue-500/10 dark:border-blue-500/30' :
                          p.label === 'Root' ? 'bg-rose-50/50 border-rose-200 text-rose-600 dark:bg-rose-500/10 dark:border-rose-500/30' :
                            'bg-emerald-50/50 border-emerald-200 text-emerald-600 dark:bg-emerald-500/10 dark:border-emerald-500/30'
                        }`}>
                        <span className="text-[24px] font-black">{p.value}</span>
                      </div>
                      <span className="mt-3 text-[13px] font-bold text-slate-400">{p.meaning}</span>
                    </div>
                    {i < breakdown.length - 1 && <span className="text-2xl font-black text-slate-200 dark:text-white/10 mt-8">+</span>}
                  </div>
                )) : (
                  <div className="py-4 text-center">
                    <p className="text-slate-400 font-bold italic">無法產生拆解視圖，請確認解析格式 🚀</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. AI 詳細解析 */}
          <div className="grid md:grid-cols-[1fr_280px] gap-8">
            <div className="space-y-6">
              <h3 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Sparkles size={20} className="text-yellow-500" /> 深度語源解析
              </h3>
              {analysis && !analysis.startsWith('ERROR:') ? (
                <div className="text-[15px] leading-relaxed text-slate-700 dark:text-slate-300 highlighter">
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
                <div className="p-10 border-2 border-dashed border-slate-100 dark:border-white/5 rounded-[32px] text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-500/10 rounded-full flex items-center justify-center mx-auto text-purple-600">
                    <Brain size={32} />
                  </div>
                  <p className="text-slate-400 font-bold">目前無解析資料，準備好來一場語源之旅嗎？</p>
                  <button onClick={() => handleAiAnalyze(word.id, word.word)} className="mt-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-[24px] font-black shadow-lg shadow-purple-500/30 active:scale-95 transition-all">✨ 點擊生成詳細解析</button>
                </div>
              )}
            </div>

            {/* Sidebar Stats & Actions */}
            <div className="space-y-4">
              <div className="p-6 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-3xl border border-emerald-100/50 dark:border-emerald-500/10">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-black text-[12px] uppercase mb-4">
                  <Zap size={14} /> 學習數據
                </div>
                <div className="space-y-4">
                  <div>
                    <span className="block text-[11px] text-slate-400 font-bold mb-1">熟練度標記</span>
                    <div className="flex gap-1.5">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-2.5 rounded-full transition-all duration-700 ${i <= (word.repetitions || 0) ? 'w-4 bg-emerald-500' : 'w-2 bg-slate-200 dark:bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  const currentNotes = word.notes || '';
                  const updatedNotes = currentNotes ? `${currentNotes}\n\n【深度解析】\n${analysis}` : analysis;
                  updateWord(word.id, { notes: updatedNotes });
                  triggerNotification('筆記同步', '已將完整解析存入單字筆記');
                }}
                disabled={!analysis || analysis.startsWith('ERROR:')}
                className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[24px] font-black text-[14px] shadow-xl active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={18} /> 同步全段筆記
              </button>
            </div>
          </div>

          {/* 手機版底部專屬返回按鈕 (讓使用者滑到底部時可快速退出) */}
          <div className="pt-4 mt-2 border-t border-slate-100 dark:border-white/5 md:hidden flex flex-col">
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); }} className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-[20px] font-black text-[15px] active:scale-95 transition-all shadow-sm touch-manipulation">
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
export default function VocabularyTab({ geminiKey, user, isAdmin }) {
  const [words, setWords] = useState([]); // 從 Firestore 動態載入
  const [subTab, setSubTab] = useState('bank');
  const [search, setSearch] = useState('');
  const [filterPos, setFilterPos] = useState('all');
  const [isSyncing, setIsSyncing] = useState(false);
  const [userWords, setUserWords] = useState([]); // 個人學習進度
  const [currentSet, setCurrentSet] = useState('6000 words'); // 目前選擇的單字庫來源
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [detailedWordId, setDetailedWordId] = useState(null);
  const [analyzingIds, setAnalyzingIds] = useState(new Set());
  const [aiAnalysisData, setAiAnalysisData] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [notification, setNotification] = useState(null);
  const [accent, setAccent] = useState('US'); // 預設口音 (US / UK)
  const [dbError, setDbError] = useState(''); // 記錄資料庫連線或權限錯誤

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
    if (!db || !user?.uid) return;

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
        // 模擬搜尋
        const filteredLocal = search.trim()
          ? localData.filter(w => w.word.toLowerCase().startsWith(search.trim().toLowerCase()))
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
    // 使用動態來源
    // 修正路徑：如果是個人收藏，從使用者自己的私有目錄讀取
    const vocabRef = currentSet === 'Personal'
      ? collection(db, 'Users', user.uid, 'PersonalVocab')
      : collection(db, 'Schools', 'khsh', 'Grades', 'grade_2', 'SchoolVocab'); // 學校共用單字庫

    // 效能優化：若有搜尋字串，直接在服務端過濾 (前綴搜尋)
    if (search.trim()) {
      const searchLower = search.trim().toLowerCase();
      q = query(
        vocabRef,
        where('word', '>=', searchLower),
        where('word', '<=', searchLower + '\uf8ff'),
        limit(30)
      );
    } else {
      // 預設加載前 30 筆，減輕初始渲染與雲端讀取壓力
      const orderField = currentSet === 'Personal' ? 'createdAt' : 'word';
      q = query(vocabRef, orderBy(orderField, 'asc'), limit(30));
    }

    const unsub = onSnapshot(q, (snapshot) => {
      const mainData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setWords(mainData);
      setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
      setDbError('');
      logDebug('INFO', `已加載來源: ${currentSet}`, { count: mainData.length, mode: search ? 'Search' : 'Initial' });
    }, (error) => {
      logDebug('ERROR', '載入單字庫失敗', error.message);
      if (error.code === 'permission-denied') {
        setDbError('權限不足：請先登入 Google 帳號以存取雲端單字庫。');
      } else {
        setDbError(`載入失敗：${error.message}`);
      }
      setWords([]); // 清空以避免無限載入
    });

    return () => unsub();
  }, [search, currentSet, logDebug, user?.uid]);

  // 加載更多 (效能優化)
  const loadMoreWords = useCallback(async () => {
    if (!db || !lastVisible || search.trim()) return;
    if (currentSet === 'Personal' && !user?.uid) return;

    const vocabRef = currentSet === 'Personal'
      ? collection(db, 'Users', user.uid, 'PersonalVocab')
      : collection(db, 'Schools', 'khsh', 'Grades', 'grade_2', 'SchoolVocab');

    const orderField = currentSet === 'Personal' ? 'createdAt' : 'word';
    const q = query(vocabRef, orderBy(orderField, 'asc'), startAfter(lastVisible), limit(30));
    try {
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const moreData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setWords(prev => [...prev, ...moreData]);
        setLastVisible(snapshot.docs[snapshot.docs.length - 1]);
        logDebug('INFO', '已加載更多單字', { count: moreData.length });
      }
    } catch (error) {
      logDebug('ERROR', '載入更多單字失敗', error.message);
    }
  }, [lastVisible, search, currentSet, logDebug, user?.uid]);

  // 合併單字與個人進度 (確保未在當前分頁的個人單字也能被測驗與複習)
  const mergedWords = useMemo(() => {
    const progressMap = new Map(userWords.map(p => [String(p.word || '').toLowerCase(), p]));
    const merged = words.map(w => {
      const wordKey = String(w.word || '').toLowerCase();
      const progress = progressMap.get(wordKey);
      if (progress) progressMap.delete(wordKey); // 移除已匹配的
      return progress ? { ...w, ...progress } : w;
    });
    // 加上剩下那些「沒有在當前 30 筆清單中，但使用者有背過」的單字
    const remainingUserWords = Array.from(progressMap.values());
    return [...merged, ...remainingUserWords];
  }, [words, userWords]);

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
        const batch = writeBatch(db);
        allData.forEach((item, i) => {
          const word = String(item['單字'] || item['word'] || '').trim();
          if (!word) return;
          const ref = doc(db, 'Schools', 'khsh', 'Grades', 'grade_2', 'SchoolVocab', word.toLowerCase());
          batch.set(ref, {
            word: word,
            meaning: String(item['中文'] || item['chinese'] || '').trim(),
            chinese: String(item['中文'] || item['chinese'] || '').trim(),
            pos: String(item['屬性'] || item['pos'] || 'n.').trim(),
            level: String(item['級別'] || item['level'] || 1),
            type: '內建',
            shared: true,
            serialNumber: item['流水號'] || item['編號'] || Date.now() + i,
            date: String(item['日期'] || item['date'] || new Date().toLocaleDateString()),
            updatedAt: serverTimestamp()
          }, { merge: true });
        });
        await batch.commit();
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

    if (isGuest) {
      const localData = JSON.parse(localStorage.getItem('gsat_local_vocab')) || [];
      const index = localData.findIndex(w => w.id === id || w.word.toLowerCase() === wordObj.word.toLowerCase());
      if (index !== -1) {
        localData[index] = { ...localData[index], ...updates, updatedAt: Date.now() };
        localStorage.setItem('gsat_local_vocab', JSON.stringify(localData));
        if (currentSet === 'Personal') setWords([...localData]);
      }
      return;
    }

    const ref = doc(db, 'Users', user.uid, 'PersonalVocab', wordObj.word.toLowerCase());
    await setDoc(ref, {
      ...updates,
      word: wordObj.word,
      updatedAt: serverTimestamp()
    }, { merge: true });

    logDebug('INFO', '已更新單字進度', { word: wordObj.word });
  }, [user?.uid, mergedWords, logDebug]);

  const deleteWord = useCallback(async (id) => {
    if (!user?.uid || !isAdmin) return;
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

        if (!isAdmin && currentSet !== 'Personal') {
          alert("您只能刪除「個人收藏」中的單字喔！");
          return;
        }
        const ref = currentSet === 'Personal'
          ? doc(db, 'Users', user.uid, 'PersonalVocab', wordObj.word.toLowerCase())
          : doc(db, 'Schools', 'khsh', 'Grades', 'grade_2', 'SchoolVocab', wordObj.word.toLowerCase());
        await deleteDoc(ref);
        logDebug('SUCCESS', '已從雲端刪除單字', { word: wordObj.word, set: currentSet });
      }
    } catch (e) {
      logDebug('ERROR', '刪除失敗', e.message);
    }
  }, [user?.uid, isAdmin, mergedWords, logDebug, currentSet]);

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

    if (isGuest) {
      alert("訪客模式無法修改公共單字庫，請先登入喔！");
      return;
    }

    const batch = writeBatch(db);
    newWords.forEach((w, i) => {
      const wordVal = (w.word || '').trim();
      if (!wordVal) return;

      const ref = targetSet === 'Personal'
        ? doc(db, 'Users', user.uid, 'PersonalVocab', wordVal.toLowerCase())
        : doc(db, 'Schools', 'khsh', 'Grades', 'grade_2', 'SchoolVocab', wordVal.toLowerCase());
      const sn = Date.now() + i;

      batch.set(ref, {
        word: wordVal,
        meaning: w.meaning || w.chinese || '',
        chinese: w.meaning || w.chinese || '',
        pos: w.partOfSpeech || w.pos || 'n.',
        level: String(w.level || '1'),
        type: targetSet === 'Personal' ? '個人' : (isAdmin ? (w.source || '教師') : '個人'),
        shared: isAdmin && targetSet !== 'Personal',
        serialNumber: sn,
        tags: w.tags || [], // 確保寫入 tags 陣列
        date: new Date().toLocaleDateString(),
        userEmail: user.email || '',
        createdAt: serverTimestamp()
      }, { merge: true });

      if (shouldPush && targetSet !== 'Personal') pushToGAS(w);
    });

    await batch.commit();
    logDebug('SUCCESS', `已新增 ${newWords.length} 筆單字至 ${targetSet}`);
  }, [user?.uid, user?.email, isAdmin, pushToGAS, logDebug, currentSet]);

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
    } catch (e) {}

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
    <div className="flex flex-col w-full h-full animate-fadeIn pb-8 space-y-4 relative">
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
      `}</style>
      {/* Header */}
      <div className="flex justify-between items-center px-1 shrink-0">
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
          <button onClick={handleExportIG} className="flex items-center justify-center p-2 bg-gradient-to-br from-pink-500 to-orange-400 text-white rounded-xl active:scale-95 transition-all shadow-sm" title="分享至 IG 限時動態">
            <Share2 size={16} />
          </button>

          <button onClick={() => setIsDebugMode(!isDebugMode)} className={`hidden sm:block p-2 rounded-xl transition-all ${isDebugMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'}`} title="切換偵錯模式"><Bug size={16} /></button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="px-1 mb-2">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide bg-slate-200/50 dark:bg-slate-800/50 p-1.5 rounded-[24px] backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-inner">
          {SUB_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setSubTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-[20px] font-black text-[13px] whitespace-nowrap transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] ${subTab === tab.id
                ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-slate-600'
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
      <div key={subTab} className="animate-tab-enter flex-1 overflow-y-auto" onScroll={(e) => {
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
            geminiKey={geminiKey}
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
            triggerNotification={triggerNotification}
            playVoice={playVoice}
            accent={accent}
            setAccent={setAccent}
            dbError={dbError}
          />
        )}
        {subTab === 'review' && <ReviewMode words={todayReview} updateWord={updateWord} incrementWordCount={incrementWordCount} playVoice={playVoice} accent={accent} />}
        {subTab === 'quiz' && <QuizMode words={mergedWords} updateWord={updateWord} setWords={setWords} geminiKey={geminiKey} incrementWordCount={incrementWordCount} playVoice={playVoice} accent={accent} />}
        {subTab === 'import' && <ImportTab addWords={addWords} syncFromGAS={syncFromGAS} isSyncing={isSyncing} isAdmin={isAdmin} geminiKey={geminiKey} />}
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

      {/* 全局通知元件 */}
      {notification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[1000] animate-slide-up-fade">
          <div className={`px-6 py-4 rounded-[24px] border shadow-2xl backdrop-blur-xl flex items-center gap-4 ${notification.type === 'error' ? 'bg-rose-50/90 border-rose-200 text-rose-600 dark:bg-rose-500/20' : 'bg-emerald-50/90 border-emerald-200 text-emerald-600 dark:bg-emerald-500/20'
            }`}>
            <div className={`p-2 rounded-xl ${notification.type === 'error' ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {notification.type === 'error' ? <XCircle size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <div>
              <div className="text-[14px] font-black leading-none mb-1">{notification.title}</div>
              <div className="text-[12px] font-bold opacity-80">{notification.message}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORD BANK
// ═══════════════════════════════════════════════════════════════════════════════
const WordBank = ({
  words, search, setSearch, updateWord, deleteWord, addWords,
  currentSet, setCurrentSet, geminiKey, isAdmin, handleExportIG,
  detailedWordId, setDetailedWordId, analyzingIds, aiAnalysisData,
  setAiAnalysisData, setAnalyzingIds, filterPos, setFilterPos,
  triggerNotification, playVoice, accent, setAccent, dbError
}) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newWord, setNewWord] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newPos, setNewPos] = useState('n.');
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [newTags, setNewTags] = useState(''); // 新增標籤輸入狀態

  const [filterTag, setFilterTag] = useState('all');
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(new Set());
  
  // 記錄本次 session 已經點擊加入收藏的單字 ID，用於即時顯示動畫與狀態
  const [savedWords, setSavedWords] = useState(new Set());

  // 動態萃取所有不重複的標籤
  const availableTags = useMemo(() => {
    const tags = new Set();
    words.forEach(w => {
      if (w.tags && Array.isArray(w.tags)) w.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [words]);

  const filtered = useMemo(() => {
    let list = words;
    if (filterPos !== 'all') list = list.filter(w => (w.partOfSpeech || w.pos) === filterPos);
    if (filterTag !== 'all') list = list.filter(w => w.tags && w.tags.includes(filterTag));
    return list;
  }, [words, filterPos, filterTag]);

  const handleAiAnalyze = async (id, word) => {
    if (!geminiKey) return triggerNotification('需要 API Key', '請先至設定頁面輸入 Gemini API Key', 'error');
    setAnalyzingIds(prev => new Set(prev).add(id));
    try {
      const prompt = `你是一位專業的英文語源學老師與記憶專家。請針對單字 "${word}" 提供結構化解析。
請務必遵守以下規範：
1. **單字拆解**：請在開頭以 [Prefix], [Root], [Suffix] 格式拆解單字。
2. **語源解說**：簡述每個構件的來源與意思。
3. **重點標記**：在解析內容中使用 **粗體** 標註核心關鍵字。
4. **結構化區段**：
1. **結構化區段**：請嚴格使用以下 ### 標題。
   ### [單字構造拆解]
   (格式: **Prefix**: un- (不) + **Root**: break (打破) + **Suffix**: -able (能夠))
   ### [核心記憶與語源]
   （簡短說明單字組成邏輯）
   ### [地道例句搭配]
   （1 個高品質例句與常用搭配詞）
   (格式範例: **Prefix**: un- (不) + **Root**: break (打破) + **Suffix**: -able (能夠)。若無字首字尾請寫 **Root**: word (意思))
   ### [大腦記憶法]
   （提供生動好記的諧音、聯想或故事記憶法，幫助學生秒記這個單字）
   ### [語源與字根詳解]
   （詳細解說這個單字的歷史來源與字根演變）
   ### [實戰例句與搭配詞]
   （提供 1 個進階難度的高品質例句與 2 個常用搭配詞）

請用親切且精簡的繁體中文撰寫，字數控制在 120 字內。直接回傳 Markdown 內容，不要問候語。`;

      const response = await fetchAI(prompt, { geminiKey });
      if (!response) throw new Error('API 回傳為空');
      setAiAnalysisData(prev => ({ ...prev, [id]: response }));

      // 自動同步到單字筆記 (Firestore)
      await updateWord(id, { notes: response });
    } catch (e) {
      setAiAnalysisData(prev => ({ ...prev, [id]: 'ERROR:AI 解析失敗，可能是 API 繁忙或連線異常。' }));
      triggerNotification('解析失敗', '請點擊重試按鈕再試一次', 'error');
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
    if (!geminiKey) return triggerNotification('需要 API Key', '請先設定 Gemini API Key 才能使用此功能', 'error');

    setIsAutoFilling(true);
    try {
      const prompt = `你是一個專業的高中英文老師。請提供單字 "${newWord.trim()}" 的最常見中文解釋與詞性。
請嚴格以 JSON 格式回傳，不要有任何 Markdown 或其他文字：
{"meaning": "繁體中文解釋", "pos": "詞性縮寫(n./v./adj./adv./prep./conj./phr.)"}`;

      const response = await fetchAI(prompt, { geminiKey });
      if (response) {
        const match = response.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          setNewMeaning(parsed.meaning || '');
          setNewPos(parsed.pos || 'n.');
          triggerNotification('AI 填入成功', '已自動帶入解釋與詞性');
        } else {
          throw new Error('無法解析格式');
        }
      } else {
        throw new Error('API 無回應');
      }
    } catch (e) {
      console.error(e);
      triggerNotification('自動填入失敗', '請檢查網路連線或稍後再試，也可直接手動輸入', 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleManualAdd = () => {
    if (!newWord.trim() || !newMeaning.trim()) {
      alert('請輸入單字與解釋');
      return;
    }
    const tagsArray = newTags.split(/[,，\s]+/).filter(t => t.trim() !== ''); // 支援空格或逗號分隔
    const wordObj = { word: newWord.trim(), meaning: newMeaning.trim(), partOfSpeech: newPos, level: 1, source: 'Personal', tags: tagsArray };
    const target = isAdmin ? currentSet : 'Personal';
    addWords([wordObj], target, false);
    if (!isAdmin && currentSet !== 'Personal') setCurrentSet('Personal');
    setNewWord(''); setNewMeaning(''); setNewPos('n.'); setNewTags('');
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
    'phr.': 'text-slate-600 bg-slate-50 dark:text-slate-400 dark:bg-slate-500/10 border-slate-100 dark:border-slate-500/20',
  };

  return (
    <div className="space-y-4">
      {/* 來源選擇與搜尋 */}
      <div className="flex flex-col gap-3">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 px-1">
          {[
            { id: '6000 words', label: '6000 核心單字', icon: <BookOpen size={14} /> },
            { id: 'Teacher Picks', label: '教師推薦', icon: <Sparkles size={14} /> },
            { id: 'Personal', label: '個人收藏', icon: <Heart size={14} /> }
          ].map(set => (
            <button
              key={set.id}
              onClick={() => setCurrentSet(set.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-[12px] font-black whitespace-nowrap transition-all duration-300 ease-spring-smooth active:scale-95 ${currentSet === set.id
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md shadow-slate-900/20 dark:shadow-white/10'
                : 'bg-white/60 dark:bg-white/5 text-slate-500 hover:bg-white dark:hover:bg-white/10 border border-slate-200/50 dark:border-white/5'
                }`}
            >
              <span className={currentSet === set.id ? 'opacity-100' : 'opacity-60'}>{set.icon}</span>
              {set.label}
            </button>
          ))}
        </div>

        <div className="flex gap-3 px-1">
          <div className="flex-1 flex items-center gap-3 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl backdrop-saturate-200 border border-white/60 dark:border-white/10 rounded-[24px] px-5 py-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.04)] dark:shadow-[0_4px_16px_rgba(0,0,0,0.2)] focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-500/30 transition-all duration-300 transform-gpu will-change-transform">
            <Search size={18} className="text-slate-400 shrink-0" />
            <input
              type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="搜尋或輸入單字..."
              className="flex-1 bg-transparent text-[15px] font-bold text-[var(--text-primary)] outline-none placeholder:text-slate-400 w-full"
            />
          </div>
          <button onClick={() => {
            if (words.length === 0) return;
            const randomWord = words[Math.floor(Math.random() * words.length)];
            setFilterPos('all');
            setSearch(randomWord.word);
          }}
            className="p-4 rounded-[24px] shadow-sm bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 active:scale-[0.95] transition-all duration-300 ease-spring shrink-0" title="隨機抽背">
            <Shuffle size={20} />
          </button>
          <button onClick={() => setAccent(a => a === 'US' ? 'UK' : 'US')}
            className="p-4 rounded-[24px] shadow-sm bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/10 active:scale-[0.95] transition-all duration-300 ease-spring shrink-0 flex items-center justify-center font-black text-[18px]" title={accent === 'US' ? '目前為美式，點擊切換為英式發音' : '目前為英式，點擊切換為美式發音'}>
            {accent === 'US' ? '🇺🇸' : '🇬🇧'}
          </button>
          <button onClick={() => setShowAdd(!showAdd)}
            className={`p-4 rounded-[24px] shadow-lg active:scale-[0.95] transition-all duration-300 ease-spring shrink-0 ${showAdd ? 'bg-slate-100 dark:bg-white/10 text-slate-500 rotate-45 shadow-none' : 'bg-emerald-500 text-white shadow-emerald-500/20 hover:bg-emerald-600'}`}>
            <Plus size={20} />
          </button>
          <button onClick={() => { setIsBatchMode(!isBatchMode); setSelectedBatch(new Set()); }}
            className={`p-4 rounded-[24px] shadow-sm transition-all duration-300 ease-spring shrink-0 ${isBatchMode ? 'bg-indigo-500 text-white shadow-indigo-500/20' : 'bg-white dark:bg-white/5 border border-slate-200/50 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10'}`} title="批次管理">
            <CheckCircle2 size={20} />
          </button>
        </div>
      </div>

      {/* 新增單字表單 */}
      {showAdd && (
        <div className="bg-white/40 dark:bg-white/5 backdrop-blur-[24px] px-6 py-7 rounded-[32px] border border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),0_8px_32px_rgba(16,185,129,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] mx-1 animate-slide-up-fade relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <div className="flex items-center justify-between mb-5 relative z-10">
            <h3 className="text-[16px] font-black text-emerald-600 dark:text-emerald-400 flex items-center gap-2 uppercase tracking-widest">
              <Sparkles size={18} /> 新增單字
            </h3>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <input
                  type="text" placeholder="輸入英文單字..." value={newWord} onChange={e => setNewWord(e.target.value)}
                  className="w-full bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 text-[16px] font-black outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all text-[var(--text-primary)] pr-[110px]"
                />
                <button
                  onClick={handleAiAutoFill} disabled={isAutoFilling || !newWord.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 rounded-[16px] text-[12px] font-black active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5 hover:bg-emerald-100"
                >
                  {isAutoFilling ? <RefreshCw size={14} className="animate-spin" /> : <Wand2 size={14} />} AI 填入
                </button>
              </div>
              <div className="w-full sm:w-[140px]">
                <div className="relative h-full">
                  <select value={newPos} onChange={e => setNewPos(e.target.value)} className="w-full h-full bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 text-[16px] font-black outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition-all appearance-none text-[var(--text-primary)]">
                    <option value="n.">n. 名詞</option>
                    <option value="v.">v. 動詞</option>
                    <option value="adj.">adj. 形容詞</option>
                    <option value="adv.">adv. 副詞</option>
                    <option value="prep.">prep. 介系</option>
                    <option value="conj.">conj. 連接</option>
                    <option value="phr.">phr. 片語</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="text" placeholder="輸入中文解釋..." value={newMeaning} onChange={e => setNewMeaning(e.target.value)} className="flex-1 bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 text-[16px] font-black outline-none focus:border-emerald-400 transition-all text-[var(--text-primary)]" />
                <input type="text" placeholder="自訂標籤 (用空格分隔，例: 段考 L1)" value={newTags} onChange={e => setNewTags(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleManualAdd()} className="flex-1 sm:max-w-[200px] bg-white dark:bg-black/20 border border-[var(--border-color)] rounded-[24px] px-6 py-4 text-[14px] font-black outline-none focus:border-emerald-400 transition-all text-[var(--text-primary)]" />
              </div>
              <button onClick={handleManualAdd} className="w-full sm:w-auto px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black text-[16px] shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 whitespace-nowrap">
                <Check size={20} /> 儲存至{isAdmin ? currentSet : '個人收藏'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 詞性過濾 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 py-1">
        {['all', 'n.', 'v.', 'adj.', 'adv.', 'prep.', 'conj.'].map(pos => (
          <button key={pos} onClick={() => setFilterPos(pos)}
            className={`px-4 py-2 rounded-full text-[11px] font-black whitespace-nowrap transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-95 ${filterPos === pos ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10 shadow-sm'}`}>
            {pos === 'all' ? '全部詞性' : pos}
          </button>
        ))}
      </div>
      
      {/* 批次管理工具列 */}
      {isBatchMode && (
        <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/30 p-3 mx-1 rounded-[20px] border border-indigo-200 dark:border-indigo-500/30 animate-slide-up-fade">
          <span className="text-indigo-600 dark:text-indigo-400 font-black text-[13px] ml-2">已選取 {selectedBatch.size} 項</span>
          <div className="flex gap-2">
            {currentSet === 'Personal' || isAdmin ? (
              <button onClick={handleBatchDelete} disabled={selectedBatch.size === 0} className="px-4 py-2 bg-rose-500 disabled:opacity-50 text-white rounded-xl text-[12px] font-black shadow-sm active:scale-95 transition-all">刪除</button>
            ) : null}
            {currentSet !== 'Personal' && (
              <button onClick={handleBatchSave} disabled={selectedBatch.size === 0} className="px-4 py-2 bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-[12px] font-black shadow-sm active:scale-95 transition-all">加入收藏</button>
            )}
          </div>
        </div>
      )}

      {/* 標籤過濾器 (如果有自訂標籤才顯示) */}
      {availableTags.length > 0 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-1 pb-1">
          <button onClick={() => setFilterTag('all')} className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${filterTag === 'all' ? 'bg-indigo-500 text-white shadow-sm' : 'bg-white/40 dark:bg-slate-900/40 border border-white/60 dark:border-white/10 text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-white/10'}`}>
            所有標籤
          </button>
          {availableTags.map(tag => (
            <button key={tag} onClick={() => setFilterTag(tag)} className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap transition-all ${filterTag === tag ? 'bg-indigo-500 text-white shadow-sm scale-105' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/30'}`}>
              <Tag size={12} /> {tag}
            </button>
          ))}
        </div>
      )}

      {/* 錯誤提示 */}
      {dbError && (
        <div className="mx-1 mb-2 p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-[20px] flex items-center gap-3 animate-slide-up-fade">
          <AlertCircle size={20} className="text-red-500 shrink-0" />
          <span className="text-sm font-bold text-red-600 dark:text-red-400">{dbError}</span>
        </div>
      )}

      {/* 單字列表 - 排版優化 */}
      <div className="space-y-4 pb-20 pt-2 px-1">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center py-10 opacity-50">
            <BookOpen size={40} className="mb-2 text-slate-300" />
            <p className="font-bold text-slate-400 text-sm">搜尋不到相關單字</p>
          </div>
        ) : (
          filtered.map((w, idx) => {
            return (
              <div
                key={w.id}
                style={{ animationDelay: `${Math.min(idx * 30, 600)}ms` }}
                className="group flex flex-col bg-white/50 dark:bg-zinc-900/40 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[32px] overflow-hidden transition-all duration-500 ease-spring shadow-[0_8px_20px_rgba(0,0,0,0.03)] dark:shadow-none transform-gpu will-change-transform hover:shadow-lg hover:-translate-y-1 active:scale-[0.98]"
              >
                <div
                  className="flex items-center gap-5 px-6 py-[22px] cursor-pointer relative overflow-hidden"
                  onClick={() => {
                    handleSpeak(null, w.word);
                    setDetailedWordId(w.id);
                  }}
                >
                  {/* 批次選取 Checkbox */}
                  {isBatchMode && (
                    <div className="shrink-0 mr-1 animate-pop-in">
                      <button onClick={(e) => {
                        e.stopPropagation();
                        const next = new Set(selectedBatch);
                        if (next.has(w.id)) next.delete(w.id);
                        else next.add(w.id);
                        setSelectedBatch(next);
                      }} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedBatch.has(w.id) ? 'bg-indigo-500 border-indigo-500 text-white scale-110' : 'border-slate-300 dark:border-slate-600'}`}>
                        {selectedBatch.has(w.id) && <Check size={14} strokeWidth={3} />}
                      </button>
                    </div>
                  )}
                  <div className="flex-1 min-w-0 relative z-10 space-y-2">
                    {/* 第一行：單字 */}
                    <div className="flex items-center justify-between">
                      <span className="text-[24px] font-black tracking-tighter transition-all duration-500 text-slate-900 dark:text-white">
                        {w.word}
                      </span>
                      <div className="flex items-center gap-1 sm:gap-2 transition-all duration-500 text-slate-300">
                        {currentSet !== 'Personal' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (savedWords.has(w.id)) return;
                              setSavedWords(prev => new Set(prev).add(w.id));
                              addWords([w], 'Personal', false);
                            }}
                            className={`p-2 rounded-full transition-all active:scale-90 ${savedWords.has(w.id) ? 'text-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'text-slate-300 hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                            title="加入個人收藏"
                          >
                            <Heart size={22} className={savedWords.has(w.id) ? 'fill-current animate-heart-burst' : ''} />
                          </button>
                        )}
                        <ChevronRight size={22} className="group-hover:translate-x-1" />
                      </div>
                    </div>

                    {/* 第二行：詞性 + 發音 */}
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border leading-none transition-all ${posColors[w.partOfSpeech || w.pos] || 'text-gray-500 bg-gray-500/10 border-gray-100'}`}>
                        {w.partOfSpeech || w.pos}
                      </span>
                      {w.tags && w.tags.map(t => (
                        <span key={t} className="text-[10px] font-black px-2 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-500/20 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 leading-none">
                          #{t}
                        </span>
                      ))}
                      <button
                        onClick={(e) => handleSpeak(e, w.word)}
                        className="p-1.5 text-slate-400 hover:text-emerald-500 bg-slate-100 dark:bg-white/5 hover:bg-emerald-50 dark:hover:bg-emerald-500/20 rounded-xl transition-all active:scale-90"
                        title="發音"
                      >
                        <Volume2 size={16} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); playVoice(w.word, accent, 0.4); }}
                        className="p-1.5 text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 rounded-xl transition-all active:scale-90"
                        title="慢速發音"
                      >
                        🐢
                      </button>
                    </div>

                    {/* 第三行：中文意思 */}
                    <p className="text-[15px] font-bold leading-relaxed break-words whitespace-normal transition-all duration-500 text-slate-400 dark:text-slate-500 line-clamp-1">
                      {w.meaning || w.chinese}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 詳情全屏視窗 */}
      {detailedWordId && (
        <WordDetailOverlay
          word={filtered.find(w => w.id === detailedWordId) || words.find(w => w.id === detailedWordId)}
          analysis={words.find(w => w.id === detailedWordId)?.notes || aiAnalysisData[detailedWordId]}
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
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// REVIEW MODE (Flashcards with SRS)
// ═══════════════════════════════════════════════════════════════════════════════
const ReviewMode = ({ words, updateWord, incrementWordCount, playVoice, accent }) => {
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

  const handleRate = (quality) => {
    const updated = calculateNextReview(current, quality);
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
            {current.partOfSpeech && <span className="text-[13px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg mb-6 pointer-events-none">{current.partOfSpeech}</span>}
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
            <p className="text-[22px] font-black text-emerald-700 dark:text-emerald-400 mb-4 pointer-events-none text-center break-words whitespace-normal px-4">{current.meaning}</p>
            {current.example && <p className="text-[14px] font-bold text-slate-500 dark:text-emerald-100/60 italic max-w-sm pointer-events-none text-center break-words whitespace-normal px-4">"{current.example}"</p>}

            {/* 發音控制區 */}
            <div className="flex items-center gap-4 my-2 pointer-events-auto">
              <button onClick={(e) => { e.stopPropagation(); playVoice(current.word, accent); }} className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full hover:scale-110 active:scale-90 transition-transform shadow-sm flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20"><Volume2 size={24}/></button>
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
const QuizMode = ({ words, updateWord, setWords, geminiKey, incrementWordCount, playVoice, accent }) => {
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

  const playDing = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
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

  useEffect(() => {
    if (quizDone) playVictory();
  }, [quizDone, playVictory]);

  const generateChoiceQuiz = useCallback(() => {
    if (words.length < 4) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, Math.min(quizCount, words.length)).map(w => {
      const wrongOptions = words.filter(o => o.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [...wrongOptions.map(o => o.meaning), w.meaning].sort(() => Math.random() - 0.5);
      return { word: w, options, answer: w.meaning };
    });
    setQuestions(qs);
    setQIdx(0); setScore(0); setSelected(null); setShowResult(false); setQuizDone(false);
    setQuizType('choice');
  }, [words, quizCount]);

  const generateSpellQuiz = useCallback(() => {
    if (words.length < 1) return;
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    const qs = shuffled.slice(0, Math.min(quizCount, words.length)).map(w => ({
      word: w, answer: w.word.toLowerCase()
    }));
    setQuestions(qs);
    setQIdx(0); setScore(0); setSpellInput(''); setShowResult(false); setQuizDone(false); setSpellFailed(false);
    setQuizType('spell');
  }, [words, quizCount]);

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
    }
    // Update SRS
    if (questions[qIdx].word) {
      const updated = calculateNextReview(questions[qIdx].word, isCorrect ? 4 : 1);
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
          const updated = calculateNextReview(questions[qIdx].word, 4);
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
        <div className="flex gap-3">
          <button onClick={() => setQuizType(null)} className="px-6 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-2xl font-black active:scale-95 transition-all">返回</button>
          <button onClick={() => { setQIdx(0); setScore(0); setSelected(null); setShowResult(false); setQuizDone(false); }}
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
          <p className="text-[12px] sm:text-[13px] font-black text-slate-400 bg-slate-100 dark:bg-white/10 px-3 py-1 rounded-lg inline-block mt-2 sm:mt-3">{q.word.partOfSpeech}</p>
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
          <span className="text-[24px] sm:text-[32px] font-black text-slate-900 dark:text-white px-4 block leading-tight">{q.word.meaning}</span>
          {q.word.partOfSpeech && <p className="text-[12px] font-bold text-slate-400 mt-2">({q.word.partOfSpeech})</p>}
        </div>
        <div className="space-y-3">
          <input ref={spellRef} autoFocus type="text" value={spellInput} onChange={e => setSpellInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (!showResult || spellFailed) && handleSpellSubmit()}
            disabled={showResult && !spellFailed}
            className={`w-full text-center text-[22px] sm:text-[24px] font-black py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] border-2 outline-none transition-all duration-300 tracking-widest ${
              showResult && !spellFailed
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
const ImportTab = ({ addWords, syncFromGAS, isSyncing, isAdmin, geminiKey }) => {
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
                      結構如下：[{"word": "單字", "meaning": "中文", "partOfSpeech": "詞性(n./v./adj./adv./prep./conj.)", "example": "英文例句"}]
                      注意事項：
                      1. 只輸出 JSON 陣列，不要有其他文字。
                      2. 盡力確保拼寫正確。
                      3. 詞性必須符合規範縮寫。`;

      // 3. 調用 Gemini Vision API (這裡假設 fetchAI 支援 Vision 或直接實作)
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey || localStorage.getItem('gsat_gemini_key')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: file.type, data: base64Data } }
              ]
            }]
          })
        }
      );

      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

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
    addWords(preview);
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
