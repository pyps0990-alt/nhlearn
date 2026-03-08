export const INITIAL_WEEKLY_SCHEDULE = {
  1: [{ id: 101, startTime: '08:00', endTime: '09:00', subject: '國文', location: '302 教室', teacher: '王老師', items: '國文講義' }],
  2: [], 3: [], 4: [], 5: [], 6: [], 0: []
};

export const WEEKDAYS = [
  { id: 1, label: '一' }, { id: 2, label: '二' }, { id: 3, label: '三' },
  { id: 4, label: '四' }, { id: 5, label: '五' }, { id: 6, label: '六' }, { id: 0, label: '日' }
];

export const SUBJECTS_LIST = [
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

export const NOTE_CATEGORIES = ['課堂筆記', '錯題本', '重點摘要', '考前衝刺'];

export const INITIAL_STORES = [
  { id: 1, name: '50嵐 (內湖文德店)', discount: '憑內湖高中學生證 全品項折 5 元', type: '飲料', icon: '🥤', distance: '步行 3 分鐘' },
  { id: 2, name: '八方雲集 (文德店)', discount: '內用/外帶 滿 100 元贈豆漿一杯', type: '餐飲', icon: '🥟', distance: '步行 5 分鐘' },
  { id: 3, name: '路易莎咖啡 LOUISA', discount: '憑學生證 飲品 9 折', type: '咖啡', icon: '☕', distance: '步行 4 分鐘' },
  { id: 4, name: '墊腳石 (內湖店)', discount: '文具圖書憑證 85 折', type: '文具', icon: '📚', distance: '步行 8 分鐘' },
];

export const GOOGLE_CLIENT_ID = '687493999096-ou5u6bug4t9v1u54bp39qauimvedvou9.apps.googleusercontent.com';
export const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
export const PEOPLE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/people/v1/rest';
export const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';
