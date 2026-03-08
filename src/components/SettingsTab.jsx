import React, { useState, useEffect } from 'react';
import {
  Settings, User, Monitor, Sun, Moon, Edit3,
  Bell, Sparkles, Cloud, BrainCircuit, RefreshCw,
  CheckCircle2, X, Store, Trash2, Lock
} from 'lucide-react';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';

const SettingsTab = ({
  isAdmin, setIsAdmin, triggerNotification, handleAuthClick,
  isGoogleConnected, handleSignoutClick, requestPushPermission,
  testPushNotification, theme, setTheme, aiTestStatus,
  testAiConnection, geminiKey, setGeminiKey
}) => {
  const [adminPassword, setAdminPassword] = useState('');
  const [campusName, setCampusName] = useState(() => localStorage.getItem('gsat_campus_name') || '內湖高中');
  const [campusAddress, setCampusAddress] = useState(() => localStorage.getItem('gsat_campus_address') || '台北市內湖區文德路218號');
  const [editingCampus, setEditingCampus] = useState(false);
  const [tempName, setTempName] = useState('');
  const [tempAddr, setTempAddr] = useState('');

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
          <Settings size={28} /> 系統設定與管理
        </h2>
        {isAdmin && (
          <button onClick={() => setIsAdmin(false)} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-sm font-black active:scale-95">
            登出後台
          </button>
        )}
      </div>

      {/* 外觀設定 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <User size={16} className="text-emerald-600" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">個人與外觀</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-soft">
          <h4 className="text-[14px] font-black text-gray-800 mb-4">🎨 外觀主題</h4>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {themeOptions.map(opt => (
              <button key={opt.value} onClick={() => { setTheme(opt.value); localStorage.setItem('gsat_theme', opt.value); }}
                className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all active:scale-95 ${theme === opt.value ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : 'border-transparent bg-gray-50 hover:bg-gray-100'}`}>
                <opt.icon size={28} className={theme === opt.value ? 'text-emerald-600' : 'text-gray-500'} />
                <span className={`text-[12px] font-black ${theme === opt.value ? 'text-emerald-700' : 'text-gray-600'}`}>{opt.label}</span>
              </button>
            ))}
          </div>
          <h4 className="text-[14px] font-black text-gray-800 mb-3">🏫 校園快速導覽</h4>
          {!editingCampus ? (
            <div className="bg-emerald-50/80 rounded-[24px] border border-emerald-100 p-4 flex items-center gap-4">
              <div className="w-12 h-12 shrink-0 bg-white rounded-[18px] shadow-sm flex items-center justify-center text-xl">🏫</div>
              <div className="flex-1 min-w-0">
                <div className="font-black text-gray-900">{campusName}</div>
                <div className="text-[12px] font-bold text-gray-500 truncate">{campusAddress}</div>
              </div>
              <button onClick={() => { setTempName(campusName); setTempAddr(campusAddress); setEditingCampus(true); }}
                className="p-2.5 bg-white rounded-xl shadow-sm border border-gray-100">
                <Edit3 size={14} />
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

      {/* 系統服務 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <Cloud size={16} className="text-blue-600" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">系統服務串接</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-soft">
          <h4 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><Bell className="text-orange-500" size={16} /> 通知功能</h4>
          <div className="flex gap-2">
            <button onClick={requestPushPermission} className="flex-1 bg-orange-50 text-orange-600 px-4 py-3 rounded-2xl text-sm font-black flex justify-center items-center gap-2 active:scale-95 border border-orange-100">
              <Bell size={16} /> 授權通知
            </button>
            <button onClick={testPushNotification} className="flex-1 bg-white text-gray-700 px-4 py-3 rounded-2xl text-sm font-black flex justify-center items-center gap-2 active:scale-95 border border-gray-200">
              <Sparkles size={16} /> 測試推播
            </button>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-soft">
          <h4 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><Cloud className="text-blue-500" size={16} /> Google 服務</h4>
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
            <div>
              <div className="text-sm font-black text-gray-900">Google 帳號備份</div>
              <div className="text-[12px] font-bold text-gray-500 mt-1">備份筆記至 Drive</div>
            </div>
            {isGoogleConnected ? (
              <button onClick={handleSignoutClick} className="px-4 py-2 rounded-xl text-xs font-black bg-red-50 text-red-600 border border-red-200 active:scale-90">登出</button>
            ) : (
              <button onClick={handleAuthClick} className="px-4 py-2 rounded-xl text-xs font-black bg-blue-600 text-white active:scale-90">登入</button>
            )}
          </div>
        </div>
      </section>

      {/* AI 設定 */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <BrainCircuit size={16} className="text-purple-600" />
          <h3 className="text-sm font-black text-gray-400 uppercase tracking-wider">AI 引擎設定</h3>
        </div>
        <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-white/60 shadow-soft">
          <h4 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><Sparkles className="text-purple-500" size={16} /> API 金鑰管理</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="text-[12px] font-black text-gray-400">GEMINI KEY {!geminiKey && <span className="text-amber-500">未設定</span>}</label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[11px] font-black text-purple-600 hover:underline">🔗 取得金鑰</a>
              </div>
              <div className="flex gap-2">
                <input type="password" placeholder="貼上您的 API Key" value={geminiKey}
                  onChange={e => { setGeminiKey(e.target.value); localStorage.setItem('gsat_gemini_key', e.target.value); }}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm font-black outline-none focus:border-purple-400 focus:bg-white" />
                <button onClick={testAiConnection} disabled={aiTestStatus === 'testing'}
                  className={`px-4 rounded-2xl font-black text-xs active:scale-95 flex items-center gap-2 ${aiTestStatus === 'success' ? 'bg-emerald-500 text-white' : aiTestStatus === 'error' ? 'bg-red-500 text-white' : 'bg-purple-600 text-white hover:bg-purple-700'}`}>
                  {aiTestStatus === 'testing' ? <RefreshCw size={14} className="animate-spin" /> : aiTestStatus === 'success' ? <CheckCircle2 size={14} /> : aiTestStatus === 'error' ? <X size={14} /> : '測試'}
                  {aiTestStatus === 'idle' ? '測試' : aiTestStatus === 'testing' ? '驗證中' : aiTestStatus === 'success' ? '成功' : '失敗'}
                </button>
              </div>
            </div>
            <div className="p-4 bg-purple-50/80 rounded-2xl border border-purple-100 text-[11px] font-bold text-gray-500 leading-relaxed">
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
          <div className="bg-white/80 backdrop-blur-2xl p-8 rounded-[32px] border border-white/60 shadow-soft flex flex-col items-center max-w-sm mx-auto w-full">
            <div className="bg-emerald-100 p-4 rounded-[24px] mb-4 text-emerald-600"><Store size={32} /></div>
            <h4 className="text-[17px] font-black text-gray-900 mb-1">特約商店管理</h4>
            <p className="text-[12px] font-bold text-gray-500 mb-5 text-center">進入後台以管理商店資料</p>
            <div className="w-full flex flex-col gap-3">
              <input type="password" placeholder="管理員密碼" value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                className="w-full p-3 rounded-2xl border border-gray-200 outline-none text-sm font-bold text-center focus:border-emerald-400" />
              <button onClick={handleAdminLogin} className="w-full bg-emerald-600 text-white font-black py-3 rounded-2xl active:scale-95 shadow-md">解鎖後台</button>
            </div>
          </div>
        ) : (
          <div className="bg-white/80 backdrop-blur-2xl p-6 rounded-[32px] border border-emerald-500/30 shadow-lg">
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
            <div className="space-y-3">
              <h5 className="text-[13px] font-bold text-gray-500">現有商店：{stores.length} 間</h5>
              {stores.map(store => (
                <div key={store.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-xl">{store.icon || '🏪'}</div>
                    <div>
                      <div className="font-bold text-gray-900 text-sm">{store.name}</div>
                      <div className="text-xs text-gray-400">{store.discount}</div>
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
    </div>
  );
};

export default SettingsTab;
