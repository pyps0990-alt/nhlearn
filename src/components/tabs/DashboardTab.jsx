import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles, Clock, BellRing, Calendar, RefreshCw,
  Image as ImageIcon, Trash2, MapPin, Plus,
  Globe, AlertCircle, BookText, Utensils, Bell,
  Sun, Moon, Coffee, ChevronRight, ArrowUpDown, Check,
  Timer, Play, Pause, RotateCcw, Zap, ExternalLink, Notebook, Search, Flame,
  CheckCircle2, PenTool, UserPlus, UserMinus,
  Languages, Calculator, Beaker, Dna, History, Map as MapIcon, Scale, Library, GraduationCap, TrendingUp,
  Music, Palette, Trophy, Laptop, Lightbulb, GripVertical
} from 'lucide-react';

import { fetchAI } from '../../utils/helpers';

const WEEKDAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
const ICON_MAP = {
  BookText, Languages, Calculator, Zap, Beaker, Dna,
  History, Map: MapIcon, Scale, Library, Globe, GraduationCap,
  Music, Palette, Trophy, Laptop, PenTool, Lightbulb
};

// === 外部函式與常數 ===
const getGreeting = () => {
  const h = new Date().getHours();
  if (5 <= h && h < 12) return { text: '早安', icon: Sun, time: 'morning' };
  if (12 <= h && h < 18) return { text: '午安', icon: Coffee, time: 'afternoon' };
  return { text: '晚安', icon: Moon, time: 'evening' };
};

const INITIAL_WEEKLY_SCHEDULE = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };

// --- 快顯時鐘元件解決頻繁重繪問題 ---
const LiveClock = React.memo(() => {
  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const update = () => setTime(new Date());
    const timer = setInterval(update, 1000);
    const handleVisibility = () => document.visibilityState === 'visible' && update();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
  return (
    <span className="text-slate-800 dark:text-white text-[24px] font-black font-mono tracking-tight">
      {time.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  );
});

const ENCOURAGEMENTS = [
  "辛苦了！今天的學習非常有價值",
  "太棒了，離夢想又進了一步",
  "深呼吸，給努力的自己一個讚",
  "今日份的努力已打卡，好好休息吧",
  "學會休息，是為了走更長遠的路"
];

const getDaysLeft = (targetDate) => {
  const diff = new Date(targetDate) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

const ALL_DAYS = [
  { id: 1, label: '週一' }, { id: 2, label: '週二' }, { id: 3, label: '週三' },
  { id: 4, label: '週四' }, { id: 5, label: '週五' }, { id: 6, label: '週六' }, { id: 0, label: '週日' }
];

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getLinkIcon = (iconName) => {
  return (ICON_MAP && ICON_MAP[iconName]) ? ICON_MAP[iconName] : Globe;
};

// 供課表使用的圖示庫
const DASHBOARD_ICONS = [
  'BookText', 'Languages', 'Calculator', 'Zap', 'Beaker', 'Dna',
  'History', 'Map', 'Scale', 'Library', 'Globe', 'GraduationCap',
  'Music', 'Palette', 'Trophy', 'Laptop', 'PenTool', 'Lightbulb'
];

// 判斷課表單項的圖示
const getSubjectIcon = (item, subjects) => {
  if (item.icon && ICON_MAP[item.icon]) return ICON_MAP[item.icon];
  const s = subjects?.find(sub => sub.name === item.subject);
  if (s && s.icon && ICON_MAP[s.icon]) return ICON_MAP[s.icon];
  return BookText;
};

const THEME_COLORS = {
  emerald: {
    key: 'emerald', hex: 'bg-emerald-500', text: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20',
    activeBg: 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/30', ring: 'ring-emerald-500/20'
  },
  blue: {
    key: 'blue', hex: 'bg-blue-500', text: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20',
    activeBg: 'bg-gradient-to-br from-blue-500 to-indigo-500 text-white shadow-blue-500/30', ring: 'ring-blue-500/20'
  },
  rose: {
    key: 'rose', hex: 'bg-rose-500', text: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20',
    activeBg: 'bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-rose-500/30', ring: 'ring-rose-500/20'
  },
  amber: {
    key: 'amber', hex: 'bg-amber-500', text: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20',
    activeBg: 'bg-gradient-to-br from-amber-500 to-orange-400 text-white shadow-amber-500/30', ring: 'ring-amber-500/20'
  },
  purple: {
    key: 'purple', hex: 'bg-purple-500', text: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20',
    activeBg: 'bg-gradient-to-br from-purple-500 to-fuchsia-500 text-white shadow-purple-500/30', ring: 'ring-purple-500/20'
  },
  indigo: {
    key: 'indigo', hex: 'bg-indigo-500', text: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20',
    activeBg: 'bg-gradient-to-br from-indigo-500 to-blue-500 text-white shadow-indigo-500/30', ring: 'ring-indigo-500/20'
  },
  slate: {
    key: 'slate', hex: 'bg-slate-500', text: 'text-slate-500',
    bg: 'bg-slate-50 dark:bg-slate-500/10', border: 'border-slate-200 dark:border-slate-500/20',
    activeBg: 'bg-gradient-to-br from-slate-600 to-gray-500 text-white shadow-slate-500/30', ring: 'ring-slate-500/20'
  }
};

const getSubjectTheme = (item, subjects) => {
  let targetColorKey = item.color;
  if (!targetColorKey && subjects) {
    const s = subjects.find(sub => sub.name === item.subject);
    if (s && s.color) {
      if (THEME_COLORS[s.color]) targetColorKey = s.color;
      else {
        const match = s.color.match(/text-([a-z]+)-/);
        if (match && THEME_COLORS[match[1]]) targetColorKey = match[1];
      }
    }
  }
  if (!targetColorKey || !THEME_COLORS[targetColorKey]) targetColorKey = 'emerald';
  return THEME_COLORS[targetColorKey];
};


// === 🍅 Focus Timer (Pomodoro) Widget ===
const FOCUS_QUOTES = [
  "專注的力量，會帶你去想去的地方 🚀",
  "深呼吸，你正在變得更強 💪",
  "每一分鐘的專注都是對未來的投資 📈",
  "全神貫注，這就是你的武器 ⚔️",
  "休息是為了走更長遠的路 🌱"
];

const FocusTimerWidget = ({ triggerNotification }) => {
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  const [duration, setDuration] = useState(25 * 60); // seconds
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessions, setSessions] = useState(() => Number(localStorage.getItem('gsat_pomo_sessions') || '0'));
  const [expanded, setExpanded] = useState(false);
  const intervalRef = useRef(null);

  // 白噪音狀態與音軌控制
  const [noiseType, setNoiseType] = useState('none');
  const noiseNodeRef = useRef(null);
  const audioCtx = useRef(null);

  const playDing = useCallback(() => {
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 880; osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.8);
    } catch { }
  }, []);

  const stopNoise = useCallback(() => {
    if (noiseNodeRef.current) {
      try { noiseNodeRef.current.stop(); } catch (e) { }
      noiseNodeRef.current.disconnect();
      noiseNodeRef.current = null;
    }
  }, []);

  // 🚀 純 Web Audio API 演算出的沉浸式下雨白噪音 (不需載入任何外部資源)
  const playNoise = useCallback((type) => {
    stopNoise();
    if (type === 'none') return;
    try {
      const ctx = audioCtx.current || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
      audioCtx.current = ctx;
      const bufferSize = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let lastOut = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brownian noise 演算法，聽起來極度類似下雨聲/海浪聲
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5;
      }
      const node = ctx.createBufferSource();
      node.buffer = buffer;
      node.loop = true;
      const gain = ctx.createGain();
      gain.gain.value = type === 'rain' ? 0.3 : 0.05; // 控制下雨聲或輕微海浪聲的音量
      node.connect(gain);
      gain.connect(ctx.destination);
      node.start(0);
      noiseNodeRef.current = node;
    } catch (e) { console.error("Audio error", e); }
  }, [stopNoise]);

  const expectedEndTimeRef = useRef(null);

  useEffect(() => {
    if (isRunning) {
      // 🚀 核心修復：儲存絕對結束時間，抵禦 iOS 背景凍結
      expectedEndTimeRef.current = Date.now() + timeLeft * 1000;

      const tick = () => {
        const remaining = Math.round((expectedEndTimeRef.current - Date.now()) / 1000);
        setTimeLeft(Math.max(0, remaining));
      };

      intervalRef.current = setInterval(tick, 1000);

      // 當手機解鎖或 App 從背景喚醒時，立刻校正一次時間
      const handleVisibility = () => {
        if (document.visibilityState === 'visible') tick();
      };
      document.addEventListener('visibilitychange', handleVisibility);

      return () => {
        clearInterval(intervalRef.current);
        document.removeEventListener('visibilitychange', handleVisibility);
      };
    }
  }, [isRunning]);

  useEffect(() => {
    if (isRunning && timeLeft <= 0) {
      setIsRunning(false);
      playDing();
      stopNoise(); // 結束時自動停止白噪音
      if (mode === 'focus') {
        const newCount = sessions + 1;
        setSessions(newCount);
        localStorage.setItem('gsat_pomo_sessions', String(newCount));
        triggerNotification?.('專注完成 🎉', FOCUS_QUOTES[newCount % FOCUS_QUOTES.length]);
        setMode('break');
        setDuration(5 * 60);
        setTimeLeft(5 * 60);
      } else {
        triggerNotification?.('休息結束 ☕', '準備好進入下一個專注時段了嗎？');
        setMode('focus');
        setDuration(25 * 60);
        setTimeLeft(25 * 60);
      }
    }
  }, [timeLeft, isRunning, mode, sessions, playDing, stopNoise, triggerNotification]);

  // 當使用者手動暫停時，自動暫停白噪音；繼續時自動恢復
  useEffect(() => {
    if (isRunning && noiseType !== 'none') {
      playNoise(noiseType);
    } else {
      stopNoise();
    }
  }, [isRunning, noiseType, playNoise, stopNoise]);

  const reset = () => { setIsRunning(false); setTimeLeft(duration); stopNoise(); };
  const progress = duration > 0 ? ((duration - timeLeft) / duration) * 100 : 0;
  const mins = String(Math.floor(timeLeft / 60)).padStart(2, '0');
  const secs = String(timeLeft % 60).padStart(2, '0');

  // SVG circular progress
  const radius = 54, stroke = 6;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center gap-4 p-4 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 rounded-[28px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98] group"
      >
        <div className={`p-3 rounded-2xl transition-colors ${mode === 'focus' ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
          <Timer size={24} className={mode === 'focus' ? 'text-rose-500' : 'text-emerald-500'} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-[16px] font-black text-slate-800 dark:text-white block leading-tight">專注模式</span>
          <span className="text-[12px] font-bold text-slate-400 dark:text-gray-500">番茄鐘 · 今日已完成 {sessions} 輪</span>
        </div>
        <div className="flex items-center gap-1 text-emerald-500 group-hover:translate-x-1 transition-transform">
          <Zap size={16} />
          <ChevronRight size={16} />
        </div>
      </button>
    );
  }

  return (
    <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 rounded-[36px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] animate-slide-up-fade">
      {/* Header */}
      <div className={`px-6 py-4 flex items-center justify-between ${mode === 'focus' ? 'bg-gradient-to-r from-rose-500/10 to-orange-500/10 dark:from-rose-950/40 dark:to-orange-950/40' : 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 dark:from-emerald-950/40 dark:to-teal-950/40'}`}>
        <div className="flex items-center gap-3">
          <Timer size={20} className={mode === 'focus' ? 'text-rose-500' : 'text-emerald-500'} />
          <span className="text-[14px] font-black text-slate-800 dark:text-white">
            {mode === 'focus' ? '🍅 專注時段' : '☕ 休息時段'}
          </span>
          <span className="text-[11px] font-bold text-slate-400 dark:text-gray-500 bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-full">
            第 {sessions + 1} 輪
          </span>
        </div>
        <button onClick={() => setExpanded(false)} className="text-[12px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors px-2 py-1">收合</button>
      </div>

      {/* Timer Body */}
      <div className="flex flex-col items-center py-8 px-6">
        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90 filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]" viewBox="0 0 120 120">
            <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-white/60 dark:text-white/5" />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              strokeWidth={stroke} strokeLinecap="round"
              stroke={mode === 'focus' ? '#f43f5e' : '#10b981'}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear opacity-40 blur-[4px]"
            />
            <circle
              cx="60" cy="60" r={radius} fill="none"
              strokeWidth={stroke} strokeLinecap="round"
              stroke={mode === 'focus' ? '#f43f5e' : '#10b981'}
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              className="transition-all duration-1000 ease-linear"
              style={{ filter: `drop-shadow(0 2px 6px ${mode === 'focus' ? 'rgba(244,63,94,0.6)' : 'rgba(16,185,129,0.6)'})` }}
            />
          </svg>
          <div className="absolute inset-3 rounded-full bg-white/30 dark:bg-black/20 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_4px_16px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_16px_rgba(0,0,0,0.2)] border border-white/50 dark:border-white/10 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-[36px] font-black text-slate-900 dark:text-white font-mono tracking-tight leading-none">{mins}:{secs}</span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">
              {mode === 'focus' ? 'Focus' : 'Break'}
            </span>
          </div>
        </div>

        {/* 白噪音選擇器 */}
        <div className="flex gap-2 mb-6 bg-white/40 dark:bg-black/20 p-1.5 rounded-[20px] backdrop-blur-md">
          {[{ id: 'none', icon: '🔇 無', label: '關閉' }, { id: 'rain', icon: '🌧️ 雨聲', label: '下雨' }, { id: 'wave', icon: '🌊 海浪', label: '海浪' }].map(n => (
            <button
              key={n.id}
              onClick={() => setNoiseType(n.id)}
              className={`px-4 py-2.5 rounded-[16px] text-[12px] font-black transition-all duration-300 ease-spring-smooth ${noiseType === n.id
                ? (mode === 'focus' ? 'bg-rose-500 text-white shadow-md' : 'bg-emerald-500 text-white shadow-md')
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-white hover:bg-white/50 dark:hover:bg-white/10'
                }`}
            >{n.icon}</button>
          ))}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="p-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-90"
          >
            <RotateCcw size={20} />
          </button>
          <button
            onClick={() => setIsRunning(!isRunning)}
            className={`p-5 rounded-full shadow-lg transition-all active:scale-90 ${mode === 'focus'
              ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white shadow-rose-500/30 hover:shadow-rose-500/50'
              : 'bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-emerald-500/30 hover:shadow-emerald-500/50'
              }`}
          >
            {isRunning ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </button>
          <button
            onClick={() => {
              setIsRunning(false);
              if (mode === 'focus') { setMode('break'); setDuration(5 * 60); setTimeLeft(5 * 60); }
              else { setMode('focus'); setDuration(25 * 60); setTimeLeft(25 * 60); }
            }}
            className="p-3 rounded-2xl bg-gray-100 dark:bg-white/5 text-slate-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10 transition-all active:scale-90 text-[11px] font-black"
          >
            {mode === 'focus' ? '☕' : '🍅'}
          </button>
        </div>

        {/* Session count */}
        <div className="flex items-center gap-2 mt-6">
          {[...Array(Math.min(sessions, 8))].map((_, i) => (
            <div key={i} className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.5)]" />
          ))}
          {sessions > 8 && <span className="text-[10px] font-black text-slate-400">+{sessions - 8}</span>}
          {sessions === 0 && <span className="text-[11px] font-bold text-slate-400 dark:text-gray-500">尚未完成任何專注時段</span>}
        </div>
      </div>
    </div>
  );
};

// === 校園新聞 Widget 元件 ===
const SchoolNewsWidget = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // 官網新聞首頁備用連結
  const NEWS_PAGE_URL = "https://www.nhsh.tp.edu.tw/content?a=T0RESU5qYzNPVE01TlRFPTBjVE0zRWpOeDRrVGludGVseQ==&c=T0RESU9ERXhNamsyTVRnPTNrek01RWpOeElrVGludGVseQ==";

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        // 呼叫 Vercel 後端 API
        const response = await fetch('/api/getNews');

        if (!response.ok) throw new Error('無法取得資料');

        const data = await response.json();

        if (Array.isArray(data) && data.length > 0) {
          setNews(data);
          setError(false);
        } else {
          throw new Error('沒有資料');
        }
      } catch (err) {
        setError(true);
        setNews([
          { title: "目前無法取得最新公告，請點擊跳轉官網查看", date: "系統通知" }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  return (
    <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 mt-5 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)]">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <h3 className="text-[16px] font-black text-slate-800 dark:text-gray-100 flex items-center gap-2">
          <MapPin className={error ? "text-orange-400 shrink-0" : "text-blue-500 shrink-0"} size={20} />
          {error ? "官網連線中" : "最新公告"}
        </h3>
        <a href={NEWS_PAGE_URL} target="_blank" rel="noreferrer" className="text-[12px] font-black text-blue-600 dark:text-blue-400 hover:underline">
          查看更多
        </a>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <RefreshCw size={20} className="text-gray-200 dark:text-gray-700 animate-spin shrink-0" />
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, idx) => (
            <a
              key={idx}
              href={item.link || NEWS_PAGE_URL}
              target="_blank"
              rel="noreferrer"
              className="block p-4 bg-white/50 dark:bg-white/5 backdrop-blur-md hover:bg-white/80 dark:hover:bg-white/10 border border-white/60 dark:border-white/10 rounded-[28px] transition-all duration-500 ease-spring group active:scale-[0.98] hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(59,130,246,0.15)] relative z-10"
            >
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className={`text-[11px] font-black ${error ? 'text-orange-400' : 'text-blue-500/70 dark:text-blue-400/70'}`}>
                    {item.date}
                  </div>
                  {error ? (
                    <AlertCircle size={12} className="text-orange-300 shrink-0" />
                  ) : (
                    <Plus size={12} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  )}
                </div>
                <div className="text-[13.5px] font-black text-slate-800 dark:text-gray-200 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors leading-snug">
                  {item.title}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// === AI Daily Briefing Component ===
// === AI Floating Assistant Component ===
const AiBriefing = React.memo(({ weeklySchedule, contactBook, user }) => {
  const [briefing, setBriefing] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [lastGenerated, setLastGenerated] = useState(0);

  const generateBriefing = useCallback(async (isManual = false) => {
    const isThrottleActive = Date.now() - lastGenerated < 5 * 60 * 1000;
    if (!isManual && isThrottleActive && briefing) return;
    if (loading) return;

    setLoading(true);
    try {
      const today = new Date();
      const day = today.getDay();
      const dateStr = today.toISOString().split('T')[0];
      const todayClasses = (weeklySchedule && weeklySchedule[day]) || [];
      const todayTasks = (contactBook && contactBook[dateStr]) || [];

      const prompt = `你是一位親切、幽默的學習小助手。請根據以下資訊，為學生寫一段大約 80 字的今日摘要。
      - 今日課程：${todayClasses.map(c => c.subject).join(', ') || '無'}
      - 重點任務：${todayTasks.map(t => (t.homework ? `作業:${t.homework}` : `考試:${t.exam}`)).join('; ') || '無'}
      請用輕鬆幽默的語氣，最後加一句鼓勵的話。`;

      const result = await fetchAI(prompt, { temperature: 0.8 });
      if (result) {
        setBriefing(result);
        setLastGenerated(Date.now());
      }
    } catch (e) {
      console.error("AI Briefing failed", e);
    } finally {
      setLoading(false);
    }
  }, [weeklySchedule, contactBook, lastGenerated, briefing, loading]);

  useEffect(() => {
    generateBriefing(false);
  }, [generateBriefing]);

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-3">
      {/* 氣泡對話框 */}
      {isOpen && (
        <div className="w-[280px] sm:w-[320px] p-5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-[28px] border border-white/60 dark:border-white/10 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-5 duration-300">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-indigo-500 font-black text-[14px]">
              <Sparkles size={16} />
              AI 學習小助手
            </div>
            <button
              onClick={() => generateBriefing(true)}
              className="p-1.5 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
              <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''} text-slate-400`} />
            </button>
          </div>

          <div className="min-h-[60px]">
            {loading ? (
              <div className="space-y-2 py-2">
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-full animate-pulse" />
                <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full w-[80%] animate-pulse" />
              </div>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-slate-600 dark:text-gray-300 font-bold">
                {briefing || '正在準備你的學習建議...'}
              </p>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex justify-end">
            <button
              onClick={() => setIsOpen(false)}
              className="text-[12px] font-black text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              我知道了
            </button>
          </div>
        </div>
      )}

      {/* 主按鈕 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-500 hover:scale-110 active:scale-95 group relative ${isOpen ? 'bg-zinc-900 text-white rotate-90' : 'bg-gradient-to-br from-indigo-500 to-emerald-500 text-white'
          }`}
      >
        {isOpen ? (
          <Plus className="rotate-45" size={24} />
        ) : (
          <>
            <Sparkles size={24} />
            {!briefing && loading && (
              <div className="absolute inset-0 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
            )}
          </>
        )}
      </button>
    </div>
  );
});

// === GitHub 風格學習熱力圖 Widget ===
const LearningHeatmapWidget = React.memo(({ streak }) => {
  const stats = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('gsat_vocab_stats')) || {}; }
    catch { return {}; }
  }, []);

  const { days, monthLabels } = useMemo(() => {
    const today = new Date();
    const currentDayOfWeek = today.getDay(); // 0(Sun) - 6(Sat)
    const weeksToShow = 14;
    const totalDays = weeksToShow * 7;

    const startDate = new Date(today);
    startDate.setDate(today.getDate() - (weeksToShow - 1) * 7 - currentDayOfWeek);

    const daysArr = [];
    const mLabels = [];
    let lastMonth = -1;

    const formatDate = (dateObj) => {
      const y = dateObj.getFullYear();
      const m = String(dateObj.getMonth() + 1).padStart(2, '0');
      const d = String(dateObj.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };

    const todayStr = formatDate(today);

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const dateStr = formatDate(d);
      const isFuture = d > today;
      const dayStats = stats[dateStr] || { words: 0, time: 0 };

      const totalMins = Math.floor((dayStats.time || 0) / 60);
      const words = dayStats.words || 0;

      // 計算活躍等級 0~4
      let level = 0;
      if (totalMins >= 90 || words >= 100) level = 4;
      else if (totalMins >= 45 || words >= 50) level = 3;
      else if (totalMins >= 20 || words >= 20) level = 2;
      else if (totalMins > 0 || words > 0) level = 1;

      let colorClass = 'bg-slate-100 dark:bg-white/5';
      if (!isFuture) {
        if (level === 4) colorClass = 'bg-emerald-600 dark:bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.4)] z-10';
        else if (level === 3) colorClass = 'bg-emerald-500 dark:bg-emerald-500';
        else if (level === 2) colorClass = 'bg-emerald-400 dark:bg-emerald-600/80';
        else if (level === 1) colorClass = 'bg-emerald-200 dark:bg-emerald-800/60';
      } else {
        colorClass = 'bg-transparent';
      }

      daysArr.push({ date: dateStr, level, colorClass, isFuture, stats: dayStats, isToday: dateStr === todayStr });

      if (d.getDay() === 0) {
        if (d.getMonth() !== lastMonth) {
          mLabels.push({ colIndex: i / 7, label: d.toLocaleString('zh-TW', { month: 'short' }) });
          lastMonth = d.getMonth();
        }
      }
    }
    return { days: daysArr, monthLabels: mLabels };
  }, [stats]);

  return (
    <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[36px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-[600ms] hover:-translate-y-1 animate-slide-up-fade">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[16px] font-black text-slate-800 dark:text-white flex items-center gap-2 tracking-tight">
          <TrendingUp className="text-emerald-500" size={20} /> 學習熱力圖
        </h3>
        {streak > 0 && (
          <div className="flex items-center gap-1.5 text-[11px] font-black text-orange-600 bg-orange-50 dark:bg-orange-500/20 dark:text-orange-400 px-3 py-1.5 rounded-xl border border-orange-100 dark:border-orange-500/30 shadow-sm animate-pulse-slow">
            <Flame size={14} /> 連續打卡 {streak} 天
          </div>
        )}
      </div>

      <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 pb-2">
        <div className="relative h-4 mb-1 text-[10px] font-bold text-slate-400" style={{ width: `${14 * 20}px` }}>
          {monthLabels.map((m, idx) => (
            <span key={idx} className="absolute top-0" style={{ left: `${m.colIndex * 20}px` }}>{m.label}</span>
          ))}
        </div>
        <div className="flex gap-2 min-w-max">
          <div className="flex flex-col gap-[5px] text-[9px] font-bold text-slate-400 justify-between mt-1">
            <span>日</span><span className="opacity-0">一</span><span>二</span>
            <span className="opacity-0">三</span><span>四</span><span className="opacity-0">五</span><span>六</span>
          </div>
          <div className="grid grid-flow-col gap-[5px]" style={{ gridTemplateRows: 'repeat(7, 1fr)' }}>
            {days.map((d, i) => (
              <div
                key={i}
                title={d.isFuture ? '未來' : `${d.date}\n專注: ${Math.floor((d.stats.time || 0) / 60)} 分鐘\n單字: ${d.stats.words || 0} 個`}
                className={`relative w-[15px] h-[15px] rounded-[4px] ${d.colorClass} transition-all duration-300 hover:scale-125 cursor-pointer ${d.isToday ? 'ring-2 ring-emerald-500/50 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end items-center gap-1.5 mt-4 text-[10px] font-bold text-slate-400">
        <span className="mr-1">Less</span>
        <div className="w-3 h-3 rounded-[3px] bg-slate-100 dark:bg-white/5" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-200 dark:bg-emerald-800/60" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-400 dark:bg-emerald-600/80" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-500 dark:bg-emerald-500" />
        <div className="w-3 h-3 rounded-[3px] bg-emerald-600 dark:bg-emerald-400" />
        <span className="ml-1">More</span>
      </div>
    </div>
  );
});

// === 儀表板主元件 ===
const DashboardTab = ({
  isAdmin, weeklySchedule, setWeeklySchedule, subjects, triggerNotification,
  customLinks, contactBook, isEditingSchedule, setIsEditingSchedule, classID, navToSettings,
  saveToFirestore, customCountdowns, dashboardLayout,
  setContactBook, saveContactBookToFirestore, user
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [scheduleView, setScheduleView] = useState('daily'); // 'daily' | 'weekly'

  // --- Dashboard 狀態 ---
  const [editDayTab, setEditDayTab] = useState(() => {
    const today = new Date().getDay();
    return (today === 0 || today === 6) ? 1 : today;
  });
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);
  const [isSwapMode, setIsSwapMode] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState([]); // Array of 2 IDs
  const [streak, setStreak] = useState(0);

  // --- 課表拖曳狀態 ---
  const [draggedScheduleIdx, setDraggedScheduleIdx] = useState(null);

  // --- 自訂代課彈窗狀態 ---
  const [showSubModal, setShowSubModal] = useState(false);
  const [subModalData, setSubModalData] = useState(null);
  const [subInputVal, setSubInputVal] = useState('');

  useEffect(() => {
    try {
      const stats = JSON.parse(localStorage.getItem('gsat_vocab_stats')) || {};
      const todayStr = new Date().toISOString().split('T')[0];
      let currentStreak = 0;
      let tempDate = new Date();
      while (true) {
        const dStr = tempDate.toISOString().split('T')[0];
        const s = stats[dStr];
        if (s && (s.words > 0 || s.time > 0)) {
          currentStreak++;
          tempDate.setDate(tempDate.getDate() - 1);
        } else {
          if (dStr === todayStr) tempDate.setDate(tempDate.getDate() - 1);
          else break;
        }
      }
      setStreak(currentStreak);
    } catch (e) { }
  }, []);

  // 檢查是否有任何課表資料
  const hasScheduleData = useMemo(() => {
    if (!weeklySchedule) return false;
    return Object.values(weeklySchedule).some(dayArr => dayArr && dayArr.length > 0);
  }, [weeklySchedule]);

  const displaySchedule = previewSchedule || weeklySchedule;

  // 定期更新時間
  useEffect(() => {
    const update = () => setCurrentTime(new Date());
    const timer = setInterval(update, 60000); // 🚀 效能優化：降至每分鐘更新，避免整頁頻繁重繪卡死手機
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  const encouragement = useMemo(() => {
    const seed = new Date().toDateString();
    let hash = 0;
    for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    return ENCOURAGEMENTS[Math.abs(hash) % ENCOURAGEMENTS.length];
  }, []);

  // --- 智慧日期與「20:00 預習」邏輯 ---
  const { targetDay, isTomorrowMode, displayDate, targetDateStr, isWeekendRest } = useMemo(() => {
    const now = new Date(currentTime);
    const day = now.getDay();
    const hours = now.getHours();
    const currentMins = hours * 60 + now.getMinutes();

    const todayClasses = (weeklySchedule && weeklySchedule[day]) || [];
    const hasSat = weeklySchedule && weeklySchedule[6] && weeklySchedule[6].length > 0;
    const hasSun = weeklySchedule && weeklySchedule[0] && weeklySchedule[0].length > 0;

    const hasSchedule = Object.values(weeklySchedule || {}).some(dayArr => dayArr && dayArr.length > 0);

    let weekendRest = false;
    // 只有在今天沒有任何課程，且「有設定任何課表」時，才判斷是否為休息日
    if (hasSchedule && todayClasses.length === 0) {
      if (day === 6 && !hasSat) weekendRest = true;
      if (day === 0 && !hasSun && hours < 20) weekendRest = true;
      if (day === 5 && !hasSat && !hasSun) weekendRest = true; // 週五沒課，且六日也沒課
    }

    let tDay = day;
    let display = new Date(now);
    let tomorrowMode = false;

    // 💡 優化：如果今天有課，過了最後一堂課的結束時間，就自動切換成明天模式
    // 若今天沒課，預設下午 13:00 後切換為明天模式
    if (todayClasses.length > 0) {
      const lastClassMins = todayClasses.reduce((max, c) => Math.max(max, timeToMins(c.endTime)), 0);
      if (currentMins >= lastClassMins) {
        tomorrowMode = true;
      }
    } else {
      if (hours >= 13) {
        tomorrowMode = true;
      }
    }

    if (tomorrowMode) {
      tDay = (tDay + 1) % 7;
      display.setDate(display.getDate() + 1);
    }

    // 若目標日期是週末，而且週末「沒有排課」，才自動跳轉到週一
    if (!weekendRest && (tDay === 0 || tDay === 6)) {
      if (!weeklySchedule || !weeklySchedule[tDay] || weeklySchedule[tDay].length === 0) {
        const daysUntilMonday = tDay === 0 ? 1 : 2;
        tDay = 1;
        display.setDate(display.getDate() + daysUntilMonday);
      }
    }

    return {
      targetDay: tDay,
      isTomorrowMode: tomorrowMode,
      displayDate: display.toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' }),
      targetDateStr: display.toISOString().split('T')[0],
      isWeekendRest: weekendRest
    };
  }, [currentTime, weeklySchedule]);

  // --- 💡 當前課程進度計算 ---
  const { currentClass, currentProgress, hasClassesToday, currentClassProgress } = useMemo(() => {
    const realDay = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes() + currentTime.getSeconds() / 60;
    const todayList = (weeklySchedule && weeklySchedule[realDay]) || [];

    if (todayList.length === 0) {
      return { currentClass: null, currentProgress: 100, hasClassesToday: false, currentClassProgress: 0 };
    }

    let active = null;
    let classProgress = 0;
    let prog = 0;
    let totalDuration = 0;
    let elapsedDuration = 0;

    for (let c of todayList) {
      const start = timeToMins(c.startTime);
      const end = timeToMins(c.endTime);
      const duration = end - start;
      if (duration > 0) {
        totalDuration += duration;
        if (currentMins >= end) {
          elapsedDuration += duration; // 這堂課已結束
        } else if (currentMins >= start && currentMins < end) {
          active = c; // 正在進行中
          elapsedDuration += (currentMins - start);
          classProgress = ((currentMins - start) / duration) * 100;
        }
      }
    }
    if (totalDuration > 0) prog = (elapsedDuration / totalDuration) * 100;
    else prog = 100;

    return {
      currentClass: active,
      currentProgress: Math.min(100, Math.max(0, prog)), // 確保在 0~100 之間
      hasClassesToday: true,
      currentClassProgress: classProgress
    };
  }, [currentTime, weeklySchedule]);

  const tomorrowsPrep = useMemo(() => {
    if (!contactBook) return [];
    const matched = [];
    Object.entries(contactBook).forEach(([dateKey, entries]) => {
      entries.forEach(entry => {
        if (entry.homeworkDeadline === targetDateStr || entry.examDeadline === targetDateStr) {
          matched.push({ ...entry, _originalDateKey: dateKey });
        }
      });
    });
    return matched;
  }, [contactBook, targetDateStr]);

  // --- 💡 首頁直接「確認收到」聯絡簿邏輯 ---
  const handleToggleAck = async (dateStr, id) => {
    if (!user) return triggerNotification('提示', '請先登入才能確認收到喔！');
    const currentEntries = contactBook[dateStr] || [];
    const updatedEntries = currentEntries.map(entry => {
      if (entry.id === id) {
        const acks = entry.acknowledgedBy || [];
        const hasAcked = acks.includes(user.uid);
        return { ...entry, acknowledgedBy: hasAcked ? acks.filter(uid => uid !== user.uid) : [...acks, user.uid] };
      }
      return entry;
    });
    const newContactBook = { ...contactBook, [dateStr]: updatedEntries };
    setContactBook(newContactBook);
    await saveContactBookToFirestore(newContactBook);
  };

  const upcomingDaysSchedule = useMemo(() => {
    const schedules = [];
    const classes = (weeklySchedule && weeklySchedule[targetDay]) || [];
    if (classes.length > 0) {
      schedules.push({
        title: isTomorrowMode ? '明日預習模式' : '今日學習排程',
        subtitle: displayDate,
        classes,
        dayOffset: 0
      });
    }
    return schedules;
  }, [targetDay, weeklySchedule, isTomorrowMode, displayDate]);

  // 💡 動態計算「下一個上課日的前一晚」是星期幾
  const nextPrepDayStr = useMemo(() => {
    if (!weeklySchedule) return '日';
    const today = currentTime.getDay();
    for (let i = 1; i <= 7; i++) {
      const checkDay = (today + i) % 7;
      if (weeklySchedule[checkDay] && weeklySchedule[checkDay].length > 0) {
        const prepDay = (checkDay + 6) % 7;
        return ['日', '一', '二', '三', '四', '五', '六'][prepDay];
      }
    }
    return '日'; // 預設防呆
  }, [currentTime, weeklySchedule]);

  const updateSchedule = (id, field, value) => {
    const target = previewSchedule || weeklySchedule;
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    setter(prev => ({
      ...prev,
      [editDayTab]: (prev[editDayTab] || []).map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const addSchedule = () => {
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    const newItem = {
      id: Date.now(),
      subject: '新課程',
      startTime: '08:10',
      endTime: '09:00',
      location: '',
      teacher: '',
      rescheduled: false,
      link: '',
      color: '',
      icon: ''
    };
    setter(prev => ({
      ...prev,
      [editDayTab]: [...(prev[editDayTab] || []), newItem]
    }));
    triggerNotification('新增成功', '已加入新課程項目');
  };

  const deleteSchedule = (id) => {
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    setter(prev => ({
      ...prev,
      [editDayTab]: (prev[editDayTab] || []).filter(item => item.id !== id)
    }));
  };

  const handleScheduleDragStart = (e, index) => {
    setDraggedScheduleIdx(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleScheduleDragEnter = (e, index) => {
    if (draggedScheduleIdx === null || draggedScheduleIdx === index) return;
    const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
    setter(prev => {
      const newDaySchedule = [...(prev[editDayTab] || [])];
      const draggedItem = newDaySchedule[draggedScheduleIdx];
      newDaySchedule.splice(draggedScheduleIdx, 1);
      newDaySchedule.splice(index, 0, draggedItem);
      return { ...prev, [editDayTab]: newDaySchedule };
    });
    setDraggedScheduleIdx(index);
  };
  const handleScheduleDragEnd = () => setDraggedScheduleIdx(null);
  const handleScheduleDragOver = (e) => e.preventDefault();

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadLoading(true);
    triggerNotification('讀取中', '正在解析課表照片...');

    try {
      const reader = new FileReader();
      const base64Promise = new Promise(resolve => {
        reader.onload = (e) => resolve(e.target.result.split(',')[1]);
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      const prompt = `請將照片中的課表轉換為 JSON 格式。
【重要】只能輸出 JSON 陣列，不准有任何其他文字、Markdown 符號（如 \`\`\`json）。

JSON 結構必須是這樣：
[
  {"dayOfWeek": 1, "subject": "國文", "startTime": "08:10", "endTime": "09:00", "teacher": "", "location": ""}
]
- "dayOfWeek" 為 1 到 6 代表星期一到六，0 代表星期日。
- 忽略「午休」、「打掃」或「空白」的節次。必須包含「第八節」、「第九節」或「輔導課」。
- 如果照片有明確時間，請優先使用照片的時間。
- 如果照片「只有寫第幾節」而沒有寫時間，請一律使用台灣高中標準時間填入（例如第1節 08:10-09:00, 第2節 09:10-10:00, 第8節 16:10-17:00）。`;

      const summary = await fetchAI(prompt, {
        temperature: 0.1,
        responseJson: true,
        image: { mimeType: file.type || 'image/jpeg', data: base64Data }
      });

      if (!summary) throw new Error('AI 未回傳資料');

      let parsedData;
      if (typeof summary === 'object') {
        parsedData = summary;
      } else {
        let cleanSummary = summary.replace(/```json/gi, '').replace(/```/g, '').trim();
        if (cleanSummary.startsWith('[')) {
          const firstBracket = cleanSummary.indexOf('[');
          const lastBracket = cleanSummary.lastIndexOf(']');
          if (firstBracket !== -1 && lastBracket !== -1) {
            cleanSummary = cleanSummary.slice(firstBracket, lastBracket + 1);
          }
        } else {
          const firstBrace = cleanSummary.indexOf('{');
          const lastBrace = cleanSummary.lastIndexOf('}');
          if (firstBrace !== -1 && lastBrace !== -1) {
            cleanSummary = cleanSummary.slice(firstBrace, lastBrace + 1);
          }
        }
        try {
          parsedData = JSON.parse(cleanSummary.trim());
        } catch (parseErr) {
          console.error("JSON 解析失敗的字串：", cleanSummary);
          throw new Error('AI 回傳的格式不正確，請再試一次');
        }
      }

      const newSchedule = { ...INITIAL_WEEKLY_SCHEDULE };

      // 🌟 核心修復：判斷 AI 傳來的是不是陣列 (Array)
      if (Array.isArray(parsedData)) {
        // AI 吐出的是乾淨的陣列格式 (V3 終極版 Prompt)
        parsedData.forEach((item, index) => {
          // 從 item 中抓出星期幾 (dayOfWeek)
          let dayIndex = parseInt(item.dayOfWeek);
          // 防呆：如果 AI 吐出 7 (星期日)，轉換為 0
          if (dayIndex === 7) dayIndex = 0;

          if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
            newSchedule[dayIndex].push({
              id: Date.now() + index,
              subject: item.courseName || item.subject || '未命名課程',
              startTime: item.startTime || '08:00',
              endTime: item.endTime || '09:00',
              location: item.location || '',
              teacher: item.teacher || '',
              rescheduled: false,
              link: item.link || '',
              color: item.color || '',
              icon: item.icon || ''
            });
          }
        });
      } else {
        // 備用方案：萬一 AI 還是吐出舊的物件分類格式
        Object.keys(parsedData).forEach(dayKey => {
          const dayIndex = dayKey === '0' || dayKey === '7' ? 0 : parseInt(dayKey);
          if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
            if (Array.isArray(parsedData[dayKey])) {
              const mappedItems = parsedData[dayKey].map((item, index) => ({
                id: Date.now() + dayIndex * 1000 + index,
                subject: item.courseName || item.subject || '未命名課程',
                startTime: item.startTime || '08:00',
                endTime: item.endTime || '09:00',
                location: item.location || '',
                teacher: item.teacher || '',
                rescheduled: false,
                link: item.link || '',
                color: item.color || '',
                icon: item.icon || ''
              }));
              newSchedule[dayIndex] = [...newSchedule[dayIndex], ...mappedItems];
            }
          }
        });
      }

      setPreviewSchedule(newSchedule);
      setIsEditingSchedule(true);
    } catch (err) {
      console.error("AI Schedule Parsing Error:", err);
      triggerNotification('解析失敗 ❌', '課表影像辨識中斷，請稍後再試或手動調整。');
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSwap = async (id1, id2) => {
    let day1 = -1, day2 = -1, idx1 = -1, idx2 = -1;
    const newWeekly = JSON.parse(JSON.stringify(weeklySchedule)); // 深拷貝防止直接修改狀態

    // 支援跨天搜尋：找出第一堂課所在的星期與索引
    for (let d = 0; d < 7; d++) {
      const list = newWeekly[d] || [];
      const i = list.findIndex(item => item.id === id1);
      if (i !== -1) { day1 = d; idx1 = i; break; }
    }

    if (idx1 === -1) return;

    const item1 = { ...newWeekly[day1][idx1] };
    const originalSubj1 = item1.subject;
    let noticeContent = '';

    if (id2 === 'absent') {
      newWeekly[day1][idx1] = {
        ...item1,
        subject: '自習',
        teacher: '',
        rescheduled: true
      };
      noticeContent = `「${originalSubj1}」已變更為自習 (老師請假)`;
      triggerNotification('標記成功 📝', noticeContent);
    } else if (id2 === 'substitute') {
      // 顯示自訂代課 Modal，取代原本的 window.prompt
      setSubModalData({ id1, originalSubj: originalSubj1 });
      setSubInputVal(originalSubj1);
      setShowSubModal(true);
      return; // 中斷這裡，等待彈窗確認
    } else {
      // 找出第二堂課
      for (let d = 0; d < 7; d++) {
        const list = newWeekly[d] || [];
        const i = list.findIndex(item => item.id === id2);
        if (i !== -1) { day2 = d; idx2 = i; break; }
      }

      if (idx2 === -1) return;

      const item2 = { ...newWeekly[day2][idx2] };
      const originalSubj2 = item2.subject;

      newWeekly[day1][idx1] = {
        ...item1,
        subject: item2.subject, teacher: item2.teacher, location: item2.location, link: item2.link, color: item2.color, icon: item2.icon, rescheduled: true
      };
      newWeekly[day2][idx2] = {
        ...item2,
        subject: item1.subject, teacher: item1.teacher, location: item1.location, link: item1.link, color: item1.color, icon: item1.icon, rescheduled: true
      };

      noticeContent = `已對調「${originalSubj1}」與「${originalSubj2}」`;
      triggerNotification('調課成功 ⚡', noticeContent);
    }

    setWeeklySchedule(newWeekly);
    setIsSwapMode(false);
    setSelectedForSwap([]);

    if (classID || user) {
      // Sync to Firebase directly
      const cleanSchedule = JSON.parse(JSON.stringify(newWeekly));
      try {
        await saveToFirestore(cleanSchedule);
        triggerNotification('調課成功 ⚡', `已對調並同步至雲端`);
      } catch (err) {
        if (err.message === 'PERMISSION_DENIED' || err.message?.includes('permission')) {
          triggerNotification('同步失敗 ❌', '權限不足：請先登入帳號，或檢查 Firebase 安全規則');
        } else {
          triggerNotification('同步失敗 ❌', '請檢查網路或系統狀態');
        }
      }
    } else {
      triggerNotification('調課成功 ⚡', `已對調並儲存至本機`);
    }
  };

  // --- 處理彈窗的代課確認事件 ---
  const confirmSubstitute = async () => {
    if (!subInputVal || !subModalData) return;

    const { id1, originalSubj } = subModalData;
    let day1 = -1, idx1 = -1;
    const newWeekly = JSON.parse(JSON.stringify(weeklySchedule));

    for (let d = 0; d < 7; d++) {
      const list = newWeekly[d] || [];
      const i = list.findIndex(item => item.id === id1);
      if (i !== -1) { day1 = d; idx1 = i; break; }
    }

    if (idx1 === -1) return;

    newWeekly[day1][idx1] = {
      ...newWeekly[day1][idx1],
      subject: subInputVal,
      rescheduled: true
    };

    const noticeContent = `「${originalSubj}」已變更為 ${subInputVal}`;
    triggerNotification('標記成功 📝', noticeContent);

    setWeeklySchedule(newWeekly);
    setIsSwapMode(false);
    setSelectedForSwap([]);
    setShowSubModal(false);

    if (classID || user) {
      const cleanSchedule = JSON.parse(JSON.stringify(newWeekly));
      try {
        await saveToFirestore(cleanSchedule);
        triggerNotification('調課成功 ⚡', `已變更並同步至雲端`);
      } catch (err) {
        if (err.message === 'PERMISSION_DENIED' || err.message?.includes('permission')) {
          triggerNotification('同步失敗 ❌', '權限不足：請先登入帳號，或檢查 Firebase 安全規則');
        } else {
          triggerNotification('同步失敗 ❌', '請檢查網路或系統狀態');
        }
      }
    } else {
      triggerNotification('調課成功 ⚡', `已變更並儲存至本機`);
    }
  };

  const toggleSwapSelect = (id) => {
    if (!isSwapMode) return;
    setSelectedForSwap(prev => {
      if (prev.includes(id)) return prev.filter(i => i !== id);
      const next = [...prev, id];
      if (next.length === 2) {
        handleSwap(next[0], next[1]);
        return [];
      }
      return next;
    });
  };

  // --- 💡 升級版：全自動時間動態判斷 (支援跨日預測) ---
  const liveStatus = useMemo(() => {
    if (!displaySchedule) return null;
    const currentDay = currentTime.getDay();
    const today = displaySchedule[currentDay] || [];

    const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();

    // 1. 判斷是否有正在進行的課 (Ongoing)
    const ongoing = today.find(item => item && item.startTime && item.endTime && nowStr >= item.startTime && nowStr < item.endTime);
    if (ongoing) {
      const parts = ongoing.endTime.split(':');
      if (parts.length === 2) {
        const remaining = (Number(parts[0]) * 60 + Number(parts[1])) - currentMins;
        return { type: 'ongoing', item: ongoing, remaining, label: 'Live Now' };
      }
    }

    // 2. 判斷今天是否有下一堂課 (Next Today)
    const nextToday = today
      .filter(item => item && item.startTime && item.startTime > nowStr)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0];

    if (nextToday) {
      const parts = nextToday.startTime.split(':');
      if (parts.length === 2) {
        const countdown = (Number(parts[0]) * 60 + Number(parts[1])) - currentMins;
        return { type: 'next', item: nextToday, countdown, label: 'Upcoming' };
      }
    }

    // 3. 跨日預測：今天課上完了，或是今天是週末，預測「下一個上課日」的第一堂課
    let nextDay = (currentDay + 1) % 7;
    let isWeekendJump = false;

    // 尋找接下來最近的有排課的一天
    let attempts = 0;
    while (attempts < 7) {
      const nextDayClasses = displaySchedule[nextDay] || [];
      if (nextDayClasses.length > 0) {
        if (nextDay !== (currentDay + 1) % 7) isWeekendJump = true;
        const firstNextClass = nextDayClasses.sort((a, b) => a.startTime.localeCompare(b.startTime))[0];
        return {
          type: 'tomorrow',
          item: firstNextClass,
          label: isWeekendJump ? '下一個上課日' : '明日首堂'
        };
      }
      nextDay = (nextDay + 1) % 7;
      attempts++;
    }

    return null;
  }, [displaySchedule, currentTime]);

  const handleSaveEdit = async () => {
    const cleanSchedule = JSON.parse(JSON.stringify(weeklySchedule || {}));
    if (classID || user) {
      triggerNotification('連線中', '正在將課表上傳至雲端...');
      try {
        await saveToFirestore(cleanSchedule);

        triggerNotification('同步成功 🎉', classID ? '課表已安全備份至班級雲端！' : '個人自訂課表已備份至雲端！');
      } catch (err) {
        triggerNotification('同步失敗 ❌', '請檢查網路或系統權限');
      }
    } else {
      triggerNotification('儲存成功', '個人自訂課表已儲存至本機（未登入無法雲端備份）！');
    }
    setIsEditingSchedule(false);
  };

  const widgetCountdowns = customCountdowns?.length > 0 ? (
    <div className={`grid ${customCountdowns.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
      {customCountdowns.map((item, i) => {
        const days = getDaysLeft(item.date);
        const style = item.style || 'gradient';
        const styles = {
          simple: "bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] text-slate-800 dark:text-white",
          gradient: "bg-gradient-to-br from-emerald-500 to-teal-600 text-white",
          neon: "bg-slate-900 border border-emerald-500/30 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.1)]",
          sakura: "bg-gradient-to-br from-pink-400 to-rose-300 text-white shadow-lg shadow-pink-500/20",
          cyber: "bg-slate-900 border border-fuchsia-500/40 text-fuchsia-400 shadow-[0_0_20px_rgba(217,70,239,0.15)]"
        };
        return (
          <div key={item.id || i} className={`${styles[style] || styles.gradient} rounded-[32px] p-5 shadow-soft relative overflow-hidden group active:scale-[0.98] transition-all`}>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg opacity-90">{item.icon || '📅'}</span>
                <span className="text-[12px] font-black opacity-90 tracking-wider font-sans">{item.title}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-[32px] font-black leading-none">{Math.max(0, days)}</span>
                <span className="text-[12px] font-bold opacity-70">Days</span>
              </div>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 w-20 h-20 opacity-10 group-hover:scale-125 transition-transform duration-700" />
          </div>
        );
      })}
    </div>
  ) : null;

  const greeting = getGreeting();
  const bgGradients = {
    morning: "bg-gradient-to-br from-amber-50/70 to-orange-100/70 dark:from-amber-900/30 dark:to-orange-900/30",
    afternoon: "bg-gradient-to-br from-blue-50/70 to-cyan-100/70 dark:from-blue-900/30 dark:to-cyan-900/30",
    evening: "bg-gradient-to-br from-indigo-100/70 to-purple-100/70 dark:from-indigo-900/30 dark:to-purple-900/30"
  };

  const widgetGreeting = (
    <div className={`group ${bgGradients[greeting.time]} backdrop-blur-2xl backdrop-saturate-150 p-8 md:p-10 text-slate-900 dark:text-white rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] border border-white/60 dark:border-white/10 relative transition-all duration-500 ease-spring-smooth hover:-translate-y-1 overflow-hidden`}>
      <div className="relative z-10">
        <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
          <h2 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            {React.createElement(greeting.icon, { size: 32, className: "shrink-0", strokeWidth: 3 })}
            <span>{greeting.text}</span>
          </h2>
          <div className="flex flex-col items-end">
            <span className="text-slate-500 dark:text-emerald-100/80 text-[11px] font-black uppercase tracking-widest">Current Time</span>
            <LiveClock />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-between items-end flex-wrap gap-x-4">
            <div className="flex items-center gap-3 mb-1">
              <span className="text-slate-700 dark:text-emerald-100/80 text-[13px] font-black tracking-widest uppercase">
                {hasClassesToday ? '今日課程進度' : '今日無課程安排'}
              </span>
              {streak > 0 && (
                <span className="flex items-center gap-1 text-[11px] font-black bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-500/30">
                  <Flame size={12} className="shrink-0" /> 連續學習 {streak} 天
                </span>
              )}
            </div>
            <span className="text-slate-800 dark:text-white text-[20px] font-black">{Math.round(currentProgress)}%</span>
          </div>
          <div className="h-3 bg-emerald-200/50 dark:bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-emerald-100/50 dark:border-white/5 relative">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all duration-1000 ease-spring-smooth"
              style={{ width: `${currentProgress}%` }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer-slide_2s_infinite]"></div>
          </div>
        </div>

        {/* 整合式課程動態 (包含跨日預測) */}
        {(liveStatus || currentProgress >= 100) && (
          <div className="mt-6 bg-emerald-50/60 dark:bg-white/5 backdrop-blur-2xl rounded-[28px] p-4 border border-emerald-200/50 dark:border-white/20 animate-fadeIn flex items-center justify-between shadow-glass transition-transform group-hover:scale-[1.01]">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0 ${(liveStatus?.type === 'ongoing') ? 'bg-emerald-600' : (liveStatus?.type === 'tomorrow' ? 'bg-purple-500' : (currentProgress >= 100 ? 'bg-orange-400' : 'bg-blue-400'))}`}>
                <Clock size={22} className="text-white shrink-0" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${liveStatus?.type === 'tomorrow' ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300' : 'bg-emerald-600/10 dark:bg-white/10 text-emerald-700 dark:text-emerald-400'}`}>
                    {liveStatus ? liveStatus.label : 'Finished'}
                  </span>
                </div>
                <h4 className="text-[14px] font-black text-slate-900 dark:text-white leading-tight flex items-center gap-1.5">
                  {liveStatus?.item?.rescheduled && <span className="text-sm" title="調課通知">🔔</span>}
                  {liveStatus ? liveStatus.item?.subject : '今日課程已全部結束'}
                </h4>
                <p className="text-[11px] font-bold text-slate-500 dark:text-emerald-100/90 mt-0.5 opacity-90">
                  {liveStatus?.type === 'tomorrow' ? `${liveStatus.item?.startTime} 開始上課` : (liveStatus ? (liveStatus.item?.location || '教室環境') : encouragement)}
                </p>
              </div>
            </div>
            {/* 右側時間顯示 (智慧切換：>30m 顯示時間, <=30m 顯示倒數) */}
            {liveStatus && liveStatus.type !== 'tomorrow' && (
              <div className="flex flex-col items-end bg-emerald-600/10 dark:bg-black/10 px-3 py-1.5 rounded-xl border border-emerald-200/50 dark:border-white/10">
                <span className="text-[16px] font-black text-emerald-900 dark:text-white leading-none">
                  {liveStatus.type === 'ongoing'
                    ? liveStatus.remaining
                    : (liveStatus.countdown > 30 ? liveStatus.item?.startTime : liveStatus.countdown)
                  }
                </span>
                <span className="text-[8px] font-black text-emerald-700 dark:text-emerald-100 uppercase tracking-tighter mt-1">
                  {liveStatus.type === 'ongoing'
                    ? 'MIN LEFT'
                    : (liveStatus.countdown > 30 ? 'START TIME' : 'MINS TO')
                  }
                </span>
              </div>
            )}
          </div>
        )}
      </div>
      <Sparkles className="absolute -right-4 -bottom-4 text-emerald-900 dark:text-white opacity-5 dark:opacity-10 w-40 h-40 pointer-events-none transition-transform duration-1000 group-hover:rotate-12 group-hover:scale-110" />
    </div>
  );

  const widgetAiBriefing = (
    <AiBriefing
      weeklySchedule={weeklySchedule}
      contactBook={contactBook}
      user={user}
    />
  );

  const widgetHeatmap = <LearningHeatmapWidget streak={streak} />;

  const widgetPomodoro = <FocusTimerWidget triggerNotification={triggerNotification} />;

  const widgetSchedule = (
    <div id="schedule-section" className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] relative overflow-hidden transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)]">
      {/* 全局頭部：提供快速調課與編輯按鈕 */}
      {hasScheduleData && (
        <div className="flex justify-between items-center mb-6 relative z-10 border-b border-slate-200/50 dark:border-white/10 pb-5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl text-emerald-600 dark:text-emerald-400 shadow-sm">
              <Calendar size={20} />
            </div>
            <h3 className="text-lg font-black text-slate-800 dark:text-white">學習排程</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setIsSwapMode(!isSwapMode); setEditDayTab(currentTime.getDay()); setSelectedForSwap([]); }} className={`px-3 sm:px-4 py-2 rounded-[14px] text-[12px] sm:text-[13px] font-black transition-all shadow-sm ${isSwapMode ? 'bg-orange-500 text-white' : 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-500/20'}`}>
              <ArrowUpDown size={14} className="inline mr-1.5 mb-0.5" />{isSwapMode ? '退出調課' : '快速調課'}
            </button>
          </div>
        </div>
      )}

      {isSwapMode && !isEditingSchedule ? (
        <div className="space-y-4 animate-fadeIn relative z-10">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {ALL_DAYS.map(d => (
              <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-4 py-2.5 rounded-xl text-[13px] font-black whitespace-nowrap transition-all shadow-sm ${editDayTab === d.id ? 'bg-orange-500 text-white' : 'bg-white dark:bg-white/5 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/5'}`}>{d.label}</button>
            ))}
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-500/30 text-orange-600 dark:text-orange-400 p-4 rounded-[20px] text-sm font-bold flex items-center gap-3 shadow-inner">
            <ArrowUpDown size={20} className="shrink-0" />
            {selectedForSwap.length === 0 ? '請選擇第一堂要異動的課程' : '請選擇要對調的目標課程，或點擊下方直接設定代課/自習。'}
          </div>
          <div className="space-y-3">
            {(displaySchedule[editDayTab] || []).length === 0 && <p className="text-slate-400 font-bold py-6 text-center bg-slate-50 dark:bg-white/5 rounded-[24px] border border-dashed border-slate-200 dark:border-white/10">這天沒有課程</p>}
            {(displaySchedule[editDayTab] || []).map(item => {
              const isSelected = selectedForSwap.includes(item.id);
              const theme = getSubjectTheme(item, subjects);
              return (
                <div key={item.id} onClick={() => toggleSwapSelect(item.id)} className={`relative overflow-hidden flex flex-col gap-3 px-6 py-4 rounded-[24px] border transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${isSelected ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-50/30 dark:bg-orange-900/20 scale-[1.02]' : `bg-white/80 dark:bg-white/5 ${theme.border} hover:-translate-y-0.5`}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${theme.bg} ${theme.text}`}>
                        {React.createElement(getSubjectIcon(item, subjects), { size: 18 })}
                      </div>
                      <div className="flex flex-col truncate">
                        <span className={`text-[16px] font-black text-slate-800 dark:text-gray-100 truncate`}>{item.subject}</span>
                        <span className="text-[11px] font-bold text-slate-500 truncate">{item.teacher || '無設定教師'} {item.location && `• ${item.location}`}</span>
                      </div>
                    </div>
                    <div className="text-[13px] font-mono font-black text-slate-600 dark:text-gray-300 bg-slate-100 dark:bg-black/20 px-3 py-1.5 rounded-xl shrink-0 self-start sm:self-auto border border-slate-200 dark:border-white/5">
                      {item.startTime} - {item.endTime}
                    </div>
                  </div>
                  {isSelected && selectedForSwap.length === 1 && (
                    <div className="flex gap-2 pt-4 mt-1 border-t border-slate-200/50 dark:border-white/10 animate-slide-up-fade">
                      <button onClick={(e) => { e.stopPropagation(); handleSwap(item.id, 'absent'); }} className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white text-[13px] font-black rounded-xl shadow-md shadow-rose-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <AlertCircle size={16} /> 標記為自習
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleSwap(item.id, 'substitute'); }} className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white text-[13px] font-black rounded-xl shadow-md shadow-blue-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                        <PenTool size={16} /> 設定代課
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : isWeekendRest && !isEditingSchedule ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse">
            <Sun className="text-emerald-500" size={40} />
          </div>
          <h4 className="text-[22px] font-black text-slate-900 dark:text-white mb-2">假日休息中 ✨</h4>
          <p className="text-slate-500 dark:text-gray-400 font-bold max-w-[220px] leading-relaxed">
            好好充電！<br />週{nextPrepDayStr}晚 20:00 將顯示下個上課日的排程。
          </p>
        </div>
      ) : isEditingSchedule ? (
        <div className="flex flex-col gap-4">
          {!previewSchedule && (
            <label className="border-2 border-dashed border-emerald-200 dark:border-emerald-900/30 rounded-3xl p-8 flex flex-col items-center gap-3 cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/5 transition-all group">
              {uploadLoading ? <RefreshCw className="animate-spin text-emerald-500" size={32} /> : <ImageIcon className="text-emerald-400 group-hover:scale-110 transition-transform" size={32} />}
              <div className="text-center">
                <span className="block text-emerald-600 dark:text-emerald-400 font-black text-lg">{uploadLoading ? 'AI 解析中...' : '上傳課表照片'}</span>
                <span className="text-xs text-emerald-600/60 dark:text-emerald-400/40 font-bold">由 AI 自動辨識課程與時間</span>
              </div>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
            </label>
          )}
          {previewSchedule && (
            <div className="flex flex-col gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 p-4 rounded-[24px] text-sm font-bold flex items-center gap-3">
                <PenTool size={20} className="shrink-0" />
                <p>AI 解析完成！您可以直接<strong>點擊下方的「時間」或「科目」欄位進行手動微調</strong>，確認無誤後再點擊儲存。</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPreviewSchedule(null)} className="flex-1 py-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl font-black active:scale-95 transition-all">放棄重測</button>
                <button onClick={async () => {
                  const cleanSchedule = JSON.parse(JSON.stringify(previewSchedule || {}));
                  setWeeklySchedule(previewSchedule);
                  setPreviewSchedule(null);
                  if (classID || user) {
                    triggerNotification('連線中', '正在將課表上傳至雲端...');
                    try {
                      await saveToFirestore(cleanSchedule);
                      triggerNotification('同步成功 🎉', classID ? '課表已安全備份至班級雲端！' : '個人自訂課表已備份至雲端！');
                    } catch (err) {
          if (err.message === 'PERMISSION_DENIED' || err.message?.includes('permission')) {
            triggerNotification('同步失敗 ❌', '權限不足：請先登入帳號，或檢查 Firebase 安全規則');
          } else {
            triggerNotification('同步失敗 ❌', '請檢查網路或系統狀態');
          }
                    }
                  } else {
                    triggerNotification('儲存成功', '已儲存課表結果！');
                  }
                  setIsEditingSchedule(false);
                }}
                  className="flex-1 py-4 bg-emerald-500 text-white rounded-2xl font-black active:scale-95 transition-all shadow-lg shadow-emerald-500/20">儲存結果</button>
              </div>
            </div>
          )}
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {ALL_DAYS.map(d => (
              <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-5 py-3 rounded-2xl font-black whitespace-nowrap transition-all ${editDayTab === d.id ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-white/10'}`}>{d.label}</button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={() => {
                if (window.confirm('確定要清空今天的排程嗎？')) {
                  const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
                  setter(prev => ({ ...prev, [editDayTab]: [] }));
                }
              }} className="flex-1 sm:flex-none px-5 py-4 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400 rounded-[24px] font-black text-[14px] active:scale-95 transition-all border border-orange-200/50 dark:border-orange-500/30 hover:bg-orange-100 dark:hover:bg-orange-900/50">
                清空今日
              </button>
              <button onClick={() => {
                if (window.confirm('⚠️ 警告：確定要一鍵清空「全部」的課表嗎？這將無法復原！')) {
                  const setter = previewSchedule ? setPreviewSchedule : setWeeklySchedule;
                  setter({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] });
                }
              }} className="flex-1 sm:flex-none px-5 py-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-[24px] font-black text-[14px] active:scale-95 transition-all border border-red-200/50 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-900/50">
                一鍵刪除
              </button>
            </div>
            <button
              onClick={handleSaveEdit}
              className="w-full sm:flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black text-[16px] shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} /> {classID || user ? '完成編輯並同步至雲端' : '儲存我的自訂課表'}
            </button>
          </div>

          <div className="space-y-4">
            {(displaySchedule[editDayTab] || []).map((item, index) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => handleScheduleDragStart(e, index)}
                onDragEnter={(e) => handleScheduleDragEnter(e, index)}
                onDragEnd={handleScheduleDragEnd}
                onDragOver={handleScheduleDragOver}
                className={`p-6 bg-white/50 dark:bg-black/20 backdrop-blur-xl rounded-[32px] border ${getSubjectTheme(item, subjects).border} relative group transition-all duration-500 ease-spring hover:shadow-[0_12px_32px_rgba(0,0,0,0.1)] animate-slide-up-fade ${draggedScheduleIdx === index ? 'opacity-50 scale-[0.98] border-dashed border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20 z-50 shadow-xl' : ''}`}
              >
                {/* 拖曳手把 (大螢幕顯示，手機端可直接長按卡片拖曳) */}
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing text-slate-300 hover:text-emerald-500 transition-colors hidden sm:flex h-[80%] items-center px-1 z-10">
                  <GripVertical size={20} />
                </div>

                <div className="flex flex-col gap-4 sm:pl-5">

                  {/* Row 1: Subject, Color Picker and Time */}
                  <div className="flex flex-col md:flex-row md:items-stretch gap-4">
                    <div className="flex flex-col justify-between flex-1 bg-slate-50/50 dark:bg-black/20 p-4 rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-sm focus-within:border-emerald-400 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-[20px] ${getSubjectTheme(item, subjects).bg} ${getSubjectTheme(item, subjects).text} flex items-center justify-center shrink-0 shadow-inner transition-colors`}>
                          {React.createElement(getSubjectIcon(item, subjects), { size: 22 })}
                        </div>
                        <input type="text" value={item.subject || ''} onChange={e => updateSchedule(item.id, 'subject', e.target.value)} className={`flex-1 bg-transparent font-black text-[20px] ${getSubjectTheme(item, subjects).text} outline-none placeholder:text-slate-400`} placeholder="輸入課程名稱" />
                      </div>

                      <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-slate-200/50 dark:border-white/5">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 w-12 text-right">標籤顏色</span>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(THEME_COLORS).map(([key, config]) => (
                              <button key={key} onClick={() => updateSchedule(item.id, 'color', key)} className={`w-5 h-5 rounded-full ${config.hex} shadow-sm transition-transform hover:scale-110 active:scale-95 ${item.color === key ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 scale-110' : ''}`} />
                            ))}
                            <button onClick={() => updateSchedule(item.id, 'color', '')} className={`w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] text-slate-600 dark:text-slate-300 font-black shadow-sm hover:scale-110 active:scale-95 transition-transform ${!item.color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 scale-110' : ''}`}>A</button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest shrink-0 w-12 text-right">自訂圖示</span>
                          <div className="flex items-center bg-slate-100 dark:bg-black/40 px-2 py-1.5 rounded-[10px] border border-slate-200 dark:border-white/5 focus-within:border-emerald-400 transition-colors">
                            <Search size={12} className="text-slate-400 shrink-0" />
                            <input
                              type="text"
                              placeholder="搜尋..."
                              value={item._iconSearch || ''}
                              onChange={e => updateSchedule(item.id, '_iconSearch', e.target.value)}
                              className="bg-transparent text-[11px] outline-none ml-1.5 w-14 text-[var(--text-primary)] placeholder:text-slate-400"
                            />
                          </div>
                          <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1 mask-fade-edges flex-1">
                            {((item._iconSearch || '').trim()
                              ? Object.keys(ICON_MAP).filter(k => k.toLowerCase().includes(item._iconSearch.toLowerCase())).slice(0, 30)
                              : DASHBOARD_ICONS).map(iconName => {
                                const IconComp = ICON_MAP[iconName] || BookText;
                                return (
                                  <button key={iconName} onClick={() => updateSchedule(item.id, 'icon', iconName)} className={`shrink-0 p-1.5 rounded-lg transition-all active:scale-90 ${item.icon === iconName ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/30 shadow-sm ring-1 ring-emerald-400' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}><IconComp size={16} /></button>
                                );
                              })}
                            <button onClick={() => updateSchedule(item.id, 'icon', '')} className={`shrink-0 px-2 py-1.5 rounded-lg transition-all text-[10px] font-black active:scale-90 ${!item.icon ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-slate-600 scale-110' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5'}`}>預設</button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center gap-2 bg-slate-50/50 dark:bg-black/20 p-4 rounded-[24px] border border-slate-200/50 dark:border-white/5 shadow-sm shrink-0 w-full md:w-auto">
                      <div className="flex items-center gap-2 text-slate-400 text-[11px] font-black uppercase tracking-widest"><Clock size={12} /> 上課時間</div>
                      <div className="flex items-center justify-between gap-3">
                        <input type="time" value={item.startTime || ''} onChange={e => updateSchedule(item.id, 'startTime', e.target.value)} className="flex-1 sm:flex-none text-center bg-white dark:bg-slate-800 px-2 sm:px-3 py-2 rounded-[14px] font-mono font-black text-[14px] sm:text-[15px] text-slate-700 dark:text-gray-200 outline-none shadow-sm border border-slate-200 dark:border-white/5 min-w-0" />
                        <span className="text-slate-300 dark:text-gray-600 font-bold">➜</span>
                        <input type="time" value={item.endTime || ''} onChange={e => updateSchedule(item.id, 'endTime', e.target.value)} className="flex-1 sm:flex-none text-center bg-white dark:bg-slate-800 px-2 sm:px-3 py-2 rounded-[14px] font-mono font-black text-[14px] sm:text-[15px] text-slate-700 dark:text-gray-200 outline-none shadow-sm border border-slate-200 dark:border-white/5 min-w-0" />
                      </div>
                    </div>
                  </div>

                  {/* Row 2: Details */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-3.5 rounded-[20px] border border-slate-200 dark:border-white/5 focus-within:border-emerald-400 transition-all shadow-sm">
                      <span className="text-[12px] font-black text-slate-400 shrink-0 w-8 text-center">教師</span>
                      <input type="text" value={item.teacher || ''} onChange={e => updateSchedule(item.id, 'teacher', e.target.value)} className="w-full bg-transparent text-[14px] font-bold outline-none text-[var(--text-primary)]" placeholder="選填" />
                    </div>
                    <div className="flex items-center gap-2 bg-white dark:bg-black/20 p-3.5 rounded-[20px] border border-slate-200 dark:border-white/5 focus-within:border-emerald-400 transition-all shadow-sm">
                      <span className="text-[12px] font-black text-slate-400 shrink-0 w-8 text-center">地點</span>
                      <input type="text" value={item.location || ''} onChange={e => updateSchedule(item.id, 'location', e.target.value)} className="w-full bg-transparent text-[14px] font-bold outline-none text-[var(--text-primary)]" placeholder="選填" />
                    </div>
                    <div className="flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10 p-3.5 rounded-[20px] border border-blue-100 dark:border-blue-900/30 focus-within:border-blue-400 transition-all shadow-sm">
                      <ExternalLink size={16} className="text-blue-400 ml-1.5 shrink-0" />
                      <input type="text" value={item.link || ''} onChange={e => updateSchedule(item.id, 'link', e.target.value)} className="w-full bg-transparent text-[14px] font-bold outline-none text-blue-700 dark:text-blue-300 placeholder:text-blue-300/60 dark:placeholder:text-blue-700/60" placeholder="外部連結 (選填)" />
                    </div>
                  </div>

                  {/* Row 3: Reschedule Toggle */}
                  <div className="mt-1 flex items-center justify-between px-3 bg-orange-50/30 dark:bg-orange-950/20 p-3.5 rounded-[20px] border border-orange-100/50 dark:border-orange-500/10">
                    <span className="text-[13px] font-black text-orange-600 dark:text-orange-400 flex items-center gap-2">
                      <Bell size={16} className={item.rescheduled ? 'animate-pulse' : 'opacity-60'} /> 特殊調課標記
                    </span>
                    <button onClick={() => updateSchedule(item.id, 'rescheduled', !item.rescheduled)} className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 outline-none shadow-inner ${item.rescheduled ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300 ease-spring-smooth ${item.rescheduled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
                <button onClick={() => deleteSchedule(item.id)} className="absolute -top-3 -right-3 text-red-500 p-2.5 bg-white dark:bg-slate-800 rounded-full transition-all duration-300 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 active:scale-90 shadow-md border border-slate-100 dark:border-white/5 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            ))}
            <button
              onClick={addSchedule}
              className="w-full mt-4 py-6 border-2 border-dashed border-emerald-300 dark:border-emerald-800/50 rounded-[32px] text-emerald-600 dark:text-emerald-400 font-black text-[16px] flex items-center justify-center gap-2 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all duration-300 ease-spring active:scale-[0.98] group bg-white/50 dark:bg-black/20"
            >
              <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" /> 點擊手動新增課程
            </button>
          </div>
        </div>
      ) : (
        <div className="relative pl-[40px]">
          {/* Timeline Vertical Line */}
          <div className="absolute left-[15px] top-2 bottom-6 w-[2px] bg-gradient-to-b from-emerald-500/40 via-emerald-500/20 to-transparent dark:from-emerald-500/30 dark:via-emerald-500/10 rounded-full" />

          <div className="space-y-10">
            {!hasScheduleData && !isEditingSchedule ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center animate-pulse-slow relative z-10 bg-[var(--bg-surface)] glass-effect rounded-[32px] border border-[var(--border-color)]">
                <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-[28px] flex items-center justify-center mb-6 border border-emerald-100 dark:border-emerald-900/30 shadow-inner">
                  <Calendar size={36} className="text-emerald-500" />
                </div>
                <h4 className="text-[20px] font-black text-slate-900 dark:text-white mb-2">專屬你的學習排程</h4>
                <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                  您可以直接建立個人的自訂課表，<br />或前往設定綁定班級代碼以同步全班進度。
                </p>
                <button onClick={() => navToSettings('academic')} className="flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-[15px] shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all">
                  前往設定課表與班級
                </button>
              </div>
            ) : (
              <>
                {upcomingDaysSchedule.length === 0 && <p className="text-gray-400 text-center py-6 font-bold">未來幾天沒有排程喔！</p>}
                {upcomingDaysSchedule.map((group, gIdx) => (group.dayOffset === 0 && (
                  <div key={gIdx} className="space-y-6">
                    <div className="flex items-end justify-between px-2 relative z-10 mb-2 animate-fadeIn">
                      <div>
                        <h4 className="text-[16px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                          {group.title === '明日預習模式' ? <Moon className="text-indigo-500" size={18} /> : <Sun className="text-amber-500" size={18} />}
                          {group.title}
                        </h4>
                        <p className="text-[12px] font-bold text-slate-400 mt-1.5 tracking-wider">{group.subtitle}</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      {(() => {
                        const nowStr = `${String(currentTime.getHours()).padStart(2, '0')}:${String(currentTime.getMinutes()).padStart(2, '0')}`;
                        const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
                        const safeClasses = group?.classes || [];
                        const sortedClasses = [...safeClasses].sort((a, b) => {
                          const aStart = a?.startTime || '00:00';
                          const bStart = b?.startTime || '00:00';
                          return aStart.localeCompare(bStart);
                        });
                        const elements = [];
                        let nowMarkerPlaced = false;

                        sortedClasses.forEach((item, idx) => {
                          const startMins = timeToMins(item.startTime);
                          const endMins = timeToMins(item.endTime);
                          const prevEndMins = idx > 0 ? timeToMins(sortedClasses[idx - 1].endTime) : null;

                          // Insert Break
                          if (prevEndMins !== null && startMins > prevEndMins) {
                            const breakDuration = startMins - prevEndMins;

                            // Check if "Now" is during this break
                            if (!nowMarkerPlaced && currentMins >= prevEndMins && currentMins < startMins) {
                              elements.push({ type: 'now', id: `now-marker-${idx}` });
                              nowMarkerPlaced = true;
                            }

                            elements.push({
                              type: 'break',
                              id: `break-${idx}-${item.id || idx}`,
                              duration: breakDuration,
                              startTime: sortedClasses[idx - 1].endTime || '00:00',
                              endTime: item.startTime || '00:00'
                            });
                          }

                          // Check if "Now" is at the start of today or before first class
                          if (!nowMarkerPlaced && idx === 0 && currentMins < startMins) {
                            elements.push({ type: 'now', id: 'now-start' });
                            nowMarkerPlaced = true;
                          }

                          // Check if "Now" is during this class
                          elements.push({ type: 'class', ...item });

                          // Check if "Now" is right after this class
                          if (!nowMarkerPlaced && currentMins >= startMins && currentMins < endMins) {
                            nowMarkerPlaced = true;
                          }
                        });

                        // If now is after all classes
                        if (!nowMarkerPlaced && sortedClasses.length > 0 && currentMins >= timeToMins(sortedClasses[sortedClasses.length - 1].endTime)) {
                          elements.push({ type: 'now', id: 'now-end' });
                        }

                        return elements.map((el) => {
                          if (el.type === 'now') {
                            return (
                              <div key={el.id} className="relative flex items-center gap-4 py-3 my-1">
                                <div className="absolute left-[-32px] w-4 h-4 bg-rose-500 rounded-full border-[3px] border-white dark:border-slate-900 shadow-[0_0_15px_rgba(244,63,94,0.8)] z-20 animate-pulse" />
                                <div className="h-[2px] flex-1 bg-gradient-to-r from-rose-500/60 to-transparent relative">
                                  <span className="absolute -top-5 left-0 text-[10px] font-black text-rose-500 bg-rose-50/90 dark:bg-rose-950/80 px-2 py-1 rounded-lg backdrop-blur-md border border-rose-200/50 dark:border-rose-500/30 tracking-widest shadow-sm">現在時間 NOW</span>
                                </div>
                              </div>
                            );
                          }

                          if (el.type === 'break') {
                            const isCurrentBreak = currentTime.getHours() * 60 + currentTime.getMinutes() >= timeToMins(el.startTime) && currentTime.getHours() * 60 + currentTime.getMinutes() < timeToMins(el.endTime);

                            if (!isCurrentBreak) return null;

                            return (
                              <div key={el.id} className={`relative group/break py-3 pr-2 transition-all duration-500 ${isCurrentBreak ? 'scale-[1.02] opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                                {/* Break Indicator on Timeline */}
                                <div className={`absolute left-[-26px] top-0 bottom-0 w-[4px] rounded-full transition-colors ${isCurrentBreak ? 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]' : 'bg-gray-200 dark:bg-white/10'}`} />

                                <div className={`ml-4 flex items-center gap-3 p-3 rounded-2xl border transition-all ${isCurrentBreak ? 'bg-orange-50/40 dark:bg-orange-950/20 border-orange-200/50 dark:border-orange-500/20' : 'bg-transparent border-transparent'}`}>
                                  <div className={`h-[1px] w-6 border-t border-dashed transition-colors ${isCurrentBreak ? 'border-orange-400' : 'border-gray-300 dark:border-gray-600'}`} />
                                  <span className={`text-[12px] font-black flex items-center gap-2 ${isCurrentBreak ? 'text-orange-600 dark:text-orange-400 animate-pulse' : 'text-slate-400 dark:text-gray-500'}`}>
                                    ☕ 休息時間 {el.duration} 分鐘
                                  </span>
                                  <div className="h-[1px] flex-1 border-t border-dashed border-gray-300 dark:border-gray-600 opacity-50" />
                                </div>
                              </div>
                            );
                          }

                          const item = el;
                          const isActive = currentClass?.id === item.id;
                          const theme = getSubjectTheme(item, subjects);

                          return (
                            <div key={item.id} className="relative group">
                              {/* Timeline Node */}
                              <div className={`absolute left-[-31px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-[3px] transition-all duration-500 z-10 ${isActive ? 'bg-emerald-500 border-emerald-200 dark:border-emerald-800 scale-125 neon-glow-emerald shadow-[0_0_15px_#10b981]' : 'bg-gray-300 dark:bg-slate-700 border-white dark:border-slate-900 group-hover:border-emerald-500/50'}`} />

                              {/* Pill Card */}
                              <div
                                onClick={() => toggleSwapSelect(item.id)}
                                className={`relative overflow-hidden flex items-center gap-4 px-6 py-4 rounded-[32px] border transition-all duration-300 cursor-pointer active:scale-[0.96] hover:shadow-[0_12px_24px_rgba(0,0,0,0.15)] backdrop-blur-md ${isActive ? `${theme.activeBg} border-white/30 shadow-lg scale-[1.02] ring-4 ${theme.ring}` :
                                  item.rescheduled ? 'bg-orange-50/30 dark:bg-orange-950/30 border-orange-500/60 shadow-[0_0_20px_rgba(255,152,0,0.15)] hover:scale-[1.01]' :
                                    `bg-white/60 dark:bg-white/5 shadow-sm dark:shadow-none ${theme.border} hover:-translate-y-0.5 hover:scale-[1.01]`
                                  } ${selectedForSwap.includes(item.id) ? 'border-orange-500 ring-4 ring-orange-500/20 scale-105' : ''}`}
                                style={item.rescheduled && !isActive ? { border: '2px solid #ff9800', boxShadow: '0 0 15px rgba(255, 152, 0, 0.3)' } : {}}
                              >
                                {isActive && (
                                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/10 dark:bg-white/10">
                                    <div
                                      className="bg-white/90 h-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                                      style={{ width: `${currentClassProgress}%` }}
                                    ></div>
                                  </div>
                                )}
                                {selectedForSwap.length === 1 && selectedForSwap[0] === item.id && (
                                  <div className="flex gap-1 absolute -top-3 left-1/2 -translate-x-1/2 z-[20]">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleSwap(item.id, 'absent'); }}
                                      className="bg-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 active:scale-90 transition-transform"
                                    >
                                      老師因故無法前往
                                    </button>
                                  </div>
                                )}

                                <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 overflow-hidden">
                                  <div className="flex flex-col min-w-0">
                                    <span className={`text-[18px] font-black truncate flex items-center gap-2 leading-tight ${isActive ? 'text-white' : 'text-slate-800 dark:text-gray-100'}`}>
                                      {item.rescheduled && <span className="text-xl" title="有調課變動">🔔</span>}
                                      {React.createElement(getSubjectIcon(item, subjects), { size: 18, className: isActive ? 'text-white/80' : getSubjectTheme(item, subjects).text })}
                                      {item.subject}
                                    </span>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                      <span className={`text-[13px] font-bold truncate transition-opacity ${isActive ? 'text-white/80' : 'text-slate-500 dark:text-gray-500 opacity-80'}`}>
                                        {item.teacher || '自主進度'} {item.location && ` @ ${item.location}`}
                                      </span>
                                      {item.link && (
                                        <a href={item.link} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className={`px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 transition-colors ${isActive ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-blue-50 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 hover:bg-blue-100'}`}>
                                          <ExternalLink size={10} /> 上課連結
                                        </a>
                                      )}
                                    </div>
                                  </div>

                                  {item.startTime !== item.endTime && (
                                    <div className={`self-start sm:self-auto shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-2xl transition-all duration-300 ${isActive ? 'bg-white/20 text-white' : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/20 shadow-sm'}`}>
                                      <span className="text-[15px] font-mono font-black">{item.startTime}</span>
                                      <span className={`text-[10px] opacity-40 ${isActive ? 'text-white' : 'text-emerald-500'}`}>➜</span>
                                      <span className="text-[13px] font-mono font-bold opacity-80">{item.endTime}</span>
                                    </div>
                                  )}
                                </div>

                                {isActive && (
                                  <div className="absolute -top-1 -right-1 flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const LINK_COLORS = {
    blue: { text: 'text-blue-600 dark:text-blue-400', groupText: 'group-hover:text-blue-700 dark:group-hover:text-blue-300', bgHover: 'group-hover:bg-blue-600 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(59,130,246,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(59,130,246,0.3)]' },
    emerald: { text: 'text-emerald-600 dark:text-emerald-400', groupText: 'group-hover:text-emerald-700 dark:group-hover:text-emerald-300', bgHover: 'group-hover:bg-emerald-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(16,185,129,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(16,185,129,0.3)]' },
    orange: { text: 'text-orange-600 dark:text-orange-400', groupText: 'group-hover:text-orange-700 dark:group-hover:text-orange-300', bgHover: 'group-hover:bg-orange-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(249,115,22,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(249,115,22,0.3)]' },
    rose: { text: 'text-rose-600 dark:text-rose-400', groupText: 'group-hover:text-rose-700 dark:group-hover:text-rose-300', bgHover: 'group-hover:bg-rose-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(244,63,94,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(244,63,94,0.3)]' },
    purple: { text: 'text-purple-600 dark:text-purple-400', groupText: 'group-hover:text-purple-700 dark:group-hover:text-purple-300', bgHover: 'group-hover:bg-purple-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(168,85,247,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(168,85,247,0.3)]' },
    indigo: { text: 'text-indigo-600 dark:text-indigo-400', groupText: 'group-hover:text-indigo-700 dark:group-hover:text-indigo-300', bgHover: 'group-hover:bg-indigo-500 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(99,102,241,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(99,102,241,0.3)]' },
    slate: { text: 'text-slate-600 dark:text-slate-400', groupText: 'group-hover:text-slate-700 dark:group-hover:text-slate-300', bgHover: 'group-hover:bg-slate-600 group-hover:text-white', shadow: 'group-hover:shadow-[0_0_24px_rgba(71,85,105,0.4)] dark:group-hover:shadow-[0_0_24px_rgba(71,85,105,0.3)]' }
  };

  const widgetLinks = (
    <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] relative overflow-hidden group/links">
      <div className="absolute top-0 right-0 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none mix-blend-multiply dark:mix-blend-lighten"></div>
      <div className="flex items-center gap-3 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-[24px] bg-white/50 dark:bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/60 dark:border-white/20 shadow-sm">
          <Globe className="text-blue-600 dark:text-blue-400" size={24} />
        </div>
        <h3 className="text-[22px] font-black text-slate-800 dark:text-white tracking-tight">外部連結</h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10">
        {customLinks.map((link, idx) => {
          const IconComp = getLinkIcon(link.icon);
          const col = LINK_COLORS[link.themeColor] || LINK_COLORS.blue;
          return (
            <a key={link.id || `custom-link-${idx}`} href={link.url} target="_blank" rel="noreferrer"
              className="flex flex-col items-center gap-3 p-5 bg-white/40 dark:bg-white/5 backdrop-blur-xl rounded-[32px] active:scale-[0.95] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] border border-white/50 dark:border-white/10 hover:bg-white/80 dark:hover:bg-white/10 hover:-translate-y-2 hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_20px_40px_rgba(59,130,246,0.15)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.2),0_20px_40px_rgba(59,130,246,0.25)] group relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-colors duration-[600ms]"></div>
              <div className={`p-4 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-[24px] group-hover:scale-[1.15] group-hover:-rotate-6 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0 shadow-sm border border-white/60 dark:border-white/5 relative z-10 ${col.text} ${col.shadow} ${col.bgHover}`}>
                <IconComp size={28} className="shrink-0 drop-shadow-sm" />
              </div>
              <span className={`text-[14px] font-black text-slate-700 dark:text-gray-200 text-center w-full px-1 transition-colors duration-[600ms] relative z-10 ${col.groupText}`}>{link.title}</span>
            </a>
          );
        })}
      </div>
    </div>
  );

  const widgetNews = <SchoolNewsWidget />;

  const hasExam = tomorrowsPrep.some(item => item.exam);

  const widgetPrep = tomorrowsPrep.length > 0 && !isEditingSchedule ? (
    <div className="relative animate-pop-in">
      <div className={`relative z-10 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[36px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[15px] font-black text-slate-800 dark:text-gray-100 flex items-center gap-2">
            <BellRing size={18} className="text-orange-500" />
            明日準備摘要
          </h3>
          <span className="px-3 py-1 bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-black rounded-full border border-orange-100/50 dark:border-orange-500/20">
            {tomorrowsPrep.length} 個事項
          </span>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {tomorrowsPrep.map((item, idx) => (
            <div key={item.id || `prep-${idx}`} className={`group flex items-center gap-3 p-3.5 rounded-[24px] transition-all bg-white/40 dark:bg-white/5 border border-white/60 dark:border-white/5 hover:bg-white/80 dark:hover:bg-white/10 ${item.exam ? 'ring-1 ring-rose-500/20' : ''}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${item.exam ? 'bg-rose-500 text-white' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'}`}>
                {item.exam ? <AlertCircle size={18} /> : <Notebook size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${item.exam ? 'bg-rose-50 text-rose-500 dark:bg-rose-950/30' : 'bg-slate-100 text-slate-500 dark:bg-white/10'}`}>
                    {item.subject}
                  </span>
                  {item.exam && <span className="w-1 h-1 rounded-full bg-rose-500 animate-pulse" />}
                </div>
                <p className="text-[13.5px] font-bold text-slate-700 dark:text-gray-200 truncate leading-snug">
                  {item.exam ? `考試：${item.exam}` : item.homework}
                </p>
              </div>
              <button
                onClick={() => handleToggleAck(item._originalDateKey, item.id)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90 ${item.acknowledgedBy?.includes(user?.uid) ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-300 hover:text-emerald-500 dark:text-gray-600 dark:hover:text-emerald-400'}`}
              >
                <CheckCircle2 size={20} />
              </button>
            </div>
          ))}
        </div>
        {hasExam && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2 text-[11px] font-black text-rose-500 italic">
            <span className="flex h-2 w-2 rounded-full bg-rose-500" /> 注意：明天有考試，請務必複習！
          </div>
        )}
      </div>
    </div>
  ) : null;

  const widgets = {
    countdowns: widgetCountdowns,
    greeting: (
      <React.Fragment>
        {widgetGreeting}
      </React.Fragment>
    ),
    heatmap: widgetHeatmap,
    pomodoro: widgetPomodoro,
    schedule: widgetSchedule,
    links: widgetLinks,
    news: widgetNews,
    prep: widgetPrep
  };

  const layout = dashboardLayout || [
    { id: 'countdowns', visible: true }, { id: 'greeting', visible: true }, { id: 'pomodoro', visible: true },
    { id: 'heatmap', visible: true }, { id: 'schedule', visible: true }, { id: 'links', visible: true }, { id: 'news', visible: true }, { id: 'prep', visible: true }
  ]

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade px-1 relative">
      {layout.filter(item => item.visible).map(item => (
        <React.Fragment key={item.id}>{widgets[item.id]}</React.Fragment>
      ))}

      {/* 代課/更改科目 Modal (取代 window.prompt) */}
      {showSubModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 rounded-[32px] p-6 w-full max-w-sm shadow-2xl border border-white/20 dark:border-white/10 transform transition-all animate-slide-up-fade">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl">
                <PenTool size={24} />
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-white">設定代課或更改</h3>
            </div>
            <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mb-4">
              請輸入新的課程名稱或代課老師 (原: {subModalData?.originalSubj})
            </p>
            <input
              type="text"
              autoFocus
              value={subInputVal}
              onChange={e => setSubInputVal(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 mb-6 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 font-black text-[16px] text-slate-800 dark:text-white transition-all"
              placeholder="例如: 數學-王大明"
              onKeyDown={(e) => e.key === 'Enter' && confirmSubstitute()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setShowSubModal(false); setSubInputVal(''); setSubModalData(null); setIsSwapMode(false); setSelectedForSwap([]); }}
                className="flex-1 py-3.5 rounded-2xl font-black bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                取消
              </button>
              <button
                onClick={confirmSubstitute}
                className="flex-1 py-3.5 rounded-2xl font-black bg-blue-500 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-600 active:scale-95 transition-all"
              >
                確認變更
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default DashboardTab;