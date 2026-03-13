import React, { useState, useEffect } from 'react';
import {
  Settings, User, Monitor, Sun, Moon, Edit3,
  Bell, Sparkles, Cloud, BrainCircuit, RefreshCw, GraduationCap,
  CheckCircle2, X, Store, Trash2, Lock, MapPin, Globe, Plus, Link, Share, PlusSquare, Smartphone,
  Utensils, Coffee, CupSoda, PenTool, Clock
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const SettingsTab = ({
  isAdmin, setIsAdmin, triggerNotification, handleAuthClick,
  isGoogleConnected, handleSignoutClick, requestPushPermission,
  testPushNotification, theme, setTheme, aiTestStatus,
  testAiConnection, geminiKey, setGeminiKey,
  customLinks, setCustomLinks,
  classID, setClassID, setIsEditingSchedule, navTo,
  handleImport206Template, customCountdowns, setCustomCountdowns
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [campusName, setCampusName] = useState(() => localStorage.getItem('gsat_campus_name') || '內湖高中');
  const [campusAddress, setCampusAddress] = useState(() => localStorage.getItem('gsat_campus_address') || '台北市內湖區文德路218號');
  const [editingCampus, setEditingCampus] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempAddr, setTempAddr] = useState('');

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
  const [editingLink, setEditingLink] = useState(null); // id, title, url

  const handleAddCustomLink = () => {
    if (!newLinkTitle.trim() || !newLinkUrl.trim()) {
      triggerNotification('資料不全', '請輸入名稱與網址');
      return;
    }
    let url = newLinkUrl.trim();
    if (!url.startsWith('http')) url = 'https://' + url;
    setCustomLinks([...customLinks, { title: newLinkTitle.trim(), url, id: Date.now() }]);
    setNewLinkTitle('');
    setNewLinkUrl('');
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
    const unsub = onSnapshot(collection(db, 'stores'), snapshot => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setStores(data);
    });
    return () => unsub();
  }, [isAdmin]);

  const handleSaveCampus = () => {
    const name = tempName.trim() || '內湖高中';
    const addr = tempAddr.trim() || '台北市內湖區文德路218號';
    setCampusName(name); setCampusAddress(addr);
    localStorage.setItem('gsat_campus_name', name);
    localStorage.setItem('gsat_campus_address', addr);
    setEditingCampus(false);
    triggerNotification('已儲存', '校園資訊已更新');
  };

  const handleAddOrUpdateStore = async () => {
    if (!newStore.name || !newStore.discount) { triggerNotification('資料不完整', '請輸入商店名稱與優惠'); return; }
    try {
      if (editingStore) {
        await updateDoc(doc(db, 'stores', editingStore), { ...newStore, updatedAt: Date.now() });
        triggerNotification('更新成功', `${newStore.name} 已更新`);
        setEditingStore(null);
      } else {
        await addDoc(collection(db, 'stores'), { ...newStore, createdAt: Date.now() });
        triggerNotification('新增成功', `${newStore.name} 已加入`);
      }
      setNewStore({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '', operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: '' });
    } catch (e) { triggerNotification('儲存失敗', '請稍後再試'); }
  };

  const handleDeleteStore = async (id, name) => {
    if (!window.confirm(`確定刪除「${name}」？`)) return;
    try { await deleteDoc(doc(db, 'stores', id)); triggerNotification('刪除成功', `${name} 已移除`); }
    catch (e) { triggerNotification('刪除失敗', '請稍後再試'); }
  };

  const handleAdminLogin = () => {
    if (adminPassword === 'admin') { setIsAdmin(true); setAdminPassword(''); }
    else { triggerNotification('登入失敗', '密碼錯誤'); }
  };

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-slide-up-fade mb-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-emerald-600 flex items-center gap-3">
          <Settings size={28} className="shrink-0" /> 系統設定
        </h2>
        {isAdmin && (
          <button onClick={() => setIsAdmin(false)} className="px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-black active:scale-95 transition-all hover:bg-red-100 dark:hover:bg-red-900/40">
            登出後台
          </button>
        )}
      </div>

      {/* 外觀設定 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-[var(--text-secondary)]">
          <Sparkles size={16} className="text-emerald-500 shrink-0" />
          <h3 className="text-sm font-black uppercase tracking-wider">個人與外觀</h3>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-soft glass-effect transition-all duration-500">
          <h4 className="text-[14px] font-black text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <Monitor size={18} className="text-emerald-500 shrink-0" />
            外觀主題
          </h4>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {themeOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTheme(opt.value); localStorage.setItem('gsat_theme', opt.value); }}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 ${theme === opt.value ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-sm' : 'border-transparent bg-slate-50 dark:bg-white/5 hover:bg-slate-100'}`}>
                <opt.icon size={28} className={`shrink-0 ${theme === opt.value ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span className={`text-[12px] font-black ${theme === opt.value ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500'}`}>{opt.label}</span>
              </button>
            ))}
          </div>
          <h4 className="text-[14px] font-black text-[var(--text-primary)] mb-3 flex items-center gap-2">
            <GraduationCap size={18} className="text-emerald-500 shrink-0" />
            校園快速導覽
          </h4>
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
                className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                <Edit3 size={14} className="shrink-0" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <input className="w-full p-3 rounded-2xl border border-emerald-200 outline-none text-sm font-bold focus:border-emerald-400" value={tempName} onChange={e => setTempName(e.target.value)} placeholder="學校名稱" />
              <input className="w-full p-3 rounded-2xl border border-emerald-200 outline-none text-sm font-bold focus:border-emerald-400" value={tempAddr} onChange={e => setTempAddr(e.target.value)} placeholder="學校地址" />
              <div className="flex gap-2">
                <button onClick={handleSaveCampus} className="flex-1 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm active:scale-95">儲存</button>
                <button onClick={() => setEditingCampus(false)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm active:scale-95">取消</button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 班級與課表管理 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <GraduationCap size={16} className="text-emerald-600 neon-glow-emerald" />
          <h3 className="text-sm font-black text-[var(--text-secondary)] dark:text-gray-400 uppercase tracking-wider">班級與課表管理</h3>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-soft space-y-4 transition-all duration-500 glass-effect">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase ml-1">班級代碼 (用於同步雲端課表)</label>
            <input
              type="text"
              placeholder="例如：302"
              value={classID}
              onChange={e => setClassID(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 dark:bg-white/5 dark:border-white/10 px-5 py-3.5 rounded-2xl text-[15px] font-black focus:border-emerald-400 outline-none transition-all text-slate-900 dark:text-white"
            />
          </div>

          <button
            onClick={() => {
              if (!classID.trim()) {
                triggerNotification('提示', '請先輸入班級代碼');
                return;
              }
              setIsEditingSchedule(true);
              navTo('dashboard');
            }}
            className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-600/20 active:scale-[0.98] transition-all hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            <Edit3 size={18} className="shrink-0" /> 管理 / 編輯班級課表
          </button>

          {classID === '206' && (
            <button
              onClick={handleImport206Template}
              className="w-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 font-black py-4 rounded-2xl active:scale-[0.98] transition-all hover:bg-blue-100 dark:hover:bg-blue-900/40 flex items-center justify-center gap-2"
            >
              <RefreshCw size={18} className="shrink-0" /> 導入 206 班範例課表
            </button>
          )}

          <div className="p-4 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20 text-[11px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed">
            💡 輸入班級代碼後，系統會自動從雲端同步該班級的課表。編輯後的課表也將同步至雲端供同學查看。
          </div>
        </div>
      </section>

      {/* 自定義連結管理 */}
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
          <div className="bg-emerald-50/50 backdrop-blur-xl p-5 rounded-[28px] border border-emerald-100 animate-apple-linear overflow-hidden">
            <h4 className="text-[14px] font-black text-emerald-800 dark:text-emerald-400 mb-4 flex items-center gap-2">
              <Plus size={16} className="shrink-0" /> 新增快捷連結
            </h4>
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600/50 uppercase ml-2">連結名稱</label>
                <input
                  type="text"
                  value={newLinkTitle}
                  onChange={e => setNewLinkTitle(e.target.value)}
                  placeholder="例如：我的 Github"
                  className="w-full bg-white border border-emerald-100 px-5 py-3.5 rounded-2xl text-[14px] font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black text-emerald-600/50 uppercase ml-2">網址 (URL)</label>
                <input
                  type="text"
                  value={newLinkUrl}
                  onChange={e => setNewLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  className="w-full bg-white border border-emerald-100 px-5 py-3.5 rounded-2xl text-[14px] font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                />
              </div>
              <button
                onClick={handleAddCustomLink}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-[20px] shadow-lg shadow-emerald-200 active:scale-[0.98] transition-all hover:bg-emerald-700"
              >
                儲存設置
              </button>
            </div>
          </div>
        )}

        <div className="bg-[var(--bg-surface)] p-2 rounded-[32px] border border-[var(--border-color)] shadow-soft glass-effect">
          {customLinks.length === 0 && !isAddingLink ? (
            <div className="p-8 text-center flex flex-col items-center gap-3">
              <div className="w-12 h-12 bg-slate-50 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-300 dark:text-gray-700 shrink-0">
                <Link size={24} className="shrink-0" />
              </div>
              <p className="text-sm font-black text-slate-300">目前尚無自定義連結<br /><span className="text-[10px]">點擊右上角新增</span></p>
            </div>
          ) : (
            <div className="space-y-1">
              {customLinks.map((link) => (
                <div key={link.id} className="p-2 border-b border-slate-50 dark:border-white/5 last:border-none">
                  {editingLink?.id === link.id ? (
                    <div className="p-3 bg-slate-50 dark:bg-white/5 rounded-2xl space-y-3 animate-fadeIn">
                      <input
                        className="w-full bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-500/20 text-slate-900 dark:text-white"
                        value={editingLink.title}
                        onChange={e => setEditingLink({ ...editingLink, title: e.target.value })}
                      />
                      <input
                        className="w-full bg-white dark:bg-slate-800 px-4 py-2 rounded-xl text-sm font-bold border border-emerald-100 dark:border-emerald-500/20 text-slate-900 dark:text-white"
                        value={editingLink.url}
                        onChange={e => setEditingLink({ ...editingLink, url: e.target.value })}
                      />
                      <div className="flex gap-2">
                        <button onClick={handleSaveEdit} className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-black">儲存</button>
                        <button onClick={() => setEditingLink(null)} className="flex-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 py-2 rounded-xl text-xs font-black">取消</button>
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

      {/* 系統服務 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Cloud size={16} className="text-blue-600" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">系統服務串接</h3>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-soft space-y-5 glass-effect">
          {/* 通知開關 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-500/10 rounded-xl flex items-center justify-center text-orange-500 shrink-0"><Bell size={20} className="shrink-0" /></div>
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">推播通知</div>
                <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">接收課程與作業提醒</div>
              </div>
            </div>
            <Switch
              enabled={notifPermission === 'granted'}
              onChange={(val) => val ? requestPushPermission() : triggerNotification('資訊', '請至瀏覽器設定關閉權限')}
              colorClass="bg-orange-500"
            />
          </div>

          {/* 定位開關 */}
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 shrink-0"><MapPin size={20} className="shrink-0" /></div>
              <div>
                <div className="text-sm font-black text-slate-900 dark:text-white">即時定位</div>
                <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400">用於尋找附近 YouBike</div>
              </div>
            </div>
            <Switch
              enabled={locPermission === 'granted'}
              onChange={(val) => val ? handleLocationRequest() : triggerNotification('資訊', '請至瀏覽器設定關閉權限')}
              colorClass="bg-emerald-500"
            />
          </div>

          <div className="pt-2 border-t border-slate-50 dark:border-white/5 flex gap-2">
            <button onClick={testPushNotification} className="flex-1 bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300 px-4 py-3 rounded-2xl text-[12px] font-black flex justify-center items-center gap-2 active:scale-95 border border-slate-100 dark:border-white/5">
              <Sparkles size={14} className="shrink-0" /> 測試推播
            </button>
            <button onClick={requestPushPermission} className="flex-1 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-3 rounded-2xl text-[12px] font-black flex justify-center items-center gap-2 active:scale-95 border border-emerald-100 dark:border-white/5">
              <Bell size={14} className="shrink-0" /> 測試通知連線
            </button>
          </div>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-soft glass-effect">
          <h4 className="text-[14px] font-black text-slate-900 dark:text-white mb-4 flex items-center gap-2"><Cloud className="text-blue-500" size={16} /> Google 服務</h4>
          <div className="flex justify-between items-center bg-slate-50 dark:bg-white/5 p-4 rounded-2xl">
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">Google 帳號備份</div>
              <div className="text-[12px] font-bold text-slate-500 dark:text-gray-400 mt-1">備份筆記至 Drive</div>
            </div>
            {isGoogleConnected ? (
              <button onClick={handleSignoutClick} className="px-4 py-2 rounded-xl text-xs font-black bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/30 active:scale-90">登出</button>
            ) : (
              <button onClick={handleAuthClick} className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white active:scale-90">登入</button>
            )}
          </div>
        </div>
      </section>

      {/* iOS 安裝教學 */}
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
              <div className="text-sm font-black text-slate-900 dark:text-white">第一步：點擊 Safari 下方分享按鈕</div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">在 Safari 瀏覽器打開本站後點擊底部工具列</div>
            </div>
          </div>
          <div className="flex items-start gap-3 bg-blue-50/50 dark:bg-blue-500/5 p-4 rounded-2xl border border-blue-100 dark:border-blue-500/10 transition-transform active:scale-[0.98]">
            <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <PlusSquare size={20} className="text-blue-500" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-900 dark:text-white">第二步：選擇「加入主畫面」</div>
              <div className="text-[11px] font-bold text-slate-500 dark:text-gray-400">這將讓 App 脫離瀏覽器，獲得全螢幕與穩定通知</div>
            </div>
          </div>
        </div>
      </section>

      {/* AI 設定 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <BrainCircuit size={16} className="text-purple-600 shrink-0" />
          <h3 className="text-sm font-black text-slate-400 dark:text-gray-500 uppercase tracking-wider">AI 引擎設定</h3>
        </div>
        <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-[var(--border-color)] shadow-soft glass-effect">
          <h4 className="text-[14px] font-black text-slate-800 dark:text-white mb-4 flex items-center gap-2"><Sparkles className="text-purple-500" size={16} /> API 金鑰管理</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[12px] font-black text-slate-400 dark:text-gray-500">GEMINI KEY {!geminiKey && <span className="text-amber-500">未設定</span>}</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[11px] font-black text-purple-600 hover:underline">🔗 取得金鑰</a>
              </div>
              <div className="flex gap-2">
                <input type="password" placeholder="貼上您的 API Key" value={geminiKey}
                  onChange={e => { setGeminiKey(e.target.value); localStorage.setItem('gsat_gemini_key', e.target.value); }}
                  className="flex-1 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-purple-400 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-white" />
                <button onClick={testAiConnection} disabled={aiTestStatus === 'testing'}
                  className={`px-4 rounded-2xl font-black text-xs active:scale-95 flex items-center gap-2 ${aiTestStatus === 'success' ? 'bg-emerald-500 text-white' : aiTestStatus === 'error' ? 'bg-red-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                  {aiTestStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : aiTestStatus === 'success' ? <CheckCircle2 size={14} /> : aiTestStatus === 'error' ? <X size={14} /> : '測試'}
                  {aiTestStatus === 'idle' ? '測試' : aiTestStatus === 'testing' ? '驗證中' : aiTestStatus === 'success' ? '成功' : '失敗'}
                </button>
              </div>
            </div>
            <div className="p-4 bg-purple-50/80 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/20 text-[11px] font-bold text-slate-500 dark:text-gray-400 leading-relaxed">
              💡 使用 Gemini 2.5 Flash 模型，金鑰僅存在您的瀏覽器中。
            </div>
          </div>
        </div>
      </section>

      {/* 管理員 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Lock size={16} className="text-gray-600" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">管理/學生會專區</h3>
        </div>
        {!isAdmin ? (
          <div className="bg-[var(--bg-surface)] p-8 rounded-[32px] border border-[var(--border-color)] shadow-soft flex flex-col items-center max-w-sm mx-auto w-full glass-effect">
            <div className="bg-emerald-100 dark:bg-emerald-500/10 p-4 rounded-[24px] mb-4 text-emerald-600 dark:text-emerald-400"><Store size={32} /></div>
            <h4 className="text-[17px] font-black text-slate-900 dark:text-white mb-1">特約商店管理</h4>
            <p className="text-[12px] font-bold text-slate-500 dark:text-gray-400 mb-5 text-center">進入後台以管理商店資料</p>
            <div className="w-full flex flex-col gap-3">
              <input type="password" placeholder="管理員密碼" value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                className="w-full p-3 rounded-2xl border border-slate-200 dark:border-white/10 outline-none text-sm font-bold text-center focus:border-emerald-400 bg-white dark:bg-white/5 text-slate-900 dark:text-white" />
              <button onClick={handleAdminLogin} className="w-full bg-emerald-600 text-white font-black py-3 rounded-2xl active:scale-95 shadow-md">解鎖後台</button>
            </div>
          </div>
        ) : (
          <div className="bg-[var(--bg-surface)] p-6 rounded-[32px] border border-emerald-500/30 shadow-lg glass-effect">
            <h4 className="text-[14px] font-black text-gray-800 mb-4">🏪 特約商店管理（已授權）</h4>
            <div className="bg-emerald-50/80 p-5 rounded-[24px] border border-emerald-100 flex flex-col gap-3 mb-6">
              <h5 className="text-sm font-black text-emerald-800 flex justify-between items-center">
                {editingStore ? '編輯商店' : '新增商店'}
                {editingStore && <button onClick={() => { setEditingStore(null); setNewStore({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '特約商店', address: '', operatingHours: '', deliveryStatus: '僅限自取', estimatedTime: '', deliveryUrl: '' }); }} className="text-xs text-gray-500 bg-white px-2 py-1 rounded-md border">取消編輯</button>}
              </h5>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="商店名稱 *" className="p-3 rounded-xl border border-emerald-200 text-sm font-bold col-span-2" value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} />
                <input placeholder="優惠內容 *" className="p-3 rounded-xl border border-emerald-200 text-sm font-bold col-span-2" value={newStore.discount} onChange={e => setNewStore({ ...newStore, discount: e.target.value })} />
                <div className="flex gap-2 col-span-2">
                  <input placeholder="Icon" className="p-3 rounded-xl border border-emerald-200 text-sm font-bold w-1/4 text-center" value={newStore.icon} onChange={e => setNewStore({ ...newStore, icon: e.target.value })} />
                  <select className="p-3 rounded-xl border border-emerald-200 text-sm font-bold bg-white flex-1" value={newStore.type} onChange={e => setNewStore({ ...newStore, type: e.target.value })}>
                    {['餐飲', '飲料', '咖啡', '文具', '其他'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <input placeholder="地址（選填）" className="p-3 rounded-xl border border-emerald-200 text-sm font-bold col-span-2" value={newStore.address} onChange={e => setNewStore({ ...newStore, address: e.target.value })} />
              </div>
              <button onClick={handleAddOrUpdateStore} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl active:scale-95 mt-1 shadow-md">
                {editingStore ? '儲存變更' : '新增商店'}
              </button>
            </div>
            <div className="space-y-3 pt-2">
              <h5 className="text-[12px] font-black text-slate-400 uppercase tracking-widest px-1">現有商店：{stores.length} 間</h5>
              {stores.map(store => (
                <div key={store.id} className="flex justify-between items-center bg-slate-50/50 dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white dark:bg-slate-800 rounded-xl flex items-center justify-center border border-slate-100 dark:border-white/10 shrink-0">
                      {React.createElement(getStoreCategoryIcon(store.type), { size: 24, className: "text-emerald-500 shrink-0" })}
                    </div>
                    <div>
                      <div className="font-black text-slate-900 dark:text-white text-sm leading-tight">{store.name}</div>
                      <div className="text-[11px] font-bold text-slate-400 mt-0.5">{store.discount}</div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingStore(store.id); setNewStore({ name: store.name || '', discount: store.discount || '', type: store.type || '餐飲', icon: store.icon || '🏪', distance: store.distance || '特約商店', address: store.address || '', operatingHours: store.operatingHours || '', deliveryStatus: store.deliveryStatus || '僅限自取', estimatedTime: store.estimatedTime || '', deliveryUrl: store.deliveryUrl || '' }); }} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold">編輯</button>
                    <button onClick={() => handleDeleteStore(store.id, store.name)} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold">刪除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
      {/* 自定義倒數管理 */}
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
          <div className="bg-white dark:bg-white/5 border border-emerald-100 dark:border-emerald-500/20 rounded-[32px] p-6 shadow-soft animate-slide-up-fade">
            <div className="space-y-4">
              <input
                placeholder="事件名稱 (例如：畢業典禮)"
                className="w-full p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-sm font-bold bg-gray-50 dark:bg-white/5 outline-none focus:ring-2 focus:ring-emerald-500"
                value={newCountdown.title}
                onChange={e => setNewCountdown({ ...newCountdown, title: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="date"
                  className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-sm font-bold bg-gray-50 dark:bg-white/5 outline-none"
                  value={newCountdown.date}
                  onChange={e => setNewCountdown({ ...newCountdown, date: e.target.value })}
                />
                <select
                  className="p-4 rounded-2xl border border-gray-100 dark:border-white/10 text-sm font-bold bg-gray-50 dark:bg-white/5 outline-none"
                  value={newCountdown.style}
                  onChange={e => setNewCountdown({ ...newCountdown, style: e.target.value })}
                >
                  <option value="gradient">主題漸層</option>
                  <option value="simple">極簡風格</option>
                  <option value="neon">電競霓虹</option>
                </select>
              </div>
              <button
                onClick={handleAddCountdown}
                className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg active:scale-[0.98] transition-all"
              >
                確認新增
              </button>
            </div>
          </div>
        )}

        <div className="bg-[var(--bg-surface)] p-2 rounded-[32px] border border-[var(--border-color)] shadow-soft glass-effect">
          {!customCountdowns || customCountdowns.length === 0 ? (
            <div className="p-8 text-center text-slate-400 font-bold text-sm">
              目前沒有自定義倒數項目 ✨
            </div>
          ) : (
            <div className="space-y-2 p-2">
              {customCountdowns.map(item => (
                <div key={item.id} className="flex justify-between items-center bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="text-xl">📅</div>
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
    </div>
  );
};

export default SettingsTab;
