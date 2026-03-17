import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, LayoutDashboard, BookOpen, Notebook, Store, Bus, Settings, MessageSquare, HelpCircle, X, ArrowRight, Command, GraduationCap, BookMarked } from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: '儀表板', icon: LayoutDashboard, keywords: ['home', 'dashboard', '首頁', '課表'] },
  { id: 'vocabulary', label: '單字本', icon: BookOpen, keywords: ['vocab', 'word', '單字', '英文'] },
  { id: 'contact', label: '聯絡簿', icon: Notebook, keywords: ['contact', 'homework', '作業', '聯絡'] },
  { id: 'notes', label: '知識筆記', icon: BookMarked, keywords: ['note', 'study', '筆記', '知識'] },
  { id: 'credits', label: '學分計算', icon: GraduationCap, keywords: ['credit', 'score', '學分', '畢業'] },
  { id: 'stores', label: '校園商家', icon: Store, keywords: ['store', 'shop', '商店', '美食'] },
  { id: 'traffic', label: '交通資訊', icon: Bus, keywords: ['traffic', 'bus', '公車', '交通'] },
  { id: 'settings', label: '設定', icon: Settings, keywords: ['settings', 'config', '設定', '偏好'] },
  { id: 'feedback', label: '回饋', icon: MessageSquare, keywords: ['feedback', '回饋', '建議', '問題'] },
  { id: 'tutorial', label: '使用教學', icon: HelpCircle, keywords: ['help', 'tutorial', '教學', '說明'] },
];

const CommandPalette = ({ isOpen, onClose, onSelectTab }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filtered = useMemo(() => {
    if (!query.trim()) return TABS;
    const q = query.toLowerCase();
    return TABS.filter(t =>
      t.label.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.keywords.some(k => k.includes(q))
    );
  }, [query]);

  const handleSelect = (tabId) => {
    onSelectTab(tabId);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && filtered.length > 0) {
      handleSelect(filtered[0].id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] animate-fadeIn transition-all" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/30 dark:bg-slate-900/60 backdrop-blur-md" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-[90%] max-w-xl bg-white/70 dark:bg-zinc-800/70 backdrop-blur-3xl backdrop-saturate-200 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_24px_64px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_24px_64px_rgba(0,0,0,0.4)] overflow-hidden animate-slide-up-fade transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
      >
        {/* Search Input */}
        <div className="flex items-center gap-4 px-6 py-5 border-b border-gray-200/50 dark:border-white/10">
          <Search size={24} className="text-emerald-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="輸入指令或搜尋功能..."
            className="flex-1 bg-transparent text-[20px] font-black text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 outline-none"
          />
          <kbd className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-white/10 rounded-lg text-[11px] font-black text-slate-500 dark:text-slate-400 border border-gray-200 dark:border-white/5 shadow-sm">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto py-3 px-3 scrollbar-hide">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-slate-400 dark:text-gray-600">
              <Search size={32} className="mb-3 opacity-40" />
              <span className="text-[14px] font-bold">找不到相關功能</span>
            </div>
          ) : (
            filtered.map((tab, idx) => (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-[20px] hover:bg-white dark:hover:bg-white/5 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] group active:scale-[0.98] focus:bg-white dark:focus:bg-white/5 focus:outline-none ${idx === 0 && query ? 'bg-white/60 dark:bg-white/5 shadow-sm ring-1 ring-emerald-500/20' : ''}`}
              >
                <div className={`p-2.5 rounded-[14px] transition-colors duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${idx === 0 && query ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white group-hover:shadow-md group-hover:shadow-emerald-500/30'}`}>
                  {React.createElement(tab.icon, { size: 20 })}
                </div>
                <span className="flex-1 text-left text-[16px] font-black text-slate-800 dark:text-gray-200">{tab.label}</span>
                <span className="text-[12px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">前往 <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" /></span>
              </button>
            ))
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-white/5 text-[11px] font-bold text-slate-400 dark:text-gray-600">
          <Command size={12} />
          <span>按 Enter 選取 · Esc 關閉</span>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
