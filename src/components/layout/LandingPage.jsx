import React from 'react';
import { 
  Sparkles, ArrowRight, RefreshCw, Store, ShieldCheck, 
  ChevronRight, Heart, Star, Coffee, Zap, Globe
} from 'lucide-react';

const LandingPage = ({ onStart, onGuestStart }) => {
  return (
    <div className="min-h-screen bg-[#020617] text-white font-sans selection:bg-emerald-500/30 overflow-x-hidden">
      {/* 🚀 Mesh Gradient Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[150px] rounded-full animate-float-delayed" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-purple-500/5 blur-[100px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 flex justify-between items-center p-6 lg:px-12 max-w-7xl mx-auto backdrop-blur-md bg-[#020617]/20 sticky top-0 border-b border-white/5">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-xl flex items-center justify-center text-white font-black shadow-[0_0_20px_rgba(16,185,129,0.4)] group-hover:scale-110 transition-transform">G</div>
          <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-white/70">GSAT Pro</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-bold text-white/60">
          <a href="#features" className="hover:text-emerald-400 transition-colors">功能特色</a>
          <a href="#support" className="hover:text-emerald-400 transition-colors">支持專案</a>
          <a href="/privacy.html" className="hover:text-emerald-400 transition-colors">隱私政策</a>
        </div>
        <button 
          onClick={onStart} 
          className="px-6 py-2.5 bg-white text-black rounded-full font-black text-sm active:scale-95 transition-all hover:bg-emerald-400 hover:text-white hover:shadow-[0_0_30px_rgba(52,211,153,0.3)] shadow-lg"
        >
          立即體驗
        </button>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-xs font-black mb-8 border border-emerald-500/20 animate-fadeIn backdrop-blur-sm">
          <Sparkles size={14} className="animate-pulse" /> 專為高中生打造的全方位數位助手
        </div>
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tighter mb-8 leading-[1] animate-slide-up-fade">
          掌握學測節奏<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-400 to-blue-400 drop-shadow-sm">
            GSAT Pro
          </span> 伴你上榜
        </h1>

        <p className="text-lg md:text-xl text-white/40 font-bold mb-12 max-w-2xl mx-auto leading-relaxed animate-fadeIn delay-200">
          一款整合數位課表、即時通知、校園特約與 AI 學習分析的數位助手，幫助你在繁忙的高三生活中，精準管理每一分一秒。
        </p>

        <div className="flex flex-col sm:flex-row gap-5 justify-center animate-slide-up-fade delay-300">
          <button 
            onClick={onStart} 
            className="group px-10 py-5 bg-emerald-500 text-white rounded-[24px] font-black text-lg shadow-[0_20px_50px_rgba(16,185,129,0.3)] active:scale-95 transition-all flex items-center justify-center gap-3 hover:bg-emerald-400 hover:-translate-y-1"
          >
            Google 登入 <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button 
            onClick={onGuestStart} 
            className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white rounded-[24px] font-black text-lg active:scale-95 transition-all border border-white/10 backdrop-blur-xl flex items-center justify-center gap-2"
          >
            直接體驗 <ChevronRight size={20} />
          </button>
        </div>

        {/* Floating Mockup Preview / Stats */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4 w-full opacity-60 hover:opacity-100 transition-opacity">
          {[
            { label: '即時通知', value: '100%', icon: Zap },
            { label: '校園覆蓋', value: '全台', icon: Globe },
            { label: 'AI 解析', value: 'Gemini', icon: Sparkles },
            { label: '完全免費', value: 'Free', icon: Heart }
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 border border-white/5 p-6 rounded-3xl backdrop-blur-sm">
              <stat.icon className="text-emerald-400 mb-3" size={24} />
              <div className="text-2xl font-black mb-1">{stat.value}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-white/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </header>

      {/* Features Grid */}
      <section id="features" className="relative z-10 py-32 px-6 bg-emerald-500/[0.02]">
        <div className="max-w-6xl mx-auto">
          <div className="mb-20 text-center">
            <h2 className="text-4xl md:text-5xl font-black mb-6">更聰明的備考方式</h2>
            <p className="text-white/40 font-bold">不僅僅是課表，更是你的數位外腦。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={RefreshCw} 
              color="bg-blue-500" 
              title="即時同步課表" 
              desc="與班級雲端同步，任何調課異動立即推播通知，不再跑錯教室。" 
            />
            <FeatureCard 
              icon={Store} 
              color="bg-orange-500" 
              title="特約商店優惠" 
              desc="整合校園周邊特約商店，出示數位介面即可享有學生專屬折扣。" 
            />
            <FeatureCard 
              icon={ShieldCheck} 
              color="bg-emerald-500" 
              title="Google 安全驗證" 
              desc="使用 Google 帳號安全登入，保護你的個人學習數據不外洩。" 
            />
          </div>
        </div>
      </section>

      {/* Support Section */}
      <section id="support" className="relative z-10 py-32 px-6 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto bg-gradient-to-br from-white/10 to-white/5 p-12 md:p-20 rounded-[48px] border border-white/10 backdrop-blur-3xl text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 animate-pulse">
            <Heart size={120} strokeWidth={1} />
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-8">支持這個專案</h2>
          <p className="text-white/60 font-medium mb-12 text-lg leading-relaxed">
            GSAT Pro 是一項由學生為學生發起的開源計畫。如果您覺得這個工具對您有幫助，歡迎透過各種方式支持我們持續更新。
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button className="flex items-center gap-3 px-8 py-4 bg-white text-black rounded-2xl font-black hover:bg-emerald-400 hover:text-white transition-all active:scale-95 shadow-xl">
              <Coffee size={20} /> 請開發者喝杯咖啡
            </button>
            <button className="flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-black hover:bg-white/10 transition-all active:scale-95">
              <Star size={20} className="text-yellow-400" /> GitHub 點個星星
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-20 px-6 border-t border-white/5 bg-[#020617]">
        <div className="max-w-6xl mx-auto flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-x-10 gap-y-6 mb-12 text-[13px] font-black text-white/40 uppercase tracking-widest">
            <a href="/privacy.html" className="hover:text-emerald-400 transition-colors">Privacy Policy</a>
            <a href="/terms.html" className="hover:text-emerald-400 transition-colors">Terms of Service</a>
            <a href="mailto:support@gsat-pro.web.app" className="hover:text-emerald-400 transition-colors">Contact Support</a>
          </div>
          <p className="text-[11px] font-black text-white/20 uppercase tracking-[0.4em] text-center leading-loose">
            © 2026 GSAT PRO TEAM. EMPOWERING STUDENTS THROUGH TECHNOLOGY.<br />
            MADE WITH ❤️ FOR THE NEXT GENERATION.
          </p>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0) scale(1.1); }
          50% { transform: translateY(30px) scale(1); }
        }
        .animate-float { animation: float 15s ease-in-out infinite; }
        .animate-float-delayed { animation: float-delayed 18s ease-in-out infinite; }
      `}} />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, color, title, desc }) => (
  <div className="group p-10 bg-white/5 border border-white/5 rounded-[40px] backdrop-blur-md hover:bg-white/[0.08] hover:border-emerald-500/30 transition-all duration-500 hover:-translate-y-2">
    <div className={`w-16 h-16 ${color} text-white rounded-3xl flex items-center justify-center mb-8 shadow-xl group-hover:scale-110 transition-transform duration-500 rotate-3 group-hover:rotate-0`}>
      <Icon size={32} strokeWidth={2.5} />
    </div>
    <h3 className="text-2xl font-black mb-4 group-hover:text-emerald-400 transition-colors">{title}</h3>
    <p className="text-white/40 font-bold leading-relaxed">
      {desc}
    </p>
  </div>
);

export default LandingPage;
