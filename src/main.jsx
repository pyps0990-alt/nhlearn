import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { registerSW } from 'virtual:pwa-register';

// 啟動 PWA 的 Service Worker
registerSW({ immediate: true });

// 🚀 註冊通知後勤兵 (Service Worker)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/firebase-messaging-sw.js')
      .then(reg => console.log('✅ Service Worker 已就緒:', reg.scope))
      .catch(err => console.log('❌ Service Worker 註冊失敗:', err));
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)