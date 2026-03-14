import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Settings, LayoutDashboard, BookOpen, Notebook,
  Library, Store, Bus, HelpCircle, ShieldCheck,
  BellRing, Bell, AlertCircle, RefreshCw
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

import './App.css';
import SmartNotificationBanner from './components/SmartNotificationBanner';
import { INITIAL_WEEKLY_SCHEDULE, SUBJECTS_LIST, DEFAULT_LINKS, ICON_MAP, GOOGLE_CLIENT_ID, DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC, SCOPES } from './utils/constants';
import { SCHEDULE_206_TEMPLATE } from './utils/templates';
import { timeToMins } from './utils/helpers';
import { db, auth, messaging, firebaseError, VAPID_KEY } from './firebase';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc, serverTimestamp, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
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
  const [user, setUser] = useState(null); // 🚀 關鍵修復：加入 user 狀態，解決 is not defined
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

  // Refs
  const notifiedSet = useRef(new Set());
  const scheduleRef = useRef(weeklySchedule);
  const contactBookRef = useRef(contactBook);
  const tokenClientRef = useRef(null);

  useEffect(() => { scheduleRef.current = weeklySchedule; }, [weeklySchedule]);
  useEffect(() => { contactBookRef.current = contactBook; }, [contactBook]);

  // Persist
  useEffect(() => { localStorage.setItem('gsat_schedule', JSON.stringify(weeklySchedule)); }, [weeklySchedule]);
  useEffect(() => { localStorage.setItem('gsat_contact_book', JSON.stringify(contactBook)); }, [contactBook]);
  useEffect(() => { localStorage.setItem('gsat_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('gsat_subjects', JSON.stringify(subjects)); }, [subjects]);
  useEffect(() => { localStorage.setItem('gsat_custom_links', JSON.stringify(customLinks)); }, [customLinks]);
  useEffect(() => { localStorage.setItem('gsat_custom_countdowns', JSON.stringify(customCountdowns)); }, [customCountdowns]);
  useEffect(() => { localStorage.setItem('gsat_class_id', classID); }, [classID]);

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
        await requestPushPermission(authUser); // 登入後自動執行同步
      } else {
        setUser(null);
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
          const transformed = { 1: [], 2: [], 3: [], 4: [], 5: [] };
          cloudData.forEach((item, idx) => {
            if (transformed[item.day]) {
              transformed[item.day].push({
                id: item.id || Date.now() + idx,
                subject: item.course || item.subject,
                teacher: item.teacher || '',
                startTime: item.startTime || '08:00',
                endTime: item.endTime || '09:00',
                location: item.location || '',
                rescheduled: item.rescheduled || false
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
        // 🚀 關鍵修復：如果雲端找不到該班級，必須將畫面重置為空課表
        console.log(`雲端尚未建立 ${classID} 班的資料`);
        setWeeklySchedule(INITIAL_WEEKLY_SCHEDULE);
        setContactBook({});
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

              const isReschedule = data.type?.toLowerCase() === 'reschedule';

              toast.success(`${data.title || '系統通知'}: ${data.content || ''}`, {
                icon: isReschedule ? '🟠' : '🔔',
                style: {
                  borderRadius: '20px',
                  background: isReschedule ? '#f97316' : '#333',
                  color: '#fff'
                }
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
        if (day >= 1 && day <= 5) {
          (newSchedule[dayKey] || []).forEach(item => {
            flatSchedule.push({
              id: item.id, day: day, course: item.subject, teacher: item.teacher || '',
              startTime: item.startTime, endTime: item.endTime, location: item.location || '', rescheduled: item.rescheduled || false
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
    const transformed = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    SCHEDULE_206_TEMPLATE.forEach((item, idx) => {
      if (transformed[item.day]) {
        transformed[item.day].push({
          id: Date.now() + idx, subject: item.course, teacher: item.teacher,
          startTime: item.startTime, endTime: item.endTime, location: '', rescheduled: false
        });
      }
    });
    setWeeklySchedule(transformed);

    await setDoc(doc(db, 'classes', '206'), {
      className: "206", school: "內湖高中",
      schedule: SCHEDULE_206_TEMPLATE.map((item, idx) => ({
        id: Date.now() + idx, day: item.day, course: item.course, teacher: item.teacher,
        startTime: item.startTime, endTime: item.endTime, location: '', rescheduled: false
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
        await new Promise(r => window.gapi.load('client', r));
        await window.gapi.client.init({ clientId: GOOGLE_CLIENT_ID, discoveryDocs: [DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC] });
        const storedToken = localStorage.getItem('gsat_google_token');
        if (storedToken) { window.gapi.client.setToken({ access_token: storedToken }); setIsGoogleConnected(true); fetchUserInfo(); }
        if (GOOGLE_CLIENT_ID) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID, scope: SCOPES,
            callback: async tokenResponse => {
              if (tokenResponse.error) throw tokenResponse;
              localStorage.setItem('gsat_google_token', tokenResponse.access_token);
              setIsGoogleConnected(true);
              await fetchUserInfo();
              triggerNotification('Google 登入成功', '已啟用雲端備份！');
              setAppPhase('welcome');
            }
          });
        }
      } catch { }
    };
    init();
  }, [fetchUserInfo, triggerNotification]);

  const handleAuthClick = async () => {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/drive.metadata.readonly');

    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential.accessToken;

      localStorage.setItem('gsat_google_token', token);
      setIsGoogleConnected(true);

      const profile = { name: user.displayName, email: user.email, photo: user.photoURL };
      setUserProfile(profile);
      localStorage.setItem('gsat_user_profile', JSON.stringify(profile));

      if (user.email?.endsWith('@nhsh.tp.edu.tw')) {
        setIsAdmin(true);
        triggerNotification('歡迎老師', '已自動開啟管理員權限！');
      }

      triggerNotification('Google 登入成功', '已啟用雲端備份！');
      setAppPhase('welcome');

      if (window.gapi?.client) {
        window.gapi.client.setToken({ access_token: token });
        fetchUserInfo();
      }
    } catch (error) {
      console.error("Auth error:", error);
      setIsGoogleConnected(false);
    }
  };

  // ─── Smart Reminder System ────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const dateStr = now.toDateString();
      const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

      const todayClasses = scheduleRef.current[day] || [];
      let lastClassEndMins = 0;
      todayClasses.forEach(c => {
        if (!c.startTime) return;
        const startMins = timeToMins(c.startTime);
        const endMins = timeToMins(c.endTime);
        if (endMins > lastClassEndMins) lastClassEndMins = endMins;
        const diff = startMins - currentMins;
        if (diff > 0 && diff <= 5) {
          const key = `class-${c.id}-${dateStr}-5min`;
          if (!notifiedSet.current.has(key)) {
            notifiedSet.current.add(key);
            triggerNotification(`🔔 準備上課：${c.subject}`, `📍 ${c.location || '未定'} | ${diff}分鐘後`);
          }
        }
      });

      const allEntries = Object.values(contactBookRef.current || {}).flat();
      if (lastClassEndMins > 0 && currentMins >= lastClassEndMins + 5 && currentMins <= lastClassEndMins + 6) {
        const hw = allEntries.filter(e => e.homeworkDeadline === tomorrowStr);
        if (hw.length) {
          const key = `hw-${dateStr}`;
          if (!notifiedSet.current.has(key)) {
            notifiedSet.current.add(key);
            triggerNotification(`🎒 放學提醒：${hw.length} 項作業`, hw.map(t => t.homework).join(', '));
          }
        }
      }
      if (currentMins >= 1140 && currentMins <= 1141) {
        const exams = allEntries.filter(e => e.examDeadline === tomorrowStr);
        if (exams.length) {
          const key = `exam-${dateStr}-1900`;
          if (!notifiedSet.current.has(key)) {
            notifiedSet.current.add(key);
            triggerNotification(`📝 明日大考 (${exams.length}項)`, exams.map(t => t.exam).join(', '));
          }
        }
      }
    }, 30000);
    return () => clearInterval(timer);
  }, [triggerNotification]);

  // ─── Nav ─────────────────────────────────────────────────────────────────
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '日常課表' },
    { id: 'english', icon: BookOpen, label: '單字特訓' },
    { id: 'contactBook', icon: Notebook, label: '電子聯絡簿' },
    { id: 'notes', icon: Library, label: '知識筆記' },
    { id: 'stores', icon: Store, label: '特約商店' },
    { id: 'traffic', icon: Bus, label: '交通與 YouBike' },
    { id: 'help', icon: HelpCircle, label: '如何使用' },
    { id: 'legal', icon: ShieldCheck, label: '法律資訊' },
  ];

  const getTabName = id => navItems.find(n => n.id === id)?.label || 'GSAT Pro';

  // ─── Phases ───────────────────────────────────────────────────────────────
  if (appPhase === 'auth') return <LandingPage onStart={handleAuthClick} />;
  if (appPhase === 'welcome') return <WelcomeScreen isFirstTime={!localStorage.getItem('gsat_legal_accepted')} onFinishWelcome={() => { localStorage.setItem('gsat_onboarding_done', 'true'); setAppPhase('app'); }} requestPushPermission={testPushNotification} />;
  if (firebaseError) return <MaintenanceView error={firebaseError} />;

  return (
    <>
      {showPrivacyModal && <PrivacyModal onAccept={() => { setShowPrivacyModal(false); setAppPhase('app'); }} />}
      <IosNotification notification={notification} />

      {/* 🚀 加入智慧通知導引，放置在 UI 最頂層 */}
      {appPhase === 'app' && (
        <SmartNotificationBanner onActivate={testPushNotification} />
      )}

      {/* Fixed Top Navigation & Legal */}
      {appPhase === 'app' && (
        <div className="fixed top-0 left-0 right-0 z-[1000] glass-effect px-6 h-20 flex items-center justify-between shadow-soft pt-[env(safe-area-inset-top)] border-b border-white/10 transition-all duration-300">
          {/* 選單區域 */}
          <div className="relative w-40">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl transition-all active:scale-95 duration-300 w-full overflow-hidden ${isNavOpen ? 'bg-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)]' : 'bg-emerald-50/80 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-500/20'}`}
            >
              <Menu size={18} strokeWidth={3} className="transition-transform duration-500 shrink-0" style={{ transform: isNavOpen ? 'rotate(90deg)' : 'none' }} />
              <span className="text-[15px] font-black truncate tracking-wide">{getTabName(activeTab)}</span>
            </button>

            {isNavOpen && (
              <>
                <div className="fixed inset-0 z-[-1] bg-black/5 animate-fadeIn" onClick={() => setIsNavOpen(false)} />
                <div className="absolute top-full left-0 mt-4 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-[60px] rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.25)] border border-white/60 dark:border-white/10 overflow-hidden z-[1010] pt-[env(safe-area-inset-top)] animate-apple-linear origin-top-left">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-gray-50/10">
                    <span className="text-[12px] font-black text-slate-400 dark:text-gray-400 uppercase tracking-[0.2em]">功能選單</span>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-1">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { navTo(item.id); setIsNavOpen(false); }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left rounded-2xl transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700 shadow-sm dark:bg-emerald-500/10 dark:text-emerald-400' : 'text-slate-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-emerald-600'}`}
                      >
                        <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} className={`shrink-0 ${activeTab === item.id ? 'text-emerald-600 neon-glow-emerald' : 'text-slate-400'}`} />
                        <span className="text-[15px] font-bold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 法律與設定區域 */}
          <div className="flex items-center gap-4 w-44 justify-end">
            <div className="flex items-center bg-gray-100/40 dark:bg-white/5 px-3 py-2 rounded-xl sm:rounded-2xl border border-gray-200/50 dark:border-white/10 shrink-0 glass-effect">
              <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-[10px] sm:text-[11px] font-black text-gray-400 hover:text-emerald-500 transition-colors uppercase tracking-[0.1em] sm:tracking-[0.15em] px-1">Privacy</a>
              <span className="text-gray-300 dark:text-white/10 mx-0.5">|</span>
              <a href="/terms.html" target="_blank" rel="noreferrer" className="text-[10px] sm:text-[11px] font-black text-gray-400 hover:text-emerald-500 transition-colors uppercase tracking-[0.1em] sm:tracking-[0.15em] px-1">Terms</a>
            </div>
            <button
              onClick={() => {
                if (activeTab === 'settings') navTo(previousTab);
                else navTo('settings');
              }}
              className={`p-3 rounded-2xl transition-all active:scale-90 shadow-soft shrink-0 ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-[0_10px_30px_rgba(16,185,129,0.3)] rotate-180' : 'bg-gray-100/50 dark:bg-white/5 text-gray-400 border border-gray-200/50 dark:border-white/10'}`}
            >
              <Settings size={20} strokeWidth={2.5} className={`shrink-0 ${activeTab === 'settings' ? 'neon-glow-emerald' : ''}`} />
            </button>
          </div>
        </div>
      )}

      <Toaster position="bottom-center" toastOptions={{ duration: 6000, style: { fontSize: '14px', fontWeight: '900', borderRadius: '24px', padding: '16px 24px', boxShadow: '0 10px 40px rgba(0,0,0,0.1)' } }} />

      {/* Notice Banner - Fixed below Header */}
      {notices.length > 0 && activeTab === 'dashboard' && (
        <div className="fixed top-[68px] left-0 w-full z-[990] bg-orange-500/95 border-b border-white/20 backdrop-blur-xl animate-fadeIn">
          <div className="max-w-screen-xl mx-auto px-6 py-3 flex items-center gap-4">
            <div className="shrink-0 flex items-center justify-center w-8 h-8 bg-white/20 rounded-full animate-pulse">
              <BellRing size={16} className="text-white shrink-0" />
            </div>
            <div className="flex-1 overflow-hidden relative">
              <div className="flex gap-12 whitespace-nowrap animate-notice-slide">
                <span className="text-[14px] font-black text-white tracking-wider flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px]">NEW</span>
                  {notices[0].title}：{notices[0].content}
                </span>
                {/* Duplicate for seamless effect */}
                <span className="text-[14px] font-black text-white tracking-wider flex items-center gap-2">
                  <span className="bg-white/20 px-2 py-0.5 rounded-lg text-[10px]">HOT</span>
                  {notices[0].title}：{notices[0].content}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto w-full px-4 pt-28 ios-safe-pb touch-pan-y scrollbar-hide bg-transparent scroll-smooth transition-all duration-300"
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            isAdmin={isAdmin}
            weeklySchedule={weeklySchedule}
            setWeeklySchedule={setWeeklySchedule}
            subjects={subjects}
            triggerNotification={triggerNotification}
            requestPushPermission={testPushNotification}
            testPushNotification={testPushNotification}
            setSettingsOpen={() => navTo('settings')}
            isGoogleConnected={isGoogleConnected}
            contactBook={contactBook}
            customLinks={customLinks}
            isEditingSchedule={isEditingSchedule}
            setIsEditingSchedule={setIsEditingSchedule}
            classID={classID}
            saveToFirestore={saveToFirestore}
            customCountdowns={customCountdowns}
          />
        )}
        {activeTab === 'english' && <VocabularyTab userProfile={userProfile} isAdmin={isAdmin} theme={theme} geminiKey={geminiKey} />}
        {activeTab === 'contactBook' && (
          <ContactBookTab
            contactBook={contactBook}
            setContactBook={setContactBook}
            subjects={subjects}
            isAdmin={isAdmin}
            saveContactBookToFirestore={saveContactBookToFirestore}
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
        {activeTab === 'stores' && <StoresTab isAdmin={isAdmin} />}
        {activeTab === 'traffic' && <TrafficTab />}
        {activeTab === 'help' && <TutorialTab onOpenFeedback={() => window.open('https://forms.gle/gJyuP7ZEBjdo2MFK9', '_blank')} />}
        {activeTab === 'settings' && (
          <SettingsTab
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            triggerNotification={triggerNotification}
            handleAuthClick={handleAuthClick}
            isGoogleConnected={isGoogleConnected}
            handleSignoutClick={handleSignoutClick}
            requestPushPermission={testPushNotification}
            testPushNotification={testPushNotification}
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
          />
        )}
        {activeTab === 'legal' && <LegalTab onBack={() => navTo('settings')} />}
      </div>
    </>
  );
};

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('gsat_theme') || 'system');

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
        <MainApp
          forcedTheme={theme}
          setForcedTheme={setTheme}
          testPushNotification={requestPushPermission}
        />
      </div>
    </div>
  );
}