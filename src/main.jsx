import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/index.css'

// ⚠️ 移除 virtual:pwa-register 避免與 Firebase SW 衝突導致「無限重新整理」

// 清除舊的衝突 Service Worker，解除無限重新整理的詛咒
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (let registration of registrations) {
      if (registration.active?.scriptURL.includes('sw.js') && !registration.active?.scriptURL.includes('firebase')) {
        registration.unregister();
      }
    }
  });
}

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