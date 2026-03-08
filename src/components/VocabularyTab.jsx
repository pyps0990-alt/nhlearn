import React from 'react';
import { BookOpen, Sparkles } from 'lucide-react';

const VocabularyTab = ({ userProfile, isAdmin, theme, geminiKey }) => {
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-130px)] animate-fadeIn">
      <div className="flex justify-between items-center px-1 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
            <BookOpen size={24} />
          </div>
          <h2 className="text-2xl font-black text-emerald-600 tracking-tight">單字遊戲</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-xl shadow-sm">
          <Sparkles size={14} />
          <span className="text-[12px] font-bold">AI 輔助</span>
        </div>
      </div>
      <div className="flex-1 w-full bg-[#f2f2f7] rounded-[36px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 overflow-hidden relative">
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
