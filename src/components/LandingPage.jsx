import React from 'react';
import { Sparkles, ArrowRight, RefreshCw, Store, ShieldCheck } from 'lucide-react';

/**
 * 💡 公開登錄頁面元件 (Landing Page)
 * 用於通過 Google OAuth 審核，說明應用程式用途
 */
const LandingPage = ({ onStart }) => (
  <div className="min-h-screen bg-white text-slate-900 font-sans">
    {/* 導航列 */}
    <nav className="flex justify-between items-center p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white font-black shadow-lg shadow-emerald-500/20">G</div>
        <span className="text-xl font-black tracking-tighter">GSAT Pro</span>
      </div>
      <button 
        onClick={onStart} 
        className="px-6 py-2 bg-slate-900 text-white rounded-full font-bold text-sm active:scale-95 transition-all hover:bg-slate-800"
      >
        立即登入
      </button>
    </nav>

    {/* 主視覺區 */}
    <main className="max-w-4xl mx-auto px-6 pt-16 pb-24 text-center">
      <div className="inline-flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-1.5 rounded-full text-xs font-black mb-6 border border-emerald-100">
        <Sparkles size={14} /> 專為高中生打造的備考神器
      </div>
      <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 leading-[1.1]">
        掌握學測節奏<br /><span className="text-emerald-500">GSAT Pro</span> 伴你上榜
      </h1>
      <p className="text-lg text-slate-500 font-medium mb-10 max-w-2xl mx-auto">
        GSAT Pro 是一款整合數位課表、即時調課通知、特約商店查詢與 AI 學習分析的數位助手，幫助你在繁忙的高三生活中，精準管理每一分一秒。
      </p>
      <div className="flex flex-col md:flex-row gap-4 justify-center">
        <button 
          onClick={onStart} 
          className="px-8 py-4 bg-emerald-500 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-500/30 active:scale-95 transition-all flex items-center justify-center gap-2 hover:bg-emerald-600"
        >
          開始使用 <ArrowRight size={20} />
        </button>
        <a 
          href="#features" 
          className="px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black text-lg active:scale-95 transition-all hover:bg-slate-200"
        >
          功能介紹
        </a>
      </div>
    </main>

    {/* 功能介紹區 (Google 審核重點：說明用途) */}
    <section id="features" className="bg-slate-50 py-24 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6">
            <RefreshCw size={28} />
          </div>
          <h3 className="text-xl font-black mb-4">即時同步課表</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            與班級雲端同步，任何調課異動立即推播通知，不再跑錯教室。
          </p>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mb-6">
            <Store size={28} />
          </div>
          <h3 className="text-xl font-black mb-4">特約商店優惠</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            整合校園周邊特約商店，出示數位介面即可享有學生專屬折扣。
          </p>
        </div>
        <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 transition-transform hover:-translate-y-1">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-500 rounded-2xl flex items-center justify-center mb-6">
            <ShieldCheck size={28} />
          </div>
          <h3 className="text-xl font-black mb-4">Google 安全驗證</h3>
          <p className="text-slate-500 font-medium leading-relaxed">
            使用 Google 帳號安全登入，保護你的個人學習數據不外洩。
          </p>
        </div>
      </div>
    </section>

    {/* Footer (Google 審核重點：政策連結) */}
    <footer className="py-12 px-6 border-t border-slate-100 text-center bg-slate-50/50">
      <div className="flex flex-wrap justify-center gap-6 md:gap-10 mb-8 font-black text-sm text-slate-500">
        <a href="/privacy.html" className="flex items-center gap-2 hover:text-emerald-600 transition-colors border-b-2 border-transparent hover:border-emerald-200 pb-1">
          <ShieldCheck size={16} /> 隱私權政策 (Privacy Policy)
        </a>
        <a href="/terms.html" className="hover:text-emerald-600 transition-colors border-b-2 border-transparent hover:border-emerald-200 pb-1">
          服務條款 (Terms of Service)
        </a>
        <a href="mailto:support@gsat-pro.web.app" className="hover:text-emerald-600 transition-colors border-b-2 border-transparent hover:border-emerald-200 pb-1">
          聯絡支援 (Support)
        </a>
      </div>
      <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest leading-loose">
        © 2026 GSAT Pro Team. All rights reserved.<br />
        專為高中生打造的數位備考助手
      </p>
    </footer>
  </div>
);

export default LandingPage;
