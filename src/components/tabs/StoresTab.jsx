import React, { useState, useEffect } from 'react';
import { Store, CreditCard, Clock, MapPin, Navigation, CheckCircle2, Utensils, Coffee, CupSoda, PenTool } from 'lucide-react';

import { db } from '../../config/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';


const StoresTab = ({ isAdmin, campusName, schoolId }) => {
  const [stores, setStores] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [hasFeature, setHasFeature] = useState(null); // 紀錄特約商店功能是否開啟

  const [newStore, setNewStore] = useState({
    name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '',
    operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: ''
  });

  // 1. 監聽學校根目錄文件，檢查功能開關 (Feature Flag)
  useEffect(() => {
    if (!schoolId) return;
    const schoolRef = doc(db, 'Schools', schoolId);
    const unsubSchool = onSnapshot(
      schoolRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const features = docSnap.data().features;
          if (Array.isArray(features)) {
            setHasFeature(features.includes('stores'));
          } else if (features && typeof features === 'object') {
            setHasFeature(features.hasDiscountStores !== false);
          } else {
            setHasFeature(true);
          }
        } else {
          setHasFeature(true);
        }
      },
      (error) => {
        console.error("Firestore 監聽錯誤 (school info):", error);
        setErrorMsg('無法讀取學校設定');
      }
    );
    return () => unsubSchool();
  }, [schoolId]);

  // 2. 監聽特約商店資料 (更新為新路徑 DiscountStores)
  useEffect(() => {
    // 若功能未開啟，則不抓取資料以節省流量
    if (hasFeature !== true || !schoolId) {
      setStores([]);
      return;
    }
    const unsub = onSnapshot(
      collection(db, 'Schools', schoolId, 'DiscountStores'),
      (snapshot) => {
        const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        storesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setStores(storesData);
        setErrorMsg(''); // 成功讀取時清空錯誤
      },
      (error) => {
        // 💡 加上錯誤捕捉：避免出現 Uncaught Error 導致整個 App 崩潰
        console.error("Firestore 監聽錯誤 (stores):", error);
        if (error.code === 'permission-denied') {
          setErrorMsg('權限不足：無法讀取商店資料，請檢查 Firebase 安全規則。');
        } else {
          setErrorMsg('發生錯誤：' + error.message);
        }
      }
    );
    return () => unsub();
  }, [hasFeature, schoolId]);

  const getStoreCategoryIcon = (type) => {
    switch (type) {
      case '餐飲': return Utensils;
      case '飲料': return CupSoda;
      case '咖啡': return Coffee;
      case '文具': return PenTool;
      default: return Store;
    }
  };

  const handleNavigate = (storeName, address) => {
    const fullQuery = `${storeName} ${address || ''}`.trim();
    const query = encodeURIComponent(fullQuery);
    const isIOS = /iPad|iPhone|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);

    if (isAndroid) {
      window.location.href = `intent://maps.google.com/maps?q=${query}#Intent;scheme=http;package=com.google.android.apps.maps;end`;
    } else if (isIOS) {
      window.location.href = `comgooglemaps://?q=${query}`;
      setTimeout(() => window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank'), 500);
    } else {
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  // 3. UI 狀態處理：若功能未開放，顯示 Empty State
  if (!schoolId) {
    return (
      <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade mb-12">
        <div className="flex flex-col gap-2 px-2">
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
            <Store size={28} className="shrink-0 neon-glow-emerald" />
            校園特約商店
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[40px] border border-white/60 dark:border-white/10 shadow-sm mx-2 animate-pop-in">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5">
            <Store size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2">尚未設定學校</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-xs">
            請先至設定頁面選擇您的學校，以查看專屬特約商店！
          </p>
        </div>
      </div>
    );
  }

  if (hasFeature === false) {
    return (
      <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade mb-12">
        <div className="flex flex-col gap-2 px-2">
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
            <Store size={28} className="shrink-0 neon-glow-emerald" />
            校園特約商店
          </h2>
        </div>
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[40px] border border-white/60 dark:border-white/10 shadow-sm mx-2 animate-pop-in">
          <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-5">
            <Store size={40} className="text-slate-400" />
          </div>
          <h3 className="text-xl font-black text-slate-700 dark:text-slate-200 mb-2">本校目前未開放特約商店</h3>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 max-w-xs">
            {campusName || '本校'}的特約商店功能尚未啟用，請關注後續公告或聯繫學生會！
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 flex flex-col w-full text-left animate-slide-up-fade mb-12">
      <div className="flex flex-col gap-2 px-2">
        <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-3 tracking-tight">
          <Store size={28} className="shrink-0 neon-glow-emerald" />
          校園特約商店
        </h2>
        <p className="text-[14px] font-bold text-slate-500 dark:text-slate-400 ml-10">
          出示{campusName || '校園'}學生證即可享有專屬優惠，為你的荷包把關！
        </p>
      </div>

      {/* 如果有權限錯誤，顯示在畫面上 */}
      {errorMsg && (
        <div className="bg-red-50 text-red-600 p-5 rounded-[24px] text-sm font-bold border border-red-100 shadow-sm mx-1">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-1">
        {stores.map((store, idx) => (
          <div
            key={store.id}
            style={{ animationDelay: `${idx * 80}ms` }}
            className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl backdrop-saturate-150 p-7 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 flex flex-col relative transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] group hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] hover:-translate-y-2 animate-slide-up-fade overflow-hidden"
          >
            {/* 標題與圖示區塊 */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 rounded-[24px] shadow-sm shrink-0">
                  {React.createElement(getStoreCategoryIcon(store.type), { size: 32, className: "text-emerald-600 dark:text-emerald-400 shrink-0" })}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-[3px] border-white dark:border-zinc-900 flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={12} className="text-white shrink-0" />
                </div>
              </div>

              <div className="flex flex-col">
                <h4 className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight leading-tight mb-2">
                  {store.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
                    {store.type}
                  </span>
                  {store.deliveryStatus && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${store.deliveryStatus.includes('外送')
                      ? 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20'
                      : 'text-gray-500 bg-gray-50 border-gray-100 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700'
                      }`}>
                      {store.deliveryStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 專屬優惠區塊 */}
            <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-500/10 p-4 rounded-3xl border border-orange-100 dark:border-orange-500/20 shadow-inner mb-6 relative overflow-hidden transition-colors group-hover:bg-orange-100/50 dark:group-hover:bg-orange-500/20">
              <div className="absolute -right-2 -top-2 p-2 opacity-5 pointer-events-none transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-110">
                <CreditCard size={80} className="text-orange-900 dark:text-orange-300" />
              </div>
              <CreditCard size={20} className="text-orange-500 shrink-0 mt-0.5 relative z-10" />
              <div className="flex flex-col gap-0.5 relative z-10">
                <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest">
                  GSAT PRO 獨家優惠
                </span>
                <span className="text-[16px] font-black text-orange-800 dark:text-orange-200 leading-snug break-words">
                  {store.discount}
                </span>
              </div>
            </div>

            {/* 底部資訊與導航 */}
            <div className="mt-auto flex items-center justify-between gap-3 pt-5 border-t border-gray-100 dark:border-zinc-800">
              <div className="flex flex-col gap-1.5 w-1/2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{store.operatingHours || store.estimatedTime || '詳見官網'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500 dark:text-zinc-400">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{store.address || '內湖區校園周邊'}</span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate(store.name, store.address)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 text-white rounded-[20px] text-[13px] font-black shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-emerald-600 hover:shadow-emerald-500/40 shrink-0"
              >
                <Navigation size={16} /> 導航
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StoresTab;