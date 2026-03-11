import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const VocabularyTab = ({ userProfile, isAdmin, theme, geminiKey }) => {
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-130px)] animate-fadeIn">
      <div className="flex justify-between items-center px-1 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <BookOpen size={24} className="shrink-0" />
          </div>
          <h2 className="text-2xl font-black text-emerald-600 tracking-tight">單字遊戲</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-xl shadow-sm shrink-0">
          <Sparkles size={14} className="shrink-0" />
          <span className="text-[12px] font-bold">AI 輔助</span>
        </div>
      </div>
      <div className="flex-1 w-full bg-[var(--bg-surface)] rounded-[36px] shadow-soft border border-[var(--border-color)] overflow-hidden relative glass-effect">
        <iframe
          src={`./teacher_vocab.html?email=${encodeURIComponent(userProfile?.email || '')}&name=${encodeURIComponent(userProfile?.name || '')}&isAdmin=${isAdmin}&theme=${theme}&geminiKey=${encodeURIComponent(geminiKey || '')}`}
          className="absolute inset-0 w-full h-full border-none bg-transparent"
          title="Vocabulary App"
        />
      </div>
    </div>
  );
};

export default VocabularyTab;
