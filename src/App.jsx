import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Settings, LayoutDashboard, BookOpen, Notebook,
  Library, Store, Bus, HelpCircle, ShieldCheck,
  BellRing, Bell, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import './App.css';
import SmartNotificationBanner from './components/SmartNotificationBanner';
import { INITIAL_WEEKLY_SCHEDULE, SUBJECTS_LIST, DEFAULT_LINKS, ICON_MAP, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC, SCOPES } from './utils/constants';
import { SCHEDULE_206_TEMPLATE } from './utils/templates';
import { timeToMins } from './utils/helpers';

export const DEFAULT_DASHBOARD_LAYOUT = [
  { id: 'countdowns', visible: true, label: '自訂倒數計時' },
  { id: 'greeting', visible: true, label: '歡迎卡片與進度' },
  { id: 'pomodoro', visible: true, label: '專注模式 (番茄鐘)' },
  { id: 'schedule', visible: true, label: '今日課表與時間軸' },
  { id: 'links', visible: true, label: '自訂外部連結' },
  { id: 'news', visible: true, label: '校園最新公告' },
  { id: 'prep', visible: true, label: '明日準備事項' }
];
import { db, auth, messaging, firebaseError, VAPID_KEY } from './firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signInWithCredential } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, addDoc } from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import DashboardTab from './components/DashboardTab';
import VocabularyTab from './components/VocabularyTab';
import ContactBookTab from './components/ContactBookTab';
import NotesTab from './components/NotesTab';
import StoresTab from './components/StoresTab';
import TrafficTab from './components/TrafficTab';
import TutorialTab from './components/TutorialTab';
import SettingsTab from './components/SettingsTab';
import LegalTab from './components/LegalTab';
import LandingPage from './components/LandingPage';
import FeedbackTab from './components/FeedbackTab';
import CommandPalette from './components/CommandPalette';
import { IosNotification, WelcomeScreen, AuthScreen, PrivacyModal } from './components/SharedComponents';



// ─── 系統維護畫面 ────────────────────────────────────────────────────────
const MaintenanceView = ({ error }) => (
  <div style={{
    position: 'fixed', inset: 0, backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', zIndex: 9999, fontFamily: 'sans-serif'
  }}>
    <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>⚠️</div>
    <h1 style={{ fontSize: '1.5rem', fontWeight: '900', color: '#1e293b', marginBottom: '1rem' }}>系統連線異常</h1>
    <p style={{ color: '#64748b', fontWeight: 'bold', lineHeight: '1.6', marginBottom: '2rem', maxWidth: '300px' }}>
      無法連線至雲端資料庫。請檢查環境變數 (VITE_FIREBASE_API_KEY) 與網路連線。
    </p>
    <div style={{ backgroundColor: '#ffffff', padding: '1rem', borderRadius: '1rem', border: '1px solid #e2e8f0', width: '100%', maxWidth: '320px' }}>
      <p style={{ fontSize: '10px', color: '#94a3b8', wordBreak: 'break-all', textTransform: 'uppercase' }}>
        Debug: {error || 'INITIALIZATION_FAILED'}
      </p>
    </div>
    <button
      onClick={() => window.location.reload()}
      style={{
        marginTop: '2rem', backgroundColor: '#059669', color: 'white', border: 'none',
        padding: '1rem 2rem', borderRadius: '1rem', fontWeight: '900', cursor: 'pointer', boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.2)'
      }}
    >
      重新整理
    </button>
  </div>
);

// ─── 核心 App 組件 ────────────────────────────────────────────────────────
const MainApp = ({ forcedTheme, setForcedTheme, testPushNotification }) => {
  const theme = forcedTheme;
  const setTheme = setForcedTheme;

  // ─── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const contentRef = useRef(null);

  // ─── 切換分頁並自動置頂 ───────────────────────────────────────
  const navTo = (tabId) => {
    if (tabId === activeTab) return;
    setPreviousTab(activeTab);
    setActiveTab(tabId);
    if (contentRef.current) {
      contentRef.current.scrollTo({ top: 0, behavior: 'auto' });
    }
  };

  const [isAdmin, setIsAdmin] = useState(false);
  const [user, setUser] = useState(null);
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_user_profile')) || null; } catch { return null; }
  });
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gsat_gemini_key') || '');
  const [appPhase, setAppPhase] = useState(() => {
    if (!localStorage.getItem('gsat_onboarding_done')) return 'auth';
    return 'app';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState('idle');
  const [classID, setClassID] = useState(() => localStorage.getItem('gsat_class_id') || '');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); // 紀錄未讀通知數量 (用於 iOS 紅點)
  const lastNoticeTimestamp = useRef(Date.now()); // 🔴 紀錄 App 啟動時間，只推播比這更新的通知
  const [campusName, setCampusName] = useState(() => localStorage.getItem('gsat_campus_name') || '內湖高中');
  const [campusAddress, setCampusAddress] = useState(() => localStorage.getItem('gsat_campus_address') || '台北市內湖區文德路218號');
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);

  // 全域快捷鍵 Ctrl+K 開啟指令面板
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCmdPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_schedule')) || INITIAL_WEEKLY_SCHEDULE; } catch { return INITIAL_WEEKLY_SCHEDULE; }
  });
  const [contactBook, setContactBook] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_contact_book')) || {}; } catch { return {}; }
  });
  const [notes, setNotes] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_notes')) || []; } catch { return []; }
  });
  const [subjects, setSubjects] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_subjects')) || SUBJECTS_LIST; } catch { return SUBJECTS_LIST; }
  });
  const [customLinks, setCustomLinks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_custom_links')) || DEFAULT_LINKS; } catch { return DEFAULT_LINKS; }
  });
  const [customCountdowns, setCustomCountdowns] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_custom_countdowns')) || []; } catch { return []; }
  });
  const [dashboardLayout, setDashboardLayout] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('gsat_dashboard_layout'));
      if (saved && Array.isArray(saved) && saved.length > 0) {
        const savedIds = saved.map(s => s.id);
        const missing = DEFAULT_DASHBOARD_LAYOUT.filter(d => !savedIds.includes(d.id));
        return [...saved, ...missing];
      }
      return DEFAULT_DASHBOARD_LAYOUT;
    } catch { return DEFAULT_DASHBOARD_LAYOUT; }
  });

  // Refs
  const tokenClientRef = useRef(null);

  // Persist
  useEffect(() => { localStorage.setItem('gsat_schedule', JSON.stringify(weeklySchedule)); }, [weeklySchedule]);
  useEffect(() => { localStorage.setItem('gsat_contact_book', JSON.stringify(contactBook)); }, [contactBook]);
  useEffect(() => { localStorage.setItem('gsat_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('gsat_subjects', JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem('gsat_custom_links', JSON.stringify(customLinks)); }, [customLinks]);
  useEffect(() => { localStorage.setItem('gsat_custom_countdowns', JSON.stringify(customCountdowns)); }, [customCountdowns]);
  useEffect(() => { localStorage.setItem('gsat_class_id', classID); }, [classID]);
  useEffect(() => { localStorage.setItem('gsat_dashboard_layout', JSON.stringify(dashboardLayout)); }, [dashboardLayout]);

  // ─── 清除 iOS App 圖示紅點 (當使用者開啟/回到 App 時) ─────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setUnreadCount(0);
        if ('clearAppBadge' in navigator) navigator.clearAppBadge().catch(e => console.error(e));
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // 全域自動置頂
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
    }, 10);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // ─── FCM 與 Auth 整合區塊 ────────────────────────────────────────────────
  const requestPushPermission = async (currentUser) => {
    if (!('Notification' in window) || !messaging || !currentUser?.uid) return;

    try {
      if (Notification.permission !== 'granted') return;
      const cleanVapidKey = VAPID_KEY?.trim().replace(/\s/g, '');
      const token = await getToken(messaging, { vapidKey: cleanVapidKey });

      if (token) {
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          fcmToken: token,
          lastActive: serverTimestamp(),
          userName: currentUser.displayName || '匿名同學',
          email: currentUser.email || '',
          classID: classID || '206',
          device: navigator.userAgent.includes('iPhone') ? 'iOS' : 'Web'
        }, { merge: true });
        console.log("✅ FCM Token 已自動更新至雲端");
      }
    } catch (err) {
      console.error("自動擷取 FCM 失敗:", err);
    }
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        setUser(authUser);
        setIsGoogleConnected(true); // 🚀 確保 Firebase 登入狀態同步至 Google 連線狀態
        await requestPushPermission(authUser);
      } else {
        setUser(null);
        setIsGoogleConnected(false);
      }
    });
    return () => unsub();
  }, [classID]);

  // Firestore Sync
  useEffect(() => {
    if (!db || !classID) return;

    // ⚠️ 確保你的資料是存放在 'classes' 集合中
    const docRef = doc(db, 'classes', classID);
    const unsub = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data().schedule;
        if (Array.isArray(cloudData)) {
          const transformed = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
          cloudData.forEach((item, idx) => {
            if (transformed[item.day] !== undefined) {
              transformed[item.day].push({
                id: item.id || Date.now() + idx,
                subject: item.course || item.subject,
                teacher: item.teacher || '',
                startTime: item.startTime || '08:00',
                endTime: item.endTime || '09:00',
                location: item.location || '',
                rescheduled: item.rescheduled || false,
                link: item.link || '',
                color: item.color || ''
              });
            }
          });
          setWeeklySchedule(transformed);
        }

        // Sync Contact Book
        if (docSnap.data().contactBook) {
          setContactBook(docSnap.data().contactBook);
        }
      } else {
        // 🚀 如果雲端找不到該班級，將本地資料重置為初始狀態
        console.log(`雲端尚未建立 ${classID} 班的資料`);
        setWeeklySchedule(JSON.parse(localStorage.getItem('gsat_schedule')) || INITIAL_WEEKLY_SCHEDULE);
        setContactBook(JSON.parse(localStorage.getItem('gsat_contact_book')) || {});
      }
    }, (err) => {
      console.error("Firestore sync error:", err);
    });
    return () => unsub();
  }, [db, classID]);

  // Notice System Sync
  useEffect(() => {
    if (!db || !classID) return;
    const noticesRef = collection(db, 'classes', classID, 'notices');
    const q = query(noticesRef, orderBy('timestamp', 'desc'), limit(5));

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot && snapshot.docs) {
        const allNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 僅保留：course (課程)、reschedule (調課)、homework (作業)、exam (考試)
        const allowedTypes = ['course', 'reschedule', 'homework', 'exam', 'COURSE', 'RESCHEDULE', 'HOMEWORK', 'EXAM'];
        const filteredNotices = allNotices.filter(n => allowedTypes.includes(n.type));
        setNotices(filteredNotices);

        if (snapshot.docChanges) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (!allowedTypes.includes(data.type)) return;

              // 🔴 關鍵修正：只對「App啟動後」才新增的通知進行推播
              if (data.timestamp <= lastNoticeTimestamp.current) {
                console.log('偵測到舊通知，已略過推播:', data.title);
                return;
              }

              // 🚀 僅觸發原生 Web Push 通知 (前景)，移除 App 內橫幅
              triggerNativeNotification(data.title || '系統通知', data.content || '');
              
              // 🔴 更新 iOS / Android 桌面 App 圖示的未讀紅點 (Badge API)
              setUnreadCount(prev => {
                const nextCount = prev + 1;
                if ('setAppBadge' in navigator) {
                  navigator.setAppBadge(nextCount).catch(e => console.error(e));
                }
                return nextCount;
              });

              // 自動連動調課邏輯
              if (data.type === "COURSE" || data.type === "RESCHEDULE" || (data.content && data.content.includes("調課"))) {
                setWeeklySchedule(prev => {
                  const updated = { ...prev };
                  let changed = false;
                  Object.keys(updated).forEach(day => {
                    updated[day] = updated[day].map(course => {
                      if (data.targetCourse && (course.subject.includes(data.targetCourse) || data.targetCourse.includes(course.subject))) {
                        changed = true;
                        return { ...course, rescheduled: true };
                      }
                      return course;
                    });
                  });
                  return changed ? updated : prev;
                });
              }
            }
          });
        }
      }
    }, (err) => {
      console.error("Firestore sync error (Notices)：", err);
    });
    return () => unsub();
  }, [db, classID]);

  const saveToFirestore = async (newSchedule) => {
    if (!db || !classID) return;
    try {
      const flatSchedule = [];
      Object.keys(newSchedule).forEach(dayKey => {
        const day = parseInt(dayKey);
        if (day >= 0 && day <= 6) {
          (newSchedule[dayKey] || []).forEach(item => {
            flatSchedule.push({
              id: item.id, day: day, course: item.subject, teacher: item.teacher || '',
              startTime: item.startTime, endTime: item.endTime, location: item.location || '',
              rescheduled: item.rescheduled || false, link: item.link || '',
              color: item.color || ''
            });
          });
        }
      });
      await setDoc(doc(db, 'classes', classID), { schedule: flatSchedule, lastUpdated: serverTimestamp() }, { merge: true });
    } catch (e) { console.error("Firestore save error:", e); }
  };

  const saveContactBookToFirestore = async (newContactBook) => {
    if (!db || !classID) return;
    try {
      await setDoc(doc(db, 'classes', classID), {
        contactBook: newContactBook,
        lastUpdated: serverTimestamp()
      }, { merge: true });
    } catch (e) { console.error("Firestore contact book save error:", e); }
  };

  const handleImport206Template = async () => {
    if (!classID || classID !== '206') {
      triggerNotification('提示', '請先將班級代碼設定為 206');
      return;
    }
    const transformed = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    SCHEDULE_206_TEMPLATE.forEach((item, idx) => {
      if (transformed[item.day] !== undefined) {
        transformed[item.day].push({
          id: Date.now() + idx, subject: item.course, teacher: item.teacher,
          startTime: item.startTime, endTime: item.endTime, location: '',
          rescheduled: false, link: '', color: ''
        });
      }
    });
    setWeeklySchedule(transformed);

    await setDoc(doc(db, 'classes', '206'), {
      className: "206", school: "內湖高中",
      schedule: SCHEDULE_206_TEMPLATE.map((item, idx) => ({
        id: Date.now() + idx, day: item.day, course: item.course, teacher: item.teacher,
        startTime: item.startTime, endTime: item.endTime, location: '',
        rescheduled: false, link: '', color: ''
      })),
      lastUpdated: serverTimestamp()
    }, { merge: true });

    triggerNotification('導入成功', '內中 206 班課表已導入並同步至雲端！');
  };

  // ─── Notifications ────────────────────────────────────────────────────────
  const triggerNativeNotification = async (title, message) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    try {
      new Notification(String(title), { body: String(message), icon: '/favicon.ico' });
    } catch (e) {
      if (navigator.serviceWorker) {
        try { (await navigator.serviceWorker.ready).showNotification(String(title), { body: String(message) }); } catch { }
      }
    }
  };

  const triggerNotification = useCallback((title, message) => {
    setNotification({ show: true, title: String(title), message: String(message) });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 6000);
    triggerNativeNotification(title, message);
  }, []);

  // ─── 網頁端本地定時提醒 (晚上 20:00) ──────────────────────────────────────
  // 防呆機制：若無部署 Firebase Functions，只要網頁處於開啟狀態，晚上八點一樣會觸發原生推播
  const contactBookRef = useRef(contactBook);
  useEffect(() => { contactBookRef.current = contactBook; }, [contactBook]);

  useEffect(() => {
    const checkLocalReminder = () => {
      const now = new Date();
      // 在 20:00 的第 0 分鐘觸發
      if (now.getHours() === 20 && now.getMinutes() === 0) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        const cb = contactBookRef.current || {};
        const tomorrowsEntries = cb[tomorrowStr] || [];
        
        if (tomorrowsEntries.length > 0) {
          const exams = tomorrowsEntries.filter(e => e.exam).length;
          const hws = tomorrowsEntries.filter(e => e.homework).length;
          let txt = [];
          if (exams > 0) txt.push(`💯 ${exams} 項考試`);
          if (hws > 0) txt.push(`📝 ${hws} 項作業`);
          triggerNativeNotification('明日準備事項 🎒', `明天有 ${txt.join(" 以及 ")}，請記得準備！`);
        }
      }
    };
    const timer = setInterval(checkLocalReminder, 60000);
    return () => clearInterval(timer);
  }, []); // 獨立執行，避免依賴重渲染

  // ─── 測試 Firebase 雲端通知推播 ──────────────────────────────────────────
  const sendTestNotice = async () => {
    // 僅觸發原生 Web Push 通知，不寫入資料庫產生畫面橫幅
    triggerNativeNotification('原生推播測試 🚀', '這是一則系統原生推播測試！如果您看到這個通知，代表 Web Push 運作完全正常 ✅');
  };

  // ─── AI Test ─────────────────────────────────────────────────────────────
  const testAiConnection = async () => {
    if (!geminiKey) return triggerNotification('提示', '請先輸入 API Key');
    setAiTestStatus('testing');
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: 'Hi' }] }] }) }
      );
      if ((await res.json()).candidates) {
        setAiTestStatus('success');
        triggerNotification('驗證成功 🎉', 'AI 已就緒！');
      } else throw new Error('驗證失敗');
    } catch (e) {
      setAiTestStatus('error');
      triggerNotification('驗證失敗', e.message);
    } finally {
      setTimeout(() => setAiTestStatus('idle'), 3000);
    }
  };

  // ─── Theme ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      if (mq.matches) root.classList.add('dark'); else root.classList.remove('dark');
      const handler = e => { if (e.matches) root.classList.add('dark'); else root.classList.remove('dark'); };
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // ─── Google API ──────────────────────────────────────────────────────────
  const fetchUserInfo = useCallback(async () => {
    try {
      if (!window.gapi?.client?.people) await window.gapi.client.load(PEOPLE_DISCOVERY_DOC);
      const res = (await window.gapi.client.people.people.get({ resourceName: 'people/me', personFields: 'names,emailAddresses,photos' })).result;
      const profile = { name: res.names?.[0]?.displayName, email: res.emailAddresses?.[0]?.value, photo: res.photos?.[0]?.url };
      setUserProfile(profile);
      localStorage.setItem('gsat_user_profile', JSON.stringify(profile));
      if (profile.email?.endsWith('@nhsh.tp.edu.tw')) { setIsAdmin(true); triggerNotification('歡迎老師', '已自動開啟管理員權限！'); }
    } catch (e) {
      if (e.status === 401) {
        localStorage.removeItem('gsat_google_token');
        localStorage.removeItem('gsat_user_profile');
        window.gapi?.client?.setToken?.('');
        setIsGoogleConnected(false);
        setUserProfile(null);
      }
    }
  }, [triggerNotification]);

  const handleSignoutClick = useCallback(() => {
    const token = window.gapi?.client?.getToken();
    if (token) {
      window.google?.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        localStorage.removeItem('gsat_google_token');
        localStorage.removeItem('gsat_user_profile');
        setIsGoogleConnected(false);
        setUserProfile(null);
        triggerNotification('已登出', 'Google 帳號連線已中斷。');
      });
    }
  }, [triggerNotification]);

  useEffect(() => {
    const init = async () => {
      const waitFor = () => new Promise((resolve, reject) => {
        let n = 0;
        const check = () => { if (window.gapi && window.google) resolve(); else if (n++ > 50) reject(); else setTimeout(check, 200); };
        check();
      });
      try {
        await waitFor();
        console.log("🟢 Scripts loaded, initializing GAPI...");

        await new Promise(r => window.gapi.load('client', r));
        await window.gapi.client.init({
          discoveryDocs: [DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC]
        });
        console.log("✅ GAPI Client Init (Discovery Only)");

        const storedToken = localStorage.getItem('gsat_google_token');
        if (storedToken) {
          window.gapi.client.setToken({ access_token: storedToken });
          setIsGoogleConnected(true);
          fetchUserInfo().catch(e => console.error("UserInfo fetch failed:", e));
        }

        if (window.google?.accounts?.oauth2?.initCodeClient) {
          try {
            console.log("🚀 Initializing GSI (Auth Code Flow)...");
            tokenClientRef.current = window.google.accounts.oauth2.initCodeClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: SCOPES,
              ux_mode: 'redirect',
              redirect_uri: GOOGLE_REDIRECT_URI,
              include_granted_scopes: true,
              // Google 要求在某些版本中仍需提供 callback 即使是 redirect 模式
              callback: (resp) => { console.log("GSI Callback Triggered:", resp); }
            });
            console.log("✅ GSI Initialized");
          } catch (gisErr) {
            console.error("❌ GSI Init Error:", gisErr);
          }
        } else {
          console.warn("⚠️ Google Identity Services not fully loaded.");
        }

        // 處理從 API Callback 帶回來的 Token
        const urlParams = new URLSearchParams(window.location.search);
        const accessToken = urlParams.get('access_token');
        const idToken = urlParams.get('id_token');

        if (idToken) {
          console.log("📥 從 Callback 取得 ID Token，正在還原 Firebase 演唱會...");
          try {
            const credential = GoogleAuthProvider.credential(idToken, accessToken);
            const result = await signInWithCredential(auth, credential);

            localStorage.setItem('gsat_google_token', accessToken);
            setIsGoogleConnected(true);

            const profile = { name: result.user.displayName, email: result.user.email, photo: result.user.photoURL };
            setUserProfile(profile);
            localStorage.setItem('gsat_user_profile', JSON.stringify(profile));

            if (result.user.email?.endsWith('@nhsh.tp.edu.tw')) {
              setIsAdmin(true);
              triggerNotification('歡迎老師', '已自動正式開啟管理員權限！');
            }

            triggerNotification('Google 登入成功', '安全性流程驗證通過！');
            setAppPhase('welcome');

            // 清理 URL
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (error) {
            console.error("Firebase session restore error:", error);
            triggerNotification('登入失敗', '憑證驗證失敗，請重試。');
          }
        }

        // 檢查是否有 Auth Error
        const authError = urlParams.get('auth_error');
        if (authError) {
          console.error("❌ Auth Error from Callback:", authError);
          triggerNotification('登入發生錯誤', `代碼: ${authError}。請檢查環境變數 (Client Secret) 是否設置。`);
          window.history.replaceState({}, document.title, window.location.pathname);
        }

        // 處理 Firebase Redirect 結果
        try {
          const result = await getRedirectResult(auth);
          if (result) {
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            if (token) localStorage.setItem('gsat_google_token', token);
            setIsGoogleConnected(true);

            const profile = { name: result.user.displayName, email: result.user.email, photo: result.user.photoURL };
            setUserProfile(profile);
            localStorage.setItem('gsat_user_profile', JSON.stringify(profile));

            if (result.user.email?.endsWith('@nhsh.tp.edu.tw')) {
              setIsAdmin(true);
              triggerNotification('歡迎老師', '已自動開啟管理員權限！');
            }

            triggerNotification('Google 登入成功', '已啟用雲端備份！');
            setAppPhase('app'); // 🚀 直接進入 App
          }
        } catch (error) {
          console.error("Redirect auth error:", error);
        }
      } catch (err) {
        console.error("❌ Main Initialization Error:", err);
      }
    };
    init();
  }, [fetchUserInfo, triggerNotification]);

  const handleAuthClick = async () => {
    console.log("📍 Using Redirect URI:", GOOGLE_REDIRECT_URI);
    if (tokenClientRef.current) {
      console.log("🚀 啟動 Google Authorization Code Flow (requestCode)");
      try {
        tokenClientRef.current.requestCode();
      } catch (err) {
        console.error("requestCode failed:", err);
        triggerNotification('啟動登入失敗', '請重新整理頁面再試。');
      }
    } else {
      // 回退方案
      const provider = new GoogleAuthProvider();
      try {
        await signInWithRedirect(auth, provider);
      } catch (error) {
        console.error("Fallback Auth error:", error);
      }
    }
  };

  const handleGuestStart = () => {
    setAppPhase('app');
    triggerNotification('訪客模式', '已進入應用程式，部分功能可能受限。');
  };

  // ─── Nav ─────────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '日常課表' },
    { id: 'english', icon: BookOpen, label: '單字特訓' },
    { id: 'contactBook', icon: Notebook, label: '電子聯絡簿' },
    { id: 'notes', icon: Library, label: '知識筆記' },
    { id: 'stores', icon: Store, label: '特約商店' },
    { id: 'traffic', icon: Bus, label: '交通與 YouBike' },
    { id: 'feedback', icon: MessageSquare, label: '回饋與支持' },
    { id: 'help', icon: HelpCircle, label: '如何使用' },
  ];

  const getTabName = id => navItems.find(n => n.id === id)?.label || 'GSAT Pro';

  // ─── Phases ───────────────────────────────────────────────────────────────
  if (appPhase === 'auth') return <LandingPage onStart={handleAuthClick} onGuestStart={handleGuestStart} />;
  if (appPhase === 'welcome') return <WelcomeScreen isFirstTime={!localStorage.getItem('gsat_legal_accepted')} onFinishWelcome={() => { localStorage.setItem('gsat_onboarding_done', 'true'); setAppPhase('app'); }} requestPushPermission={testPushNotification} />;
  if (firebaseError) return <MaintenanceView error={firebaseError} />;

  return (
    <>
      {showPrivacyModal && <PrivacyModal onAccept={() => { setShowPrivacyModal(false); setAppPhase('app'); }} />}
      <IosNotification notification={notification} />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onSelectTab={(id) => {
          const map = { dashboard: 'dashboard', vocabulary: 'english', contact: 'contactBook', stores: 'stores', traffic: 'traffic', settings: 'settings', feedback: 'feedback', tutorial: 'help' };
          setActiveTab(map[id] || id);
          setIsNavOpen(false);
        }}
      />

      {/* 🚀 加入智慧通知導引，放置在 UI 最頂層 */}
      {appPhase === 'app' && (
        <SmartNotificationBanner onActivate={testPushNotification} />
      )}

      {/* Fixed Top Navigation & Legal */}
      {appPhase === 'app' && (
        <div className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none pt-[calc(env(safe-area-inset-top)+16px)] px-4 sm:px-6 transition-all duration-500">
          <div className="pointer-events-auto max-w-screen-xl mx-auto h-[68px] glass-effect rounded-[32px] flex items-center justify-between px-3 shadow-float border border-white/40 dark:border-white/10 transition-all duration-500">
            {/* 選單區域 */}
            <div className="relative">
              <button
                onClick={() => setIsNavOpen(!isNavOpen)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-[24px] transition-all duration-500 ease-spring-smooth active:scale-95 overflow-hidden ${isNavOpen ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' : 'hover:bg-slate-100/50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200'}`}
              >
                <Menu size={20} strokeWidth={isNavOpen ? 2.5 : 2} className="transition-transform duration-500 shrink-0" style={{ transform: isNavOpen ? 'rotate(90deg)' : 'none' }} />
                <div className="flex items-center gap-2">
                  <span className="text-[15px] sm:text-[16px] font-black tracking-tight truncate max-w-[120px] sm:max-w-none">{getTabName(activeTab)}</span>
                  <span className="hidden md:flex items-center justify-center px-1.5 py-0.5 rounded border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-[10px] font-black text-slate-400">⌘K</span>
                </div>
              </button>

              {isNavOpen && (
                <>
                  <div className="fixed inset-0 z-[-1] bg-black/5 dark:bg-black/20 backdrop-blur-sm animate-fadeIn" onClick={() => setIsNavOpen(false)} />
                  <div className="absolute top-full left-0 mt-4 w-[280px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-[64px] rounded-[36px] shadow-[0_40px_100px_rgba(0,0,0,0.15)] dark:shadow-[0_40px_100px_rgba(0,0,0,0.6)] border border-white/60 dark:border-white/10 overflow-hidden z-[1010] animate-apple-linear origin-top-left p-3">
                    <div className="px-4 py-3 mb-1">
                      <span className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.25em]">功能選單</span>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-hide space-y-1">
                      {navItems.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => { navTo(item.id); setIsNavOpen(false); }}
                          className={`w-full flex items-center gap-4 px-4 py-3.5 text-left rounded-[24px] transition-all duration-300 ease-spring-smooth active:scale-[0.98] ${activeTab === item.id ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 shadow-sm' : 'text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-emerald-600 dark:hover:text-emerald-400'}`}
                        >
                          <item.icon size={22} strokeWidth={activeTab === item.id ? 2.5 : 2} className={`shrink-0 transition-transform duration-300 ${activeTab === item.id ? 'text-emerald-500 scale-110' : 'text-slate-400'}`} />
                          <span className="text-[16px] font-bold">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 法律與設定區域 */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center bg-slate-100/50 dark:bg-white/5 px-3 py-2 rounded-full border border-slate-200/50 dark:border-white/5 backdrop-blur-sm">
                <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest px-2" onClick={(e) => e.stopPropagation()}>Privacy</a>
                <span className="text-slate-300 dark:text-white/10 text-[10px]">·</span>
                <a href="/terms.html" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest px-2" onClick={(e) => e.stopPropagation()}>Terms</a>
              </div>
              <button
                onClick={() => {
                  if (activeTab === 'settings') navTo(previousTab);
                  else navTo('settings');
                }}
                className={`p-3 rounded-full transition-all duration-500 ease-spring-smooth active:scale-90 shadow-sm shrink-0 ${activeTab === 'settings' ? 'bg-emerald-500 text-white shadow-emerald-500/25 rotate-180 scale-105' : 'bg-slate-100/80 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-white/5 hover:bg-slate-200 dark:hover:bg-white/10'}`}
              >
                <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
              </button>
            </div>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" toastOptions={{ duration: 6000, style: { fontSize: '14px', fontWeight: '900', borderRadius: '24px', padding: '16px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }} />

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto w-full px-4 pt-32 sm:pt-[140px] ios-safe-pb touch-pan-y scrollbar-hide bg-transparent scroll-smooth transition-all duration-300 relative z-10"
      >
        <div key={activeTab} className="animate-tab-enter">
          {activeTab === 'dashboard' && (
            <DashboardTab
              isAdmin={isAdmin}
              weeklySchedule={weeklySchedule}
              setWeeklySchedule={setWeeklySchedule}
              subjects={subjects}
              triggerNotification={triggerNotification}
              requestPushPermission={testPushNotification}
              testPushNotification={sendTestNotice}
              setSettingsOpen={() => navTo('settings')}
              isGoogleConnected={isGoogleConnected}
              contactBook={contactBook}
              customLinks={customLinks}
              isEditingSchedule={isEditingSchedule}
              setIsEditingSchedule={setIsEditingSchedule}
              classID={classID}
              saveToFirestore={saveToFirestore}
              customCountdowns={customCountdowns}
              dashboardLayout={dashboardLayout}
            />
          )}
          {activeTab === 'english' && <VocabularyTab user={user} geminiKey={geminiKey} isAdmin={isAdmin} />}
          {activeTab === 'contactBook' && (
            <ContactBookTab
              contactBook={contactBook}
              setContactBook={setContactBook}
              subjects={subjects}
              isAdmin={isAdmin}
              saveContactBookToFirestore={saveContactBookToFirestore}
              classID={classID}
            />
          )}
          {activeTab === 'notes' && (
            <NotesTab
              notes={notes} setNotes={setNotes}
              subjects={subjects} setSubjects={setSubjects}
              selectedSubject={selectedSubject} setSelectedSubject={setSelectedSubject}
              triggerNotification={triggerNotification}
              isGoogleConnected={isGoogleConnected}
            />
          )}
          {activeTab === 'stores' && <StoresTab isAdmin={isAdmin} campusName={campusName} />}
          {activeTab === 'traffic' && <TrafficTab campusName={campusName} campusAddress={campusAddress} />}
          {activeTab === 'feedback' && <FeedbackTab userProfile={userProfile} triggerNotification={triggerNotification} onBack={() => navTo(previousTab)} onSuccess={() => navTo('dashboard')} />}
          {activeTab === 'help' && <TutorialTab onOpenFeedback={() => navTo('feedback')} campusName={campusName} />}
          {activeTab === 'settings' && (
            <SettingsTab
              isAdmin={isAdmin}
              setIsAdmin={setIsAdmin}
              triggerNotification={triggerNotification}
              handleAuthClick={handleAuthClick}
              isGoogleConnected={isGoogleConnected}
              handleSignoutClick={handleSignoutClick}
              requestPushPermission={testPushNotification}
              testPushNotification={sendTestNotice}
              theme={theme}
              setTheme={setTheme}
              aiTestStatus={aiTestStatus}
              testAiConnection={testAiConnection}
              geminiKey={geminiKey}
              setGeminiKey={setGeminiKey}
              navTo={navTo}
              previousTab={previousTab}
              customLinks={customLinks}
              setCustomLinks={setCustomLinks}
              classID={classID}
              setClassID={setClassID}
              setIsEditingSchedule={setIsEditingSchedule}
              handleImport206Template={handleImport206Template}
              customCountdowns={customCountdowns}
              setCustomCountdowns={setCustomCountdowns}
              campusName={campusName}
              setCampusName={setCampusName}
              campusAddress={campusAddress}
              setCampusAddress={setCampusAddress}
              dashboardLayout={dashboardLayout}
              setDashboardLayout={setDashboardLayout}
            />
          )}
          {activeTab === 'legal' && <LegalTab onBack={() => navTo('settings')} />}
        </div>
      </div>
    </>
  );
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gsat_theme') || 'system');
  const [user, setUser] = useState(null); // 🚀 將 user 狀態提升到頂層

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('此瀏覽器不支援通知。iOS 請先「加入主畫面」。');
      return;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        toast.success('通知已授權！系統將自動連線。');
      } else {
        toast.error('請在瀏覽器設定中允許通知。');
      }
    } catch (err) {
      console.error("FCM Error:", err);
    }
  };

  // 註冊 Service Worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/firebase-messaging-sw.js')
        .then((registration) => console.log('✅ Service Worker 註冊成功:', registration.scope))
        .catch((err) => console.error('❌ Service Worker 註冊失敗:', err));
    }
  }, []);

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    localStorage.setItem('gsat_theme', theme);
  }, [theme]);

  return (
    <div className={isDark ? 'dark' : ''}>
      <div className="main-container relative h-[100dvh] w-full flex flex-col bg-slate-50 dark:bg-zinc-950 overflow-hidden font-sans text-slate-800 dark:text-zinc-200">
        {/* Subtle Ambient Mesh Background */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/5 dark:bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full pointer-events-none animate-float-delayed" />
        <MainApp
          forcedTheme={theme}
          setForcedTheme={setTheme}
          testPushNotification={requestPushPermission}
          user={user}
          setUser={setUser}
        />
      </div>
    </div>
  );
}