import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

export const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BAAIWem3KGfCQyKFE7vgc4sygRAD6LaQhs9vt8JO3_rFW-6gDrGai6MqbvljUOaIMh4mdZyc2uwqWkBTpM2765g";

// 1. 取得環境變數
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 2. 在最外層宣告變數，確保 export 抓得到它們
let app = null;
let db = null;
let auth = null;
let messaging = null;
let firebaseError = null; // 👈 關鍵：必須在這裡先定義！

try {
  // 檢查 API Key 是否存在
  if (!firebaseConfig.apiKey) {
    throw new Error("環境變數 VITE_FIREBASE_API_KEY 遺失，請檢查 .env.local");
  }

  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
  messaging = getMessaging(app);
  console.log("✅ Firebase 初始化成功");
} catch (error) {
  console.error("❌ Firebase 初始化失敗:", error);
  firebaseError = error.message; // 這裡賦值給外層變數
}

// 3. 正式導出
export { db, auth, messaging, firebaseError };