import React, { useState } from 'react';
import { ShieldCheck, FileText, ChevronLeft, Scale, Globe, Eye, ExternalLink } from 'lucide-react';
import PrivacyTab from './PrivacyTab';
import TermsTab from './TermsTab';

const LegalTab = ({ onBack }) => {
  const [view, setView] = useState('menu'); // 'menu', 'privacy', 'terms'


  return (
    <div className="space-y-6 flex flex-col w-full text-left mb-8">
      {/* 頂部導航 */}
      <div className="flex items-center gap-4 px-1">
        {view !== 'menu' && (
          <button
            onClick={() => setView('menu')}
            className="p-3 bg-slate-50 dark:bg-white/10 rounded-xl shadow-sm border border-slate-200 dark:border-white/10 active:scale-90 transition-all shrink-0"
          >
            <ChevronLeft size={20} className="shrink-0 text-slate-600 dark:text-gray-300" />
          </button>
        )}
        <h2 className="text-2xl font-black text-[var(--text-primary)]">
          {view === 'menu' ? '法律資訊與服務' : view === 'privacy' ? '隱私保護' : '使用規範'}
        </h2>
      </div>

      {view === 'menu' ? (
        <div className="grid grid-cols-1 gap-4 animate-slide-up-fade px-1">
          <button
            onClick={() => setView('privacy')}
            className="group bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0 border border-transparent dark:border-white/10 group-hover:scale-110 transition-transform">
                <ShieldCheck size={24} className="shrink-0" />
              </div>
              <div>
                <div className="text-[17px] font-black text-[var(--text-primary)]">隱私權政策</div>
                <div className="text-[12px] font-bold text-slate-400">瞭解我們如何保護您的數據</div>
              </div>
            </div>
            <ChevronLeft size={20} className="text-slate-300 rotate-180 shrink-0 transition-transform group-hover:translate-x-1" />
          </button>

          <button
            onClick={() => setView('terms')}
            className="group bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-500/10 rounded-2xl flex items-center justify-center text-blue-600 shrink-0 border border-transparent dark:border-white/10 group-hover:scale-110 transition-transform">
                <FileText size={24} className="shrink-0" />
              </div>
              <div>
                <div className="text-[17px] font-black text-[var(--text-primary)]">服務條款</div>
                <div className="text-[12px] font-bold text-slate-400">使用 GSAT Pro 的權利與義務</div>
              </div>
            </div>
            <ChevronLeft size={20} className="text-slate-300 rotate-180 shrink-0 transition-transform group-hover:translate-x-1" />
          </button>

          <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] mt-4">
            <h4 className="text-[14px] font-black text-[var(--text-primary)] mb-2 flex items-center gap-2">
              <Globe size={16} className="text-slate-400 shrink-0" /> 資料合規性
            </h4>
            <p className="text-[12px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed">
              本程式嚴格遵守 Google API 使用者數據政策，所有機敏權限皆經過明確告知與授權。我們致力於打造一個安全、透明的學習環境。
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-10 rounded-[40px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] max-h-[75vh] overflow-y-auto scrollbar-hide">
          {view === 'privacy' ? <PrivacyTab /> : <TermsTab />}

          <div className="mt-12 pt-8 border-t border-[var(--border-color)] text-center">
            <p className="text-[12px] font-bold text-slate-400">若有任何疑問，請聯絡開發團隊</p>
            <a href="mailto:support@gsat-pro.web.app" className="text-[14px] font-black text-emerald-600 hover:underline mt-1 inline-block">support@gsat-pro.web.app</a>
          </div>
        </div>
      )}
    </div>
  );
};

export default LegalTab;
