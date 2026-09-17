import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, Plus, Trash2, Save, Clock, MapPin, User, BookText,
  GripVertical, ChevronDown, Palette, Upload, AlertCircle, CheckCircle2,
  Calendar, Edit3, Copy, X
} from 'lucide-react';
import { SUBJECTS_LIST, WEEKDAYS, ICON_MAP } from '../../utils/constants';
import toast from 'react-hot-toast';

const EMPTY_COURSE = {
  subject: '', teacher: '', startTime: '08:10', endTime: '09:00',
  location: '', color: '', icon: '', rescheduled: false
};

const ALL_DAYS = [
  { id: 0, label: '日' }, { id: 1, label: '一' }, { id: 2, label: '二' },
  { id: 3, label: '三' }, { id: 4, label: '四' }, { id: 5, label: '五' }, { id: 6, label: '六' }
];

const COLOR_OPTIONS = [
  { name: '紅', value: 'bg-red-500', hex: '#ef4444' },
  { name: '橙', value: 'bg-orange-500', hex: '#f97316' },
  { name: '黃', value: 'bg-yellow-500', hex: '#eab308' },
  { name: '綠', value: 'bg-emerald-500', hex: '#10b981' },
  { name: '藍', value: 'bg-blue-500', hex: '#3b82f6' },
  { name: '靛', value: 'bg-indigo-500', hex: '#6366f1' },
  { name: '紫', value: 'bg-purple-500', hex: '#a855f7' },
  { name: '粉', value: 'bg-pink-500', hex: '#ec4899' },
];

const ScheduleAdminTab = ({
  weeklySchedule, setWeeklySchedule, subjects,
  saveToFirestore, triggerNotification, isAdmin,
  classID, onBack, handleImportTemplate
}) => {
  const [activeDay, setActiveDay] = useState(1);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_COURSE });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);

  const daySchedule = weeklySchedule[activeDay] || [];

  const canEdit = isAdmin || !classID;

  const handleAddCourse = () => {
    if (!canEdit) {
      triggerNotification('權限不足 ❌', '僅管理員可修改班級課表');
      return;
    }
    const lastItem = daySchedule[daySchedule.length - 1];
    const newStart = lastItem ? lastItem.endTime : '08:10';
    const [h, m] = newStart.split(':').map(Number);
    const endMins = h * 60 + m + 50;
    const newEnd = `${String(Math.floor(endMins / 60)).padStart(2, '0')}:${String(endMins % 60).padStart(2, '0')}`;

    setFormData({
      ...EMPTY_COURSE,
      startTime: newStart,
      endTime: newEnd
    });
    setEditingItem('new');
  };

  const handleEditCourse = (item) => {
    if (!canEdit) {
      triggerNotification('權限不足 ❌', '僅管理員可修改班級課表');
      return;
    }
    setFormData({
      subject: item.subject || '',
      teacher: item.teacher || '',
      startTime: item.startTime || '08:10',
      endTime: item.endTime || '09:00',
      location: item.location || '',
      color: item.color || '',
      icon: item.icon || '',
      rescheduled: item.rescheduled || false
    });
    setEditingItem(item.id);
  };

  const handleSaveItem = () => {
    if (!formData.subject.trim()) {
      toast.error('請輸入課程名稱');
      return;
    }

    const newSchedule = JSON.parse(JSON.stringify(weeklySchedule));
    if (!newSchedule[activeDay]) newSchedule[activeDay] = [];

    if (editingItem === 'new') {
      const maxId = Math.max(0, ...Object.values(newSchedule).flat().map(c => c.id || 0));
      newSchedule[activeDay].push({
        id: maxId + 1,
        ...formData
      });
    } else {
      const idx = newSchedule[activeDay].findIndex(c => c.id === editingItem);
      if (idx !== -1) {
        newSchedule[activeDay][idx] = { ...newSchedule[activeDay][idx], ...formData };
      }
    }

    setWeeklySchedule(newSchedule);
    setEditingItem(null);
    setFormData({ ...EMPTY_COURSE });
    setHasChanges(true);
  };

  const handleDeleteCourse = (itemId) => {
    if (!canEdit) return;
    const newSchedule = JSON.parse(JSON.stringify(weeklySchedule));
    newSchedule[activeDay] = (newSchedule[activeDay] || []).filter(c => c.id !== itemId);
    setWeeklySchedule(newSchedule);
    setHasChanges(true);
  };

  const handleBulkDelete = () => {
    if (selectedItems.length === 0) return;
    const newSchedule = JSON.parse(JSON.stringify(weeklySchedule));
    newSchedule[activeDay] = (newSchedule[activeDay] || []).filter(c => !selectedItems.includes(c.id));
    setWeeklySchedule(newSchedule);
    setSelectedItems([]);
    setHasChanges(true);
  };

  const handleCopyDay = (fromDay) => {
    const newSchedule = JSON.parse(JSON.stringify(weeklySchedule));
    const source = newSchedule[fromDay] || [];
    const maxId = Math.max(0, ...Object.values(newSchedule).flat().map(c => c.id || 0));
    newSchedule[activeDay] = source.map((item, idx) => ({
      ...item,
      id: maxId + idx + 1,
      rescheduled: false
    }));
    setWeeklySchedule(newSchedule);
    setHasChanges(true);
    toast.success(`已複製 星期${ALL_DAYS.find(d => d.id === fromDay)?.label} 的課表`);
  };

  const handleSaveToCloud = async () => {
    setSaving(true);
    try {
      await saveToFirestore(weeklySchedule);
      triggerNotification('同步成功 ✅', '課表已儲存至雲端');
      setHasChanges(false);
    } catch (err) {
      if (err.message === 'PERMISSION_DENIED_NOT_ADMIN') {
        triggerNotification('權限不足 ❌', '只有管理員可修改班級雲端課表');
      } else {
        triggerNotification('同步失敗 ❌', err.message || '請檢查網路');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleMoveItem = (itemId, direction) => {
    const newSchedule = JSON.parse(JSON.stringify(weeklySchedule));
    const list = newSchedule[activeDay] || [];
    const idx = list.findIndex(c => c.id === itemId);
    if (idx === -1) return;
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    [list[idx], list[targetIdx]] = [list[targetIdx], list[idx]];
    newSchedule[activeDay] = list;
    setWeeklySchedule(newSchedule);
    setHasChanges(true);
  };

  const getSubjectTheme = (subjectName) => {
    const match = subjects.find(s => s.name === subjectName);
    return match || { icon: 'BookText', color: 'text-slate-500' };
  };

  return (
    <div className="space-y-5 animate-tab-enter pb-8">
      {/* Header */}
      <div className="liquid-glass-heavy p-5 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="p-2 liquid-glass-subtle rounded-xl active:scale-90 transition-all shrink-0">
            <ArrowLeft size={20} className="text-slate-600 dark:text-slate-300" />
          </button>
          <div className="min-w-0">
            <h2 className="text-[18px] font-black text-slate-800 dark:text-white truncate">課表管理後台</h2>
            <p className="text-[11px] font-bold text-slate-400 truncate">
              {classID ? `班級模式 · ${classID}` : '個人課表模式'}
              {isAdmin && ' · 管理員'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {handleImportTemplate && (
            <button
              onClick={handleImportTemplate}
              className="p-2.5 liquid-glass-subtle rounded-xl active:scale-90 transition-all"
              title="匯入範本"
            >
              <Upload size={18} className="text-blue-500" />
            </button>
          )}
          <button
            onClick={handleSaveToCloud}
            disabled={saving || !hasChanges}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-black text-[13px] transition-all active:scale-95 ${
              hasChanges
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                : 'liquid-glass-subtle text-slate-400 cursor-not-allowed'
            }`}
          >
            <Save size={16} className="shrink-0" />
            {saving ? '儲存中...' : '同步雲端'}
          </button>
        </div>
      </div>

      {/* Day Tabs */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {ALL_DAYS.filter(d => d.id >= 1 && d.id <= 5).map(d => (
          <button
            key={d.id}
            onClick={() => { setActiveDay(d.id); setEditingItem(null); setSelectedItems([]); }}
            className={`px-5 py-3 rounded-xl text-[14px] font-black whitespace-nowrap transition-all ${
              activeDay === d.id
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'liquid-glass-subtle text-slate-500 dark:text-slate-400 hover:bg-white/70 dark:hover:bg-white/10'
            }`}
          >
            週{d.label}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddCourse}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 text-white rounded-xl font-black text-[13px] shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <Plus size={16} /> 新增課程
          </button>
          <button
            onClick={() => { setBulkMode(!bulkMode); setSelectedItems([]); }}
            className={`px-4 py-2.5 rounded-xl font-black text-[13px] transition-all active:scale-95 ${
              bulkMode ? 'bg-rose-500 text-white shadow-md' : 'liquid-glass-subtle text-slate-500'
            }`}
          >
            {bulkMode ? '取消批次' : '批次操作'}
          </button>
        </div>
        {bulkMode && selectedItems.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 text-white rounded-xl text-[12px] font-black active:scale-95 transition-all"
          >
            <Trash2 size={14} /> 刪除 {selectedItems.length} 項
          </button>
        )}
        <div className="relative">
          <button
            onClick={() => document.getElementById('copy-dropdown')?.classList.toggle('hidden')}
            className="flex items-center gap-1.5 px-3 py-2.5 liquid-glass-subtle rounded-xl text-[12px] font-black text-slate-500 active:scale-95 transition-all"
          >
            <Copy size={14} /> 複製自...
          </button>
          <div id="copy-dropdown" className="hidden absolute right-0 top-full mt-2 liquid-glass-heavy p-2 z-50 min-w-[120px] animate-apple-linear">
            {ALL_DAYS.filter(d => d.id >= 1 && d.id <= 5 && d.id !== activeDay).map(d => (
              <button
                key={d.id}
                onClick={() => { handleCopyDay(d.id); document.getElementById('copy-dropdown')?.classList.add('hidden'); }}
                className="w-full px-3 py-2 text-left text-[13px] font-black text-slate-700 dark:text-slate-200 hover:bg-emerald-500/10 rounded-lg transition-colors"
              >
                週{d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Course List */}
      <div className="space-y-3">
        {daySchedule.length === 0 ? (
          <div className="liquid-glass py-16 text-center">
            <Calendar size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <p className="text-[15px] font-black text-slate-400">此日尚無課程</p>
            <p className="text-[12px] font-bold text-slate-300 dark:text-slate-600 mt-1">點擊「新增課程」開始編排</p>
          </div>
        ) : (
          daySchedule.map((item, idx) => {
            const theme = getSubjectTheme(item.subject);
            const IconComp = ICON_MAP[theme.icon] || BookText;
            const isSelected = selectedItems.includes(item.id);

            return (
              <div
                key={item.id}
                className={`liquid-glass p-4 transition-all duration-300 ${
                  isSelected ? 'ring-2 ring-rose-500/40 scale-[1.01]' : ''
                } ${item.rescheduled ? 'border-orange-400/40' : ''}`}
                style={item.rescheduled ? { borderColor: 'rgba(251,146,60,0.4)' } : {}}
              >
                <div className="flex items-center gap-3">
                  {/* Drag / Select handle */}
                  {bulkMode ? (
                    <button
                      onClick={() => setSelectedItems(prev =>
                        prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]
                      )}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        isSelected ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                      }`}
                    >
                      {isSelected ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600" />}
                    </button>
                  ) : (
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button onClick={() => handleMoveItem(item.id, -1)} disabled={idx === 0}
                        className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                        <ChevronDown size={14} className="rotate-180" />
                      </button>
                      <button onClick={() => handleMoveItem(item.id, 1)} disabled={idx === daySchedule.length - 1}
                        className="p-0.5 text-slate-300 hover:text-slate-500 disabled:opacity-20 transition-colors">
                        <ChevronDown size={14} />
                      </button>
                    </div>
                  )}

                  {/* Subject Icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    item.color ? '' : 'bg-slate-100 dark:bg-white/10'
                  } ${theme.color}`}
                    style={item.color ? { backgroundColor: item.color + '20' } : {}}
                  >
                    <IconComp size={20} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-black text-slate-800 dark:text-white truncate">{item.subject}</span>
                      {item.rescheduled && (
                        <span className="text-[9px] font-black bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded-md shrink-0">調課中</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-[11px] font-bold text-slate-400">
                      <span className="flex items-center gap-1"><Clock size={11} /> {item.startTime} - {item.endTime}</span>
                      {item.teacher && <span className="flex items-center gap-1 truncate"><User size={11} /> {item.teacher}</span>}
                      {item.location && <span className="flex items-center gap-1 truncate"><MapPin size={11} /> {item.location}</span>}
                    </div>
                  </div>

                  {/* Actions */}
                  {!bulkMode && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button onClick={() => handleEditCourse(item)}
                        className="p-2 liquid-glass-subtle rounded-lg text-slate-400 hover:text-blue-500 transition-colors active:scale-90">
                        <Edit3 size={15} />
                      </button>
                      <button onClick={() => handleDeleteCourse(item.id)}
                        className="p-2 liquid-glass-subtle rounded-lg text-slate-400 hover:text-rose-500 transition-colors active:scale-90">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Form Modal */}
      {editingItem !== null && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 animate-fadeIn">
          <div className="liquid-glass-heavy p-6 w-full max-w-md shadow-2xl animate-slide-up-fade overflow-hidden">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[18px] font-black text-slate-800 dark:text-white flex items-center gap-2">
                <Edit3 size={20} className="text-emerald-500" />
                {editingItem === 'new' ? '新增課程' : '編輯課程'}
              </h3>
              <button onClick={() => { setEditingItem(null); setFormData({ ...EMPTY_COURSE }); }}
                className="p-2 liquid-glass-subtle rounded-xl text-slate-400 active:scale-90">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {/* Subject */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">課程名稱 *</label>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={e => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                  className="w-full liquid-glass-subtle px-4 py-3 text-[15px] font-black text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
                  placeholder="例如：國文"
                />
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {SUBJECTS_LIST.map(s => (
                    <button key={s.name} onClick={() => setFormData(prev => ({ ...prev, subject: s.name, icon: s.icon }))}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-black transition-all ${
                        formData.subject === s.name ? 'bg-emerald-500 text-white' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                      }`}>
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">開始時間</label>
                  <input type="time" value={formData.startTime}
                    onChange={e => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                    className="w-full liquid-glass-subtle px-3 py-2.5 text-[14px] font-bold text-slate-700 dark:text-white outline-none" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">結束時間</label>
                  <input type="time" value={formData.endTime}
                    onChange={e => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
                    className="w-full liquid-glass-subtle px-3 py-2.5 text-[14px] font-bold text-slate-700 dark:text-white outline-none" />
                </div>
              </div>

              {/* Teacher & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">教師</label>
                  <input type="text" value={formData.teacher}
                    onChange={e => setFormData(prev => ({ ...prev, teacher: e.target.value }))}
                    className="w-full liquid-glass-subtle px-3 py-2.5 text-[14px] font-bold text-slate-700 dark:text-white outline-none"
                    placeholder="例如：王老師" />
                </div>
                <div>
                  <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">教室</label>
                  <input type="text" value={formData.location}
                    onChange={e => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full liquid-glass-subtle px-3 py-2.5 text-[14px] font-bold text-slate-700 dark:text-white outline-none"
                    placeholder="例如：302" />
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">課程顏色</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button key={c.value} onClick={() => setFormData(prev => ({ ...prev, color: c.hex }))}
                      className={`w-8 h-8 rounded-xl transition-all ${formData.color === c.hex ? 'ring-2 ring-offset-2 ring-emerald-500 scale-110' : 'hover:scale-105'}`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                  {formData.color && (
                    <button onClick={() => setFormData(prev => ({ ...prev, color: '' }))}
                      className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Save/Cancel */}
            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-200/50 dark:border-white/10">
              <button onClick={() => { setEditingItem(null); setFormData({ ...EMPTY_COURSE }); }}
                className="flex-1 py-3.5 liquid-glass-subtle rounded-xl font-black text-[14px] text-slate-600 dark:text-slate-300 active:scale-95 transition-all">
                取消
              </button>
              <button onClick={handleSaveItem}
                className="flex-1 py-3.5 bg-emerald-500 text-white rounded-xl font-black text-[14px] shadow-lg shadow-emerald-500/25 active:scale-95 transition-all">
                {editingItem === 'new' ? '新增' : '儲存變更'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScheduleAdminTab;
