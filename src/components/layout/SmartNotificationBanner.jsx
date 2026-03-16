import React, { useState, useEffect } from 'react';

const SmartNotificationBanner = ({ onActivate }) => {
    const [status, setStatus] = useState('checking'); // checking, need-pwa, need-permission, hidden

    useEffect(() => {
        const checkStatus = () => {
            // 1. 偵測是否為 iOS
            const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
            // 2. 偵測是否已在 PWA 模式 (加入主畫面)
            const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;
            // 3. 檢查通知權限
            const permission = Notification.permission;

            if (isIOS && !isStandalone) {
                setStatus('need-pwa');
            } else if (permission !== 'granted') {
                setStatus('need-permission');
            } else {
                setStatus('hidden');
            }
        };

        checkStatus();
    }, []);

    if (status === 'hidden') return null;

    return (
        <div className="fixed top-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-3xl shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-500 rounded-2xl flex items-center justify-center text-white text-xl">
                        {status === 'need-pwa' ? '📲' : '🔔'}
                    </div>
                    <div className="flex-1 text-left">
                        <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                            {status === 'need-pwa' ? '將 GSAT Pro 加入主畫面' : '開啟調課即時提醒'}
                        </h4>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {status === 'need-pwa'
                                ? 'iOS 限制：點擊下方分享鈕並選擇「加入主畫面」才能接收通知。'
                                : '為了第一時間通知你 206 班課表異動，請允許通知。'}
                        </p>
                    </div>
                    {status === 'need-permission' && (
                        <button
                            onClick={onActivate}
                            className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold rounded-xl active:scale-95 transition-transform"
                        >
                            立刻開啟
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SmartNotificationBanner;