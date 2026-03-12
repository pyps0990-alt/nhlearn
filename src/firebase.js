import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getMessaging } from "firebase/messaging";

export const VAPID_KEY = "BAAIWem3KGfCQyKFE7vgc4sygRAD6LaQhs9vt8JO3_rFW-6gDrGai6MqbvljUOaIMh4mdZyc2uwqWkBTpM2765g";

// 1. 取得環境變數
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