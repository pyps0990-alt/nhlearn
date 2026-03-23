import React, { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import {
  Menu, Settings, LayoutDashboard, BookOpen, Notebook,
  BookMarked, Store, Bus, HelpCircle, ShieldCheck,
  BellRing, Bell, AlertCircle, RefreshCw, MessageSquare, Globe, GraduationCap, TrendingUp
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import './styles/App.css';
import SmartNotificationBanner from './components/layout/SmartNotificationBanner';
import { INITIAL_WEEKLY_SCHEDULE, SUBJECTS_LIST, DEFAULT_LINKS, ICON_MAP, GOOGLE_CLIENT_ID, GOOGLE_REDIRECT_URI, DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC, SCOPES } from './utils/constants';
import { SCHEDULE_206_TEMPLATE } from './utils/templates';
import { timeToMins } from './utils/helpers';

export const DEFAULT_DASHBOARD_LAYOUT = [
  { id: 'countdowns', visible: true, label: '自訂倒數計時' },
  { id: 'greeting', visible: true, label: '歡迎卡片與進度' },
  { id: 'heatmap', visible: false, label: '學習熱力圖' },
  { id: 'pomodoro', visible: false, label: '專注模式 (番茄鐘)' },
  { id: 'schedule', visible: true, label: '今日課表與時間軸' },
  { id: 'links', visible: false, label: '自訂外部連結' },
  { id: 'news', visible: false, label: '校園最新公告' },
  { id: 'prep', visible: true, label: '明日準備事項' }
];
import { db, auth, messaging, firebaseError, VAPID_KEY, functions } from './config/firebase';
import { GoogleAuthProvider, signInWithRedirect, getRedirectResult, onAuthStateChanged, signInWithCredential, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp, collection, query, orderBy, limit, getDocs, addDoc, writeBatch } from 'firebase/firestore';
import { getToken, onMessage } from 'firebase/messaging';
import { httpsCallable } from 'firebase/functions';
const DashboardTab = lazy(() => import('./components/tabs/DashboardTab'));
const VocabularyTab = lazy(() => import('./components/tabs/VocabularyTab'));
const ContactBookTab = lazy(() => import('./components/tabs/ContactBookTab'));
const NotesTab = lazy(() => import('./components/tabs/NotesTab'));
const StoresTab = lazy(() => import('./components/tabs/StoresTab'));
const TrafficTab = lazy(() => import('./components/tabs/TrafficTab'));
const TutorialTab = lazy(() => import('./components/tabs/TutorialTab'));
const SettingsTab = lazy(() => import('./components/tabs/SettingsTab'));
const LegalTab = lazy(() => import('./components/tabs/LegalTab'));
const LandingPage = lazy(() => import('./components/layout/LandingPage'));
const FeedbackTab = lazy(() => import('./components/tabs/FeedbackTab'));
const CreditsTab = lazy(() => import('./components/tabs/CreditsTab'));
const GradesTab = lazy(() => import('./components/tabs/GradesTab'));
const CommandPalette = lazy(() => import('./components/layout/CommandPalette'));
import { IosNotification, WelcomeScreen, AuthScreen, PrivacyModal, TabSkeleton } from './components/ui/SharedComponents';

// ─── 預載入輔助函式 ────────────────────────────────────────────────────────
const preloadTab = (tabId) => {
  switch (tabId) {
    case 'dashboard': import('./components/tabs/DashboardTab'); break;
    case 'english': import('./components/tabs/VocabularyTab'); break;
    case 'contactBook': import('./components/tabs/ContactBookTab'); break;
    case 'notes': import('./components/tabs/NotesTab'); break;
    case 'settings': import('./components/tabs/SettingsTab'); break;
    case 'credits': import('./components/tabs/CreditsTab'); break;
    case 'grades': import('./components/tabs/GradesTab'); break;
    case 'cmd': import('./components/layout/CommandPalette'); break;
    default: break;
  }
};



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
const MainApp = ({ forcedTheme, setForcedTheme, testPushNotification, requestPushPermissionPrompt, user, setUser, isAdmin, setIsAdmin }) => {
  const theme = forcedTheme;
  const setTheme = setForcedTheme;

  // ─── State ───────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('dashboard');
  const [previousTab, setPreviousTab] = useState('dashboard');
  const contentRef = useRef(null);

  // ─── 切換分頁並自動置頂 ───────────────────────────────────────
  const navTo = useCallback((tabId) => {
    if (tabId === activeTab) return;
    setPreviousTab(activeTab);
    setActiveTab(tabId);
    requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
    });
  }, [activeTab]);

  // 🚀 專屬跳轉：前往設定並展開指定子分頁
  const [settingsSubTab, setSettingsSubTab] = useState('general');
  const navToSettings = useCallback((subTab = 'general') => {
    setSettingsSubTab(subTab);
    navTo('settings');
  }, [navTo]);

  // ─── 預載入邏輯 ─────────────────────────────────────────────────────────
  useEffect(() => {
    // 進入首頁 2 秒後，背景預載入最常用的分頁
    const timer = setTimeout(() => {
      ['english', 'contactBook', 'notes'].forEach(tab => preloadTab(tab));
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(() => !!localStorage.getItem('gsat_google_token'));
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_user_profile')) || null; } catch { return null; }
  });
  const [appPhase, setAppPhase] = useState(() => {
    if (!localStorage.getItem('gsat_onboarding_done')) return 'auth';
    return 'app';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState('idle');
  const [classID, setClassID] = useState(() => localStorage.getItem('gsat_class_id') || '');
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [schoolId, setSchoolId] = useState(() => localStorage.getItem('gsat_school_id') || '');
  const [gradeId, setGradeId] = useState(() => localStorage.getItem('gsat_grade_id') || '');
  const [notices, setNotices] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0); // 紀錄未讀通知數量 (用於 iOS 紅點)
  const lastNoticeTimestamp = useRef(Date.now() - 60000); // 🔴 容忍 1 分鐘的時鐘誤差，確保不漏接任何剛發送的推播
  const [contactBookError, setContactBookError] = useState('');
  const [campusName, setCampusName] = useState(() => localStorage.getItem('gsat_campus_name') || '內湖高中');
  const [campusAddress, setCampusAddress] = useState(() => localStorage.getItem('gsat_campus_address') || '台北市內湖區文德路218號');
  const [campusLat, setCampusLat] = useState(() => localStorage.getItem('gsat_campus_lat') || '25.078410');
  const [campusLng, setCampusLng] = useState(() => localStorage.getItem('gsat_campus_lng') || '121.587152');
  // 🚀 新增：儲存目前學校的動態配置
  const [schoolConfig, setSchoolConfig] = useState(null);
  const [cmdPaletteOpen, setCmdPaletteOpen] = useState(false);
  const [showPushPrompt, setShowPushPrompt] = useState(false);

  const [showTrafficTab, setShowTrafficTab] = useState(() => localStorage.getItem('gsat_show_traffic') === 'true');
  useEffect(() => { localStorage.setItem('gsat_show_traffic', String(showTrafficTab)); }, [showTrafficTab]);

  // 🚀 核心 UI 通知觸發器 (必須在所有功能之前初始化)
  const triggerNotification = useCallback((title, message, icon = 'Bell') => {
    // 1. 更新內建通知橫幅狀態
    setNotification({ show: true, title: String(title), message: String(message) });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 4000);

    // 2. 本地瀏覽器推播 (若權限已開)
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body: message, icon: '/favicon.ico' });
    }

    // 3. 畫面下方的熱提示
    toast.success(`${title}: ${message}`, {
      icon: icon === 'Bell' ? '🔔' : '✨',
      duration: 4000
    });
  }, []);

  // 考試不打擾模式狀態與切換邏輯
  const [dndEnabled, setDndEnabled] = useState(() => localStorage.getItem('gsat_dnd_enabled') === 'true');

  // 🚀 全域雲端主題訂閱控制 (New Version)
  const toggleTopicSubscription = useCallback(async (topic, isSubscribe) => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      triggerNotification('權限不足', '請先允許瀏覽器推播通知');
      return;
    }

    try {
      const token = await getToken(messaging, { vapidKey: VAPID_KEY?.trim().replace(/\s/g, '') });
      if (token && functions) {
        const targetFunc = isSubscribe ? 'subscribeToTopic' : 'unsubscribeFromTopic';
        const cloudFunc = httpsCallable(functions, targetFunc);
        await cloudFunc({ token, topic });
        console.log(`Cloud Notification: ${isSubscribe ? 'Subscribed' : 'Unsubscribed'} to ${topic}`);
      }
    } catch (e) {
      console.error("Cloud Topic Error", e);
      throw e;
    }
  }, [triggerNotification]);

  const handleToggleDnd = async (newVal) => {
    setDndEnabled(newVal);
    localStorage.setItem('gsat_dnd_enabled', String(newVal));

    if (user) {
      await setDoc(doc(db, 'Users', user.uid), { dndEnabled: newVal }, { merge: true });
    }

    if (!classID) return;

    try {
      if (newVal) {
        await toggleTopicSubscription(`class_${classID}_alerts`, false);
        triggerNotification('已開啟不打擾', '考試/上課期間將不再收到即時推播');
      } else {
        await toggleTopicSubscription(`class_${classID}_alerts`, true);
        triggerNotification('已關閉不打擾', '已恢復即時上課與調課提醒');
      }
    } catch (e) {
      triggerNotification('同步失敗', '無法更新雲端訂閱狀態');
    }
  };

  // 初始化時檢查網址是否有登入回傳的 Token，若有則直接進入 Loading 狀態
  const [isAuthLoading, setIsAuthLoading] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('id_token') || params.has('code') || params.has('auth_error');
  });

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
    try {
      const data = JSON.parse(localStorage.getItem('gsat_custom_links'));
      if (data && data.length > 0) return data;
      return [
        { id: 'default-link-1', title: '學校官網', url: 'https://www.nhsh.tp.edu.tw/', icon: 'Globe', themeColor: 'blue' },
        { id: 'default-link-2', title: '學習歷程', url: 'https://ep.tcivs.tc.edu.tw/', icon: 'BookOpen', themeColor: 'emerald' },
        { id: 'default-link-3', title: '酷課雲', url: 'https://cooc.tp.edu.tw/', icon: 'Cloud', themeColor: 'indigo' },
        { id: 'default-link-4', title: '成績查詢', url: 'https://sschool.tp.edu.tw/', icon: 'LayoutDashboard', themeColor: 'orange' }
      ];
    } catch { return []; }
  });
  const [customCountdowns, setCustomCountdowns] = useState(() => {
    try {
      const data = JSON.parse(localStorage.getItem('gsat_custom_countdowns'));
      if (data && data.length > 0) return data;
      return [
        { id: 'default-cd-1', title: '重要大考', date: '2026-01-16', icon: '🎯', style: 'gradient' },
        { id: 'default-cd-2', title: '畢業典禮', date: '2026-06-01', icon: '🎓', style: 'neon' }
      ];
    } catch { return []; }
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
  useEffect(() => { localStorage.setItem('gsat_campus_lat', campusLat); }, [campusLat]);
  useEffect(() => { localStorage.setItem('gsat_campus_lng', campusLng); }, [campusLng]);
  useEffect(() => { localStorage.setItem('gsat_school_id', schoolId); }, [schoolId]);
  useEffect(() => { localStorage.setItem('gsat_grade_id', gradeId); }, [gradeId]);

  // 🚀 自動同步使用者的班級與學校設定 (解決無痕模式或新裝置登入時，抓不到綁定班級的問題)
  useEffect(() => {
    if (!db || !user) return;
    const userRef = doc(db, 'Users', user.uid);
    getDoc(userRef).then((docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.classId !== undefined && data.classId !== classID) {
          setClassID(data.classId);
          localStorage.setItem('gsat_class_id', data.classId);
        }
        if (data.schoolId !== undefined && data.schoolId !== schoolId) {
          setSchoolId(data.schoolId);
          localStorage.setItem('gsat_school_id', data.schoolId);
        }
        if (data.gradeId !== undefined) {
          let normalizedGrade = data.gradeId;
          if (normalizedGrade && !normalizedGrade.includes('_') && normalizedGrade.startsWith('grade')) {
            normalizedGrade = normalizedGrade.replace('grade', 'grade_');
          }
          if (normalizedGrade !== gradeId) {
            setGradeId(normalizedGrade);
            localStorage.setItem('gsat_grade_id', normalizedGrade);
          }
        }
      }
    }).catch(e => console.error("Sync user profile error:", e));
  }, [user]); // 僅在使用者狀態變更(登入)時執行

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

  // ─── 初始頁面優化版授權通知彈窗 ─────────────────────────────────
  useEffect(() => {
    // 如果瀏覽器支援通知、目前是預設狀態，且已經進入 App 模式，則延遲 1.5 秒後彈出優化版玻璃彈窗
    if ('Notification' in window && Notification.permission === 'default' && appPhase === 'app') {
      const timer = setTimeout(() => setShowPushPrompt(true), 800); // 加快彈出速度
      return () => clearTimeout(timer);
    }
  }, [appPhase]);

  // ─── 智慧引導：未設定學籍者自動跳轉設定頁 ─────────────────────────────────
  useEffect(() => {
    if (appPhase === 'app' && user && (!schoolId || !gradeId)) {
      const timer = setTimeout(() => {
        navToSettings('academic');
        triggerNotification('歡迎！', '請先選擇您的學校與年級，以啟用完整功能喔。');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [appPhase, user, schoolId, gradeId]);

  // 全域自動置頂
  useEffect(() => {
    const timer = setTimeout(() => {
      if (contentRef.current) contentRef.current.scrollTo({ top: 0, behavior: 'auto' });
      window.scrollTo(0, 0);
    }, 10);
    return () => clearTimeout(timer);
  }, [activeTab]);

  // FCM 自動連線移至 App 層次

  // Firestore Sync (New Schema Structure)
  useEffect(() => {
    if (!db) return;

    // 🚀 1. 讀取並監聽目前學校的全域配置 (動態切換 Tab 與校園資訊)
    let unsubSchool = () => {};
    if (schoolId) {
      const schoolRef = doc(db, 'Schools', schoolId);
      unsubSchool = onSnapshot(schoolRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setSchoolConfig(data);
          // 自動覆蓋本地的校園基礎資訊
          if (data.name) setCampusName(data.name);
          if (data.address) setCampusAddress(data.address);
          if (data.location?.lat) setCampusLat(data.location.lat);
          if (data.location?.lng) setCampusLng(data.location.lng);
        } else {
          // 若資料庫尚未建立該校設定，給予預設值
          setSchoolConfig({
            features: {
              hasDiscountStores: false,
              english: true,
              contactBook: true,
              notes: false,
              grades: false,
              credits: false
            }
          });
        }
      }, (err) => console.error("School config sync error:", err));
    }

    let unsubSchedule = () => { };

    if (classID) {
      if (!schoolId || !gradeId) return; // 未設定學校或年級時不抓取
      // 1. Sync ClassSchedule (班級共用課表)
      const scheduleRef = collection(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'ClassSchedule');
      unsubSchedule = onSnapshot(scheduleRef, (snapshot) => {
        const transformed = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        snapshot.docs.forEach((docSnap) => {
          const item = docSnap.data();
          // 支援新版 dayOfWeek 以及舊版 day
          const dayIndex = item.dayOfWeek !== undefined ? item.dayOfWeek : item.day;
          if (dayIndex !== undefined && transformed[dayIndex]) {
            transformed[dayIndex].push({
              id: docSnap.id,
              subject: item.courseName || item.subject || '未命名課程',
              teacher: item.teacher || '',
              startTime: item.startTime || '08:00',
              endTime: item.endTime || '09:00',
              location: item.location || '',
              rescheduled: item.rescheduled || false,
              link: item.link || '',
              color: item.color || '',
              icon: item.icon || ''
            });
          }
        });
        Object.keys(transformed).forEach(day => {
          transformed[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        setWeeklySchedule(transformed);
      }, (err) => console.error("Schedule sync error:", err));
    } else if (user) {
      // Sync PersonalSchedule (個人自訂課表)
      const personalScheduleRef = collection(db, 'Users', user.uid, 'PersonalSchedule');
      unsubSchedule = onSnapshot(personalScheduleRef, (snapshot) => {
        const transformed = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
        snapshot.docs.forEach((docSnap) => {
          const item = docSnap.data();
          // 支援新版 dayOfWeek 以及舊版 day
          const dayIndex = item.dayOfWeek !== undefined ? item.dayOfWeek : item.day;
          if (dayIndex !== undefined && transformed[dayIndex]) {
            transformed[dayIndex].push({
              id: docSnap.id,
              subject: item.courseName || item.subject || '未命名課程',
              teacher: item.teacher || '',
              startTime: item.startTime || '08:00',
              endTime: item.endTime || '09:00',
              location: item.location || '',
              rescheduled: item.rescheduled || false,
              link: item.link || '',
              color: item.color || '',
              icon: item.icon || ''
            });
          }
        });
        Object.keys(transformed).forEach(day => {
          transformed[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
        });
        setWeeklySchedule(transformed);
      }, (err) => console.error("Personal schedule sync error:", err));
    }

    // 2. Sync Assignments (電子聯絡簿/作業)
    let unsubAssignments = () => { };
    if (classID && schoolId && gradeId) {
      const assignmentsRef = collection(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'Assignments');
      unsubAssignments = onSnapshot(assignmentsRef, (snapshot) => {
        setContactBookError('');
        const cb = {};
        snapshot.docs.forEach(docSnap => {
          const data = docSnap.data();
          const dateStr = data.dueDate || data.date;
          if (dateStr) {
            if (!cb[dateStr]) cb[dateStr] = [];
            cb[dateStr].push({ id: docSnap.id, ...data });
          }
        });
        setContactBook(cb);
      }, (err) => {
        console.error("Assignments sync error:", err);
        if (err.code === 'permission-denied') setContactBookError('資料庫權限不足：請檢查 Firebase 安全規則是否開放聯絡簿讀寫。');
        else setContactBookError(err.message);
      });
    }

    return () => { unsubSchedule(); unsubAssignments(); unsubSchool(); };
  }, [db, classID, user, schoolId, gradeId]);

  // Notice System Sync (全站系統公告)
  useEffect(() => {
    if (!db || !user) return; // 🚀 配合新安全規則：未登入者不嘗試讀取
    const noticesRef = collection(db, 'MainNotifications');
    const q = query(noticesRef, orderBy('timestamp', 'desc'), limit(5));

    const unsub = onSnapshot(q, (snapshot) => {
      if (snapshot && snapshot.docs) {
        const allNotices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setNotices(allNotices);

        if (snapshot.docChanges) {
          snapshot.docChanges().forEach((change) => {
            if (change.type === "added") {
              const data = change.doc.data();

              // 🚀 此處不觸發本地通知，統一交由雲端 Functions 透過 FCM 推播與鈴聲通知
              // 只更新 iOS / Android 桌面圖示的未讀紅點 (Badge)
              setUnreadCount(prev => {
                const nextCount = prev + 1;
                if ('setAppBadge' in navigator) navigator.setAppBadge(nextCount).catch(() => {});
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
  }, [db, classID, user]); // 加入 user 作為依賴

  const saveToFirestore = async (newSchedule) => {
    if (!db) return;
    if (!user) throw new Error("PERMISSION_DENIED");

    // 🚨 安全防護：如果綁定班級且非管理員，不允許編輯寫入雲端課表
    if (classID && !isAdmin) {
      console.error("權限不足：一般使用者無法修改班級課表");
      throw new Error("PERMISSION_DENIED_NOT_ADMIN");
    }

    try {
      let scheduleRef;
      const currentSchoolId = schoolId;
      const currentGradeId = gradeId;

      if (classID) {
        if (!currentSchoolId || !currentGradeId) throw new Error("MISSING_SCHOOL_OR_GRADE");
        scheduleRef = collection(db, 'Schools', currentSchoolId, 'Grades', currentGradeId, 'Classes', classID, 'ClassSchedule');
      } else {
        // ⚠️ 注意這裡：如果你的 user 物件沒有 uid，路徑就會壞掉！
        scheduleRef = collection(db, 'Users', user.uid, 'PersonalSchedule');
      }

      // 🚨 終極抓漏雷達 (請按 F12 打開 Console 看這裡印出什麼)
      console.log("=== 🚨 寫入前安全檢查 🚨 ===");
      console.log("1. 當前登入的 User 物件:", user);
      console.log("2. 你的 UID 是:", user.uid);
      console.log("3. 是否有綁定 classID:", classID);
      console.log("4. 🌟 最終 Firebase 準備前往的真實路徑:", scheduleRef.path);
      console.log("============================");

      const snap = await getDocs(scheduleRef); // 👈 報錯通常發生在這一行

      const batch = writeBatch(db);
      const currentIds = new Set();

      Object.keys(newSchedule).forEach(dayKey => {
        const day = parseInt(dayKey);
        if (day >= 0 && day <= 6) {
          (newSchedule[dayKey] || []).forEach((item, idx) => {
            const docId = item.id ? String(item.id) : `${day}_${idx}`;
            currentIds.add(docId);

            let docRef;
            if (classID) {
              docRef = doc(db, 'Schools', currentSchoolId, 'Grades', currentGradeId, 'Classes', classID, 'ClassSchedule', docId);
            } else {
              docRef = doc(db, 'Users', user.uid, 'PersonalSchedule', docId);
            }

            batch.set(docRef, {
              dayOfWeek: day, // 💡 改成 dayOfWeek，確保與 AI 排程和結構一致
              day: day, // 👈 補回 day 欄位，確保上課前 5 分鐘推播的查詢不會失效
              courseName: item.subject || item.courseName || '未命名課程', // 雙重保險
              teacher: item.teacher || '',
              startTime: item.startTime || '08:10',
              endTime: item.endTime || '09:00',
              location: item.location || '',
              rescheduled: item.rescheduled || false,
              link: item.link || '',
              color: item.color || '',
              icon: item.icon || ''
            }, { merge: true });
          });
        }
      });

      // 🚀 修復：就算權限不允許讀取舊資料，也不要阻止新資料寫入
      try {
        const snap = await getDocs(scheduleRef);
        snap.docs.forEach(docSnap => {
          if (!currentIds.has(docSnap.id)) {
            batch.delete(docSnap.ref);
          }
        });
      } catch (readErr) {
        console.warn("讀取舊課表失敗，將直接覆蓋新課表:", readErr.message);
      }

      await batch.commit();
      console.log("✅ 課表成功同步至資料庫！");
    } catch (e) {
      console.error("Firestore save error:", e);
      throw e;
    }
  };

  const saveContactBookToFirestore = async (newContactBook) => {
    if (!db || !classID) return;
    if (!schoolId || !gradeId) throw new Error("MISSING_SCHOOL_OR_GRADE");
    if (!user) throw new Error("GUEST_MODE");
    if (!user.email?.endsWith('.edu.tw') && !isAdmin) throw new Error("NOT_SCHOOL_ACCOUNT");
    try {
      const assignmentsRef = collection(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'Assignments');
      // 算一下你到底準備存入幾項作業
      const totalAssignments = Object.values(newContactBook).flat().length;
      console.log("📦 準備寫入 Firebase 的總作業數量:", totalAssignments);
      console.log("📝 實際的 newContactBook 資料:", newContactBook);
      const batch = writeBatch(db);
      const currentIds = new Set();

      Object.keys(newContactBook).forEach(dateStr => {
        newContactBook[dateStr].forEach(item => {
          const docId = item.id ? String(item.id) : Date.now().toString() + Math.floor(Math.random() * 1000);
          currentIds.add(docId);
          const docRef = doc(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'Assignments', docId);
          batch.set(docRef, {
            ...item,
            dueDate: dateStr,
            isNotified: item.isNotified !== undefined ? item.isNotified : false
          }, { merge: true });
        });
      });

      // 🚀 修復：就算權限不允許讀取舊資料，也不要阻止新資料寫入
      try {
        const snap = await getDocs(assignmentsRef);
        snap.docs.forEach(docSnap => {
          if (!currentIds.has(docSnap.id)) {
            batch.delete(docSnap.ref);
          }
        });
      } catch (readErr) {
        console.warn("讀取舊聯絡簿失敗，將直接寫入新資料:", readErr.message);
      }

      await batch.commit();
    } catch (e) {
      console.error("Firestore contact book save error:", e);
      throw e;
    }
  };

  const handleImportTemplate = async (type) => {
    let templateSource = [];
    let successMessage = '';
    
    if (type === '206') {
      if (!classID || classID !== '206') {
        triggerNotification('提示', '請先將班級代碼設定為 206');
        return;
      }
      templateSource = SCHEDULE_206_TEMPLATE;
      successMessage = '內中 206 班課表已導入並同步至雲端！';
    } else if (type === 'taiwan') {
      if (classID) {
        triggerNotification('提示', '若要導入個人範本，請先清空班級代碼（保留空白）');
        return;
      }
      // 自訂的全台通用基礎課表
      templateSource = [
        { day: 1, course: '國語文', startTime: '08:10', endTime: '09:00' },
        { day: 1, course: '英語文', startTime: '09:10', endTime: '10:00' },
        { day: 1, course: '數學', startTime: '10:10', endTime: '11:00' },
        { day: 2, course: '自然科學', startTime: '08:10', endTime: '09:00' },
        { day: 2, course: '社會', startTime: '09:10', endTime: '10:00' },
        { day: 3, course: '自主學習', startTime: '10:10', endTime: '11:00' },
        { day: 4, course: '藝術與綜合', startTime: '13:10', endTime: '14:00' },
        { day: 5, course: '健康與體育', startTime: '14:10', endTime: '15:00' }
      ];
      successMessage = '全台通用範本已成功導入您的個人課表！';
    }

    const transformed = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    templateSource.forEach((item, idx) => {
      if (transformed[item.day] !== undefined) {
        transformed[item.day].push({
          id: Date.now() + idx, subject: item.course, teacher: item.teacher,
          startTime: item.startTime, endTime: item.endTime, location: '',
          rescheduled: false, link: '', color: ''
        });
      }
    });
    setWeeklySchedule(transformed);

      try {
        await saveToFirestore(transformed);
        triggerNotification('導入成功', successMessage);
      } catch (err) {
        if (err.message === 'PERMISSION_DENIED_NOT_ADMIN') {
          triggerNotification('權限不足 ❌', '只有管理員可以修改班級雲端課表！');
        } else if (err.message === 'MISSING_SCHOOL_OR_GRADE') {
          triggerNotification('導入失敗 ❌', '請先至設定選擇學校與年級！');
        } else {
          triggerNotification('導入失敗 ❌', '請檢查網路或系統狀態');
        }
      }
  };

  // ─── Notifications (已搬移至最上方以支援全域調用) ──────────────────────────────────────────

  // ─── 監聽前景推播 (當使用者停留在頁面上時) ─────────────────────────────
  useEffect(() => {
    if (!messaging) return;
    const unsub = onMessage(messaging, (payload) => {
      console.log("📥 收到前景推播:", payload);
      if (payload.notification) {
        // 在畫面上方彈出內建的優雅提示橫幅
        triggerNotification(payload.notification.title, payload.notification.body);
        
        // 同步更新未讀紅點
        setUnreadCount(prev => {
          const nextCount = prev + 1;
          if ('setAppBadge' in navigator) navigator.setAppBadge(nextCount).catch(e => console.error(e));
          return nextCount;
        });
      }
    });
    return () => unsub();
  }, [triggerNotification]);

  // ─── 網頁端本地定時提醒 (晚上 20:00) ──────────────────────────────────────
  // 🚀 防呆機制已移除：已全面交由 Firebase Cloud Functions (dailyExamReminder) 雲端發送推播
  // 移除本地排程以徹底斬斷「雙重通知」的發生

  // ─── 測試 Firebase 雲端通知推播 ──────────────────────────────────────────
  const sendTestNotice = async () => {
    if (!('serviceWorker' in navigator)) {
      toast.error('您的瀏覽器不支援背景推播服務');
      return;
    }
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification('🎉 測試成功！', {
          body: '您的裝置已成功設定推播通知。未來的提醒都會像這樣出現喔！',
          icon: '/vite.svg', // 替換為你的 app icon
          vibrate: [200, 100, 200]
        });
      } catch (e) {
        toast.error('無法顯示通知，請檢查系統層級的通知權限。');
      }
    } else {
      toast.error('請先允許通知權限！');
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

  const handleSignoutClick = useCallback(async () => {
    triggerNotification('處理中', '正在中斷連線...');
    try {
      await signOut(auth); // 正確登出 Firebase
    } catch (err) {
      console.error("Firebase SignOut Error:", err);
    }

    const token = window.gapi?.client?.getToken();
    if (token) {
      try {
        window.google?.accounts.oauth2.revoke(token.access_token, () => {
          window.gapi?.client?.setToken('');
        });
      } catch (e) {
        console.error(e);
      }
    }

    // 無論 Google Token 是否存在，都確保清除本地狀態與畫面連線指示
    localStorage.removeItem('gsat_google_token');
    localStorage.removeItem('gsat_user_profile');
    setIsGoogleConnected(false);
    setUserProfile(null);
    triggerNotification('已登出', 'Google 帳號連線已成功中斷。');
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
              include_granted_scopes: false,
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
          setIsAuthLoading(true);
          console.log("📥 從 Callback 取得 ID Token，正在還原 Firebase 演唱會...");
          try {
            if (!auth) throw new Error("Firebase Auth 未初始化");
            const credential = GoogleAuthProvider.credential(idToken, accessToken);
            const result = await signInWithCredential(auth, credential);

            localStorage.setItem('gsat_google_token', accessToken);
            setIsGoogleConnected(true);
            setUser(result.user);

            const profile = { name: result.user.displayName, email: result.user.email, photo: result.user.photoURL };
            setUserProfile(profile);
            localStorage.setItem('gsat_user_profile', JSON.stringify(profile));

            toast.success('Google 登入成功：安全性流程驗證通過！');
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
          const result = auth ? await getRedirectResult(auth) : null;
          if (result) {
            setIsAuthLoading(true); // 確定有導向結果才顯示 Loading，避免每次重整閃爍
            const credential = GoogleAuthProvider.credentialFromResult(result);
            const token = credential?.accessToken;
            if (token) {
              localStorage.setItem('gsat_google_token', token);
              setIsGoogleConnected(true);
            }
            setUser(result.user);

            const profile = { name: result.user.displayName, email: result.user.email, photo: result.user.photoURL };
            setUserProfile(profile);
            localStorage.setItem('gsat_user_profile', JSON.stringify(profile));

            toast.success('Google 登入成功：已啟用雲端備份！');
            setAppPhase('app'); // 🚀 直接進入 App
          }
        } catch (error) {
          console.error("Redirect auth error:", error);
        }
      } catch (err) {
        console.error("❌ Main Initialization Error:", err);
      } finally {
        setIsAuthLoading(false); // 無論成功或失敗，初始化結束後都關閉 Loading
      }
    };
    init();
  }, [fetchUserInfo, triggerNotification]);

  const handleAuthClick = async () => {
    if (!auth) {
      triggerNotification('系統錯誤', '環境變數遺失，無法啟動登入。');
      return;
    }

    setIsAuthLoading(true);
    triggerNotification('連線中', '正在啟動 Google 登入...');
    console.log("📍 Using Redirect URI:", GOOGLE_REDIRECT_URI);
    if (tokenClientRef.current) {
      console.log("🚀 啟動 Google Authorization Code Flow (requestCode)");
      try {
        tokenClientRef.current.requestCode();
      } catch (err) {
        console.error("requestCode failed:", err);
        triggerNotification('啟動登入失敗', '請重新整理頁面再試。');
        setIsAuthLoading(false);
      }
    } else {
      // 回退方案
      const provider = new GoogleAuthProvider();
      try {
        await signInWithRedirect(auth, provider);
      } catch (error) {
        console.error("Fallback Auth error:", error);
        setIsAuthLoading(false);
      }
    }
  };

  const handleGuestStart = () => {
    setAppPhase('app');
    triggerNotification('訪客模式', '已進入應用程式，部分功能可能受限。');
  };

  // ─── Nav ─────────────────────────────────────────────────────────────────
  const allNavItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '日常課表' },
    { id: 'english', icon: BookOpen, label: '單字特訓' },
    { id: 'contactBook', icon: Notebook, label: '電子聯絡簿' },
    { id: 'notes', icon: BookMarked, label: '知識筆記' },
    { id: 'grades', icon: TrendingUp, label: '成績趨勢' },
    { id: 'credits', icon: GraduationCap, label: '學分計算' },
    { id: 'stores', icon: Store, label: '特約商店' },
    { id: 'traffic', icon: Bus, label: '交通與 YouBike' },
    { id: 'feedback', icon: MessageSquare, label: '回饋與支持' },
    { id: 'help', icon: HelpCircle, label: '如何使用' },
    { id: 'legal', icon: ShieldCheck, label: '隱私與條款' },
  ];

  // 🚀 動態過濾：只顯示「核心功能(必定顯示)」以及「學校有開啟的選配功能」
  const navItems = allNavItems.filter(item => {
    // 這些是系統預設的核心頁面，無條件必定顯示
    if (['dashboard', 'english', 'contactBook', 'settings', 'feedback', 'help', 'legal'].includes(item.id)) return true;

    // YouBike 交通資訊由使用者自定義開關
    if (item.id === 'traffic') {
      return showTrafficTab;
    }

    // 如果學校有配置 features，只顯示配置裡有的功能
    if (schoolConfig && schoolConfig.features) {
      // 兼容舊版陣列格式
      if (Array.isArray(schoolConfig.features)) {
        return schoolConfig.features.includes(item.id);
      }
      // 相容新版 Object 格式 (例如 features.hasDiscountStores)
      if (typeof schoolConfig.features === 'object') {
        if (item.id === 'stores' && schoolConfig.features.hasDiscountStores !== undefined) {
          return schoolConfig.features.hasDiscountStores;
        }
        // 預設為 false，只有後台明確設為 true 才顯示
        return schoolConfig.features[item.id] === true;
      }
    }
    return false;
  });

  const getTabName = id => navItems.find(n => n.id === id)?.label || 'GSAT Pro';

  // ─── Phases ───────────────────────────────────────────────────────────────
  if (appPhase === 'auth') return <LandingPage onStart={handleAuthClick} onGuestStart={handleGuestStart} />;
  if (appPhase === 'welcome') return <WelcomeScreen isFirstTime={!localStorage.getItem('gsat_legal_accepted')} onFinishWelcome={() => { localStorage.setItem('gsat_onboarding_done', 'true'); setAppPhase('app'); }} requestPushPermission={requestPushPermissionPrompt} />;
  if (firebaseError) return <MaintenanceView error={firebaseError} />;

  return (
    <>
      {/* 🚀 全螢幕登入載入動畫 (Auth Loading Overlay) */}
      {isAuthLoading && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/40 dark:bg-[#020617]/80 backdrop-blur-3xl flex flex-col items-center justify-center animate-fadeIn">
          {/* 背景氛圍光暈 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/20 blur-[80px] rounded-full animate-pulse-slow pointer-events-none"></div>

          <div className="relative bg-white/70 dark:bg-white/5 backdrop-blur-3xl border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_32px_64px_rgba(0,0,0,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_32px_64px_rgba(0,0,0,0.5)] p-12 rounded-[48px] flex flex-col items-center text-center animate-pop-in">
            {/* 質感多層次載入環 */}
            <div className="relative flex items-center justify-center mb-8">
              <div className="absolute inset-0 border-[3px] border-emerald-500/10 dark:border-white/5 rounded-full"></div>
              <div className="w-20 h-20 border-[3px] border-transparent border-t-emerald-500 border-r-emerald-500/50 rounded-full animate-spin"></div>
              <div className="absolute w-12 h-12 border-[3px] border-transparent border-b-blue-500 border-l-blue-500/50 rounded-full animate-[spin_1.5s_linear_infinite_reverse]"></div>
              <Globe size={22} className="absolute text-emerald-600 dark:text-emerald-400 animate-pulse" />
            </div>

            <h3 className="text-[22px] font-black text-slate-800 dark:text-white tracking-widest mb-2">安全連線中</h3>
            <p className="text-[13px] font-bold text-slate-500 dark:text-emerald-400/80">正在與 Google 建立加密連線</p>

            {/* 掃光進度條 */}
            <div className="w-48 h-1.5 bg-slate-200 dark:bg-white/10 rounded-full mt-8 overflow-hidden relative shadow-inner">
              <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-emerald-500 to-transparent animate-[shimmer-slide_1.5s_infinite_linear]"></div>
            </div>
          </div>
        </div>
      )}

      {showPrivacyModal && <PrivacyModal onAccept={() => { setShowPrivacyModal(false); setAppPhase('app'); }} />}

      {/* 🚀 全新液態玻璃設計：推播通知授權彈窗 */}
      {showPushPrompt && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm animate-fadeIn" onClick={() => setShowPushPrompt(false)} />
          <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-[32px] border border-white/60 dark:border-white/10 p-8 md:p-10 rounded-[48px] shadow-[0_40px_80px_rgba(0,0,0,0.2)] relative w-full max-w-sm animate-pop-in text-center overflow-hidden">
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-emerald-400/30 blur-[50px] rounded-full pointer-events-none"></div>
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-blue-400/30 blur-[50px] rounded-full pointer-events-none"></div>

            <div className="w-20 h-20 bg-white/50 dark:bg-white/10 border border-white/60 dark:border-white/20 rounded-[28px] mx-auto flex items-center justify-center mb-6 shadow-sm relative z-10 backdrop-blur-md">
              <BellRing size={36} className="text-emerald-600 dark:text-emerald-400 animate-bounce-soft" />
            </div>
            <h3 className="text-[24px] font-black text-slate-800 dark:text-white mb-3 relative z-10 tracking-tight">開啟智慧通知</h3>
            <p className="text-[14px] text-slate-500 dark:text-slate-300 font-bold mb-8 relative z-10 leading-relaxed">
              不再錯過任何重要考試與作業提醒！<br />請允許我們傳送背景推播。
            </p>
            <div className="flex gap-3 relative z-10">
              <button onClick={() => setShowPushPrompt(false)} className="flex-1 py-4 bg-white/50 dark:bg-white/5 hover:bg-white/70 backdrop-blur-md border border-white/60 dark:border-white/10 rounded-[24px] font-black text-[15px] text-slate-600 dark:text-slate-300 transition-all active:scale-95 shadow-sm">稍後再說</button>
              <button onClick={async () => {
                const granted = await requestPushPermissionPrompt();
                if (granted) {
                  await testPushNotification(user);
                }
                setShowPushPrompt(false);
              }} className="flex-1 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white rounded-[24px] font-black text-[15px] shadow-[0_10px_20px_rgba(16,185,129,0.3)] transition-all active:scale-95 border border-emerald-400/50">立即啟用</button>
            </div>
          </div>
        </div>
      )}

      <IosNotification notification={notification} />
      <CommandPalette
        isOpen={cmdPaletteOpen}
        onClose={() => setCmdPaletteOpen(false)}
        onSelectTab={(id) => {
          const map = { dashboard: 'dashboard', vocabulary: 'english', contact: 'contactBook', stores: 'stores', traffic: 'traffic', settings: 'settings', feedback: 'feedback', tutorial: 'help', grades: 'grades' };
          setActiveTab(map[id] || id);
          setIsNavOpen(false);
        }}
      />

      {/* 移除固定在下方的通知導引橫幅，避免阻擋畫面 */}
      {/* {appPhase === 'app' && (
        <SmartNotificationBanner onActivate={testPushNotification} />
      )} */}

      {/* Fixed Top Navigation & Legal */}
      {appPhase === 'app' && (
        <>
          {/* 🚀 隱形點擊遮罩：只負責捕捉點擊以關閉選單，移除全螢幕黑底與模糊干擾 */}
          {isNavOpen && (
            <div className="fixed inset-0 z-[990]" onClick={() => setIsNavOpen(false)} />
          )}

          <div className="fixed top-0 left-0 right-0 z-[1000] pointer-events-none pt-[calc(env(safe-area-inset-top)+16px)] px-4 sm:px-6 transition-all duration-500">
            <div className="pointer-events-auto max-w-screen-xl mx-auto h-[68px] bg-white/60 dark:bg-[#0f172a]/60 backdrop-blur-[32px] backdrop-saturate-[1.5] rounded-[36px] flex items-center justify-between px-3 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.08),0_8px_32px_rgba(0,0,0,0.4)] border border-white/60 dark:border-white/10 transition-all duration-500">
              {/* 選單區域 */}
              <div className="relative">
                <button
                  onClick={() => setIsNavOpen(!isNavOpen)}
                  className={`group flex items-center gap-3 px-4 py-2.5 rounded-[24px] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.95] overflow-hidden border ${isNavOpen ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.3)] border-emerald-400 dark:border-emerald-500' : 'bg-transparent hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-200 border-transparent hover:border-black/5 dark:hover:border-white/10'}`}
                >
                  <Menu size={20} strokeWidth={isNavOpen ? 2.5 : 2} className="transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] shrink-0" style={{ transform: isNavOpen ? 'rotate(90deg) scale(1.1)' : 'rotate(0deg) scale(1)' }} />
                  <div className="flex items-center gap-2">
                    <span className={`text-[15px] sm:text-[16px] font-black tracking-tight truncate max-w-[120px] sm:max-w-none transition-colors duration-[600ms] ${isNavOpen ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`}>{getTabName(activeTab)}</span>
                    <span className={`hidden md:flex items-center justify-center px-1.5 py-0.5 rounded border text-[10px] font-black transition-colors duration-[600ms] ${isNavOpen ? 'border-emerald-400/50 bg-emerald-600 text-emerald-100' : 'border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-slate-400'}`}>⌘K</span>
                  </div>
                </button>

                {isNavOpen && (
                  <div className="absolute top-full left-0 mt-4 w-[280px] bg-white/80 dark:bg-[#0f172a]/80 backdrop-blur-[48px] backdrop-saturate-[2] rounded-[36px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_32px_64px_rgba(0,0,0,0.12)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),0_32px_64px_rgba(0,0,0,0.6)] border border-white/80 dark:border-white/10 overflow-hidden z-[1010] origin-top-left" style={{ animation: 'apple-linear 0.4s cubic-bezier(0.23, 1, 0.32, 1) forwards' }}>
                    <div className="px-4 py-3 mb-1">
                      <span className="text-[11px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-[0.25em]">功能選單</span>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto scrollbar-hide space-y-1.5 p-1">
                      {navItems.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => { navTo(item.id); setIsNavOpen(false); }}
                          onMouseEnter={() => preloadTab(item.id)}
                          style={{ animationDelay: `${idx * 35}ms` }}
                          className={`group w-full flex items-center gap-3 px-4 py-3.5 text-left rounded-[24px] transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] border animate-slide-up-fade opacity-0 fill-mode-forwards ${activeTab === item.id ? 'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-[inset_0_1px_1px_rgba(255,255,255,0.5),0_4px_12px_rgba(16,185,129,0.1)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(16,185,129,0.2)] border-emerald-200/50 dark:border-emerald-500/20' : 'border-transparent text-slate-600 dark:text-slate-300 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
                        >
                          <div className={`p-2.5 rounded-[16px] transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${activeTab === item.id ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 scale-105' : 'bg-transparent text-slate-400 dark:text-slate-500 group-hover:bg-black/5 dark:group-hover:bg-white/10 group-hover:text-slate-700 dark:group-hover:text-white group-hover:scale-110'}`}>
                            <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} className="shrink-0" />
                          </div>
                          <span className={`text-[15px] font-bold transition-colors ${activeTab === item.id ? 'font-black' : ''}`}>{item.label}</span>
                          {activeTab === item.id && <div className="ml-auto w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)] animate-pulse-live"></div>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 法律與設定區域 */}
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex items-center bg-white/40 dark:bg-[#0f172a]/60 px-3 py-2 rounded-[20px] border border-white/60 dark:border-white/10 backdrop-blur-xl shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.3)]">
                  <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest px-2" onClick={(e) => e.stopPropagation()}>Privacy</a>
                  <span className="text-slate-300 dark:text-white/10 text-[10px]">·</span>
                  <a href="/terms.html" target="_blank" rel="noreferrer" className="text-[10px] font-black text-slate-400 hover:text-emerald-500 transition-colors uppercase tracking-widest px-2" onClick={(e) => e.stopPropagation()}>Terms</a>
                </div>
                <button
                  onClick={() => {
                    if (activeTab === 'settings') navTo(previousTab);
                    else navTo('settings');
                  }}
                  className={`p-3 rounded-[20px] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90 shadow-sm shrink-0 border ${activeTab === 'settings' ? 'bg-emerald-500 text-white shadow-[0_8px_24px_rgba(16,185,129,0.3)] border-emerald-400 dark:border-emerald-500 rotate-180 scale-105' : 'bg-white/50 dark:bg-[#0f172a]/60 backdrop-blur-xl text-slate-500 dark:text-slate-400 border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_4px_12px_rgba(0,0,0,0.3)] hover:bg-white/80 dark:hover:bg-white/10'}`}
                >
                  <Settings size={22} strokeWidth={activeTab === 'settings' ? 2.5 : 2} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <Toaster position="bottom-center" toastOptions={{ duration: 3000, style: { fontSize: '14px', fontWeight: '900', borderRadius: '24px', padding: '16px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }} />

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto w-full px-4 pt-[140px] sm:pt-[150px] ios-safe-pb touch-pan-y scrollbar-hide bg-transparent scroll-smooth transition-all duration-300 relative z-10"
      >
        <Suspense fallback={<TabSkeleton />}>
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
                navToSettings={navToSettings}
                isGoogleConnected={isGoogleConnected}
                contactBook={contactBook}
                setContactBook={setContactBook}
                saveContactBookToFirestore={saveContactBookToFirestore}
                user={user}
                customLinks={customLinks}
                isEditingSchedule={isEditingSchedule}
                setIsEditingSchedule={setIsEditingSchedule}
                classID={classID}
                saveToFirestore={saveToFirestore}
                customCountdowns={customCountdowns}
                dashboardLayout={dashboardLayout}
              />
            )}
            {activeTab === 'english' && (
              <VocabularyTab 
                user={user} 
                isAdmin={isAdmin} 
                schoolId={schoolId} 
                gradeId={gradeId} 
              />
            )}
            {activeTab === 'contactBook' && (
              <ContactBookTab
                contactBook={contactBook}
                setContactBook={setContactBook}
                subjects={subjects}
                isAdmin={isAdmin}
                saveContactBookToFirestore={saveContactBookToFirestore}
                classID={classID}
                user={user}
                schoolId={schoolId}
                gradeId={gradeId}
                navToSettings={navToSettings}
                errorMsg={contactBookError}
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
            {activeTab === 'credits' && <CreditsTab user={user} triggerNotification={triggerNotification} />}
            {activeTab === 'grades' && <GradesTab user={user} triggerNotification={triggerNotification} />}
            {activeTab === 'stores' && <StoresTab isAdmin={isAdmin} campusName={campusName} schoolId={schoolId} />}
            {activeTab === 'traffic' && <TrafficTab campusName={campusName} campusAddress={campusAddress} campusLat={campusLat} campusLng={campusLng} />}
            {activeTab === 'feedback' && <FeedbackTab userProfile={userProfile} triggerNotification={triggerNotification} onBack={() => navTo(previousTab)} onSuccess={() => navTo('dashboard')} />}
            {activeTab === 'help' && <TutorialTab onOpenFeedback={() => navTo('feedback')} campusName={campusName} />}
            {activeTab === 'settings' && (
              <SettingsTab
                user={user}
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
                activeSubTab={settingsSubTab}
                setActiveSubTab={setSettingsSubTab}
                customLinks={customLinks}
                setCustomLinks={setCustomLinks}
                classID={classID}
                setClassID={setClassID}
                setIsEditingSchedule={setIsEditingSchedule}
                handleImportTemplate={handleImportTemplate}
                customCountdowns={customCountdowns}
                setCustomCountdowns={setCustomCountdowns}
                campusName={campusName}
                setCampusName={setCampusName}
                campusAddress={campusAddress}
                setCampusAddress={setCampusAddress}
                campusLat={campusLat}
                setCampusLat={setCampusLat}
                campusLng={campusLng}
                setCampusLng={setCampusLng}
                dashboardLayout={dashboardLayout}
                setDashboardLayout={setDashboardLayout}
                dndEnabled={dndEnabled}
                handleToggleDnd={handleToggleDnd}
                toggleTopicSubscription={toggleTopicSubscription}
                subjects={subjects}
                setSubjects={setSubjects}
                schoolId={schoolId}
                setSchoolId={setSchoolId}
                gradeId={gradeId}
                setGradeId={setGradeId}
                showTrafficTab={showTrafficTab}
                setShowTrafficTab={setShowTrafficTab}
                navTo={navTo}
              />
            )}
            {activeTab === 'legal' && <LegalTab onBack={() => navTo('settings')} />}
          </div>
        </Suspense>
      </div>
    </>
  );
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gsat_theme') || 'system');
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const requestPushPermission = async (currentUser) => {
    if (!('Notification' in window) || !messaging || !currentUser?.uid) return;
    try {
      if (Notification.permission !== 'granted') return;
      const token = await getToken(messaging, { vapidKey: VAPID_KEY?.trim().replace(/\s/g, '') });
      if (token) {
        // 1. 從新的資料庫結構 Users/{userId} 讀取使用者的 classId
        const userRef = doc(db, 'Users', currentUser.uid);
        const userSnap = await getDoc(userRef);

        const oldClass = userSnap.exists() ? userSnap.data().classId : null;
        let currentClass = localStorage.getItem('gsat_class_id');
        let currentSchool = localStorage.getItem('gsat_school_id');
        let currentGrade = localStorage.getItem('gsat_grade_id');

        if (userSnap.exists()) {
          const data = userSnap.data();
          if (data.classId !== undefined && currentClass === null) {
            currentClass = data.classId;
            localStorage.setItem('gsat_class_id', currentClass);
          }
          if (data.schoolId !== undefined && currentSchool === null) {
            currentSchool = data.schoolId;
            localStorage.setItem('gsat_school_id', currentSchool);
          }
          if (data.gradeId !== undefined) {
            let normalizedGrade = data.gradeId;
            if (normalizedGrade && !normalizedGrade.includes('_') && normalizedGrade.startsWith('grade')) {
              normalizedGrade = normalizedGrade.replace('grade', 'grade_');
            }
            if (currentGrade === null || currentGrade !== normalizedGrade) {
              currentGrade = normalizedGrade;
              localStorage.setItem('gsat_grade_id', currentGrade);
            }
          }
        }
        
        // 🚀 讓前端 UI 知道他是幹部或管理員，從而解鎖「編輯課表」按鈕
        if (userSnap.exists() && (userSnap.data().role === 'admin' || userSnap.data().role === 'officer')) {
          setIsAdmin(true); 
        }
        
        if (!currentClass) currentClass = '';
        if (!currentSchool) currentSchool = '';
        if (!currentGrade) currentGrade = '';

        // 🚀 配合安全規則：寫入 role 欄位以供後端判定身分
        const role = userSnap.exists() && userSnap.data().role ? userSnap.data().role : 'student';

        await setDoc(userRef, {
          fcmToken: token, lastActive: serverTimestamp(),
          userName: currentUser.displayName || '同學',
          email: currentUser.email || '', 
          classId: currentClass,
          schoolId: currentSchool,
          gradeId: currentGrade,
          role: role
        }, { merge: true });

        // 🚀 自動訂閱該班級的 FCM 主題
        if (functions) {
          // 1. 若班級發生變更，主動退訂舊班級（防止幽靈推播）
          if (oldClass && oldClass !== currentClass) {
            const unsubscribe = httpsCallable(functions, 'unsubscribeFromTopic');
            await unsubscribe({ token, topic: `class_${oldClass}` }).catch(e => console.warn(e));
            await unsubscribe({ token, topic: `class_${oldClass}_alerts` }).catch(e => console.warn(e));
          }

          // 2. 僅當有設定班級時，才執行訂閱 (避免本機模式收到預設 206 的通知)
          if (currentClass) {
            const subscribe = httpsCallable(functions, 'subscribeToTopic');
            await subscribe({ token, topic: `class_${currentClass}` }).catch(e => console.warn("主題訂閱失敗:", e));

            // 依據不打擾模式決定是否訂閱即時推播 (alerts)
            let dnd = false;
            if (userSnap.exists() && userSnap.data().dndEnabled !== undefined) {
              dnd = userSnap.data().dndEnabled;
              localStorage.setItem('gsat_dnd_enabled', String(dnd));
            } else {
              dnd = localStorage.getItem('gsat_dnd_enabled') === 'true';
            }

            if (!dnd) {
              await subscribe({ token, topic: `class_${currentClass}_alerts` }).catch(e => console.warn(e));
            } else {
              const unsubscribe = httpsCallable(functions, 'unsubscribeFromTopic');
              await unsubscribe({ token, topic: `class_${currentClass}_alerts` }).catch(e => console.warn(e));
            }
          }
        }
      }
    } catch (err) { console.error("FCM Error:", err); }
  };

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (authUser) => {
      setUser(authUser);
      if (authUser) {
        await requestPushPermission(authUser);
      } else {
        setIsAdmin(false);
      }
    });
  }, []);

  const requestPushPermissionPrompt = async () => {
    if (!('Notification' in window)) {
      toast.error('此瀏覽器不支援通知。iOS 請先「加入主畫面」。');
      return false;
    }
    try {
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        toast.success('通知已授權！系統將自動連線。');
        return true;
      } else {
        toast.error('請在瀏覽器設定中允許通知。');
        return false;
      }
    } catch (err) {
      console.error("FCM Error:", err);
      return false;
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
      <div className="main-container relative h-[100dvh] w-full flex flex-col bg-[#e2e8f0] dark:bg-[#09090b] overflow-hidden font-sans text-slate-800 dark:text-zinc-200">
        {/* Liquid Glass Background Blobs (Fixed Mix-Blend Display Issues) */}
        <div className="fixed top-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-emerald-400/20 dark:bg-emerald-600/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none animate-float transform-gpu will-change-transform z-0" />
        <div className="fixed bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-blue-400/20 dark:bg-blue-600/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none animate-float-delayed transform-gpu will-change-transform z-0" />
        <div className="fixed top-[30%] left-[20%] w-[40vw] h-[40vw] bg-purple-400/10 dark:bg-purple-600/10 blur-[100px] md:blur-[120px] rounded-full pointer-events-none animate-pulse-slow transform-gpu will-change-transform z-0" />

        <MainApp
          forcedTheme={theme}
          setForcedTheme={setTheme}
          testPushNotification={requestPushPermission}
          requestPushPermissionPrompt={requestPushPermissionPrompt}
          user={user}
          setUser={setUser}
          isAdmin={isAdmin}
          setIsAdmin={setIsAdmin}
        />
      </div>
    </div>
  );
}