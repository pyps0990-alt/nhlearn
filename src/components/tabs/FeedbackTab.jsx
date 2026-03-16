import React, { useState } from 'react';
import {
  MessageSquare, Heart, Coffee, Star, Send,
  MapPin, Mail, Github, Users, CreditCard, Sparkles, RefreshCw, ImagePlus, X, ChevronDown
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const FeedbackTab = ({ userProfile, triggerNotification }) => {
  const [feedback, setFeedback] = useState('');
  const [contact, setContact] = useState(userProfile?.email || '');
  const [feedbackType, setFeedbackType] = useState('🐛 錯誤回報');
  const [screenshot, setScreenshot] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // 處理圖片上傳與自動壓縮
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; // 限制最大寬度為 800px 以壓縮圖片
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        // 轉為 jpeg 格式，品質 0.7
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        setScreenshot(compressedBase64);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      triggerNotification('提示', '請輸入您的寶貴建議');
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        userId: userProfile?.uid || 'anonymous',
        userName: userProfile?.displayName || '匿名用戶',
        email: contact,
        type: feedbackType,
        content: feedback,
        screenshot: screenshot || null,
        timestamp: serverTimestamp(),
        device: navigator.userAgent,
        version: '1.2.0'
      });

      // 🚀 寄送 Email 通知 (透過 Google Apps Script Webhook)
      const GAS_EMAIL_WEBHOOK_URL = import.meta.env.VITE_GAS_EMAIL_WEBHOOK_URL || 'https://script.google.com/macros/s/AKfycbzOPqFB_imMJ5w9T0FTOCHOER2o1Doz3keHavYmvp_DWTXf39rDMK8A1vqdUS-To1GvKg/exec';
      fetch(GAS_EMAIL_WEBHOOK_URL, {
        method: 'POST',
        mode: 'no-cors', // 避免 CORS 問題
        headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // 💡 關鍵：用 text/plain 才能順利傳輸
        body: JSON.stringify({
          subject: `🔔 GSAT Pro 新意見回饋 - ${feedbackType}`,
          email: contact || '未提供',
          message: `[${feedbackType}]\n${feedback}`,
          image: screenshot || ''
        })
      }).catch(e => console.error("Email API Error:", e));

      setSubmitted(true);
      setFeedback('');
      setScreenshot(null);
      triggerNotification('傳送成功 🎉', '感謝您的回饋，我們會持續進度！');
    } catch (err) {
      console.error('Feedback error:', err);
      triggerNotification('傳送失敗', '請檢查網路連線後再試一次');
    } finally {
      setIsSubmitting(false);
    }
  };

  const supportOptions = [
    {
      title: '贊助開發（信用卡／超商）',
      desc: '支援信用卡、超商代碼等台灣常見付款方式。',
      icon: CreditCard,
      color: 'bg-orange-500',
      action: () => window.open('https://p.ecpay.com.tw/C5ACF64', '_blank')
    },
    {
      title: '在 GitHub 點個星星 ⭐',
      desc: '給予開源項目肯定的最簡單方式。',
      icon: Star,
      color: 'bg-yellow-500',
      action: () => window.open('https://github.com/pyps0990-alt/gsat-pro', '_blank')
    },
    {
      title: '推薦給同學',
      desc: '讓更多的同學一起掌握學測節奏。',
      icon: Users,
      color: 'bg-blue-500',
      action: () => {
        if (navigator.share) {
          navigator.share({
            title: 'GSAT Pro - 你的學測神助手',
            text: '這款 App 超好用，整合了班級課表和 AI 學習分析，推薦給你！',
            url: window.location.origin
          });
        } else {
          navigator.clipboard.writeText(window.location.origin);
          triggerNotification('已複製連結', '快傳給同學吧！');
        }
      }
    }
  ];

  return (
    <div className="space-y-8 animate-slide-up-fade pb-10">
      <div className="px-1 text-left">
        <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
          <MessageSquare size={28} className="text-emerald-500 shrink-0" /> 使用者回饋
        </h2>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 ml-1">
          您的每一份建議都是 GSAT Pro 進步的動力
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 回饋表單 */}
        <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[36px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]">
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">回饋分類</label>
                <div className="relative">
                  <select
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-5 py-3.5 rounded-2xl text-[15px] font-bold outline-none focus:border-emerald-400 text-slate-900 dark:text-white appearance-none cursor-pointer"
                    value={feedbackType}
                    onChange={(e) => setFeedbackType(e.target.value)}
                  >
                    <option value="🐛 錯誤回報">🐛 錯誤回報</option>
                    <option value="✨ 功能許願">✨ 功能許願</option>
                    <option value="💡 體驗心得">💡 體驗心得</option>
                    <option value="📝 其他建議">📝 其他建議</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">聯絡方式 (選填)</label>
                <input
                  type="text"
                  placeholder="Email 或社交軟體帳號"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-5 py-3.5 rounded-2xl text-[15px] font-bold outline-none focus:border-emerald-400 text-slate-900 dark:text-white"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">回饋內容</label>
                <textarea
                  placeholder="遇到問題、功能建議或簡單的鼓勵..."
                  rows="5"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 px-5 py-4 rounded-[28px] text-[15px] font-bold outline-none focus:border-emerald-400 text-slate-900 dark:text-white resize-none"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                ></textarea>
              </div>

              {/* 上傳截圖區塊 */}
              <div className="space-y-2">
                <label className="text-[12px] font-black text-slate-400 uppercase tracking-widest ml-2">附上截圖 (選填)</label>
                {!screenshot ? (
                  <label className="w-full flex items-center justify-center gap-2 bg-slate-50 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/20 py-4 rounded-[24px] text-[14px] font-bold text-slate-500 cursor-pointer hover:bg-slate-100 dark:hover:bg-white/10 transition-colors active:scale-[0.98]">
                    <ImagePlus size={20} />
                    點擊上傳畫面截圖
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                ) : (
                  <div className="relative inline-block">
                    <img src={screenshot} alt="Screenshot preview" className="h-32 object-contain rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm" />
                    <button type="button" onClick={() => setScreenshot(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1.5 rounded-full shadow-md hover:scale-110 transition-transform active:scale-90">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                {isSubmitting ? '傳送中...' : '傳送意見回饋'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-full flex items-center justify-center mb-6">
                <Sparkles size={32} className="text-emerald-500" />
              </div>
              <h4 className="text-xl font-black text-slate-900 dark:text-white mb-2">已收到您的回饋！</h4>
              <p className="text-slate-500 dark:text-gray-400 font-bold max-w-[240px] mb-8">
                感謝您的參與，我們會認真閱讀每一份意見。
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="px-8 py-3 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-xl font-black text-sm"
              >
                再寫一份
              </button>
            </div>
          )}
        </div>

        {/* 專案支持 */}
        <div className="space-y-4">
          <div className="px-1">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Heart size={16} className="text-rose-500" /> 支持專案
            </h3>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {supportOptions.map((opt, idx) => (
              <button
                key={idx}
                onClick={opt.action}
                className="group flex items-center gap-4 p-5 bg-white dark:bg-white/5 rounded-3xl border border-gray-100 dark:border-white/10 hover:border-emerald-500/30 hover:shadow-float transition-all active:scale-[0.98] text-left"
              >
                <div className={`w-12 h-12 ${opt.color} rounded-2xl flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <opt.icon size={26} />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-black text-slate-800 dark:text-white">{opt.title}</div>
                  <div className="text-[11px] font-bold text-slate-400 dark:text-gray-500 mt-0.5">{opt.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[32px] border border-indigo-500/20 mt-2">
            <h4 className="text-indigo-600 dark:text-indigo-400 font-black text-sm flex items-center gap-2 mb-2">
              <Sparkles size={16} /> 想加入開發？
            </h4>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
              如果你也會 React 或設計，歡迎一起為全台灣的高中生打造更好的工具。請透過回饋表單聯絡我們！
            </p>
          </div>
        </div>
      </div>

      {/* Fullscreen Image Preview Modal */}
      {isPreviewOpen && screenshot && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsPreviewOpen(false)}>
          <img src={screenshot} alt="Fullscreen preview" className="max-w-full max-h-full rounded-2xl object-contain shadow-2xl scale-[0.95] animate-pop-in" />
          <button className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors active:scale-90" onClick={() => setIsPreviewOpen(false)}>
            <X size={24} />
          </button>
        </div>
      )}
    </div>
  );
};

export default FeedbackTab;
