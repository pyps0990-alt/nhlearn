import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Menu, Settings, LayoutDashboard, BookOpen, Notebook,
  Library, Store, Bus, HelpCircle, ShieldCheck
} from 'lucide-react';
import './App.css';

// Utilities & Constants
import {
  INITIAL_WEEKLY_SCHEDULE, SUBJECTS_LIST,
  GOOGLE_CLIENT_ID, DRIVE_DISCOVERY_DOC, PEOPLE_DISCOVERY_DOC, SCOPES
} from './utils/constants';
import { timeToMins } from './utils/helpers';

// Components
import DashboardTab from './components/DashboardTab';
import VocabularyTab from './components/VocabularyTab';
import ContactBookTab from './components/ContactBookTab';
import NotesTab from './components/NotesTab';
import StoresTab from './components/StoresTab';
import TrafficTab from './components/TrafficTab';
import TutorialTab from './components/TutorialTab';
import SettingsTab from './components/SettingsTab';
import LegalTab from './components/LegalTab';
import {
  IosNotification, WelcomeScreen, AuthScreen, PrivacyModal
} from './components/SharedComponents';

const MainApp = () => {
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
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('gsat_theme') || 'system');
  const [userProfile, setUserProfile] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_user_profile')) || null; } catch { return null; }
  });
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('gsat_gemini_key') || '');
  const [appPhase, setAppPhase] = useState(() => {
    // 優先順序：驗證 -> 歡迎 -> App
    if (!localStorage.getItem('gsat_onboarding_done')) return 'auth';
    return 'app';
  });
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [aiTestStatus, setAiTestStatus] = useState('idle');

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
    try { return JSON.parse(localStorage.getItem('gsat_custom_links')) || []; } catch { return []; }
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

  const requestPushPermission = async () => {
    if (!('Notification' in window)) {
      triggerNotification('系統提示', '此瀏覽器不支援通知。iOS 請先「加入主畫面」。');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') triggerNotification('授權成功 🎉', '您現在可以接收提醒了！');
    else triggerNotification('權限未開啟', '請在瀏覽器設定中允許通知。');
  };

  const testPushNotification = () => {
    if (Notification.permission === 'granted') triggerNotification('測試成功', '這是一則系統推播！');
    else requestPushPermission();
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

  const handleAuthClick = () => {
    if (!tokenClientRef.current) { triggerNotification('設定未完成', '請填入有效的 GOOGLE_CLIENT_ID'); return; }
    const token = window.gapi?.client?.getToken();
    tokenClientRef.current.requestAccessToken({ prompt: token ? '' : 'consent' });
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
  if (appPhase === 'auth') {
    return (
      <AuthScreen
        onLogin={handleAuthClick}
        onSkip={() => setAppPhase('welcome')}
      />
    );
  }

  if (appPhase === 'welcome') {
    return (
      <WelcomeScreen
        isFirstTime={!localStorage.getItem('gsat_legal_accepted')}
        onFinishWelcome={() => {
          localStorage.setItem('gsat_onboarding_done', 'true');
          setAppPhase('app');
        }}
        requestPushPermission={requestPushPermission}
      />
    );
  }

  return (
    <>
      {showPrivacyModal && <PrivacyModal onAccept={() => { setShowPrivacyModal(false); setAppPhase('app'); }} />}
      <IosNotification notification={notification} />

      {/* Header - 僅保留標題 */}
      <div className="sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-b border-white/50 dark:border-white/10 px-5 pt-[calc(env(safe-area-inset-top)+12px)] pb-4 flex justify-center items-center shadow-soft">
        <h1 className="text-xl font-black text-emerald-600">{getTabName(activeTab)}</h1>
      </div>

      {/* Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto w-full px-4 pt-4 pb-32 touch-pan-y scrollbar-hide bg-transparent scroll-smooth"
      >
        {activeTab === 'dashboard' && (
          <DashboardTab
            weeklySchedule={weeklySchedule}
            setWeeklySchedule={setWeeklySchedule}
            subjects={subjects}
            triggerNotification={triggerNotification}
            requestPushPermission={requestPushPermission}
            testPushNotification={testPushNotification}
            setSettingsOpen={() => setActiveTab('settings')}
            isGoogleConnected={isGoogleConnected}
            contactBook={contactBook}
            customLinks={customLinks}
          />
        )}
        {activeTab === 'english' && <VocabularyTab userProfile={userProfile} isAdmin={isAdmin} theme={theme} geminiKey={geminiKey} />}
        {activeTab === 'contactBook' && <ContactBookTab contactBook={contactBook} setContactBook={setContactBook} subjects={subjects} />}
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
            requestPushPermission={requestPushPermission}
            testPushNotification={testPushNotification}
            theme={theme}
            setTheme={setTheme}
            aiTestStatus={aiTestStatus}
            testAiConnection={testAiConnection}
            geminiKey={geminiKey}
            setGeminiKey={setGeminiKey}
            setActiveTab={navTo}
            previousTab={previousTab}
            customLinks={customLinks}
            setCustomLinks={setCustomLinks}
          />
        )}
        {activeTab === 'legal' && <LegalTab onBack={() => navTo('settings')} />}
      </div>

      {/* 固定底欄 (Bottom Navigation & Legal) */}
      {appPhase === 'app' && (
        <div className="fixed bottom-0 left-0 right-0 z-[60] bg-white/80 dark:bg-slate-900/80 backdrop-blur-3xl border-t border-gray-200/50 dark:border-white/10 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] flex items-center justify-between shadow-[0_-15px_50px_rgba(0,0,0,0.1)]">
          {/* 選單區域 */}
          <div className="relative">
            <button
              onClick={() => setIsNavOpen(!isNavOpen)}
              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl transition-all active:scale-95 duration-200 ${isNavOpen ? 'bg-emerald-600 text-white shadow-xl' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10'}`}
            >
              <Menu size={20} className="transition-transform duration-300" style={{ transform: isNavOpen ? 'rotate(90deg)' : 'none' }} />
              <span className="text-sm font-black">{getTabName(activeTab)}</span>
            </button>

            {isNavOpen && (
              <>
                <div className="fixed inset-0 z-[-1] bg-black/5 animate-fadeIn" onClick={() => setIsNavOpen(false)} />
                <div className="absolute bottom-full left-0 mb-4 w-60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-[60px] rounded-[32px] shadow-[0_24px_80px_rgba(0,0,0,0.25)] border border-white/60 dark:border-white/10 overflow-hidden z-[70] animate-apple-linear origin-bottom-left">
                  <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/10">
                    <span className="text-[15px] font-black text-gray-400 uppercase tracking-[0.2em]">功能選單</span>
                  </div>
                  <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-hide space-y-1">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { navTo(item.id); setIsNavOpen(false); }}
                        className={`w-full flex items-center gap-3.5 px-4 py-3.5 text-left rounded-2xl transition-all ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700 shadow-sm' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-emerald-600'}`}
                      >
                        <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} className={activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'} />
                        <span className="text-[15px] font-bold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* 法律與設定區域 */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100/50 dark:bg-white/5 px-4 py-2 rounded-2xl border border-gray-200/50 dark:border-white/5">
              <a href="/privacy.html" target="_blank" rel="noreferrer" className="text-[11px] font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest px-1">Privacy</a>
              <span className="text-gray-300 dark:text-white/10 mx-1">|</span>
              <a href="/terms.html" target="_blank" rel="noreferrer" className="text-[11px] font-black text-gray-400 hover:text-emerald-600 transition-colors uppercase tracking-widest px-1">Terms</a>
            </div>
            <button
              onClick={() => {
                if (activeTab === 'settings') navTo(previousTab);
                else navTo('settings');
              }}
              className={`p-2.5 rounded-2xl transition-all active:scale-90 ${activeTab === 'settings' ? 'bg-emerald-600 text-white shadow-lg rotate-180' : 'bg-gray-100/50 dark:bg-white/5 text-gray-400 border border-gray-200/50 dark:border-white/5'}`}
            >
              <Settings size={20} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default function App() {
  return (
    <div className="w-full min-h-[100dvh] bg-gray-100 flex justify-center font-sans overflow-hidden">
      <div className="main-container">
        <MainApp />
      </div>
    </div>
  );
}
