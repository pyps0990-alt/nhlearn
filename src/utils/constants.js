import {
  BookText, Languages, Calculator, Zap, Beaker, Dna,
  History, Map, Scale, Library, Globe, GraduationCap, Cloud, Utensils,
  Clock, Calendar, Sparkles, BrainCircuit, Trophy, Target, Activity, Heart,
  ShoppingCart, Coffee, Music, Gamepad2, Laptop
} from 'lucide-react';

export const ICON_MAP = {
  BookText, Languages, Calculator, Zap, Beaker, Dna,
  History, Map, Scale, Library, Globe, GraduationCap, Cloud, Utensils,
  Clock, Calendar, Sparkles, BrainCircuit, Trophy, Target, Activity, Heart,
  ShoppingCart, Coffee, Music, Gamepad2, Laptop
};

export const INITIAL_WEEKLY_SCHEDULE = {
  1: [{ id: 101, startTime: '08:00', endTime: '09:00', subject: '國文', location: '302 教室', teacher: '王老師', items: '國文講義' }],
  2: [], 3: [], 4: [], 5: []
};

export const WEEKDAYS = [
  { id: 1, label: '一' }, { id: 2, label: '二' }, { id: 3, label: '三' },
  { id: 4, label: '四' }, { id: 5, label: '五' }
];

export const SUBJECTS_LIST = [
  { name: '國文', icon: 'BookText', color: 'text-red-500' },
  { name: '英文', icon: 'Languages', color: 'text-blue-500' },
  { name: '數學', icon: 'Calculator', color: 'text-orange-500' },
  { name: '物理', icon: 'Zap', color: 'text-purple-500' },
  { name: '化學', icon: 'Beaker', color: 'text-cyan-500' },
  { name: '生物', icon: 'Dna', color: 'text-green-500' },
  { name: '歷史', icon: 'History', color: 'text-amber-500' },
  { name: '地理', icon: 'Map', color: 'text-emerald-500' },
  { name: '公民', icon: 'Scale', color: 'text-indigo-500' },
  { name: '自習', icon: 'Library', color: 'text-gray-500' }
];

export const DEFAULT_LINKS = [
  { title: "校園官網", url: "https://www.nhsh.tp.edu.tw/", id: 'def-1', icon: 'Globe' },
  { title: "學分殊死戰", url: "https://ldap.tp.edu.tw/login", id: 'def-2', icon: 'GraduationCap' },
  { title: "COOC平台", url: "https://cooc.tp.edu.tw/auth/login", id: 'def-3', icon: 'Cloud' },
  { title: "外食名單", url: "https://forms.gle/gJyuP7ZEBjdo2MFK9", id: 'def-4', icon: 'Utensils' }
];

export const NOTE_CATEGORIES = ['課堂筆記', '錯題本', '重點摘要', '考前衝刺'];

export const INITIAL_STORES = [
  { id: 1, name: '50嵐 (內湖文德店)', discount: '憑內湖高中學生證 全品項折 5 元', type: '飲料', icon: '🥤', distance: '步行 3 分鐘' },
  { id: 2, name: '八方雲集 (文德店)', discount: '內用/外帶 滿 100 元贈豆漿一杯', type: '餐飲', icon: '🥟', distance: '步行 5 分鐘' },
  { id: 3, name: '路易莎咖啡 LOUISA', discount: '憑學生證 飲品 9 折', type: '咖啡', icon: '☕', distance: '步行 4 分鐘' },
  { id: 4, name: '墊腳石 (內湖店)', discount: '文具圖書憑證 85 折', type: '文具', icon: '📚', distance: '步行 8 分鐘' },
];

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '288124052978-4f07cnvmck3cl9a645nvd37nei097ev4.apps.googleusercontent.com';
export const GOOGLE_REDIRECT_URI = import.meta.env.VITE_REDIRECT_URI ||
  (import.meta.env.PROD
    ? 'https://nhlearn.vercel.app/api/auth/callback'
    : 'http://localhost:5173/api/auth/callback'); // 注意：本機端也應指向 callback 雖然 Vite 沒有此路徑
export const DRIVE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest';
export const PEOPLE_DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/people/v1/rest';
export const SCOPES = 'openid email profile';
