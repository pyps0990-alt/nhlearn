import React, { useState, useEffect } from 'react';
import { Store, CreditCard, Clock, MapPin, Navigation, CheckCircle2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

const StoresTab = ({ isAdmin }) => {
  const [stores, setStores] = useState([]);
  const [newStore, setNewStore] = useState({
    name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '',
    operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: ''
  });

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'stores'), (snapshot) => {
      const storesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      storesData.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStores(storesData);
    });
    return () => unsub();
  }, []);

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

  return (
    <div className="space-y-5 flex flex-col w-full text-left animate-slide-up-fade mb-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-3">
          <Store size={28} /> 校園特約商店
        </h2>
      </div>
      <p className="text-[13px] font-bold text-gray-500 px-1 mb-2">
        出示內湖高中學生證即可享有專屬優惠！
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {stores.map((store, idx) => (
          <div
            key={store.id}
            style={{ animationDelay: `${idx * 80}ms` }}
            className="bg-white/80 backdrop-blur-2xl p-6 rounded-[36px] shadow-soft border border-white/60 flex flex-col relative transition-all duration-300 ease-spring group hover:shadow-float hover:-translate-y-1 animate-slide-up-fade overflow-hidden"
          >
            {/* 標題與圖示區塊 */}
            <div className="flex items-center gap-4 mb-5">
              <div className="relative">
                <div className="w-16 h-16 flex items-center justify-center text-3xl bg-emerald-50 border border-emerald-100 rounded-[24px] shadow-sm">
                  {store.icon}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-[3px] border-white flex items-center justify-center shadow-sm">
                  <CheckCircle2 size={12} className="text-white" />
                </div>
              </div>

              <div className="flex flex-col">
                <h4 className="text-[20px] font-black text-gray-900 tracking-tight leading-tight mb-2">
                  {store.name}
                </h4>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                    {store.type}
                  </span>
                  {store.deliveryStatus && (
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${store.deliveryStatus.includes('外送')
                      ? 'text-orange-600 bg-orange-50 border-orange-100'
                      : 'text-gray-500 bg-gray-50 border-gray-100'
                      }`}>
                      {store.deliveryStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 專屬優惠區塊 */}
            <div className="flex items-start gap-3 bg-orange-50 p-4 rounded-3xl border border-orange-100 shadow-inner mb-6 relative overflow-hidden transition-colors group-hover:bg-orange-100/50">
              <div className="absolute -right-2 -top-2 p-2 opacity-5 pointer-events-none transition-transform duration-500 group-hover:scale-110">
                <CreditCard size={80} className="text-orange-900" />
              </div>
              <CreditCard size={20} className="text-orange-500 shrink-0 mt-0.5 relative z-10" />
              <div className="flex flex-col gap-0.5 relative z-10">
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">
                  GSAT PRO 獨家優惠
                </span>
                <span className="text-[16px] font-black text-orange-800 leading-snug break-words">
                  {store.discount}
                </span>
              </div>
            </div>

            {/* 底部資訊與導航 */}
            <div className="mt-auto flex items-center justify-between gap-3 pt-5 border-t border-gray-100">
              <div className="flex flex-col gap-1.5 w-1/2">
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                  <Clock size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{store.operatingHours || store.estimatedTime || '詳見官網'}</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-bold text-gray-500">
                  <MapPin size={13} className="text-gray-400 shrink-0" />
                  <span className="truncate">{store.address || '內湖區校園周邊'}</span>
                </div>
              </div>

              <button
                onClick={() => handleNavigate(store.name, store.address)}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-emerald-500 text-white rounded-[20px] text-[13px] font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all duration-300 ease-spring hover:bg-emerald-600 hover:shadow-emerald-500/40 shrink-0"
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