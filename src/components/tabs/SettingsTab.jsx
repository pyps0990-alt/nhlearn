import React, { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import {
  Settings, User, Monitor, Sun, Moon, Edit3,
  Bell, Sparkles, Cloud, BrainCircuit, RefreshCw, GraduationCap,
  CheckCircle2, X, Store, Trash2, Lock, MapPin, Globe, Plus, Link, Share, PlusSquare, Smartphone,
  Utensils, Coffee, CupSoda, PenTool, Clock, LayoutTemplate, Eye, EyeOff, ArrowUp, ArrowDown, GripVertical, Palette, ChevronDown,
  BookOpen, BookText, Languages, Calculator, Zap, Beaker, Dna, History, Scale, Library, Music, Trophy, Laptop, Lightbulb, Bus,
  BellRing, TrendingUp, Calendar
} from 'lucide-react';
import { db } from '../../config/firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const SUBJECT_ICONS = { BookText, Languages, Calculator, Zap, Beaker, Dna, History, MapPin, Scale, Library, Globe, GraduationCap, Music, Palette, Trophy, Laptop, PenTool, Lightbulb, BookOpen };
const COLOR_CLASSES = [{ key: 'emerald', hex: 'bg-emerald-500' }, { key: 'blue', hex: 'bg-blue-500' }, { key: 'rose', hex: 'bg-rose-500' }, { key: 'amber', hex: 'bg-amber-500' }, { key: 'purple', hex: 'bg-purple-500' }, { key: 'indigo', hex: 'bg-indigo-500' }, { key: 'slate', hex: 'bg-slate-500' }];

const SettingsTab = ({
  user,
  isAdmin, setIsAdmin, triggerNotification, handleAuthClick,
  isGoogleConnected, handleSignoutClick, requestPushPermission,
  testPushNotification, theme, setTheme,
  activeSubTab, setActiveSubTab, customLinks, setCustomLinks,
  classID, setClassID, setIsEditingSchedule,
  handleImportTemplate, customCountdowns, setCustomCountdowns,
  campusName, setCampusName, campusAddress, setCampusAddress,
  dashboardLayout, setDashboardLayout,
  campusLat, setCampusLat, campusLng, setCampusLng,
  dndEnabled, handleToggleDnd,
  subjects, setSubjects,
  schoolId, setSchoolId, navTo,
  gradeId, setGradeId,
  showTrafficTab, setShowTrafficTab,
  examPeriods = []
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [editingCampus, setEditingCampus] = useState(false);
  const [tempName, setTempName] = useState(campusName);
  const [tempAddr, setTempAddr] = useState(campusAddress);
  const [tempLat, setTempLat] = useState(campusLat || '25.078410');
  const [tempLng, setTempLng] = useState(campusLng || '121.587152');

  const SETTINGS_TABS = [
    { id: 'general', label: '一般與外觀', icon: Palette },
    { id: 'academic', label: '學習與課表', icon: GraduationCap },
    { id: 'system', label: '系統服務', icon: Cloud },
    { id: 'advanced', label: '進階與管理', icon: BrainCircuit }
  ];
  const [draggedIdx, setDraggedIdx] = useState(null);

  // 🌟 手動拖動 (Drag to Scroll) 邏輯
  const scrollRef = React.useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const onMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };
  const onMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    scrollRef.current.scrollLeft = scrollLeft - (e.pageX - scrollRef.current.offsetLeft - startX) * 2;
  };

  const handleDragStart = (e, index) => { setDraggedIdx(index); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragEnter = (e, index) => {
    if (draggedIdx === null || draggedIdx === index) return;
    const newLayout = [...dashboardLayout];
    const draggedItem = newLayout[draggedIdx];
    newLayout.splice(draggedIdx, 1);
    newLayout.splice(index, 0, draggedItem);
    setDraggedIdx(index);
    setDashboardLayout(newLayout);
  };
  const handleDragEnd = () => setDraggedIdx(null);
  const handleDragOver = (e) => e.preventDefault();

  // 自定義倒數管理狀態
  const [isAddingCountdown, setIsAddingCountdown] = useState(false);
  const [newCountdown, setNewCountdown] = useState({ title: '', date: '', style: 'gradient' });

  const handleAddCountdown = () => {
    if (!newCountdown.title.trim() || !newCountdown.date) {
      triggerNotification('資料不全', '請輸入名稱與日期');
      return;
    }
    const newList = [...(customCountdowns || []), { ...newCountdown, id: Date.now() }];
    setCustomCountdowns(newList);
    setNewCountdown({ title: '', date: '', style: 'gradient' });
    setIsAddingCountdown(false);
    triggerNotification('新增成功', `已加入倒數：${newCountdown.title}`);
  };

  const handleRemoveCountdown = (id, title) => {
    setCustomCountdowns(customCountdowns.filter(c => c.id !== id));
    triggerNotification('已刪除', `已移除倒數：${title}`);
  };

  const themeOptions = [
    { value: 'system', label: '跟隨系統', icon: Monitor },
    { value: 'light', label: '淺色模式', icon: Sun },
    { value: 'dark', label: '深色模式', icon: Moon },
  ];

  // 🚀 Apple 級頂級主題切換動畫引擎
  const handleThemeChange = (newTheme) => {
    if (!document.startViewTransition) {
      setTheme(newTheme);
      return;
    }
    document.startViewTransition(() => {
      flushSync(() => {
        setTheme(newTheme);
      });
    });
  };

  const [stores, setStores] = useState([]);
  const [editingStore, setEditingStore] = useState(null);
  const [newStore, setNewStore] = useState({
    name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '',
    operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: ''
  });

  const getStoreCategoryIcon = (type) => {
    switch (type) {
      case '餐飲': return Utensils;
      case '飲料': return CupSoda;
      case '咖啡': return Coffee;
      case '文具': return PenTool;
      default: return Store;
    }
  };

  // 權限狀態
  const [locPermission, setLocPermission] = useState('prompt');
  const [notifPermission, setNotifPermission] = useState(Notification.permission);

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLinkTitle, setNewLinkTitle] = useState('');
  const [newLinkUrl, setNewLinkUrl] = useState('');
  const [newLinkColor, setNewLinkColor] = useState('blue');
  const [editingLink, setEditingLink] = useState(null); // id, title, url

  const LINK_THEMES = { blue: 'bg-blue-500', emerald: 'bg-emerald-500', orange: 'bg-orange-500', rose: 'bg-rose-500', purple: 'bg-purple-500', indigo: 'bg-indigo-500', slate: 'bg-slate-500' };

  const handleAddCustomLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      triggerNotification('資料不全', '請輸入名稱與網址');
      return;
    }
    let url = newLinkUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setCustomLinks([...customLinks, { title: newLinkTitle.trim(), url, themeColor: newLinkColor, id: Date.now() }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
    setNewLinkColor('blue');
    setIsAddingLink(false);
    triggerNotification('新增成功', `已加入：${newLinkTitle}`);
  };

  const handleRemoveLink = (id, title) => {
    setCustomLinks(customLinks.filter(l => l.id !== id));
    triggerNotification('已刪除', `已移除：${title}`);
  };

  const handleSaveEdit = () => {
    if (!editingLink.title.trim() || !editingLink.url.trim()) return;
    setCustomLinks(customLinks.map(l => l.id === editingLink.id ? editingLink : l));
    setEditingLink(null);
    triggerNotification('更新成功', '連結資訊已儲存');
  };

  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(status => {
        setLocPermission(status.state);
        status.onchange = () => setLocPermission(status.state);
      });
      navigator.permissions.query({ name: 'notifications' }).then(status => {
        setNotifPermission(Notification.permission);
        status.onchange = () => setNotifPermission(Notification.permission);
      });
    }
  }, []);

  const handleLocationRequest = () => {
    if (locPermission === 'granted') {
      triggerNotification('定位已開啟', '您的瀏覽器已允許定位存取');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocPermission('granted');
        triggerNotification('定位授權成功 📍', '現在可以使用附近的交通資訊了');
      },
      (err) => {
        setLocPermission('denied');
        triggerNotification('定位授權失敗', '請在瀏覽器設定中手動開啟定位');
      }
    );
  };

  const Switch = ({ enabled, onChange, colorClass = "bg-emerald-500" }) => (
    <button onClick={(e) => { e.stopPropagation(); onChange(!enabled); }}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-300 outline-none ${enabled ? colorClass : 'bg-gray-200 dark:bg-gray-700'}`}>
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(collection(db, 'Schools', schoolId || 'nhsh', 'DiscountStores'), snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStores(data);
    });
    return () => unsub();
  }, [isAdmin]);

  const handleSaveCampus = () => {
    const name = tempName.trim() || '內湖高中';
    const addr = tempAddr.trim() || '台北市內湖區文德路218號';
    const lat = tempLat || '25.078410';
    const lng = tempLng || '121.587152';
    setCampusName(name); setCampusAddress(addr);
    setCampusLat(lat); setCampusLng(lng);
    localStorage.setItem('gsat_campus_name', name);
    localStorage.setItem('gsat_campus_address', addr);
    localStorage.setItem('gsat_campus_lat', lat);
    localStorage.setItem('gsat_campus_lng', lng);
    setEditingCampus(false);
    triggerNotification('已儲存', '校園資訊已更新');
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      triggerNotification('定位中', '正在獲取您的目前位置...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setTempLat(pos.coords.latitude.toFixed(6));
          setTempLng(pos.coords.longitude.toFixed(6));
          triggerNotification('成功', '已更新為目前座標');
        },
        () => triggerNotification('錯誤', '無法獲取位置，請確認瀏覽器權限')
      );
    }
  };

  // --- 自定義科目管理 ---
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', icon: 'BookText', color: 'emerald' });

  const handleAddSubject = () => {
    if (!newSubject.name.trim()) return;
    if (subjects.find(s => s.name === newSubject.name.trim())) {
      triggerNotification('重複科目', '該科目已存在！');
      return;
    }
    setSubjects([...subjects, { ...newSubject, name: newSubject.name.trim() }]);
    setNewSubject({ name: '', icon: 'BookText', color: 'emerald' });
    setIsAddingSubject(false);
    triggerNotification('新增成功', `已加入科目：${newSubject.name.trim()}`);
  };

  const handleRemoveSubject = (name) => {
    if (window.confirm(`確定要刪除「${name}」嗎？\n這將不會刪除已建立的筆記或課表，但未來無法再選取此科目。`)) {
      setSubjects(subjects.filter(s => s.name !== name));
      triggerNotification('已刪除', `已移除科目：${name}`);
    }
  };

  const handleAddOrUpdateStore = async () => {
    if (!newStore.name || !newStore.discount) { triggerNotification('資料不完整', '請輸入商店名稱與優惠'); return; }
    if (!isGoogleConnected) {
      triggerNotification('權限不足', '訪客模式無法修改特約商店資料喔！');
      return;
    }
    try {
      if (editingStore) {
        await updateDoc(doc(db, 'Schools', schoolId || 'nhsh', 'DiscountStores', editingStore), { ...newStore, updatedAt: Date.now() });
        triggerNotification('更新成功', `${newStore.name} 已更新`);
        setEditingStore(null);
      } else {
        await addDoc(collection(db, 'Schools', schoolId || 'nhsh', 'DiscountStores'), { ...newStore, createdAt: Date.now() });
        triggerNotification('新增成功', `${newStore.name} 已加入`);
      }
      setNewStore({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '', operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: '' });
    } catch (e) { triggerNotification('儲存失敗', '請稍後再試'); }
  };

  const handleDeleteStore = async (id, name) => {
    if (!window.confirm(`確定刪除「${name}」？`)) return;
    if (!isGoogleConnected) {
      triggerNotification('權限不足', '訪客模式無法刪除特約商店資料喔！');
      return;
    }
    try { await deleteDoc(doc(db, 'Schools', schoolId || 'nhsh', 'DiscountStores', id)); triggerNotification('刪除成功', `${name} 已移除`); }
    catch (e) { triggerNotification('刪除失敗', '請稍後再試'); }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin') { setIsAdmin(true); setAdminPassword(''); }
    else { triggerNotification('登入失敗', '密碼錯誤'); }
  };

  // --- 段考排程管理 ---
  const [isAddingExam, setIsAddingExam] = useState(false);
  const [newExam, setNewExam] = useState({ title: '', startDate: '', endDate: '' });

  const handleAddExam = async () => {
    if (!newExam.title || !newExam.startDate || !newExam.endDate) {
      triggerNotification('資料不全', '請輸入名稱與起訖日期');
      return;
    }
    if (!classID || !schoolId || !gradeId) return;

    try {
      await addDoc(collection(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'ExamPeriods'), {
        ...newExam,
        createdAt: Date.now()
      });
      setIsAddingExam(false);
      setNewExam({ title: '', startDate: '', endDate: '' });
      triggerNotification('新增成功', `已加入：${newExam.title}`);
    } catch (e) {
      triggerNotification('儲存失敗', '請確認權限或網路');
    }
  };

  const handleRemoveExam = async (id, title) => {
    if (!window.confirm(`確定要刪除「${title}」段考期間嗎？`)) return;
    try {
      await deleteDoc(doc(db, 'Schools', schoolId, 'Grades', gradeId, 'Classes', classID, 'ExamPeriods', id));
      triggerNotification('已刪除', `已移除：${title}`);
    } catch (e) {
      triggerNotification('刪除失敗', '請確認權限');
    }
  };

  return (
    <div className="space-y-4 flex flex-col w-full text-left animate-slide-up-fade mb-8 pb-10">
      {/* 標題區域 */}
      <div className="flex justify-between items-center px-2 mb-2">
        <h2 className="text-3xl font-black text-[var(--text-primary)] flex items-center gap-3 tracking-tight">
          <Settings size={28} className="text-emerald-500 shrink-0" /> 系統設定
        </h2>
        {isAdmin && (
          <button onClick={() => setIsAdmin(false)} className="px-4 py-2.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-[16px] text-sm font-black active:scale-95 transition-all hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm">
            登出後台
          </button>
        )}
      </div>

      {/* 🚀 液態玻璃滑動選單 (Liquid Glass Sliding Pill) */}
      <div className="px-1 mb-6">
        <div
          ref={scrollRef}
          onMouseDown={onMouseDown} onMouseLeave={() => setIsDragging(false)} onMouseUp={() => setIsDragging(false)} onMouseMove={onMouseMove}
          className={`relative p-1.5 bg-slate-200/50 dark:bg-zinc-800/50 backdrop-blur-2xl rounded-[28px] flex w-full shadow-inner overflow-x-auto scrollbar-hide border border-white/40 dark:border-white/5 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        >
          {/* 魔法滑動背景膠囊 */}
          <div
            className="absolute top-1.5 bottom-1.5 bg-white dark:bg-zinc-700 rounded-[22px] shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] transition-all duration-[500ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{
              width: `calc((100% - 12px) / ${SETTINGS_TABS.length})`,
              transform: `translateX(calc(${SETTINGS_TABS.findIndex(t => t.id === activeSubTab)} * 100%))`
            }}
          />
          {SETTINGS_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`relative z-10 flex-1 min-w-[80px] sm:min-w-[100px] flex items-center justify-center gap-2 py-3.5 rounded-[22px] font-black text-[13px] sm:text-[14px] transition-colors duration-300 ${activeSubTab === tab.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
            >
              <tab.icon size={18} className={activeSubTab === tab.id ? 'animate-bounce-soft' : ''} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.substring(0, 2)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 依據選單渲染對應內容區塊 */}
      <div className="animate-tab-enter space-y-8" key={activeSubTab}>

        {/* ========================================================
            【一般與外觀】
           ======================================================== */}
        {activeSubTab === 'general' && (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1 text-[var(--text-secondary)]">
                <Palette size={16} className="text-emerald-500 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">外觀主題</h3>
              </div>
              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(opt => (
                    <button key={opt.value} onClick={() => handleThemeChange(opt.value)}
                      className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 ${theme === opt.value ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm' : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10'}`}>
                      <opt.icon size={28} className={`shrink-0 ${theme === opt.value ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className={`text-[12px] font-black ${theme === opt.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <LayoutTemplate size={16} className="text-indigo-600 neon-glow-indigo" />
                <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">首頁排版設定</h3>
              </div>
              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-3 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)]">
                <div className="space-y-2 p-1">
                  {dashboardLayout?.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragEnter={(e) => handleDragEnter(e, idx)}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      className={`flex justify-between items-center bg-white/60 dark:bg-white/5 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm transition-all duration-300 ${draggedIdx === idx ? 'opacity-40 scale-[0.98] border-dashed border-emerald-500 bg-emerald-50/50 dark:bg-emerald-900/20' : ''} ${!item.visible ? 'opacity-50 grayscale' : ''}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="cursor-grab active:cursor-grabbing p-1.5 text-slate-400 hover:text-emerald-500 transition-colors hidden sm:block touch-none">
                          <GripVertical size={18} />
                        </div>
                        <button onClick={() => {
                          const newLayout = [...dashboardLayout];
                          newLayout[idx].visible = !newLayout[idx].visible;
                          setDashboardLayout(newLayout);
                        }} className={`p-2.5 rounded-xl transition-all ${item.visible ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 shadow-sm' : 'bg-slate-100 text-slate-400 dark:bg-white/10'}`}>
                          {item.visible ? <Eye size={18} /> : <EyeOff size={18} />}
                        </button>
                        <span className="font-black text-slate-800 dark:text-white text-[15px]">{item.label}</span>
                      </div>
                      <div className="flex gap-1.5 bg-slate-100/50 dark:bg-white/5 p-1.5 rounded-xl">
                        <button onClick={() => {
                          if (idx === 0) return;
                          const newLayout = [...dashboardLayout];
                          [newLayout[idx - 1], newLayout[idx]] = [newLayout[idx], newLayout[idx - 1]];
                          setDashboardLayout(newLayout);
                        }} disabled={idx === 0} className="p-2.5 text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md">
                          <ArrowUp size={16} />
                        </button>
                        <button onClick={() => {
                          if (idx === dashboardLayout.length - 1) return;
                          const newLayout = [...dashboardLayout];
                          [newLayout[idx + 1], newLayout[idx]] = [newLayout[idx], newLayout[idx + 1]];
                          setDashboardLayout(newLayout);
                        }} disabled={idx === dashboardLayout.length - 1} className="p-2.5 text-slate-500 hover:text-emerald-600 disabled:opacity-30 transition-all bg-white dark:bg-slate-800 rounded-lg shadow-sm hover:shadow-md">
                          <ArrowDown size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-emerald-600 neon-glow-emerald" />
                  <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">自定義倒數設置</h3>
                </div>
                <button
                  onClick={() => setIsAddingCountdown(!isAddingCountdown)}
                  className={`p-2 rounded-xl transition-all active:scale-95 ${isAddingCountdown ? 'bg-red-50 text-red-500 rotate-45' : 'bg-emerald-50 text-emerald-600'}`}
                >
                  <Plus size={20} />
                </button>
              </div>

              {isAddingCountdown && (
                <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 border border-emerald-300/50 dark:border-emerald-500/30 rounded-[32px] p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(16,185,129,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(16,185,129,0.2)] animate-slide-up-fade">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">事件名稱</label>
                      <input
                        placeholder="例如：畢業典禮"
                        className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none focus:ring-2 focus:ring-emerald-500 text-[var(--text-primary)] transition-all shadow-sm"
                        value={newCountdown.title}
                        onChange={e => setNewCountdown({ ...newCountdown, title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">選擇圖標</label>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                        {['📅', '🎯', '🎓', '🏆', '🔥', '🎨', '🧪', '💻', '📚', '📝', '🏃', '✈️', '🎮', '💡', '🌟'].map(emoji => (
                          <button
                            key={emoji}
                            onClick={() => setNewCountdown({ ...newCountdown, icon: emoji })}
                            className={`shrink-0 w-[52px] h-[52px] rounded-[18px] text-[22px] flex items-center justify-center transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-90 ${(newCountdown.icon || '📅') === emoji
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/30 shadow-sm ring-2 ring-emerald-400 scale-105'
                              : 'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/10 shadow-sm'
                              }`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">日期</label>
                        <input
                          type="date"
                          className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none text-[var(--text-primary)] shadow-sm focus:border-emerald-400 transition-colors"
                          value={newCountdown.date}
                          onChange={e => setNewCountdown({ ...newCountdown, date: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1 block">風格</label>
                        <select
                          className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none text-[var(--text-primary)] shadow-sm focus:border-emerald-400 transition-colors appearance-none"
                          value={newCountdown.style}
                          onChange={e => setNewCountdown({ ...newCountdown, style: e.target.value })}
                        >
                          <option value="gradient">主題漸層</option>
                          <option value="simple">極簡風格</option>
                          <option value="neon">電競霓虹</option>
                          <option value="sakura">櫻花粉</option>
                          <option value="cyber">電競紫</option>
                        </select>
                      </div>
                    </div>
                    <button
                      onClick={handleAddCountdown}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                    >
                      確認新增
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-2 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)]">
                {!customCountdowns || customCountdowns.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-sm">
                    目前沒有自定義倒數項目 ✨
                  </div>
                ) : (
                  <div className="space-y-2 p-2">
                    {customCountdowns.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                        <div className="flex items-center gap-3">
                          <div className="text-xl bg-slate-50 dark:bg-white/5 w-10 h-10 flex items-center justify-center rounded-xl">{item.icon || '📅'}</div>
                          <div>
                            <div className="font-black text-slate-800 dark:text-white text-sm">{item.title}</div>
                            <div className="text-[11px] font-bold text-slate-400 mt-0.5">{item.date} · {item.style}</div>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveCountdown(item.id, item.title)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <BookOpen size={16} className="text-blue-600 neon-glow-blue" />
                  <h3 className="text-sm font-black text-[var(--text-secondary)] dark:text-gray-400 uppercase tracking-wider">全域科目管理</h3>
                </div>
                <button onClick={() => setIsAddingSubject(!isAddingSubject)} className={`p-2 rounded-xl transition-all active:scale-95 ${isAddingSubject ? 'bg-red-50 text-red-500 rotate-45' : 'bg-blue-50 text-blue-600'}`}>
                  <Plus size={20} />
                </button>
              </div>

              {isAddingSubject && (
                <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-[32px] border border-blue-300/50 dark:border-blue-500/30 animate-slide-up-fade">
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">科目名稱</label>
                      <input placeholder="例如：物理" className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none focus:ring-2 focus:ring-blue-500 text-[var(--text-primary)]" value={newSubject.name} onChange={e => setNewSubject({ ...newSubject, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">選擇圖標</label>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide py-1">
                        {Object.keys(SUBJECT_ICONS).map(iconKey => {
                          const IconComp = SUBJECT_ICONS[iconKey];
                          return (
                            <button key={iconKey} onClick={() => setNewSubject({ ...newSubject, icon: iconKey })} className={`shrink-0 p-3 rounded-2xl transition-all ${newSubject.icon === iconKey ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/30 shadow-sm ring-2 ring-blue-400 scale-105' : 'bg-white dark:bg-white/5 text-slate-500'}`}>
                              <IconComp size={24} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">選擇顏色</label>
                      <div className="flex gap-3 overflow-x-auto scrollbar-hide py-1">
                        {COLOR_CLASSES.map(c => (
                          <button key={c.key} onClick={() => setNewSubject({ ...newSubject, color: c.key })} className={`shrink-0 w-8 h-8 rounded-full ${c.hex} transition-transform ${newSubject.color === c.key ? 'ring-4 ring-offset-2 ring-blue-400 dark:ring-slate-700 scale-110' : 'opacity-70 hover:opacity-100'}`} />
                        ))}
                      </div>
                    </div>
                    <button onClick={handleAddSubject} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all">確認新增科目</button>
                  </div>
                </div>
              )}

              <div className="bg-white/50 dark:bg-zinc-900/40 p-4 rounded-[32px] border border-white/60 dark:border-white/10 flex flex-wrap gap-2">
                {subjects.map(sub => {
                  const IconComp = SUBJECT_ICONS[sub.icon] || BookOpen;
                  const colorConfig = COLOR_CLASSES.find(c => c.key === sub.color) || COLOR_CLASSES[0];
                  return (
                    <div key={sub.name} className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 shadow-sm group">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white ${colorConfig.hex}`}><IconComp size={12} /></div>
                      <span className="text-sm font-black text-slate-700 dark:text-slate-200">{sub.name}</span>
                      <button onClick={() => handleRemoveSubject(sub.name)} className="ml-1 p-1 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"><Trash2 size={14} /></button>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {/* ========================================================
            【學習與課表】
           ======================================================== */}
        {activeSubTab === 'academic' && (
          <>
            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <MapPin size={16} className="text-emerald-600 neon-glow-emerald" />
                <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">校園導覽設定</h3>
              </div>
              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] transition-all duration-500">
                {!editingCampus ? (
                  <div className="bg-emerald-50/80 dark:bg-emerald-500/10 rounded-[24px] border border-emerald-100 dark:border-emerald-500/20 p-4 flex items-center gap-4">
                    <div className="w-12 h-12 shrink-0 bg-white dark:bg-slate-800 rounded-[18px] shadow-sm flex items-center justify-center">
                      <MapPin size={24} className="text-emerald-500 shrink-0" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-slate-900 dark:text-white">{campusName}</div>
                      <div className="text-[12px] font-bold text-slate-500 dark:text-slate-400 truncate">{campusAddress}</div>
                    </div>
                    <button onClick={() => { setTempName(campusName); setTempAddr(campusAddress); setEditingCampus(true); }}
                      className="p-2.5 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-100 dark:border-white/5 hover:bg-slate-50 transition-colors text-slate-500">
                      <Edit3 size={16} className="shrink-0" />
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Google Maps 預覽小工具 */}
                    <div className="w-full h-32 rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-500/30 mb-2 relative shadow-inner">
                      <div className="absolute inset-0 bg-slate-100 dark:bg-slate-800 flex items-center justify-center -z-10 text-slate-400 text-xs font-bold">載入地圖中...</div>
                      <iframe
                        src={`https://maps.google.com/maps?q=${tempLat},${tempLng}&z=16&output=embed`}
                        width="100%" height="100%" frameBorder="0" style={{ border: 0 }} allowFullScreen="" aria-hidden="false" tabIndex="0" title="Google Maps Preview"
                      />
                    </div>
                    <input className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 outline-none text-[15px] font-bold focus:border-emerald-400 text-[var(--text-primary)]" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="學校名稱" />
                    <input className="w-full p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 outline-none text-[15px] font-bold focus:border-emerald-400 text-[var(--text-primary)]" value={tempAddr} onChange={e => setTempAddr(e.target.value)} placeholder="學校地址" />
                    <div className="flex gap-2">
                      <input className="flex-1 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 outline-none text-[13px] font-bold focus:border-emerald-400 text-[var(--text-primary)]" value={tempLat} onChange={e => setTempLat(e.target.value)} placeholder="緯度 (Latitude)" />
                      <input className="flex-1 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 outline-none text-[13px] font-bold focus:border-emerald-400 text-[var(--text-primary)]" value={tempLng} onChange={e => setTempLng(e.target.value)} placeholder="經度 (Longitude)" />
                      <button onClick={handleGetLocation} className="p-4 bg-emerald-50 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black active:scale-95 transition-all border border-emerald-200/50 hover:bg-emerald-100 dark:hover:bg-emerald-500/40" title="獲取目前位置"><MapPin size={18} /></button>
                    </div>
                    <div className="flex gap-3 mt-2">
                      <button onClick={() => setEditingCampus(false)} className="flex-1 py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 rounded-[20px] font-black text-sm active:scale-95 transition-all">取消</button>
                      <button onClick={handleSaveCampus} className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[20px] font-black text-sm active:scale-95 shadow-md transition-all">儲存變更</button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <GraduationCap size={16} className="text-emerald-600 neon-glow-emerald" />
                <h3 className="text-sm font-black text-[var(--text-secondary)] dark:text-gray-400 uppercase tracking-wider">班級與課表管理</h3>
              </div>
              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] space-y-5 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase ml-1">選擇學校</label>
                    <div className="relative">
                      <select value={schoolId || ''} onChange={e => setSchoolId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10 px-4 py-3.5 rounded-[16px] text-[14px] font-black focus:border-emerald-400 outline-none transition-all text-slate-900 dark:text-white appearance-none">
                        <option value="" disabled>請選擇學校...</option>
                        <option value="nhsh">內湖高中 (NHSH)</option>
                        <option value="cksh">建國中學 (CKSH)</option>
                        <option value="tfgh">北一女中 (TFGH)</option>
                        <option value="taiwan">全台高中通用 (Taiwan)</option>
                        <option value="other">其他學校</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase ml-1">選擇年級</label>
                    <div className="relative">
                      <select value={gradeId || ''} onChange={e => setGradeId(e.target.value)} className="w-full bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10 px-4 py-3.5 rounded-[16px] text-[14px] font-black focus:border-emerald-400 outline-none transition-all text-slate-900 dark:text-white appearance-none">
                        <option value="" disabled>請選擇年級...</option>
                        <option value="grade_1">高一</option>
                        <option value="grade_2">高二</option>
                        <option value="grade_3">高三</option>
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase ml-1">班級代碼 (輸入以同步雲端，留空為本機自訂)</label>
                  <input
                    type="text"
                    placeholder="例如：302 (留空則為本機自訂課表)"
                    value={classID}
                    onChange={e => setClassID(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10 px-5 py-4 rounded-[20px] text-[16px] font-black focus:border-emerald-400 outline-none transition-all text-slate-900 dark:text-white"
                  />
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={async () => {
                      if (user) {
                        try {
                          await updateDoc(doc(db, 'Users', user.uid), {
                            schoolId: schoolId || '',
                            gradeId: gradeId || '',
                            classId: classID || ''
                          });
                          triggerNotification('儲存成功', '學籍與班級設定已同步至雲端！');
                        } catch (err) {
                          console.error('Update profile error:', err);
                          triggerNotification('儲存失敗', '無法同步設定，請檢查網路連線。');
                        }
                      } else {
                        triggerNotification('已儲存', '學籍設定已儲存在本機！');
                      }
                    }}
                    className="w-full bg-blue-600 text-white font-black py-4 rounded-[20px] shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all hover:bg-blue-500 flex items-center justify-center gap-2"
                  >
                    <Cloud size={18} className="shrink-0" /> 確認並同步學籍設定
                  </button>
                  <button
                    onClick={() => {
                      setIsEditingSchedule(true);
                      navTo('dashboard');
                    }}
                    className="w-full bg-emerald-600 text-white font-black py-4 rounded-[20px] shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all hover:bg-emerald-500 flex items-center justify-center gap-2"
                  >
                    <Edit3 size={18} className="shrink-0" /> {classID ? '管理 / 編輯班級課表' : '建立 / 編輯自訂課表'}
                  </button>
                  {schoolId === 'taiwan' && !classID && (
                    <button
                      onClick={() => handleImportTemplate('taiwan')}
                      className="w-full bg-indigo-500 text-white font-black py-4 rounded-[20px] shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all hover:bg-indigo-400 flex items-center justify-center gap-2"
                    >
                      <Sparkles size={18} className="shrink-0" /> 導入全台通用課表範本
                    </button>
                  )}
                </div>
                <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-[11px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed">
                  💡 依序選擇學校、年級並輸入班級代碼後，系統會自動同步該班級的雲端課表。
                </div>
              </div>
            </section>

            {classID && (
              <section className="space-y-4">
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Calendar size={16} className="text-rose-500 neon-glow-rose" />
                    <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">段考期間管理</h3>
                  </div>
                  <button
                    onClick={() => setIsAddingExam(!isAddingExam)}
                    className={`p-2 rounded-xl transition-all active:scale-95 ${isAddingExam ? 'bg-red-50 text-red-500 rotate-45' : 'bg-rose-50 text-rose-600'}`}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                {isAddingExam && (
                  <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl p-6 rounded-[32px] border border-rose-300/50 dark:border-rose-500/30 animate-slide-up-fade">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">考試名稱</label>
                        <input
                          placeholder="例如：第一次段考"
                          className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none focus:ring-2 focus:ring-rose-500 text-[var(--text-primary)] transition-all shadow-sm"
                          value={newExam.title}
                          onChange={e => setNewExam({ ...newExam, title: e.target.value })}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">開始日期</label>
                          <input
                            type="date"
                            className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none text-[var(--text-primary)] shadow-sm focus:border-rose-400 transition-colors"
                            value={newExam.startDate}
                            onChange={e => setNewExam({ ...newExam, startDate: e.target.value })}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-black text-gray-400 uppercase ml-1 mb-1 block">結束日期</label>
                          <input
                            type="date"
                            className="w-full p-4 rounded-[20px] border border-[var(--border-color)] text-sm font-bold bg-white dark:bg-black/20 outline-none text-[var(--text-primary)] shadow-sm focus:border-rose-400 transition-colors"
                            value={newExam.endDate}
                            onChange={e => setNewExam({ ...newExam, endDate: e.target.value })}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleAddExam}
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
                      >
                        確認新增段考期間
                      </button>
                      <p className="text-[11px] text-slate-400 font-bold text-center">💡 設定期間內，系統將自動暫停所有非必要的雲端推播通知。</p>
                    </div>
                  </div>
                )}

                <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-2 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)]">
                  {(!examPeriods || examPeriods.length === 0) ? (
                    <div className="p-8 text-center text-slate-400 font-bold text-sm">
                      目前沒有設定段考排程 ✍️
                    </div>
                  ) : (
                    <div className="space-y-2 p-2">
                      {examPeriods.map(item => (
                        <div key={item.id} className="flex justify-between items-center bg-white/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 rounded-xl flex items-center justify-center text-rose-500">
                              <Calendar size={20} />
                            </div>
                            <div>
                              <div className="font-black text-slate-800 dark:text-white text-sm">{item.title}</div>
                              <div className="text-[11px] font-bold text-slate-400 mt-0.5">{item.startDate} ~ {item.endDate}</div>
                            </div>
                          </div>
                          {(isAdmin || (user && user.email?.endsWith('.edu.tw'))) && (
                            <button onClick={() => handleRemoveExam(item.id, item.title)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        )}

        {/* ========================================================
            【系統服務】
           ======================================================== */}
        {activeSubTab === 'system' && (
          <>
            <section className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <Link size={16} className="text-emerald-600 neon-glow-emerald" />
                  <h3 className="text-sm font-black text-[var(--text-secondary)] uppercase tracking-wider">自定義快捷連結</h3>
                </div>
                <button
                  onClick={() => setIsAddingLink(!isAddingLink)}
                  className={`p-2 transition-all active:scale-90 rounded-xl ${isAddingLink ? 'bg-red-50 text-red-500 rotate-45 shrink-0' : 'bg-emerald-50 text-emerald-600 shrink-0'}`}
                >
                  <Plus size={20} className="shrink-0" />
                </button>
              </div>

              {isAddingLink && (
                <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-emerald-300/50 dark:border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(16,185,129,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(16,185,129,0.2)] animate-apple-linear overflow-hidden">
                  <h4 className="text-[14px] font-black text-[var(--text-primary)] mb-4 flex items-center gap-2">
                    <Plus size={16} className="shrink-0 text-emerald-500" /> 新增快捷連結
                  </h4>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">連結名稱</label>
                      <input
                        type="text"
                        value={newLinkTitle}
                        onChange={e => setNewLinkTitle(e.target.value)}
                        placeholder="例如：我的 Github"
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3.5 rounded-2xl text-[14px] font-bold focus:border-emerald-400 outline-none transition-all text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">網址 (URL)</label>
                      <input
                        type="text"
                        value={newLinkUrl}
                        onChange={e => setNewLinkUrl(e.target.value)}
                        placeholder="https://example.com"
                        className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 px-5 py-3.5 rounded-2xl text-[14px] font-bold focus:border-emerald-400 outline-none transition-all text-[var(--text-primary)]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-2">卡片主題色</label>
                      <div className="flex gap-3 px-2 py-1">
                        {Object.entries(LINK_THEMES).map(([key, bgClass]) => (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setNewLinkColor(key)}
                            className={`w-6 h-6 rounded-full ${bgClass} transition-transform active:scale-90 ${newLinkColor === key ? 'ring-4 ring-offset-2 ring-emerald-400 dark:ring-slate-700 scale-110 shadow-md' : 'opacity-70 hover:opacity-100'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleAddCustomLink}
                      className="w-full bg-emerald-600 text-white font-black py-4 rounded-[20px] shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all hover:bg-emerald-500"
                    >
                      儲存設置
                    </button>
                  </div>
                </div>
              )}

              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-2 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)]">
                {customLinks.length === 0 && !isAddingLink ? (
                  <div className="p-8 text-center flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 dark:text-gray-700 shrink-0">
                      <Link size={24} className="shrink-0" />
                    </div>
                    <p className="text-sm font-black text-slate-400">目前尚無自定義連結<br /><span className="text-[10px]">點擊右上角新增</span></p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {customLinks.map((link) => (
                      <div key={link.id} className="p-2 border-b border-slate-50 dark:border-white/5 last:border-none">
                        {editingLink?.id === link.id ? (
                          <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-3 animate-fadeIn">
                            <input
                              className="w-full bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-500/20 text-[var(--text-primary)]"
                              value={editingLink.title}
                              onChange={e => setEditingLink({ ...editingLink, title: e.target.value })}
                            />
                            <input
                              className="w-full bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-500/20 text-[var(--text-primary)]"
                              value={editingLink.url}
                              onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                            />
                            <div className="flex gap-2 px-1 py-1">
                              {Object.entries(LINK_THEMES).map(([key, bgClass]) => (
                                <button
                                  key={key}
                                  type="button"
                                  onClick={() => setEditingLink({ ...editingLink, themeColor: key })}
                                  className={`w-5 h-5 rounded-full ${bgClass} transition-transform active:scale-90 ${editingLink.themeColor === key ? 'ring-2 ring-offset-2 ring-emerald-400 dark:ring-slate-600 scale-110 shadow-sm' : 'opacity-50 hover:opacity-100'}`}
                                />
                              ))}
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleSaveEdit} className="flex-1 bg-emerald-600 text-white py-2.5 rounded-xl text-xs font-black">儲存</button>
                              <button onClick={() => setEditingLink(null)} className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2.5 rounded-xl text-xs font-black">取消</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between p-2 pl-3 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors rounded-2xl group text-slate-900 dark:text-white">
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Globe size={20} className="shrink-0" />
                              </div>
                              <div className="min-w-0">
                                <div className="text-[14px] font-black truncate">{link.title}</div>
                                <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 truncate">{link.url}</div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <button
                                onClick={() => setEditingLink(link)}
                                className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-xl transition-all"
                              >
                                <Edit3 size={18} />
                              </button>
                              <button
                                onClick={() => handleRemoveLink(link.id, link.title)}
                                className="p-2.5 text-slate-300 dark:text-slate-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Cloud size={16} className="text-blue-600" />
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">系統服務串接</h3>
              </div>
              <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] space-y-5">
                {/* 1. 全域推播開關 */}
                <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-2xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 shrink-0"><BellRing size={20} className="shrink-0" /></div>
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">系統總體通知</div>
                      <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">所有推播服務的總開關</div>
                    </div>
                  </div>
                  <Switch
                    enabled={notifPermission === 'granted'}
                    onChange={(val) => val ? requestPushPermission() : triggerNotification('資訊', '請至瀏覽器設定關閉權限')}
                    colorClass="bg-orange-500"
                  />
                </div>

                {/* 2. 作業提醒開關 */}
                <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-2xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0"><BookText size={20} className="shrink-0 text-emerald-500" /></div>
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">每日作業提醒</div>
                      <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">每天 18:00 彙整待辦清單</div>
                    </div>
                  </div>
                  <Switch
                    enabled={localStorage.getItem('notif_homework') === 'true'}
                    onChange={async (val) => {
                      if (!classID) return triggerNotification('請先設定班級', '作業通知需要班級代碼才能同步');
                      localStorage.setItem('notif_homework', String(val));
                      try {
                        await toggleTopicSubscription(`class_${classID}_homework`, val);
                        triggerNotification(val ? '已訂閱作業提醒' : '已取消作業提醒', val ? '每天晚上將準時送到' : '已關閉雲端排程');
                      } catch (e) { triggerNotification('同步失敗', '請確認網路連線'); }
                    }}
                    colorClass="bg-emerald-500"
                  />
                </div>

                {/* 3. 每日考試與測驗提醒 */}
                <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-2xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-500 shrink-0"><TrendingUp size={20} className="shrink-0" /></div>
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">今日考試提醒</div>
                      <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">早上 07:30 提醒今日測驗項目</div>
                    </div>
                  </div>
                  <Switch
                    enabled={localStorage.getItem('notif_exam') === 'true'}
                    onChange={async (val) => {
                      if (!classID) return triggerNotification('請先設定班級', '考試提醒需要班級代碼才能同步');
                      localStorage.setItem('notif_exam', String(val));
                      try {
                        await toggleTopicSubscription(`class_${classID}_exam`, val);
                        triggerNotification(val ? '已訂閱考試提醒' : '已取消考試提醒', val ? '祝你今天考試順利！' : '已停用雲端推播');
                      } catch (e) { triggerNotification('同步失敗', '請確認網路連線'); }
                    }}
                    colorClass="bg-indigo-500"
                  />
                </div>

                {/* 4. 課表更新提醒 */}
                <div className="flex justify-between items-center group/item hover:bg-slate-50 dark:hover:bg-white/5 p-2 rounded-2xl transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-50 dark:bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500 shrink-0"><RefreshCw size={20} className="shrink-0" /></div>
                    <div>
                      <div className="text-sm font-black text-[var(--text-primary)]">課表更動通知</div>
                      <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">當同學修改班專、調課時即時通知</div>
                    </div>
                  </div>
                  <Switch
                    enabled={localStorage.getItem('notif_schedule') === 'true'}
                    onChange={async (val) => {
                      if (!classID) return triggerNotification('請先設定班級', '課表通知需要班級代碼');
                      localStorage.setItem('notif_schedule', String(val));
                      try {
                        await toggleTopicSubscription(`class_${classID}_alerts`, val);
                        triggerNotification(val ? '已訂閱課表更新' : '已取消課表更新', val ? '將能獲得最即時的課程變動' : '已取消雲端監聽');
                      } catch (e) { triggerNotification('同步失敗', '雲端連線異常'); }
                    }}
                    colorClass="bg-amber-500"
                  />
                </div>

                {/* 其他系統服務 */}
                <div className="pt-2 border-t border-slate-50 dark:border-white/5 space-y-4">
                  <div className="flex justify-between items-center py-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-50 dark:bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 shrink-0"><Moon size={20} className="shrink-0" /></div>
                      <div>
                        <div className="text-sm font-black text-[var(--text-primary)]">考試不打擾模式</div>
                        <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">暫停上課與調課等即時通知</div>
                      </div>
                    </div>
                    <Switch
                      enabled={dndEnabled}
                      onChange={handleToggleDnd}
                      colorClass="bg-purple-500"
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button onClick={testPushNotification} className="flex-1 bg-slate-50 dark:bg-white/5 text-slate-600 dark:text-slate-300 px-4 py-3 rounded-2xl text-[12px] font-black flex justify-center items-center gap-2 active:scale-95 border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors">
                    <Sparkles size={14} className="shrink-0" /> 測試推播
                  </button>
                  <button onClick={requestPushPermission} className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl text-[12px] font-black flex justify-center items-center gap-2 active:scale-95 border border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 transition-colors">
                    <Bell size={14} className="shrink-0" /> 通知連線
                  </button>
                </div>
              </div>

              <div className="group bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-0.5">
                <h4 className="text-[14px] font-black text-[var(--text-primary)] mb-4 flex items-center gap-2"><Cloud className="text-blue-500" size={16} /> Google 服務</h4>
                <div className="flex justify-between items-center bg-slate-50/50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200/50 dark:border-white/5 shadow-sm group-hover:border-blue-200 dark:group-hover:border-blue-500/30 transition-colors duration-[600ms]">
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">Google 帳號備份</div>
                    <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400 mt-1 flex items-center gap-1.5">
                      {isGoogleConnected ? <><CheckCircle2 size={12} className="text-emerald-500" /> 已啟用雲端同步</> : '備份筆記至 Drive'}
                    </div>
                  </div>
                  {isGoogleConnected ? (
                    <button onClick={handleSignoutClick} className="px-5 py-2.5 rounded-[16px] text-xs font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 active:scale-[0.95] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-red-100 dark:hover:bg-red-900/40 shadow-sm relative z-10 cursor-pointer">取消連結</button>
                  ) : (
                    <button onClick={handleAuthClick} className="px-5 py-2.5 rounded-[16px] text-xs font-black bg-blue-600 hover:bg-blue-500 text-white active:scale-[0.95] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] shadow-lg shadow-blue-500/25 flex items-center gap-2 relative z-10 cursor-pointer">
                      <Globe size={14} /> 登入備份
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center gap-2 px-1">
                <Smartphone size={16} className="text-blue-600 shrink-0" />
                <h3 className="text-sm font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider">iOS 安裝教學</h3>
              </div>
              <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-blue-100 dark:border-white/10 shadow-soft glass-effect space-y-4">
                <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/10 transition-transform active:scale-[0.98]">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <Share size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">第一步：點擊下方分享按鈕</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">在 Safari 瀏覽器打開本站後點擊底部工具列</div>
                  </div>
                </div>
                <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/10 transition-transform active:scale-[0.98]">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <PlusSquare size={20} className="text-blue-500" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-[var(--text-primary)]">第二步：選擇「加入主畫面」</div>
                    <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">這將讓 App 獲得全螢幕與穩定通知</div>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {/* ========================================================
            【進階與管理】
           ======================================================== */}
        {
          activeSubTab === 'advanced' && (
            <>
              <section className="space-y-4">
                <div className="flex items-center gap-2 px-1">
                  <Lock size={16} className="text-gray-600" />
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">管理 / 學生會專區</h3>
                </div>
                {!isAdmin ? (
                  <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-8 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] flex flex-col items-center mx-auto w-full">
                    <div className="bg-emerald-100 dark:bg-emerald-500/10 p-4 rounded-[24px] mb-4 text-emerald-600 dark:text-emerald-400"><Store size={32} /></div>
                    <h4 className="text-[17px] font-black text-[var(--text-primary)] mb-1">特約商店管理</h4>
                    <p className="text-[12px] font-bold text-slate-500 dark:text-gray-400 mb-6 text-center">進入後台以管理商店資料</p>
                    <div className="w-full flex flex-col gap-3">
                      <input type="password" placeholder="管理員密碼" value={adminPassword}
                        onChange={e => setAdminPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                        className="w-full p-4 rounded-[20px] border border-slate-200 dark:border-white/10 outline-none text-sm font-bold text-center focus:border-emerald-400 bg-slate-50 dark:bg-white/5 text-[var(--text-primary)] transition-all" />
                      <button onClick={handleAdminLogin} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-[20px] active:scale-[0.98] transition-all shadow-md">解鎖後台</button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-emerald-400/50 dark:border-emerald-500/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_12px_32px_rgba(16,185,129,0.15)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_12px_32px_rgba(16,185,129,0.25)]">
                    <h4 className="text-[15px] font-black text-[var(--text-primary)] mb-5 flex items-center gap-2"><Store size={18} className="text-emerald-500" /> 特約商店管理（已授權）</h4>
                    <div className="bg-emerald-50/80 dark:bg-emerald-950/20 p-5 rounded-[24px] border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-4 mb-6">
                      <h5 className="text-sm font-black text-emerald-800 dark:text-emerald-400 flex justify-between items-center">
                        {editingStore ? '編輯商店' : '新增商店'}
                        {editingStore && <button onClick={() => { setEditingStore(null); setNewStore({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '', operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: '' }); }} className="text-[11px] text-gray-500 bg-white dark:bg-white/10 px-2.5 py-1 rounded-lg border dark:border-white/5 shadow-sm active:scale-95 transition-all">取消編輯</button>}
                      </h5>
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="商店名稱 *" className="p-3.5 rounded-[16px] border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 text-sm font-bold col-span-2 outline-none focus:border-emerald-400 text-[var(--text-primary)]" value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} />
                        <input placeholder="優惠內容 *" className="p-3.5 rounded-[16px] border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 text-sm font-bold col-span-2 outline-none focus:border-emerald-400 text-[var(--text-primary)]" value={newStore.discount} onChange={e => setNewStore({ ...newStore, discount: e.target.value })} />
                        <div className="flex gap-2 col-span-2">
                          <input placeholder="Icon" className="p-3.5 rounded-[16px] border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 text-sm font-bold w-[30%] text-center outline-none focus:border-emerald-400 text-[var(--text-primary)]" value={newStore.icon} onChange={e => setNewStore({ ...newStore, icon: e.target.value })} />
                          <select className="p-3.5 rounded-[16px] border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 text-sm font-bold flex-1 outline-none text-[var(--text-primary)] appearance-none" value={newStore.type} onChange={e => setNewStore({ ...newStore, type: e.target.value })}>
                            {['餐飲', '飲料', '咖啡', '文具', '其他'].map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <input placeholder="地址（選填）" className="p-3.5 rounded-[16px] border border-emerald-200 dark:border-emerald-500/30 bg-white dark:bg-black/20 text-sm font-bold col-span-2 outline-none focus:border-emerald-400 text-[var(--text-primary)]" value={newStore.address} onChange={e => setNewStore({ ...newStore, address: e.target.value })} />
                      </div>
                      <button onClick={handleAddOrUpdateStore} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-[16px] active:scale-[0.98] mt-1 shadow-md transition-all">
                        {editingStore ? '儲存變更' : '新增商店'}
                      </button>
                    </div>
                    <div className="space-y-3 pt-2">
                      <h5 className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-1">現有商店：{stores.length} 間</h5>
                      {stores.map(store => (
                        <div key={store.id} className="flex justify-between items-center bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/10 shrink-0 shadow-sm">
                              {React.createElement(getStoreCategoryIcon(store.type), { size: 24, className: "text-emerald-500 shrink-0" })}
                            </div>
                            <div>
                              <div className="font-black text-[var(--text-primary)] text-[15px] leading-tight mb-1">{store.name}</div>
                              <div className="text-[11px] font-bold text-slate-400 dark:text-gray-400">{store.discount}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setEditingStore(store.id); setNewStore({ name: store.name || '', discount: store.discount || '', type: store.type || '餐飲', icon: store.icon || '🏪', distance: store.distance || '特約商店', address: store.address || '', operatingHours: store.operatingHours || '', deliveryStatus: store.deliveryStatus || '僅限自取', estimatedTime: store.estimatedTime || '', deliveryUrl: store.deliveryUrl || '' }); }} className="p-2 bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 text-blue-600 rounded-xl transition-all active:scale-95"><Edit3 size={16} /></button>
                            <button onClick={() => handleDeleteStore(store.id, store.name)} className="p-2 bg-red-50 hover:bg-red-100 dark:bg-red-500/10 text-red-600 rounded-xl transition-all active:scale-95"><Trash2 size={16} /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
      </div>
    </div>
  );
};

export default SettingsTab;
