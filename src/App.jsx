import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  BookOpen, Calendar, MessageSquare, Bell, Volume2, PenTool,
  FileText, Library, Plus, Trash2, RefreshCw, Upload,
  CheckCircle2, Clock, Smartphone, Sparkles, Settings, ArrowLeft, Save, Edit3, ChevronRight, ChevronLeft, BookPlus, Wand2, MonitorPlay, MapPin, User, Package, BrainCircuit, Image as ImageIcon, X, LayoutDashboard, Notebook, Cloud, Globe, Utensils, GraduationCap, FolderPlus, Menu, Store, Bus, Bike, CreditCard, Navigation, Zap, Train, TrainFront
} from 'lucide-react';

// ================= 常數與預設資料 =================
const INITIAL_WEEKLY_SCHEDULE = {
  1: [{ id: 101, startTime: '08:00', endTime: '09:00', subject: '國文', location: '302 教室', teacher: '王老師', items: '國文講義' }],
  2: [], 3: [], 4: [], 5: [], 6: [], 0: []
};

const WEEKDAYS = [
  { id: 1, label: '一' }, { id: 2, label: '二' }, { id: 3, label: '三' },
  { id: 4, label: '四' }, { id: 5, label: '五' }, { id: 6, label: '六' }, { id: 0, label: '日' }
];

const SUBJECTS_LIST = [
  { name: '國文', icon: '📝', color: 'text-red-600' },
  { name: '英文', icon: '🔤', color: 'text-blue-600' },
  { name: '數學', icon: '📐', color: 'text-orange-600' },
  { name: '物理', icon: '⚡', color: 'text-purple-600' },
  { name: '化學', icon: '🧪', color: 'text-cyan-600' },
  { name: '生物', icon: '🧬', color: 'text-green-600' },
  { name: '歷史', icon: '📜', color: 'text-amber-600' },
  { name: '地理', icon: '🗺️', color: 'text-emerald-600' },
  { name: '公民', icon: '⚖️', color: 'text-indigo-600' },
  { name: '自習', icon: '📚', color: 'text-gray-600' }
];

const NOTE_CATEGORIES = ['課堂筆記', '錯題本', '重點摘要', '考前衝刺'];

const INITIAL_STORES = [
  { id: 1, name: '50嵐 (內湖文德店)', discount: '憑內湖高中學生證 全品項折 5 元', type: '飲料', icon: '🥤', distance: '步行 3 分鐘' },
  { id: 2, name: '八方雲集 (文德店)', discount: '內用/外帶 滿 100 元贈豆漿一杯', type: '餐飲', icon: '🥟', distance: '步行 5 分鐘' },
  { id: 3, name: '路易莎咖啡 LOUISA', discount: '憑學生證 飲品 9 折', type: '咖啡', icon: '☕', distance: '步行 4 分鐘' },
  { id: 4, name: '墊腳石 (內湖店)', discount: '文具圖書憑證 85 折', type: '文具', icon: '📚', distance: '步行 8 分鐘' },
];

const timeToMins = (timeStr) => {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return '早安，學習愉快！';
  if (hour >= 11 && hour < 14) return '午安，記得休息！';
  if (hour >= 14 && hour < 18) return '下午好，繼續加油！';
  if (hour >= 18 && hour < 22) return '晚上好，充實自我！';
  return '夜深了，早點休息喔！';
};


// --- ★ Google API 設定 ★ ---
const GOOGLE_CLIENT_ID = '687493999096-ou5u6bug4t9v1u54bp39qauimvedvou9.apps.googleusercontent.com';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly';

// ================= 共用元件 =================
const IosNotification = ({ notification }) => {
  const safeTop = 'max(16px, env(safe-area-inset-top))';
  const topPos = `calc(${safeTop} + 10px)`;

  return (
    <div
      className={`fixed left-0 right-0 z-[160] flex justify-center transition-all duration-[500ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] pointer-events-none px-4`}
      style={{ top: notification.show ? topPos : '-120px', opacity: notification.show ? 1 : 0, transform: notification.show ? 'scale(1)' : 'scale(0.95)' }}
    >
      <div className="w-full max-w-[360px] bg-[#f8f8f9]/95 backdrop-blur-2xl p-4 rounded-[24px] shadow-[0_15px_40px_rgba(0,0,0,0.15)] border border-white/60 flex flex-col gap-1.5 pointer-events-auto">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 rounded-[8px] p-1.5 shadow-sm"><Bell size={14} className="text-white" /></div>
            <span className="text-[12px] font-black text-gray-400 uppercase tracking-wider">GSAT PRO</span>
          </div>
          <span className="text-[12px] font-bold text-gray-400">現在</span>
        </div>
        <div className="px-1 pb-1 mt-0.5">
          <div className="text-[15px] font-black text-gray-950 leading-tight mb-1">{String(notification?.title || '')}</div>
          <div className="text-[13px] font-bold text-gray-600 leading-relaxed whitespace-pre-line">{String(notification?.message || '')}</div>
        </div>
      </div>
    </div>
  );
};

// ================= 各分頁元件 =================

// 1. 儀表板 (Dashboard)
const DashboardTab = ({ weeklySchedule, setWeeklySchedule, subjects, triggerNotification, requestPushPermission, testPushNotification, setSettingsOpen }) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [editDayTab, setEditDayTab] = useState(new Date().getDay() || 1);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [previewSchedule, setPreviewSchedule] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const { currentClass, currentProgress, todayClasses, isAfter4PM } = useMemo(() => {
    const day = currentTime.getDay();
    const currentMins = currentTime.getHours() * 60 + currentTime.getMinutes();
    const todayList = weeklySchedule[day] || [];
    let active = null;
    let prog = 0;

    let totalDuration = 0;
    let elapsedDuration = 0;

    for (let c of todayList) {
      const start = timeToMins(c.startTime);
      const end = timeToMins(c.endTime);
      const duration = end - start;
      if (duration > 0) {
        totalDuration += duration;
        if (currentMins >= end) {
          elapsedDuration += duration;
        } else if (currentMins >= start && currentMins < end) {
          active = c;
          elapsedDuration += (currentMins - start);
        }
      }
    }

    if (totalDuration > 0) {
      prog = (elapsedDuration / totalDuration) * 100;
    } else {
      prog = 100;
    }

    return { currentClass: active, currentProgress: prog, todayClasses: todayList, isAfter4PM: currentTime.getHours() >= 16 };
  }, [currentTime, weeklySchedule]);

  const updateSchedule = (id, field, value) => {
    if (previewSchedule) {
      setPreviewSchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].map(item => item.id === id ? { ...item, [field]: value } : item) }));
    } else {
      setWeeklySchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].map(item => item.id === id ? { ...item, [field]: value } : item) }));
    }
  };

  const deleteSchedule = (id) => {
    if (previewSchedule) {
      setPreviewSchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].filter(item => item.id !== id) }));
    } else {
      setWeeklySchedule(prev => ({ ...prev, [editDayTab]: prev[editDayTab].filter(item => item.id !== id) }));
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const hasGemini = localStorage.getItem('gsat_gemini_key');
    const hasOpenRouter = localStorage.getItem('gsat_openrouter_key');
    const hasWindowAi = window.ai && window.ai.canCreateTextSession;
    if (!hasGemini && !hasOpenRouter && !hasWindowAi) {
      triggerNotification('設定未完成', '請先至設定綁定 API Key 或使用支援 AI 功能的瀏覽器');
      return;
    }

    setUploadLoading(true);
    triggerNotification('讀取中', '正在使用 Gemini 解析課表照片，請稍候...');

    try {
      const { base64: base64Data, mimeType } = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target.result;
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxWidth = 1200;
            if (width > maxWidth || height > maxWidth) {
              if (width > height) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxWidth) / height);
                height = maxWidth;
              }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
          };
        };
      });

      const prompt = `請分析這張課表照片。請嚴格以 JSON 格式回傳（不可有任何其他 markdown 符號或文字）。格式必須為一個包含 7 個陣列的物件，代表星期一到星期日（1~6, 0代表星期日）：
      {
        "1": [{"startTime": "08:00", "endTime": "09:00", "subject": "國文", "location": "教室", "teacher": ""}],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "0": []
      }`;

      const summary = await fetchAI(prompt, {
        temperature: 0.1,
        responseJson: true,
        image: { mimeType, data: base64Data }
      });

      let rawText = summary;
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(rawText);

      const newSchedule = { ...INITIAL_WEEKLY_SCHEDULE };
      Object.keys(parsedData).forEach(day => {
        newSchedule[day] = parsedData[day].map((item, index) => ({
          id: Date.now() + parseInt(day) * 1000 + index,
          startTime: item.startTime || '',
          endTime: item.endTime || '',
          subject: item.subject || '未命名',
          location: item.location || '',
          teacher: item.teacher || '',
          items: ''
        }));
      });

      setPreviewSchedule(newSchedule);
      setIsEditingSchedule(true);
      triggerNotification('解析完成 ✨', '請檢查解析結果，確認無誤後點擊「一鍵儲存」！');

    } catch (error) {
      console.error('解析失敗:', error);
      triggerNotification('處理失敗', '請確認照片清晰或檢查 API Key 是否正確。');
    } finally {
      setUploadLoading(false);
      event.target.value = null;
    }
  };

  const handleSavePreview = () => {
    setWeeklySchedule(previewSchedule);
    setPreviewSchedule(null);
    setIsEditingSchedule(false);
    triggerNotification('儲存成功', '新的課表已生效！');
  };

  const handleCancelPreview = () => {
    setPreviewSchedule(null);
    triggerNotification('已取消', '放棄剛剛解析的結果。');
  };

  const displaySchedule = previewSchedule || weeklySchedule;

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // 延遲一點點時間觸發，確保有從 0 開始的動畫效果
    const timer = setTimeout(() => setIsMounted(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-fadeIn">
      <SchoolNewsWidget />

      {/* 頂部歡迎區卡片 */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-700 rounded-[32px] p-6 md:p-8 text-white shadow-xl relative overflow-hidden flex-shrink-0">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-black tracking-tight">{getGreeting()}</h2>
            <div className="flex flex-col items-end">
              <span className="text-emerald-50 text-[11px] font-black uppercase tracking-widest opacity-80">CURRENT TIME</span>
              <span className="text-white text-[24px] font-black font-mono drop-shadow-sm">
                {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-end">
              <span className="text-emerald-50 text-[12px] font-black tracking-widest uppercase opacity-90">今日學習進度</span>
              <span className="text-white text-[16px] font-black font-mono">{Math.round(currentProgress)}%</span>
            </div>
            <div className="w-full h-3 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm border border-white/10 shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-300 to-white rounded-full transition-all duration-[1500ms] ease-[cubic-bezier(0.25,1,0.5,1)] relative"
                style={{ width: `${isMounted ? currentProgress : 0}%` }}
              >
                <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 text-white opacity-10 w-40 h-40" />
      </div>

      <div className="bg-white p-5 md:p-8 rounded-[36px] shadow-sm border border-gray-100 w-full mb-2">
        <div className="flex items-center justify-between mb-6 border-b border-gray-50 pb-4">
          <div className="flex items-center gap-3">
            <Calendar className="text-emerald-500" size={24} />
            <h3 className="text-[19px] font-black text-gray-950 tracking-tighter">
              {isEditingSchedule ? (previewSchedule ? '檢查解析結果' : '編輯週排程') : (isAfter4PM ? '16:00 預習模式' : '今日學習排程')}
            </h3>
          </div>
          {!previewSchedule && (
            <button onClick={() => setIsEditingSchedule(!isEditingSchedule)} className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-black transition-all ${isEditingSchedule ? 'bg-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-600'}`}>
              <Edit3 size={15} /> {isEditingSchedule ? '完成' : '編輯'}
            </button>
          )}
        </div>

        {isEditingSchedule ? (
          <div className="flex flex-col gap-4">
            {!previewSchedule && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-[24px] p-5 flex flex-col gap-3 relative overflow-hidden">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="text-emerald-600" size={20} />
                  <h4 className="font-black text-emerald-900 text-[15px]">AI 智能辨識課表</h4>
                </div>
                <p className="text-emerald-700 text-[13px] font-bold">上傳照片，Gemini 會自動解析並填入，確認後一鍵儲存！</p>

                <label className="bg-white border-2 border-dashed border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-colors cursor-pointer rounded-2xl py-4 flex flex-col items-center justify-center gap-2">
                  {uploadLoading ? <RefreshCw className="animate-spin text-emerald-500" size={24} /> : <ImageIcon className="text-emerald-400" size={24} />}
                  <span className="text-emerald-600 text-[14px] font-black">{uploadLoading ? 'AI 正在努力解析中...' : '點擊上傳照片'}</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={uploadLoading} />
                </label>
              </div>
            )}

            {previewSchedule && (
              <div className="flex gap-2">
                <button onClick={handleCancelPreview} className="flex-1 py-3 bg-red-50 text-red-600 rounded-xl font-black active:scale-95 transition-transform">放棄重來</button>
                <button onClick={handleSavePreview} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-md active:scale-95 transition-transform">一鍵儲存</button>
              </div>
            )}

            <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
              {WEEKDAYS.map(d => (
                <button key={d.id} onClick={() => setEditDayTab(d.id)} className={`px-5 py-3 rounded-2xl text-[14px] font-black flex-shrink-0 transition-all ${editDayTab === d.id ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500'}`}>{d.label}</button>
              ))}
            </div>

            <div className="flex flex-col gap-5">
              {(displaySchedule[editDayTab] || []).map(item => (
                <div key={item.id} className={`p-5 bg-white rounded-[32px] border ${previewSchedule ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'} flex flex-col gap-4 shadow-sm relative transition-colors`}>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3 flex-1 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                      <BookOpen size={18} className="text-emerald-500 flex-shrink-0" />
                      <input type="text" value={item.subject || ''} onChange={(e) => updateSchedule(item.id, 'subject', e.target.value)} className="w-full bg-transparent text-[16px] font-black text-emerald-900 outline-none" placeholder="課程名稱" />
                    </div>
                    <button onClick={() => deleteSchedule(item.id)} className="p-3.5 bg-red-50 text-red-500 rounded-[20px] shadow-sm active:scale-90 transition-transform"><Trash2 size={20} /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[20px] px-3 py-2.5">
                      <User size={16} className="text-blue-500 flex-shrink-0" />
                      <input type="text" value={item.teacher || ''} onChange={(e) => updateSchedule(item.id, 'teacher', e.target.value)} className="w-full bg-transparent text-[13px] font-black text-gray-700 outline-none" placeholder="授課老師" />
                    </div>
                    <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-[20px] px-3 py-2.5">
                      <MapPin size={16} className="text-orange-500 flex-shrink-0" />
                      <input type="text" value={item.location || ''} onChange={(e) => updateSchedule(item.id, 'location', e.target.value)} className="w-full bg-transparent text-[13px] font-black text-gray-700 outline-none" placeholder="授課地點" />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3">
                    <Clock size={18} className="text-emerald-500 flex-shrink-0" />
                    <div className="flex items-center gap-2 flex-1">
                      <input type="time" value={item.startTime || ''} onChange={(e) => updateSchedule(item.id, 'startTime', e.target.value)} className="flex-1 bg-transparent text-[15px] font-black font-mono outline-none text-center" />
                      <span className="text-gray-400 font-bold">-</span>
                      <input type="time" value={item.endTime || ''} onChange={(e) => updateSchedule(item.id, 'endTime', e.target.value)} className="flex-1 bg-transparent text-[15px] font-black font-mono outline-none text-center" />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={() => {
                const newId = Date.now();
                const now = new Date();
                const startTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
                now.setHours(now.getHours() + 1);
                const endTime = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

                const newItem = { id: newId, subject: '', startTime, endTime, location: '', teacher: '', items: '' };
                if (previewSchedule) {
                  setPreviewSchedule({ ...previewSchedule, [editDayTab]: [...(previewSchedule[editDayTab] || []), newItem] });
                } else {
                  setWeeklySchedule({ ...weeklySchedule, [editDayTab]: [...(weeklySchedule[editDayTab] || []), newItem] });
                }
              }} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-[28px] text-gray-500 text-[15px] font-black hover:bg-gray-50 transition-all flex justify-center items-center gap-2">
                <Plus size={18} /> 新增排程
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full text-left">
            {todayClasses.length === 0 && <div className="text-center py-12 bg-gray-50 rounded-[28px] text-gray-400 font-bold text-[15px]">今日進度已圓滿達成 🎉</div>}
            {todayClasses.map(item => {
              const isActive = currentClass?.id === item.id;
              const isPast = timeToMins(item.endTime) < (currentTime.getHours() * 60 + currentTime.getMinutes());
              const subjectInfo = subjects.find(s => s.name === item.subject) || { icon: '📘', color: 'text-emerald-600' };

              return (
                <div key={item.id} className={`flex flex-col p-5 md:p-6 rounded-[32px] border transition-all ${isActive ? 'bg-white border-emerald-200 shadow-[0_10px_30px_rgba(16,185,129,0.1)]' : 'bg-gray-50 border-transparent'} ${isPast ? 'opacity-40 grayscale-[0.4]' : ''} relative overflow-hidden`}>
                  {isActive && <div className={`absolute top-0 left-0 w-1.5 h-full ${subjectInfo.color.replace('text', 'bg')}`}></div>}
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl ${isActive ? subjectInfo.color.replace('text', 'bg-').replace('600', '50') : 'bg-white shadow-sm'}`}>
                      {subjectInfo.icon}
                    </span>
                    <div className="flex flex-col">
                      <span className={`text-[17px] font-black tracking-tight ${isActive ? 'text-gray-950' : 'text-gray-800'}`}>{String(item.subject)}</span>
                      <span className={`text-[12px] font-bold ${isActive ? 'text-emerald-600' : 'text-gray-400'}`}>{String(item.teacher || '自主進度')}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white/50 rounded-2xl p-3 border border-white/50">
                    <div className={`flex items-center gap-2 font-mono text-[13px] font-black ${isActive ? 'text-emerald-700' : 'text-gray-500'}`}>
                      <Clock size={16} className={isActive ? 'text-emerald-500 animate-pulse' : 'text-gray-400'} /> {item.startTime} - {item.endTime}
                    </div>
                    {item.location && <div className="text-[12px] font-bold text-gray-400 flex items-center gap-1.5"><MapPin size={14} /> {item.location}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-5 md:p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col gap-4 mb-8">
        <h3 className="text-[17px] font-black text-gray-950 flex items-center gap-2">
          <Globe className="text-emerald-500" size={20} /> 校園快速導覽
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <a href="https://www.nhsh.tp.edu.tw/" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform border border-gray-100">
            <Globe size={24} className="text-blue-500" />
            <span className="text-[13px] font-black text-gray-700 text-center">內湖高中校網</span>
          </a>
          <a href="https://ldap.tp.edu.tw/login" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform border border-gray-100">
            <GraduationCap size={24} className="text-purple-500" />
            <span className="text-[13px] font-black text-gray-700 text-center">校務行政(查成績)</span>
          </a>
          <a href="https://cooc.tp.edu.tw/auth/login" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform border border-gray-100">
            <Cloud size={24} className="text-cyan-500" />
            <span className="text-[13px] font-black text-gray-700 text-center">臺北酷課雲</span>
          </a>
          <a href="https://forms.gle/gJyuP7ZEBjdo2MFK9" target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 bg-gray-50 rounded-2xl active:scale-95 transition-transform border border-gray-100">
            <Utensils size={24} className="text-orange-500" />
            <span className="text-[13px] font-black text-gray-700 text-center">外食申請單</span>
          </a>
        </div>
      </div>
    </div>
  );
};

// 2. 英文單字 (Vocabulary)
const VocabularyTab = () => {
  return (
    <div className="flex flex-col w-full h-[calc(100dvh-130px)] animate-fadeIn">
      <div className="flex justify-between items-center px-1 mb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl">
            <BookOpen size={24} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">單字特訓</h2>
        </div>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1.5 rounded-xl shadow-sm">
          <Sparkles size={14} />
          <span className="text-[12px] font-bold">AI Powered</span>
        </div>
      </div>
      <div className="flex-1 w-full bg-[#f2f2f7] rounded-[36px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-200/60 overflow-hidden relative">
        <iframe src="./teacher_vocab.html" className="absolute inset-0 w-full h-full border-none bg-transparent" title="Vocabulary App" />
      </div>
    </div>
  );
};

// 3. 電子聯絡簿 (Contact Book)
const ContactBookTab = ({ contactBook, setContactBook, subjects }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [newEntry, setNewEntry] = useState({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '' });

  const getFormattedDate = (dateStr) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日 (${WEEKDAYS[d.getDay()].label})`;
  };

  const changeDate = (days) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleAddEntry = () => {
    if (!newEntry.homework && !newEntry.exam) return;

    const currentEntries = contactBook[selectedDate] || [];
    const updatedEntries = [...currentEntries, { id: Date.now(), ...newEntry }];

    setContactBook(prev => ({ ...prev, [selectedDate]: updatedEntries }));
    setNewEntry({ subject: subjects?.[0]?.name || '國文', homework: '', exam: '' });
  };

  const handleDeleteEntry = (id) => {
    const updatedEntries = (contactBook[selectedDate] || []).filter(item => item.id !== id);
    setContactBook(prev => ({ ...prev, [selectedDate]: updatedEntries }));
  };

  const entriesForDate = contactBook[selectedDate] || [];

  return (
    <div className="space-y-6 flex flex-col w-full text-left animate-fadeIn mb-8 pb-10">
      <div className="flex flex-col gap-1 px-1">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3">
          <Notebook className="text-emerald-500" size={28} /> 電子聯絡簿
        </h2>
        <p className="text-[13px] font-bold text-gray-500 ml-9">紀錄每日指派作業與重要測驗行程</p>
      </div>

      <div className="bg-white p-3 rounded-[32px] shadow-sm border border-gray-100 flex items-center justify-between">
        <button onClick={() => changeDate(-1)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl active:scale-95 text-gray-600 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-0.5">SELECTED DATE</span>
          <span className="text-[17px] font-black text-gray-900">{getFormattedDate(selectedDate)}</span>
        </div>
        <button onClick={() => changeDate(1)} className="p-4 bg-gray-50 hover:bg-gray-100 rounded-2xl active:scale-95 text-gray-600 transition-colors">
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="bg-white p-6 rounded-[36px] shadow-sm border border-gray-100 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-40 group-hover:scale-125 transition-transform duration-1000"></div>

        <h3 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2 relative z-10">
          <Plus size={18} className="text-emerald-500" /> 新增事項
        </h3>
        <div className="flex flex-col gap-3 relative z-10">
          <select
            className="w-full bg-gray-50 border border-gray-200 rounded-[20px] px-4 py-3.5 text-[15px] font-black outline-none focus:border-emerald-300 shadow-inner appearance-none relative"
            value={newEntry.subject}
            onChange={e => setNewEntry({ ...newEntry, subject: e.target.value })}
          >
            {subjects.map(s => <option key={s.name} value={s.name}>{s.icon} {s.name}</option>)}
          </select>

          <div className="flex flex-col gap-3">
            <div className="relative group">
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-[24px] px-5 py-4 text-[14px] font-bold outline-none focus:border-emerald-300 focus:bg-white transition-all min-h-[100px] shadow-inner"
                placeholder="📝 今日指派作業 (例如：完成習作 P.10-15)"
                value={newEntry.homework}
                onChange={e => setNewEntry({ ...newEntry, homework: e.target.value })}
              />
              <div className="absolute left-[-2px] top-4 bottom-4 w-1 bg-emerald-400 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            </div>

            <div className="relative group">
              <textarea
                className="w-full bg-gray-50 border border-gray-200 rounded-[24px] px-5 py-4 text-[14px] font-bold outline-none focus:border-red-300 focus:bg-white transition-all min-h-[100px] shadow-inner"
                placeholder="💯 明日考試內容 (例如：第一課默寫)"
                value={newEntry.exam}
                onChange={e => setNewEntry({ ...newEntry, exam: e.target.value })}
              />
              <div className="absolute left-[-2px] top-4 bottom-4 w-1 bg-red-400 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity"></div>
            </div>
          </div>

          <button onClick={handleAddEntry} className="w-full bg-gray-950 text-white py-4 rounded-[22px] font-black shadow-lg shadow-gray-200 active:scale-95 transition-all mt-2 flex items-center justify-center gap-2">
            加入聯絡簿 <CheckCircle2 size={18} />
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <h3 className="text-[13px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 mb-1">今日清單</h3>
        {entriesForDate.length === 0 ? (
          <div className="text-center py-16 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
            <div className="p-4 bg-white rounded-3xl shadow-sm text-gray-200">
              <BookOpen size={32} />
            </div>
            <p className="text-gray-400 font-bold text-[14px]">這天目前沒有任何紀錄 ✨</p>
          </div>
        ) : (
          entriesForDate.map(entry => {
            const subjectInfo = subjects.find(s => s.name === entry.subject) || { icon: '📝', color: 'text-gray-500' };
            return (
              <div key={entry.id} className="group p-6 bg-white rounded-[32px] shadow-sm border border-gray-100 relative text-left hover:shadow-md transition-all animate-slideUp">
                <div className="flex justify-between items-center mb-4 border-b border-gray-50 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${subjectInfo.color.replace('text', 'bg-').replace('600', '50')} flex items-center justify-center text-xl`}>
                      {subjectInfo.icon}
                    </div>
                    <span className="text-[16px] font-black text-gray-900">{entry.subject}</span>
                  </div>
                  <button onClick={() => handleDeleteEntry(entry.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90">
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex flex-col gap-4">
                  {entry.homework && (
                    <div className="flex gap-4 group/item">
                      <div className="w-1 bg-emerald-500 rounded-full"></div>
                      <div className="flex-1 py-1">
                        <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-1">Homework</div>
                        <p className="text-[15px] font-bold text-gray-700 leading-relaxed">{entry.homework}</p>
                      </div>
                    </div>
                  )}
                  {entry.exam && (
                    <div className="flex gap-4 group/item">
                      <div className="w-1 bg-red-500 rounded-full"></div>
                      <div className="flex-1 py-1">
                        <div className="text-[11px] font-black text-red-600 uppercase tracking-widest mb-1">Examination</div>
                        <p className="text-[15px] font-bold text-gray-700 leading-relaxed">{entry.exam}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// 4. 筆記本 (Notes)
const QuizModal = ({ isOpen, onClose, quizData, subject }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);

  if (!isOpen || !quizData || quizData.length === 0) return null;

  const handleAnswer = (index) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(index);
    const correct = index === quizData[currentQuestion].answerIndex;
    setIsCorrect(correct);
    if (correct) setScore(s => s + 1);

    setTimeout(() => {
      if (currentQuestion < quizData.length - 1) {
        setCurrentQuestion(c => c + 1);
        setSelectedAnswer(null);
        setIsCorrect(null);
      } else {
        setShowResult(true);
      }
    }, 1500);
  };

  const q = quizData[currentQuestion];

  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fadeIn"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[450px] bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-emerald-600 p-6 text-white flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black flex items-center gap-2 tracking-tight">
              <BrainCircuit size={24} /> AI 隨堂測驗
            </h3>
            <p className="text-[12px] font-bold opacity-80 uppercase tracking-widest mt-0.5">{subject} • 第 {currentQuestion + 1}/{quizData.length} 題</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
          {!showResult ? (
            <>
              <div className="bg-gray-50 p-6 rounded-[28px] border border-gray-100 shadow-inner">
                <p className="text-[17px] font-black text-gray-900 leading-relaxed text-center">
                  {q.question}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {q.options.map((opt, idx) => {
                  let statusClass = "bg-white border-gray-100 text-gray-700 hover:border-emerald-200 hover:bg-emerald-50";
                  if (selectedAnswer === idx) {
                    statusClass = isCorrect ? "bg-emerald-500 text-white border-emerald-500 scale-[1.02] shadow-lg shadow-emerald-500/30" : "bg-red-500 text-white border-red-500 scale-[1.02] shadow-lg shadow-red-500/30";
                  } else if (selectedAnswer !== null && idx === q.answerIndex) {
                    statusClass = "bg-emerald-100 text-emerald-700 border-emerald-200";
                  }

                  return (
                    <button
                      key={idx}
                      onClick={() => handleAnswer(idx)}
                      disabled={selectedAnswer !== null}
                      className={`w-full p-4 rounded-2xl border-2 text-left font-bold transition-all flex items-center gap-3 ${statusClass}`}
                    >
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-[13px] font-black ${selectedAnswer === idx ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      {opt}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-10 flex flex-col items-center text-center gap-6 animate-fadeIn">
              <div className="p-6 bg-emerald-50 rounded-full">
                <CheckCircle2 size={80} className="text-emerald-500" />
              </div>
              <div>
                <h4 className="text-3xl font-black text-gray-900 mb-2">測驗結束！</h4>
                <p className="text-gray-500 font-bold">你在這次測驗中得到了</p>
                <div className="text-5xl font-black text-emerald-600 mt-2">
                  {score} <span className="text-xl text-gray-400">/ {quizData.length}</span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full bg-gray-900 text-white py-4 rounded-2xl font-black shadow-lg active:scale-95 transition-all mt-4"
              >
                回到筆記
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 4. 筆記本 (Notes)
const NotesTab = ({ notes, setNotes, subjects, setSubjects, selectedSubject, setSelectedSubject, triggerNotification, isGoogleConnected }) => {
  const [newNote, setNewNote] = useState({ category: '課堂筆記', title: '', content: '' });
  const [attachments, setAttachments] = useState([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Quiz states
  const [isQuizOpen, setIsQuizOpen] = useState(false);
  const [quizData, setQuizData] = useState([]);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);

  // Subject management
  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSub, setNewSub] = useState({ name: '', icon: '📘', color: 'text-emerald-600' });

  const handleAddSubject = () => {
    if (!newSub.name) return;
    if (subjects.find(s => s.name === newSub.name)) {
      triggerNotification('重複科目', '該科目已存在！');
      return;
    }
    setSubjects(prev => [...prev, { ...newSub }]);
    setNewSub({ name: '', icon: '📘', color: 'text-emerald-600' });
    setShowAddSubject(false);
    triggerNotification('新增成功', `已新增科目：${newSub.name}`);
  };

  const handleDeleteSubject = (name) => {
    if (window.confirm(`確定要刪除「${name}」及其關聯內容嗎？`)) {
      setSubjects(prev => prev.filter(s => s.name !== name));
      setNotes(prev => prev.filter(n => n.subject === name));
      triggerNotification('已刪除', `已移除科目：${name}`);
    }
  };

  const handleGenerateQuiz = async () => {
    const apiKey = localStorage.getItem('gsat_gemini_key');
    if (!apiKey) {
      triggerNotification('未設定金鑰', '請先至設定綁定 Gemini API Key');
      return;
    }

    const subjectNotes = notes.filter(n => n.subject === selectedSubject?.name);
    if (subjectNotes.length === 0) {
      triggerNotification('筆記不足', '請先新增一些筆記內容，AI 才能根據內容出題。');
      return;
    }

    setIsGeneratingQuiz(true);
    triggerNotification('AI 出題中', '正在根據您的筆記設計考題...');

    try {
      const combinedContent = subjectNotes.map(n => `標題: ${n.title}\n內容: ${n.content}`).join('\n\n---\n\n');
      const prompt = `請根據以下筆記內容，為高中學生設計 3 題選擇題。請嚴格以 JSON 陣列格式回傳，不可有任何 markdown 符號。
      格式範例:
      [
        {"question": "問題 1", "options": ["選項A", "選項B", "選項C", "選項D"], "answerIndex": 0},
        ...
      ]
      
      筆記內容如下：
      ${combinedContent}`;

      let rawText = await fetchAI(prompt, { temperature: 0.7, responseJson: true });
      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedQuiz = JSON.parse(rawText);

      setQuizData(parsedQuiz);
      setIsQuizOpen(true);
    } catch (e) {
      console.error(e);
      triggerNotification('出題失敗', 'AI 無法產生題目，請稍後再試。');
    } finally {
      setIsGeneratingQuiz(false);
    }
  };

  const handleSaveNote = () => {
    if (!newNote.title || (!newNote.content && attachments.length === 0)) return;
    const noteToSave = {
      id: Date.now(),
      subject: String(selectedSubject?.name || '未知'),
      ...newNote,
      attachments: attachments,
      date: new Date().toLocaleDateString()
    };

    setNotes(prev => [noteToSave, ...prev]);
    setNewNote({ category: '課堂筆記', title: '', content: '' });
    setAttachments([]);
    triggerNotification('儲存成功', `已儲存至「${selectedSubject?.name}」筆記。`);

    // 如果已登入 Google，啟動自動備份
    if (isGoogleConnected) {
      handleBackupToDrive(noteToSave);
    }
  };

  const handleDeleteNote = async (id) => {
    const noteToDelete = notes.find(n => n.id === id);
    if (!noteToDelete) return;

    if (window.confirm(`確定要刪除「${noteToDelete.title}」嗎？`)) {
      setNotes(prev => prev.filter(n => n.id !== id));
      triggerNotification('已刪除', `已移除本地筆記：${noteToDelete.title}`);

      // 如果已連線 Google，同步刪除雲端檔案
      if (isGoogleConnected) {
        handleDeleteFromDrive(noteToDelete);
      }
    }
  };

  const handleDeleteFromDrive = async (note) => {
    if (!isGoogleConnected || !window.gapi?.client?.getToken()) return;

    try {
      // 1. 找到根資料夾
      const rootFolderRes = await window.gapi.client.drive.files.list({
        q: "name='GSAT Pro 筆記' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id)'
      });
      const rootFolderId = rootFolderRes.result.files.length > 0 ? rootFolderRes.result.files[0].id : null;
      if (!rootFolderId) return;

      // 2. 找到科目資料夾
      const subjectName = note.subject || '未分類';
      const subFolderRes = await window.gapi.client.drive.files.list({
        q: `name='${subjectName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)'
      });
      const subFolderId = subFolderRes.result.files.length > 0 ? subFolderRes.result.files[0].id : null;
      if (!subFolderId) return;

      // 3. 搜尋並刪除文字檔
      const fileName = `${note.title}.txt`;
      const fileRes = await window.gapi.client.drive.files.list({
        q: `name='${fileName}' and '${subFolderId}' in parents and trashed=false`,
        fields: 'files(id)'
      });

      for (const file of fileRes.result.files) {
        await window.gapi.client.drive.files.delete({ fileId: file.id });
      }

      // 4. 搜尋並刪除所有附件檔
      const attachments = note.attachments || (note.image ? [{ type: 'image', name: `${note.title}_附圖.jpg`, data: note.image }] : []);
      for (const att of attachments) {
        const attName = att.name || `${note.title}_附件_${Date.now()}.jpg`;
        const attRes = await window.gapi.client.drive.files.list({
          q: `name='${attName}' and '${subFolderId}' in parents and trashed=false`,
          fields: 'files(id)'
        });
        for (const file of attRes.result.files) {
          await window.gapi.client.drive.files.delete({ fileId: file.id });
        }
      }

      triggerNotification('雲端同步成功 ☁️', `已從 Drive 移除「${note.title}」。`);

    } catch (e) {
      console.error("雲端刪除失敗", e);
      // 靜默失敗或顯示輕量提示
    }
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (file.type.startsWith('image/')) {
            setAttachments(prev => [...prev, {
              id: Date.now() + Math.random(),
              name: file.name,
              type: 'image',
              data: reader.result
            }]);
          } else {
            triggerNotification('不支援的格式', '目前僅支援圖片上傳，以維護系統效能。');
          }

        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleAiSummarize = async () => {
    const apiKey = localStorage.getItem('gsat_gemini_key');
    if (!apiKey) {
      triggerNotification('未設定金鑰', '請先至設定綁定 Gemini API Key');
      return;
    }

    if (!newNote.content && attachments.length === 0) {
      triggerNotification('需要內容', '請輸入筆記內容或上傳照片供 AI 分析。');
      return;
    }

    setIsProcessingAI(true);
    triggerNotification('AI 處理中', '正在為您總結重點...');

    try {
      const prompt = `請幫我整理並摘要這份高中 ${selectedSubject?.name} 筆記的重點，請條列式列出核心考點。`;
      const aiImages = attachments
        .filter(a => a.type === 'image')
        .slice(0, 5)
        .map(a => ({
          mimeType: a.data.split(';')[0].split(':')[1] || 'image/jpeg',
          data: a.data.split(',')[1]
        }));

      let contentToAI = prompt;
      if (newNote.content) {
        contentToAI = `${prompt}\n\n以下是文字筆記內容：\n${newNote.content}`;
      }

      const summary = await fetchAI(contentToAI, { temperature: 0.3, images: aiImages });
      setNewNote(prev => ({ ...prev, content: `【AI 重點整理】\n${summary}\n\n---\n${prev.content}` }));
      triggerNotification('完成', '已將摘要插入筆記內容！');
    } catch (e) {
      console.error(e);
      triggerNotification('AI 失敗', '無法產生摘要。');
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleBackupToDrive = async (note) => {
    if (!isGoogleConnected || !window.gapi?.client?.getToken()) {
      triggerNotification('請先登入', '需先在設定登入 Google 帳號才能備份。');
      return;
    }

    setIsUploadingDrive(true);
    // 只有在手動點擊（非自動備份）時才顯示初始通知？或者統一顯示
    triggerNotification('雲端備份中', `正在同步「${note.title}」至 Drive...`);

    try {
      // 1. 確保根資料夾 "GSAT Pro 筆記" 存在
      const rootFolderRes = await window.gapi.client.drive.files.list({
        q: "name='GSAT Pro 筆記' and mimeType='application/vnd.google-apps.folder' and trashed=false",
        fields: 'files(id)'
      });

      let rootFolderId = rootFolderRes.result.files.length > 0 ? rootFolderRes.result.files[0].id : null;
      if (!rootFolderId) {
        const createRootRes = await window.gapi.client.drive.files.create({
          resource: { name: 'GSAT Pro 筆記', mimeType: 'application/vnd.google-apps.folder' },
          fields: 'id'
        });
        rootFolderId = createRootRes.result.id;
      }

      // 2. 確保科目資料夾存在
      const subjectName = note.subject || '未分類';
      const subFolderRes = await window.gapi.client.drive.files.list({
        q: `name='${subjectName}' and '${rootFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id)'
      });

      let subFolderId = subFolderRes.result.files.length > 0 ? subFolderRes.result.files[0].id : null;
      if (!subFolderId) {
        const createSubRes = await window.gapi.client.drive.files.create({
          resource: { name: subjectName, mimeType: 'application/vnd.google-apps.folder', parents: [rootFolderId] },
          fields: 'id'
        });
        subFolderId = createSubRes.result.id;
      }

      // 3. 上傳或更新筆記文字檔
      const fileName = `${note.title}.txt`;
      const fileContent = `標題: ${note.title}\n分類: ${note.category}\n日期: ${note.date}\n\n內容:\n${note.content}`;

      const existingFileRes = await window.gapi.client.drive.files.list({
        q: `name='${fileName}' and '${subFolderId}' in parents and trashed=false`,
        fields: 'files(id)'
      });
      const existingFileId = existingFileRes.result.files.length > 0 ? existingFileRes.result.files[0].id : null;

      const boundary = '-------314159265358979323846';
      if (existingFileId) {
        await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
            'Content-Type': 'text/plain; charset=UTF-8'
          },
          body: fileContent
        });
      } else {
        const fileMetadata = { name: fileName, parents: [subFolderId] };
        const multipartBody =
          `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(fileMetadata)}\r\n` +
          `--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${fileContent}\r\n` +
          `--${boundary}--`;

        await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
            'Content-Type': `multipart/related; boundary=${boundary}`
          },
          body: multipartBody
        });
      }

      // 4. 同步所有附件檔
      const noteAttachments = note.attachments || [];

      for (const att of noteAttachments) {
        const attName = att.name;
        const base64Data = att.data.split(',')[1];
        const mimeType = att.type === 'image' ? (att.data.split(';')[0].split(':')[1] || 'image/jpeg') : 'application/octet-stream';

        const existingAttRes = await window.gapi.client.drive.files.list({
          q: `name='${attName}' and '${subFolderId}' in parents and trashed=false`,
          fields: 'files(id)'
        });
        const existingAttId = existingAttRes.result.files.length > 0 ? existingAttRes.result.files[0].id : null;

        if (existingAttId) {
          await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingAttId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
              'Content-Type': mimeType
            },
            body: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
          });
        } else {
          const attMetadata = { name: attName, parents: [subFolderId] };
          const attMultipartBody =
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(attMetadata)}\r\n` +
            `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}\r\n` +
            `--${boundary}--`;

          await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: attMultipartBody
          });
        }
      }

      // 相容舊資料 & 上傳圖片
      if (note.image && (!note.attachments || note.attachments.length === 0)) {
        const imgName = `${note.title}_附圖.jpg`;
        const base64Data = note.image.split(',')[1];

        const existingImgRes = await window.gapi.client.drive.files.list({
          q: `name='${imgName}' and '${subFolderId}' in parents and trashed=false`,
          fields: 'files(id)'
        });
        const existingImgId = existingImgRes.result.files.length > 0 ? existingImgRes.result.files[0].id : null;

        if (existingImgId) {
          await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingImgId}?uploadType=media`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
              'Content-Type': 'image/jpeg'
            },
            body: Uint8Array.from(atob(base64Data), c => c.charCodeAt(0))
          });
        } else {
          const imgMetadata = { name: imgName, parents: [subFolderId] };
          const imgMultipartBody =
            `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(imgMetadata)}\r\n` +
            `--${boundary}\r\nContent-Type: image/jpeg\r\nContent-Transfer-Encoding: base64\r\n\r\n${base64Data}\r\n` +
            `--${boundary}--`;

          await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${window.gapi.client.getToken().access_token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: imgMultipartBody
          });
        }
      }


      triggerNotification('同步成功 ☁️', `筆記「${note.title}」已安全存入 Drive。`);

    } catch (e) {
      console.error("Drive 備份失敗", e);
      if (e.status === 403 || (e.result?.error?.code === 403)) {
        triggerNotification('權限不足 (403)', '請確保已在 Google Cloud Console 開啟 Drive API，或嘗試登出後重新登入授權。');
      } else {
        triggerNotification('雲端備份失敗', '請確認網路連線或重新登入 Google 帳號。');
      }
    } finally {
      setIsUploadingDrive(false);
    }
  };

  if (!selectedSubject) {
    return (
      <div className="space-y-6 animate-fadeIn flex flex-col w-full text-left mb-8">
        <div className="flex justify-between items-center px-1">
          <div className="flex flex-col gap-1">
            <h2 className="text-2xl font-black text-gray-950 flex items-center gap-2.5">
              <Library className="text-emerald-500" size={28} /> 知識筆記總覽
            </h2>
            <p className="text-[13px] font-bold text-gray-500 ml-9">點選科目開始整理你的專屬學測秘笈</p>
          </div>
          <button
            onClick={() => setIsEditMode(!isEditMode)}
            className={`p-2.5 rounded-xl transition-all active:scale-90 ${isEditMode ? 'bg-red-500 text-white shadow-lg' : 'bg-gray-100 text-gray-500'}`}
          >
            {isEditMode ? <CheckCircle2 size={20} /> : <Edit3 size={20} />}
          </button>
        </div>

        {showAddSubject && (
          <div className="bg-white p-5 rounded-[28px] border border-emerald-100 shadow-sm animate-fadeIn flex flex-col gap-4">
            <h3 className="text-sm font-black text-emerald-800">新增科目</h3>
            <div className="flex gap-2">
              <input type="text" placeholder="科目圖示 (表情符號)" className="w-1/4 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none text-center" value={newSub.icon} onChange={e => setNewSub({ ...newSub, icon: e.target.value })} />
              <input type="text" placeholder="科目名稱 (例如：生物)" className="flex-1 p-3 bg-gray-50 border border-gray-100 rounded-xl outline-none font-bold" value={newSub.name} onChange={e => setNewSub({ ...newSub, name: e.target.value })} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAddSubject(false)} className="flex-1 py-3 bg-gray-100 text-gray-500 rounded-xl font-black active:scale-95">取消</button>
              <button onClick={handleAddSubject} className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-black shadow-md active:scale-95">確認新增</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {subjects.map(s => {
            const count = notes.filter(n => n.subject === s.name).length;
            return (
              <div key={s.name} className="relative group">
                <button
                  onClick={() => !isEditMode && setSelectedSubject(s)}
                  className={`relative w-full aspect-square bg-white rounded-[32px] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-3 overflow-hidden active:scale-95 transition-all ${!isEditMode && 'hover:shadow-md hover:border-emerald-100'} ${isEditMode && 'opacity-60 grayscale-[0.5]'}`}
                >
                  <div className={`absolute top-0 left-0 w-full h-1.5 opacity-20 ${s.color.replace('text', 'bg')}`}></div>
                  <div className={`p-4 rounded-3xl ${s.color.replace('text', 'bg-').replace('600', '50')} ${!isEditMode && 'group-hover:scale-110'} transition-transform`}>
                    <div className="text-4xl">{s.icon}</div>
                  </div>
                  <div className="flex flex-col items-center gap-0.5">
                    <span className="text-[15px] font-black text-gray-900">{s.name}</span>
                    <span className="text-[11px] font-bold text-gray-400">{count} 則筆記</span>
                  </div>
                </button>
                {isEditMode && (
                  <button
                    onClick={() => handleDeleteSubject(s.name)}
                    className="absolute -top-1 -right-1 p-2 bg-red-500 text-white rounded-full shadow-lg active:scale-90 z-10 animate-pulse"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            );
          })}

          <button
            onClick={() => setShowAddSubject(true)}
            className="aspect-square bg-white/50 border-2 border-dashed border-gray-200 rounded-[32px] flex flex-col items-center justify-center gap-2 text-gray-400 hover:bg-white hover:border-emerald-200 hover:text-emerald-500 transition-all active:scale-95"
          >
            <Plus size={32} />
            <span className="text-[13px] font-black">新增科目</span>
          </button>
        </div>
      </div>
    );
  }

  const sn = notes.filter(n => n.subject === selectedSubject?.name);
  return (
    <div className="space-y-5 animate-fadeIn flex flex-col w-full text-left mb-8 pb-10 relative">
      <QuizModal
        isOpen={isQuizOpen}
        onClose={() => setIsQuizOpen(false)}
        quizData={quizData}
        subject={selectedSubject?.name}
      />

      <div className="flex items-center justify-between border-b border-gray-100 pb-5 px-1">
        <div className="flex items-center gap-4">
          <button onClick={() => setSelectedSubject(null)} className="p-3 bg-white rounded-[18px] shadow-sm text-gray-600 border border-gray-100 active:scale-90 transition-all hover:bg-gray-50 flex items-center justify-center">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white shadow-sm border border-gray-100 flex items-center justify-center text-3xl">
              {selectedSubject?.icon}
            </div>
            <div>
              <h2 className="text-[20px] font-black text-gray-950 tracking-tight">{selectedSubject?.name} 筆記</h2>
              <p className="text-[12px] font-bold text-gray-400 uppercase tracking-wider">{sn.length} 項內容已存檔</p>
            </div>
          </div>
        </div>

        {selectedSubject?.name !== '數學' && (
          <button
            onClick={handleGenerateQuiz}
            disabled={isGeneratingQuiz || sn.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl text-[13px] font-black shadow-lg shadow-purple-500/20 active:scale-95 disabled:opacity-40 transition-all"
          >
            {isGeneratingQuiz ? <RefreshCw size={16} className="animate-spin" /> : <Wand2 size={16} />}
            AI 出題
          </button>
        )}
      </div>

      <div className="bg-white/70 backdrop-blur-xl p-6 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-1000"></div>

        <div className="relative z-10 flex flex-col gap-4">
          <div className="flex gap-2.5">
            <div className="relative flex-shrink-0 w-32">
              <select
                className="w-full h-full bg-gray-50/50 border border-gray-200/50 rounded-2xl px-3.5 pr-8 appearance-none text-[13px] font-black outline-none focus:border-emerald-300 transition-all cursor-pointer"
                value={newNote.category}
                onChange={e => setNewNote({ ...newNote, category: e.target.value })}
              >
                {NOTE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <ChevronLeft size={14} className="-rotate-90" />
              </div>
            </div>
            <div className="flex-1 relative">
              <input
                type="text"
                className="w-full bg-gray-50/50 border border-gray-200/50 rounded-2xl px-5 py-4 outline-none text-[15px] font-black focus:border-emerald-300 focus:bg-white transition-all shadow-sm"
                placeholder="輸入筆記標題..."
                value={newNote.title}
                onChange={e => setNewNote({ ...newNote, title: e.target.value })}
              />
              <div className="absolute left-0 bottom-0 w-0 h-0.5 bg-emerald-500 transition-all duration-300 group-focus-within:w-full"></div>
            </div>
          </div>

          <div className="relative">
            <textarea
              className="w-full bg-gray-50/80 border border-gray-200/50 rounded-[24px] p-5 text-[15px] font-bold text-gray-800 min-h-[140px] outline-none focus:bg-white focus:border-emerald-300 transition-all resize-none shadow-inner leading-relaxed"
              placeholder="開始記錄您的學習內容..."
              value={newNote.content}
              onChange={e => setNewNote({ ...newNote, content: e.target.value })}
            />
          </div>

          {attachments.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 animate-fadeIn p-1">
              {attachments.map((att) => (
                <div key={att.id} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200/50 shadow-sm group/att bg-white">
                  {att.type === 'image' ? (
                    <img src={att.data} alt={att.name} className="w-full h-full object-cover group-hover/att:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2">
                      <FileText size={20} className="text-emerald-500 mb-1" />
                      <span className="text-[9px] font-black text-gray-400 text-center line-clamp-1 truncate w-full px-1">{att.name}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))}
                    className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full backdrop-blur-md active:scale-90 transition-all opacity-0 group-hover/att:opacity-100"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex gap-2 flex-grow">
              <label className="flex-1 flex items-center justify-center gap-2 text-[13px] font-black text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50 border border-emerald-100/50 py-3.5 rounded-2xl cursor-pointer active:scale-95 transition-all group/btn">
                <Upload size={18} className="group-hover/btn:-translate-y-0.5 transition-transform" /> 上傳檔案
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
              <button
                onClick={handleAiSummarize}
                disabled={isProcessingAI}
                className="flex-1 flex items-center justify-center gap-2 text-[13px] font-black bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100/50 border border-indigo-100/50 py-3.5 rounded-2xl active:scale-95 transition-all disabled:opacity-50 group/btn"
              >
                {isProcessingAI ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} className="text-indigo-500" />}
                AI 摘要
              </button>
            </div>
            <button
              onClick={handleSaveNote}
              className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              <Save size={24} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-5 mt-4">
        <h3 className="text-[14px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 pl-2 border-l-4 border-emerald-500">歷史紀錄</h3>
        {sn.map((n, index) => (
          <div
            key={n.id}
            className="group p-6 bg-white rounded-[32px] shadow-sm border border-gray-100 relative text-left hover:shadow-md transition-all duration-300 animate-slideUp"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 ${n.category === '錯題本' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-800'} rounded-[10px] text-[10px] font-black tracking-wide shadow-sm border-white/50 border`}>
                  {String(n.category)}
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 font-bold ml-1">
                  <Calendar size={13} className="text-gray-300" /> {String(n.date)}
                </div>
              </div>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleBackupToDrive(n)}
                  disabled={isUploadingDrive}
                  className="p-2.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"
                  title="備份至 Google Drive"
                >
                  <FolderPlus size={18} />
                </button>
                <button
                  onClick={() => handleDeleteNote(n.id)}
                  className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                  title="刪除筆記"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>

            <h4 className="font-black text-gray-900 text-[18px] mb-3 leading-tight tracking-tight">{String(n.title)}</h4>

            {((n.attachments && n.attachments.length > 0) || n.image) && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                {n.attachments ? n.attachments.map((att) => (
                  <div key={att.id} className="w-full h-32 rounded-2xl overflow-hidden border border-gray-50 shadow-inner group-hover/att:shadow-md transition-shadow relative">
                    {att.type === 'image' ? (
                      <img src={att.data} alt={att.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    ) : (
                      <div className="w-full h-32 bg-gray-50 flex flex-col items-center justify-center p-3">
                        <FileText size={24} className="text-gray-400 mb-1" />
                        <span className="text-[10px] font-bold text-gray-500 text-center line-clamp-2">{att.name}</span>
                      </div>
                    )}
                  </div>
                )) : n.image && (
                  <div className="w-full h-48 rounded-2xl overflow-hidden mb-4 border border-gray-50 shadow-inner">
                    <img src={n.image} alt="筆記附圖" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}


            <div className="relative">
              <p className="text-[14.5px] font-bold text-gray-700 whitespace-pre-wrap leading-[1.7] tracking-normal mb-1">
                {String(n.content)}
              </p>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 opacity-[0.03] text-emerald-950">
                <CheckCircle2 size={32} />
              </div>
            </div>
          </div>
        ))}
        {sn.length === 0 && (
          <div className="text-center py-20 bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200">
            <div className="inline-flex p-4 bg-white rounded-3xl shadow-sm mb-4">
              <Notebook className="text-gray-200" size={32} />
            </div>
            <p className="text-gray-400 font-black text-[15px]">尚未有任何筆記，點擊上方開始記錄！</p>
          </div>
        )}
      </div>
    </div>
  );
};

// 5. 校園特約商店 (Stores) - 支援密碼保護的後台管理與導航
const StoresTab = ({ stores, setStores }) => {
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [newStore, setNewStore] = useState({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '步行 5 分鐘', address: '' });

  const handleAdminLogin = () => {
    if (adminPassword === 'admin') {
      setIsAdminMode(true);
      setShowAdminLogin(false);
      setAdminPassword('');
    } else {
      alert('密碼錯誤！');
    }
  };

  const handleAddStore = () => {
    if (!newStore.name || !newStore.discount) return;
    setStores(prev => [{ id: Date.now(), ...newStore }, ...prev]);
    setNewStore({ name: '', discount: '', type: '餐飲', icon: '🏪', distance: '步行 5 分鐘', address: '' });
  };

  const handleDeleteStore = (id) => {
    setStores(prev => prev.filter(s => s.id !== id));
  };

  const handleNavigate = (storeName, address) => {
    const query = encodeURIComponent(address || storeName);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  return (
    <div className="space-y-5 flex flex-col w-full text-left animate-fadeIn mb-8">
      <div className="flex justify-between items-center px-1">
        <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3"><Store className="text-emerald-500" size={28} /> 校園特約商店</h2>
        <button onClick={() => isAdminMode ? setIsAdminMode(false) : setShowAdminLogin(!showAdminLogin)} className={`p-2 rounded-xl text-sm font-black transition-colors ${isAdminMode ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
          <Settings size={16} />
        </button>
      </div>
      <p className="text-[13px] font-bold text-gray-500 px-1">出示內湖高中學生證即可享有專屬優惠！</p>

      {showAdminLogin && !isAdminMode && (
        <div className="bg-white p-5 rounded-[28px] border border-gray-200 flex flex-col gap-3 shadow-sm">
          <h3 className="text-sm font-black text-gray-800 mb-1">管理員登入</h3>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="請輸入密碼 (預設: admin)"
              className="flex-1 p-3 rounded-xl border border-gray-200 outline-none text-sm font-bold"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
            />
            <button onClick={handleAdminLogin} className="bg-gray-800 text-white font-black px-4 rounded-xl active:scale-95 transition-transform">登入</button>
          </div>
        </div>
      )}

      {isAdminMode && (
        <div className="bg-emerald-50/50 p-5 rounded-[28px] border border-emerald-100 flex flex-col gap-3 relative">
          <button onClick={() => setIsAdminMode(false)} className="absolute top-4 right-4 p-1.5 bg-emerald-100 text-emerald-600 rounded-full active:scale-90"><X size={16} /></button>
          <h3 className="text-sm font-black text-emerald-800 mb-1">新增特約商店</h3>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" placeholder="商店名稱" className="p-3 rounded-xl border border-emerald-200 outline-none text-sm font-bold" value={newStore.name} onChange={e => setNewStore({ ...newStore, name: e.target.value })} />
            <input type="text" placeholder="優惠內容" className="p-3 rounded-xl border border-emerald-200 outline-none text-sm font-bold" value={newStore.discount} onChange={e => setNewStore({ ...newStore, discount: e.target.value })} />
            <input type="text" placeholder="地址 (選填)" className="p-3 rounded-xl border border-emerald-200 outline-none text-sm font-bold" value={newStore.address} onChange={e => setNewStore({ ...newStore, address: e.target.value })} />
            <select className="p-3 rounded-xl border border-emerald-200 outline-none text-sm font-bold bg-white" value={newStore.type} onChange={e => setNewStore({ ...newStore, type: e.target.value })}>
              <option value="餐飲">餐飲</option>
              <option value="飲料">飲料</option>
              <option value="咖啡">咖啡</option>
              <option value="文具">文具</option>
              <option value="其他">其他</option>
            </select>
          </div>
          <button onClick={handleAddStore} className="w-full bg-emerald-600 text-white font-black py-3 rounded-xl shadow-md active:scale-95 transition-transform mt-1">新增商店</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {stores.map(store => (
          <div key={store.id} className="bg-white p-5 rounded-[28px] shadow-sm border border-gray-100 flex flex-col relative overflow-hidden transition-all hover:shadow-md">
            {isAdminMode && (
              <button onClick={() => handleDeleteStore(store.id)} className="absolute top-4 right-4 p-2 bg-red-50 text-red-500 rounded-full active:scale-90"><Trash2 size={16} /></button>
            )}
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-3">
                <span className="text-3xl bg-gray-50 p-2.5 rounded-2xl">{store.icon}</span>
                <div>
                  <h4 className="text-[16px] font-black text-gray-900 pr-8">{store.name}</h4>
                  <span className="text-[11px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{store.type}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-50 flex flex-col gap-3">
              <div className="flex items-start gap-2 text-[13px] font-bold text-gray-700">
                <CreditCard size={16} className="text-orange-500 mt-0.5 shrink-0" />
                <span>{store.discount}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[12px] font-bold text-gray-400">
                  <MapPin size={14} className="shrink-0" />
                  <span>{store.distance}</span>
                </div>
                <button onClick={() => handleNavigate(store.name, store.address)} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[11px] font-black active:scale-95 transition-transform">
                  <Navigation size={12} /> 導航前往
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const YoubikeWidget = () => {
  const [youbikeData, setYoubikeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchYoubike = useCallback(async () => {
    setError(null);

    try {
      const res = await fetch('https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json', {
        cache: 'no-store'
      });

      if (!res.ok) {
        throw new Error(`API 請求失敗，狀態碼：${res.status}`);
      }

      const data = await res.json();

      if (!Array.isArray(data)) {
        throw new Error('API 返回的資料格式不正確');
      }

      // 擴大搜尋範圍，並篩選前 6 筆顯示
      const filtered = data.filter(station =>
        station.sna.includes('內湖高中') ||
        station.sna.includes('捷運文德站') ||
        station.sna.includes('文德路22弄') ||
        station.sna.includes('紫陽公園') ||
        station.sna.includes('瑞陽公園')
      ).slice(0, 6);

      setYoubikeData(filtered);

      const now = new Date();
      setLastUpdateTime(now.toLocaleTimeString('zh-TW', { hour12: false }));

    } catch (e) {
      console.error('Youbike Fetch Error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchYoubike();
    const interval = setInterval(fetchYoubike, 30000);
    return () => clearInterval(interval);
  }, [fetchYoubike]);

  const handleNavigate = (stationName, lat, lng) => {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');
  };

  return (
    <div className="bg-white p-5 md:p-6 rounded-[32px] shadow-sm border border-gray-100">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-[15px] font-black text-gray-800 flex items-center gap-2">
          <Bike className="text-emerald-500" size={18} /> 附近 YouBike 站點
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[18px] font-black text-gray-800 font-mono leading-none">
              {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
            </span>
          </div>
          <button onClick={fetchYoubike} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg active:scale-90 transition-transform hover:bg-gray-100">
            <RefreshCw size={14} className={loading && youbikeData.length ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        {loading && !youbikeData.length ? (
          <span className="text-[13px] font-bold text-gray-500 flex items-center gap-1.5"><RefreshCw size={14} className="animate-spin" /> 載入中...</span>
        ) : (
          <span className="text-[12px] font-bold text-gray-400">最後更新: {lastUpdateTime}</span>
        )}
        {error && <span className="text-[12px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-lg">⚠️ {error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {youbikeData.map(station => {
          const isElectric = station.sna.includes('2.0E');
          const cleanName = station.sna.replace(/YouBike2\.0E?_/, '');

          return (
            <div key={station.sno} className={`p-4 rounded-2xl border flex flex-col gap-3 transition-all hover:shadow-md ${isElectric ? 'bg-orange-50/30 border-orange-100' : 'bg-gray-50 border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-[14px] font-black text-gray-900 flex items-center gap-1.5">
                    {cleanName}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    {isElectric ? (
                      <span className="text-[10px] font-black bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md flex items-center gap-1"><Zap size={10} /> 2.0E 電動車</span>
                    ) : (
                      <span className="text-[10px] font-black bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-md">2.0 一般車</span>
                    )}
                  </div>
                </div>

                <button onClick={() => handleNavigate(cleanName, station.latitude, station.longitude)} className="p-2 bg-white rounded-xl shadow-sm text-blue-500 active:scale-90 border border-gray-100 transition-colors hover:bg-blue-50">
                  <Navigation size={14} />
                </button>
              </div>

              <div className="flex bg-white rounded-xl p-2 border border-gray-100/50 shadow-sm mt-1">
                <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 mb-0.5">可借車輛</span>
                  <span className={`text-[18px] font-black ${station.available_rent_bikes > 0 ? (isElectric ? 'text-orange-500' : 'text-emerald-600') : 'text-gray-300'}`}>
                    {station.available_rent_bikes}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center">
                  <span className="text-[10px] font-bold text-gray-400 mb-0.5">可還空位</span>
                  <span className={`text-[18px] font-black ${station.available_return_bikes > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                    {station.available_return_bikes}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && youbikeData.length === 0 && !error && (
        <p className="text-[13px] font-bold text-gray-500 mt-2 text-center py-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">找不到附近的 YouBike 站點</p>
      )}
    </div>
  );
};

const TransitWidget = () => {
  const [selectedTransport, setSelectedTransport] = useState('mrt');

  const transportModes = [
    { id: 'mrt', label: '捷運', icon: '🚇' },
    { id: 'train', label: '台鐵/高鐵', icon: '🚄' },
    { id: 'bus', label: '市區公車', icon: '🚌' },
    { id: 'coach', label: '客運/專車', icon: '🛣️' }
  ];

  const transitData = {
    'mrt': {
      title: '捷運直達 (最推薦)',
      time: '通勤首選',
      steps: [
        { icon: <TrainFront size={20} />, label: '搭乘文湖線', detail: '至「文德站」' },
        { icon: <Navigation size={20} />, label: '2號出口出站', detail: '沿文德路直行' },
        { icon: <MapPin size={20} />, label: '抵達校門口', detail: '步行約 3 分鐘' }
      ]
    },
    'train': {
      title: '高鐵 / 台鐵轉乘',
      time: '跨縣市最快',
      steps: [
        { icon: <Train size={20} />, label: '搭至南港站', detail: '高鐵或台鐵皆可' },
        { icon: <TrainFront size={20} />, label: '轉乘捷運', detail: '板南線轉文湖線' },
        { icon: <MapPin size={20} />, label: '抵達文德站', detail: '步行 3 分鐘' }
      ]
    },
    'bus': {
      title: '市區聯營公車',
      time: '免轉乘直達',
      steps: [
        { icon: <Bus size={20} />, label: '搭乘市區公車', detail: '內湖幹線/214/278' },
        { icon: <Navigation size={20} />, label: '內湖高中站', detail: '於此站牌下車' },
        { icon: <MapPin size={20} />, label: '抵達校門口', detail: '步行 1 分鐘' }
      ]
    },
    'coach': {
      title: '國道客運 / 跳蛙專車',
      time: '基隆/桃園/新北',
      steps: [
        { icon: <Bus size={20} />, label: '搭乘國道客運', detail: '1573/9005至內科' },
        { icon: <TrainFront size={20} />, label: '站點轉乘', detail: '轉捷運至文德站' },
        { icon: <MapPin size={20} />, label: '抵達內湖高中', detail: '步行或YouBike' }
      ]
    }
  };

  const currentRoute = transitData[selectedTransport];

  return (
    <div className="space-y-4 flex flex-col w-full text-left animate-fadeIn mb-8">
      <style>{`
        @keyframes routeFlow {
          0% { width: 0%; opacity: 0.5; }
          50% { opacity: 1; }
          100% { width: 100%; opacity: 0; }
        }
        .animate-route-flow {
          animation: routeFlow 2s ease-in-out infinite;
        }
      `}</style>

      <div className="bg-white p-5 md:p-6 rounded-[32px] shadow-sm border border-gray-100">
        <h3 className="text-[16px] font-black text-gray-800 mb-4 flex items-center gap-2">
          <MapPin className="text-blue-500" size={20} /> 最佳交通路徑規劃
        </h3>

        {/* Transport Mode Tabs */}
        <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide border-b border-gray-50 mb-4">
          {transportModes.map(t => (
            <button
              key={t.id}
              onClick={() => setSelectedTransport(t.id)}
              className={`px-4 py-2.5 rounded-xl text-[14px] font-black flex-shrink-0 transition-all flex items-center gap-2 ${selectedTransport === t.id ? 'bg-blue-500 text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
            >
              <span className="text-lg">{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Route Visualizations */}
        <div className="flex flex-col animate-fadeIn">
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[15px] font-black text-gray-900">{currentRoute.title}</h4>
              <span className="text-[12px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md flex items-center gap-1">
                <Clock size={14} /> {currentRoute.time}
              </span>
            </div>

            <div className="flex items-center justify-between relative px-2 py-4">
              {/* Background Line - 調整 top 為 5.5 或更精確的值使其中間穿過 */}
              <div className="absolute top-[38px] left-12 right-12 h-1 bg-gray-200 rounded-full z-0 overflow-hidden">
                {/* Animated Flow Line */}
                <div className="h-full bg-blue-400 rounded-full animate-route-flow origin-left"></div>
              </div>


              {currentRoute.steps.map((step, sIdx) => (
                <div key={sIdx} className="flex flex-col items-center gap-3 z-10 w-1/3">
                  <div className={`w-11 h-11 rounded-full text-white flex items-center justify-center shadow-md border-[3px] border-white transition-transform hover:scale-110 ${sIdx === currentRoute.steps.length - 1 ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                    {step.icon}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <span className="text-[14px] font-black text-gray-800 leading-tight">{step.label}</span>
                    <span className="text-[12px] font-bold text-gray-500 mt-1 leading-tight whitespace-pre-wrap">{step.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 新增：學校官網公告元件
const SchoolNewsWidget = () => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);

  // 內湖高中 NSS 系統的最新消息通常在這個頁面
  const NEWS_PAGE_URL = "https://www.nhsh.tp.edu.tw/content?a=T0RESU5qYzNPVE01TlRFPTBjVE0zRWpOeDRrVGludGVseQ==&c=T0RESU9ERXhNamsyTVRnPTNrek01RWpOeElrVGludGVseQ==";

  useEffect(() => {
    // 由於 CORS 限制，前端直接 fetch 學校網站會失敗
    // 這裡通常需要一個 API Proxy 或 Serverless Function
    // 暫時以模擬資料與官方連結呈現，確保 UI 穩定
    setTimeout(() => {
      setNews([
        { title: "114學年度第2學期學習歷程檔案上傳截止日期公告", date: "2026-03-05" },
        { title: "第38屆學生會正副會長遴選辦法", date: "2026-03-03" },
        { title: "HVL高中排球聯賽決賽應援團招募資訊", date: "2026-03-01" }
      ]);
      setLoading(false);
    }, 800);
  }, []);

  return (
    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 mt-5">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[16px] font-black text-gray-800 flex items-center gap-2">
          <Globe className="text-blue-500" size={20} /> 學校最新公告
        </h3>
        <a href={NEWS_PAGE_URL} target="_blank" rel="noreferrer" className="text-[12px] font-black text-blue-600 hover:underline">查看更多</a>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <RefreshCw size={20} className="text-gray-200 animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {news.map((item, idx) => (
            <a key={idx} href={NEWS_PAGE_URL} target="_blank" rel="noreferrer" className="block p-3.5 bg-gray-50/50 hover:bg-blue-50/50 border border-gray-100 rounded-2xl transition-all group">
              <div className="flex flex-col gap-1">
                <div className="text-[11px] font-black text-blue-500/70">{item.date}</div>
                <div className="text-[13.5px] font-black text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-1">{item.title}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

// 6. 交通與 YouBike
const TrafficTab = () => {

  return (
    <div className="space-y-5 flex flex-col w-full text-left animate-fadeIn mb-8">
      <h2 className="text-2xl font-black text-gray-900 flex items-center gap-3 px-1"><Bus className="text-emerald-500" size={28} /> 交通與 YouBike</h2>

      <YoubikeWidget />
      <TransitWidget />
    </div>
  );
};

// ================= 設定彈出視窗 =================
const SettingsModal = ({ isOpen, onClose, triggerNotification, handleAuthClick, isGoogleConnected, handleSignoutClick, requestPushPermission, testPushNotification }) => {
  const [geminiKey, setGeminiKey] = useState(localStorage.getItem('gsat_gemini_key') || '');
  const [openRouterKey, setOpenRouterKey] = useState(localStorage.getItem('gsat_openrouter_key') || '');

  if (!isOpen) return null;

  const handleSaveGeminiKey = (e) => {
    const val = e.target.value;
    setGeminiKey(val);
    localStorage.setItem('gsat_gemini_key', val);
  };

  const handleSaveOpenRouterKey = (e) => {
    const val = e.target.value;
    setOpenRouterKey(val);
    localStorage.setItem('gsat_openrouter_key', val);
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-[600px] bg-[#f8f8f9] h-[85vh] sm:h-auto sm:max-h-[85vh] rounded-t-[40px] sm:rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-fadeIn">
        <div className="bg-white px-6 py-5 flex justify-between items-center border-b border-gray-100">
          <h2 className="text-xl font-black text-gray-900 flex items-center gap-2"><Settings className="text-emerald-500" size={24} /> 系統設定</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 text-gray-500 rounded-full active:scale-90"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 通知設定 */}


          <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
            <h3 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><Bell className="text-orange-500" size={18} /> 通知功能設定</h3>
            <div className="flex gap-2">
              <button onClick={requestPushPermission} className="flex-1 bg-orange-50 hover:bg-orange-100 text-orange-600 px-4 py-3 rounded-2xl text-[13px] font-black flex justify-center items-center gap-2 transition-all active:scale-95 border border-orange-100">
                <Bell size={16} /> 授權系統通知
              </button>
              <button onClick={testPushNotification} className="flex-1 bg-white hover:bg-gray-50 text-gray-700 px-4 py-3 rounded-2xl text-[13px] font-black flex justify-center items-center gap-2 transition-all active:scale-95 border border-gray-200">
                <Sparkles size={16} /> 測試推播功能
              </button>
            </div>
          </div>

          {/* Google 服務串接 */}
          <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
            <h3 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><Cloud className="text-blue-500" size={18} /> Google 服務串接</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                <div>
                  <div className="text-[14px] font-black text-gray-900">Google 帳號</div>
                  <div className="text-[12px] font-bold text-gray-500 mt-1">用於備份筆記至 Drive</div>
                </div>
                {isGoogleConnected ? (
                  <button onClick={handleSignoutClick} className="px-4 py-2 rounded-xl text-[12px] font-black transition-all shadow-sm bg-red-50 text-red-600 border border-red-200 active:scale-95">
                    登出帳號
                  </button>
                ) : (
                  <button onClick={handleAuthClick} className="px-4 py-2 rounded-xl text-[12px] font-black transition-all shadow-sm bg-blue-600 text-white active:scale-95">
                    登入 Google
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* AI 引擎設定 */}
          <div className="bg-white p-5 rounded-[28px] border border-gray-100 shadow-sm">
            <h3 className="text-[14px] font-black text-gray-800 mb-4 flex items-center gap-2"><BrainCircuit className="text-purple-500" size={18} /> AI 引擎設定</h3>
            <div className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-black text-gray-400 ml-1 flex justify-between">
                  GOOGLE GEMINI KEY (優先)
                  {!geminiKey && <span className="text-amber-500">未設定</span>}
                </label>
                <input
                  type="password"
                  placeholder="輸入您的 Google Gemini API Key"
                  value={geminiKey}
                  onChange={handleSaveGeminiKey}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-[14px] font-black outline-none focus:border-purple-300"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[12px] font-black text-gray-400 ml-1 flex justify-between">
                  OPENROUTER KEY (備援)
                  {!openRouterKey && <span className="text-blue-500">可使用免費模型</span>}
                </label>
                <input
                  type="password"
                  placeholder="輸入您的 OpenRouter API Key"
                  value={openRouterKey}
                  onChange={handleSaveOpenRouterKey}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3.5 text-[14px] font-black outline-none focus:border-blue-300"
                />
              </div>

              <div className="p-3 bg-purple-50 rounded-xl">
                <p className="text-[11px] font-bold text-gray-500 leading-relaxed">
                  💡 系統將依序嘗試：Gemini ➡ OpenRouter ➡ 內建 AI (Chrome window.ai)。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- ★ Unified AI Fetcher (Resilient Fallback) ★ ---
const fetchAI = async (prompt, options = {}) => {
  const { temperature = 0.7, responseJson = false, image = null, images = [] } = options;
  const geminiKey = localStorage.getItem('gsat_gemini_key');
  const openRouterKey = localStorage.getItem('gsat_openrouter_key');

  // 將單一 image 合併進 images 陣列處理
  const allImages = [...images];
  if (image) allImages.push(image);

  // 1. Try Google Gemini API (Primary)
  if (geminiKey) {
    try {
      const contents = [{ parts: [{ text: prompt }] }];
      if (allImages.length > 0) {
        allImages.forEach(img => contents[0].parts.push({ inlineData: img }));
      }
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature, responseMimeType: responseJson ? "application/json" : "text/plain" }
        })
      });
      const data = await res.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }
    } catch (e) { console.warn("Gemini failing, trying fallback...", e); }
  }

  // 2. Try OpenRouter (Secondary / Free Models)
  if (openRouterKey) {
    try {
      const body = {
        model: "google/gemini-2.0-flash-exp:free",
        messages: [{ role: "user", content: prompt }],
        temperature
      };
      if (allImages.length > 0) {
        body.messages[0].content = [
          { type: "text", text: prompt },
          ...allImages.map(img => ({
            type: "image_url",
            image_url: { url: `data:${img.mimeType};base64,${img.data}` }
          }))
        ];
      }
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openRouterKey}`,
          'HTTP-Referer': 'https://gsat-pro.vercel.app',
          'X-Title': 'GSAT Pro'
        },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data.choices?.[0]?.message?.content) {
        return data.choices[0].message.content;
      }
    } catch (e) { console.warn("OpenRouter failing, trying fallback...", e); }
  }

  // 3. Try window.ai (Chrome Gemini Nano - Truly Built-in)
  if (window.ai && window.ai.canCreateTextSession) {
    try {
      const capabilities = await window.ai.canCreateTextSession();
      if (capabilities !== "no") {
        const session = await window.ai.createTextSession();
        return await session.prompt(prompt);
      }
    } catch (e) { console.warn("window.ai failing...", e); }
  }

  throw new Error("無法連接 AI 引擎。請檢查 API Key 或確保瀏覽器支援 AI 功能。");
};

// ================= 主應用程式 =================
const MainApp = () => {
  // --- 1. React States ---
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState({ show: false, title: '', message: '' });
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [isNavOpen, setIsNavOpen] = useState(false);

  const [weeklySchedule, setWeeklySchedule] = useState(() => {
    const saved = localStorage.getItem('gsat_schedule');
    return saved ? JSON.parse(saved) : INITIAL_WEEKLY_SCHEDULE;
  });

  const [contactBook, setContactBook] = useState(() => {
    const saved = localStorage.getItem('gsat_contact_book');
    return saved ? JSON.parse(saved) : {};
  });

  const [notes, setNotes] = useState(() => {
    const saved = localStorage.getItem('gsat_notes');
    return saved ? JSON.parse(saved) : [];
  });

  const [stores, setStores] = useState(() => {
    const saved = localStorage.getItem('gsat_stores');
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });

  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('gsat_subjects');
    return saved ? JSON.parse(saved) : SUBJECTS_LIST;
  });

  // --- 2. Effects for Storage ---
  useEffect(() => { localStorage.setItem('gsat_schedule', JSON.stringify(weeklySchedule)); }, [weeklySchedule]);
  useEffect(() => { localStorage.setItem('gsat_contact_book', JSON.stringify(contactBook)); }, [contactBook]);
  useEffect(() => { localStorage.setItem('gsat_notes', JSON.stringify(notes)); }, [notes]);
  useEffect(() => { localStorage.setItem('gsat_stores', JSON.stringify(stores)); }, [stores]);
  useEffect(() => { localStorage.setItem('gsat_subjects', JSON.stringify(subjects)); }, [subjects]);

  // --- 新增：行動端輸入優化 (防止鍵盤遮擋) ---
  useEffect(() => {
    const handleFocusIn = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const el = e.target;
        // 等待鍵盤彈出並結束滾動
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    return () => document.removeEventListener('focusin', handleFocusIn);
  }, []);

  // --- 3. React Refs ---
  const notifiedSet = useRef(new Set());
  const scheduleRef = useRef(weeklySchedule);
  const tokenClientRef = useRef(null);

  useEffect(() => { scheduleRef.current = weeklySchedule; }, [weeklySchedule]);

  // --- ★ 通知系統 ★ ---
  const triggerNativeNotification = async (title, message) => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    try {
      new Notification(String(title), { body: String(message), icon: '/favicon.ico' });
    } catch (e) {
      if (e.name === 'TypeError' && navigator.serviceWorker) {
        try {
          const reg = await navigator.serviceWorker.ready;
          if (reg) reg.showNotification(String(title), { body: String(message), icon: '/favicon.ico' });
        } catch (swError) {
          console.error("SW Notification failed", swError);
        }
      }
    }
  };

  const triggerNotification = useCallback((title, message) => {
    setNotification({ show: true, title: String(title), message: String(message) });
    setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 6000);
    triggerNativeNotification(title, message);
  }, []);

  // --- ★ Google API 串接邏輯 (修改為支援 Drive) ★ ---

  // 登出
  const handleSignoutClick = useCallback(() => {
    const token = window.gapi?.client?.getToken();
    if (token) {
      window.google.accounts.oauth2.revoke(token.access_token, () => {
        window.gapi.client.setToken('');
        localStorage.removeItem('gsat_google_token');
        setIsGoogleConnected(false);
        triggerNotification('已登出', 'Google 帳號連線已中斷。');
      });
    }
  }, [triggerNotification]);

  // 初始化 Google API
  useEffect(() => {
    const loadScript = (src) => {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
    };

    const initGoogleApi = async () => {
      try {
        await Promise.all([
          loadScript('https://apis.google.com/js/api.js'),
          loadScript('https://accounts.google.com/gsi/client')
        ]);

        await new Promise((resolve) => window.gapi.load('client', resolve));
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });

        const storedToken = localStorage.getItem('gsat_google_token');
        if (storedToken) {
          window.gapi.client.setToken({ access_token: storedToken });
          setIsGoogleConnected(true);
        }

        if (GOOGLE_CLIENT_ID && !GOOGLE_CLIENT_ID.includes("請在這裡貼上")) {
          tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse) => {
              if (tokenResponse.error !== undefined) {
                throw (tokenResponse);
              }
              localStorage.setItem('gsat_google_token', tokenResponse.access_token);
              setIsGoogleConnected(true);
              triggerNotification('Google 登入成功', '您現在可以將筆記備份到 Drive 了！');
            },
          });
        }
      } catch (err) {
        console.error("Google API 載入失敗", err);
      }
    };

    initGoogleApi();
  }, [triggerNotification]);

  const handleAuthClick = () => {
    if (!tokenClientRef.current) {
      triggerNotification('設定未完成', '請先在程式碼中填入有效的 GOOGLE_CLIENT_ID');
      return;
    }
    const token = window.gapi.client.getToken();
    if (token) {
      tokenClientRef.current.requestAccessToken({ prompt: '' });
    } else {
      tokenClientRef.current.requestAccessToken({ prompt: 'consent' });
    }
  };

  const requestPushPermission = async () => {
    if (!("Notification" in window)) {
      triggerNotification('系統提示', '此瀏覽器不支援桌面通知。iOS 用戶請先將網頁「加入主畫面」以支援推播。');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") triggerNotification('授權成功 🎉', '您現在可以接收上課提醒了！');
      else triggerNotification('權限未開啟', '請在瀏覽器設定中允許通知。');
    } catch (error) {
      Notification.requestPermission((permission) => {
        if (permission === "granted") triggerNotification('授權成功 🎉', '您現在可以接收上課提醒了！');
      });
    }
  };

  const testPushNotification = () => {
    if ("Notification" in window && Notification.permission === "granted") triggerNotification("測試成功", "這是一則系統原生推播！");
    else requestPushPermission();
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const dateStr = now.toDateString();

      const todayClasses = scheduleRef.current[day] || [];
      todayClasses.forEach(c => {
        if (!c.startTime) return;
        const startMins = timeToMins(c.startTime);
        const diff = startMins - currentMins;
        if (diff > 0 && diff <= 5) {
          const notifKey = `${c.id}-${dateStr}-5min`;
          if (!notifiedSet.current.has(notifKey)) {
            notifiedSet.current.add(notifKey);
            triggerNotification(`🔔 準備上課：${String(c.subject)}`, `📍 地點：${String(c.location || '未定')}\n👨‍🏫 老師：${String(c.teacher || '無')}`);
          }
        }
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [triggerNotification]);

  // 取得當前分頁名稱
  const getTabName = (id) => {
    const tabs = {
      'dashboard': '日常與課表',
      'english': '單字特訓',
      'contactBook': '電子聯絡簿',
      'notes': '知識筆記',
      'stores': '特約商店',
      'traffic': '交通與 YouBike'
    };
    return tabs[id] || 'GSAT Pro';
  };

  // 下拉選單項目清單
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: '日常與課表' },
    { id: 'english', icon: BookOpen, label: '單字特訓' },
    { id: 'contactBook', icon: Notebook, label: '電子聯絡簿' },
    { id: 'notes', icon: Library, label: '知識筆記' },
    { id: 'stores', icon: Store, label: '特約商店' },
    { id: 'traffic', icon: Bus, label: '交通與 YouBike' },
  ];

  return (
    <>
      <IosNotification notification={notification} />

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        triggerNotification={triggerNotification}
        handleAuthClick={handleAuthClick}
        isGoogleConnected={isGoogleConnected}
        handleSignoutClick={handleSignoutClick}
        requestPushPermission={requestPushPermission}
        testPushNotification={testPushNotification}
      />

      {/* 頂部全域導覽列 */}
      <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 px-5 py-4 flex justify-between items-center shadow-sm">
        <div className="relative">
          <button onClick={() => setIsNavOpen(!isNavOpen)} className="flex items-center gap-2 text-xl font-black text-emerald-950 active:scale-95 transition-transform">
            <Menu size={24} className="text-emerald-600" />
            {getTabName(activeTab)}
          </button>

          {/* 下拉選單內容 */}
          {isNavOpen && (
            <>
              {/* 點擊外部關閉的全螢幕覆蓋層 */}
              <div className="fixed inset-0 w-full h-full z-40" onClick={() => setIsNavOpen(false)}></div>

              <div className="absolute top-full left-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-fadeIn">
                {navItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setSelectedSubject(null);
                      setIsNavOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3.5 text-left font-bold transition-colors ${activeTab === item.id ? 'bg-emerald-50 text-emerald-700' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    <item.icon size={18} className={activeTab === item.id ? 'text-emerald-600' : 'text-gray-400'} />
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <button onClick={() => setSettingsOpen(true)} className="p-2.5 bg-gray-50 text-gray-500 rounded-full active:scale-90 transition-transform">
          <Settings size={20} />
        </button>
      </div>

      {/* 主要內容區塊 */}
      <div className="flex-1 overflow-y-auto scroll-smooth w-full px-4 pt-4 pb-8 touch-pan-y scrollbar-hide bg-[#F7FBFA]">
        {activeTab === 'dashboard' && <DashboardTab
          weeklySchedule={weeklySchedule}
          setWeeklySchedule={setWeeklySchedule}
          subjects={subjects}
          triggerNotification={triggerNotification}
          requestPushPermission={requestPushPermission}
          testPushNotification={testPushNotification}
          setSettingsOpen={setSettingsOpen}
          isGoogleConnected={isGoogleConnected}
        />}
        {activeTab === 'english' && <VocabularyTab />}
        {activeTab === 'contactBook' && <ContactBookTab contactBook={contactBook} setContactBook={setContactBook} subjects={subjects} />}
        {activeTab === 'notes' && <NotesTab
          notes={notes}
          setNotes={setNotes}
          subjects={subjects}
          setSubjects={setSubjects}
          selectedSubject={selectedSubject}
          setSelectedSubject={setSelectedSubject}
          triggerNotification={triggerNotification}
          isGoogleConnected={isGoogleConnected}
        />}
        {activeTab === 'stores' && <StoresTab stores={stores} setStores={setStores} />}
        {activeTab === 'traffic' && <TrafficTab />}
      </div>
    </>
  );
};

export default function App() {
  return (
    <div className="w-full min-h-[100dvh] bg-gray-100 flex justify-center font-sans overflow-hidden">
      <style dangerouslySetInnerHTML={{
        __html: `
          body, html { margin: 0; padding: 0; background-color: #f3f4f6; width: 100%; overscroll-behavior-y: none; }
          .main-container { width: 100%; max-width: 1024px; margin: 0 auto; position: relative; height: 100dvh; height: 100svh; background-color: #F7FBFA; box-shadow: 0 0 40px rgba(0,0,0,0.05); display: flex; flex-direction: column; overflow: hidden; }
          
          /* 針對行動端鍵盤優化 */
          @media (max-width: 768px) {
            .main-container { height: -webkit-fill-available; height: fill-available; }
          }
          
          @supports (padding-bottom: env(safe-area-inset-bottom)) { .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); } }
          @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
          .animate-fadeIn { animation: fadeIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
          .scrollbar-hide::-webkit-scrollbar { display: none; }
          .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
          .font-black { font-weight: 900 !important; }
          * { -webkit-tap-highlight-color: transparent; }
          input, textarea { font-size: 16px !important; } /* 防止 iOS 自動縮放 */
        `}} />
      <div className="main-container">
        <MainApp />
      </div>
    </div>
  );
} 2