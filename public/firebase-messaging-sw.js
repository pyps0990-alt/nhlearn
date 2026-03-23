// public/firebase-messaging-sw.js

// 1. 引入 Firebase 必要的腳本
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// 2. 初始化 Firebase (這裡只需要 Sender ID)
const firebaseConfig = {
  apiKey: "AIzaSyDFFtn4Sn5l9LKBV4vpmDohknwr-C42TuY",
  authDomain: "gsat-pro.firebaseapp.com",
  databaseURL: "https://gsat-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "gsat-pro",
  storageBucket: "gsat-pro.firebasestorage.app",
  messagingSenderId: "288124052978",
  appId: "1:288124052978:web:37f00d24cfd0322d38376b",
  measurementId: "G-BFLEWM3GSX"
};
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// 3. 處理背景通知 (僅用於 log，避免呼叫 showNotification 造成與瀏覽器自動彈窗重複)
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] 收到背景推播:', payload);
  // FCM 若帶有 notification 屬性，瀏覽器在背景會自動顯示，手動呼叫會導致重複。
});