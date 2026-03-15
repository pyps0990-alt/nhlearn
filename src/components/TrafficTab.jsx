import React, { useState, useEffect, useCallback } from 'react';
import { Bike, RefreshCw, Zap, Navigation, Bus, MapPin, AlertCircle, TrainFront, ArrowDownUp, ParkingCircle, BikeIcon, Car, Star, CloudRain, Sun, Cloud, Droplets, ChevronRight } from 'lucide-react';

// 計算兩點距離 (公尺)
const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// ⛅ 天氣預報小工具元件
const WeatherWidget = ({ lat = 25.078410, lng = 121.587152 }) => {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTaipei`);
        const data = await res.json();
        setWeather({
          max: Math.round(data.daily.temperature_2m_max[0]),
          min: Math.round(data.daily.temperature_2m_min[0]),
          rainProb: data.daily.precipitation_probability_max[0],
          code: data.daily.weather_code[0]
        });
      } catch (e) { console.error("天氣獲取失敗", e); }
      finally { setLoading(false); }
    };
    fetchWeather();
  }, [lat, lng]);

  if (loading || !weather) return null;

  const isRainy = weather.rainProb >= 50 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weather.code);
  const isCloudy = [1, 2, 3, 45, 48].includes(weather.code);
  const Icon = isRainy ? CloudRain : (isCloudy ? Cloud : Sun);
  const colorClass = isRainy ? "text-blue-500" : (isCloudy ? "text-slate-500 dark:text-slate-300" : "text-amber-500");
  const desc = isRainy ? "出門記得攜帶雨具 ☔" : (isCloudy ? "多雲時晴的舒適天氣 ⛅" : "晴朗好天氣 ☀️");

  return (
    <div
      onClick={() => window.open('https://www.cwa.gov.tw/V8/C/', '_blank')}
      className="group cursor-pointer bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-5 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_12px_32px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_12px_32px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] mb-2 flex items-center justify-between animate-slide-up-fade"
    >
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-[20px] bg-white dark:bg-black/20 shadow-inner flex items-center justify-center ${colorClass} shrink-0`}>
            <Icon size={24} />
          </div>
          <div>
            <h4 className={`text-[15px] font-black leading-tight mb-1 ${isRainy ? 'text-blue-800 dark:text-blue-300' : 'text-slate-800 dark:text-white'}`}>{desc}</h4>
            <div className="flex items-center gap-3 text-[12px] font-bold text-slate-500 dark:text-slate-400">
              <span>{weather.min}°C - {weather.max}°C</span>
              <span className="flex items-center gap-1"><Droplets size={12} className="text-blue-400" /> 降雨機率 {weather.rainProb}%</span>
            </div>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-300 dark:text-slate-600 group-hover:text-emerald-500 group-hover:translate-x-1 transition-transform duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)]" />
      </div>
    </div>
  );
};

const YoubikeWidget = ({ campusName, campusAddress, campusLat = '25.078410', campusLng = '121.587152' }) => {
  const [youbikeData, setYoubikeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdateTime, setLastUpdateTime] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('dist'); // 'dist', 'rent', 'ret'

  // 🌟 收藏站點狀態 (從 LocalStorage 讀取)
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem('gsat_youbike_favs')) || []; }
    catch { return []; }
  });

  useEffect(() => { localStorage.setItem('gsat_youbike_favs', JSON.stringify(favorites)); }, [favorites]);

  // 使用設定頁面的座標
  const DEFAULT_LAT = campusLat ? parseFloat(campusLat) : 25.078410;
  const DEFAULT_LNG = campusLng ? parseFloat(campusLng) : 121.587152;
  const RADIUS_M = 2000; // 2 公里半徑

  // 時鐘
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const LOCATION_PRESETS = [
    { name: campusName || '校園', lat: DEFAULT_LAT, lng: DEFAULT_LNG },
    { name: '港墘站', lat: 25.0800, lng: 121.5750 },
    { name: '文德站', lat: 25.0785, lng: 121.5847 },
    { name: '大湖公園', lat: 25.0837, lng: 121.6030 },
  ];

  // 取得定位
  useEffect(() => {
    if (!navigator.geolocation) {
      setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, name: campusName || '校園' });
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: '目前位置' }),
      () => {
        setUserLocation({ lat: DEFAULT_LAT, lng: DEFAULT_LNG, name: campusName || '校園' });
        setLocationError(true);
      },
      { timeout: 5000, enableHighAccuracy: false }
    );
  }, [DEFAULT_LAT, DEFAULT_LNG, campusName]);

  const fetchYoubike = useCallback(async () => {
    if (!userLocation) return;
    setError(null);
    try {
      const res = await fetch(
        'https://tcgbusfs.blob.core.windows.net/dotapp/youbike/v2/youbike_immediate.json',
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error(`API 回應錯誤: ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error('API 資料格式異常');

      const withDist = data
        .map(s => ({
          ...s,
          dist: calcDistance(
            userLocation.lat, userLocation.lng,
            parseFloat(s.latitude), parseFloat(s.longitude)
          ),
          // 相容舊 (sbi/bemp) 與新欄位 (available_rent_bikes/available_return_bikes)
          rent: parseInt(s.available_rent_bikes ?? s.sbi ?? 0),
          ret: parseInt(s.available_return_bikes ?? s.bemp ?? 0),
        }))
        .filter(s => s.dist <= RADIUS_M)
        .sort((a, b) => a.dist - b.dist)
        .slice(0, 8);

      setYoubikeData(withDist);
      setLastUpdateTime(new Date().toLocaleTimeString('zh-TW', { hour12: false }));
    } catch (e) {
      console.error('Youbike Fetch Error:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    if (!userLocation) return;
    fetchYoubike();
    const interval = setInterval(fetchYoubike, 30000);
    return () => clearInterval(interval);
  }, [fetchYoubike, userLocation]);

  const toggleFav = (sno) => {
    setFavorites(prev => prev.includes(sno) ? prev.filter(id => id !== sno) : [...prev, sno]);
  };

  const filtered = youbikeData.filter(s => {
    if (filterType === 'electric') return s.sna?.includes('2.0E');
    if (filterType === 'normal') return !s.sna?.includes('2.0E');
    return true;
  });

  const sorted = filtered.sort((a, b) => {
    // 星號收藏優先置頂
    const aFav = favorites.includes(a.sno);
    const bFav = favorites.includes(b.sno);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;

    if (sortBy === 'rent') return b.rent - a.rent;
    if (sortBy === 'ret') return b.ret - a.ret;
    return a.dist - b.dist; // default 'dist'
  });

  const handleNavigate = (lat, lng) =>
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`, '_blank');

  return (
    <div className="bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 md:p-8 rounded-[40px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] border border-white/60 dark:border-white/10 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)]">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-3 mb-5">
        <h3 className="text-[17px] font-black text-[var(--text-primary)] flex items-center gap-2 tracking-tight">
          <Bike className="text-emerald-500 shrink-0" size={22} /> 附近 YouBike 站點
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-[20px] font-black text-emerald-600 dark:text-emerald-400 font-mono tracking-tight bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-100 dark:border-emerald-500/20">
            {currentTime.toLocaleTimeString('zh-TW', { hour12: false })}
          </span>
          <button
            onClick={fetchYoubike}
            className="p-2.5 bg-white/50 dark:bg-slate-800/50 backdrop-blur-md border border-white/60 dark:border-white/10 text-slate-600 dark:text-slate-300 rounded-[14px] active:scale-[0.90] transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/80 dark:hover:bg-white/20 shadow-sm hover:shadow-md shrink-0"
            aria-label="重新整理"
          >
            <RefreshCw size={18} className={`shrink-0 ${loading && youbikeData.length ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      {/* Location Selector */}
      <div className="flex gap-2.5 mb-4 overflow-x-auto pb-2 scrollbar-hide px-1">
        <button
          onClick={() => {
            setLoading(true);
            navigator.geolocation.getCurrentPosition(
              pos => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, name: '目前位置' }),
              () => setLocationError(true)
            );
          }}
          className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex-shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center gap-1 ${userLocation?.name === '目前位置' ? 'bg-emerald-600 text-white shadow-md scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
        >
          <Navigation size={12} className="shrink-0" /> 自動定位
        </button>
        {LOCATION_PRESETS.map(loc => (
          <button
            key={loc.name}
            onClick={() => {
              setLoading(true);
              setUserLocation(loc);
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex-shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${userLocation?.name === loc.name ? 'bg-emerald-600 text-white shadow-md scale-105' : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'}`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* Location status */}
      <div className="flex items-center gap-2 mb-3">
        {locationError && userLocation?.name === '目前位置' ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-100 dark:border-amber-500/20">
            <AlertCircle size={11} className="shrink-0" /> 定位失敗，改用預設
          </span>
        ) : userLocation ? (
          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-500/20">
            <MapPin size={11} className="shrink-0" /> 基準點：{userLocation.name}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-gray-400">取得位置中...</span>
        )}
        {lastUpdateTime && (
          <span className="text-[11px] font-bold text-gray-400 ml-auto uppercase tracking-tighter">更新： {lastUpdateTime}</span>
        )}
      </div>

      {/* Filter & Sort controls */}
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
          {[['all', '全部'], ['electric', '⚡ 電動'], ['normal', '🚲 一般']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilterType(val)}
              className={`px-4 py-2 rounded-xl text-xs font-black flex-shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${filterType === val ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
          <button onClick={() => setSortBy('dist')} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${sortBy === 'dist' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}><MapPin size={12} /> 距離最近</button>
          <button onClick={() => setSortBy('rent')} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${sortBy === 'rent' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}><BikeIcon size={12} /> 可借最多</button>
          <button onClick={() => setSortBy('ret')} className={`flex-1 flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-black transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] ${sortBy === 'ret' ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm scale-105' : 'text-slate-500 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}><ParkingCircle size={12} /> 可還最多</button>
        </div>
      </div>

      {/* Error */}
      {
        error && (
          <div className="flex items-center gap-2 text-[12px] font-bold text-red-500 bg-red-50 p-3 rounded-2xl border border-red-100 mb-3">
            <AlertCircle size={14} className="shrink-0" /> {error}
          </div>
        )
      }

      {/* Loading */}
      {
        loading && !youbikeData.length ? (
          <div className="flex justify-center py-8">
            <RefreshCw size={24} className="animate-spin text-gray-300" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sorted.map(s => {
              const isElectric = s.sna?.includes('2.0E');
              const cleanName = s.sna?.replace(/YouBike2\.0E?_/, '') || s.sna || '';
              return (
                <div
                  key={s.sno}
                  className={`p-5 rounded-[28px] border flex flex-col gap-4 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:shadow-lg hover:-translate-y-1 ${isElectric ? 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 border-orange-200/50 dark:border-orange-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-200/50 dark:border-emerald-500/20'} ${s.rent === 0 ? 'opacity-60 grayscale-[50%]' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1 mr-2">
                      <h4 className="text-[14px] font-black text-slate-900 dark:text-white leading-snug">{cleanName}</h4>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {isElectric ? (
                          <span className="text-[10px] font-black bg-orange-100 dark:bg-orange-500/20 text-orange-600 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Zap size={10} className="shrink-0" /> 電動版
                          </span>
                        ) : (
                          <span className="text-[10px] font-black bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded-md">一般</span>
                        )}
                        {s.dist < 500 && (
                          <span className="text-[10px] font-black bg-teal-100 dark:bg-teal-500/20 text-teal-700 dark:text-teal-400 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            🚶 走路可達
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-gray-400">{(s.dist / 1000).toFixed(2)} km</span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFav(s.sno); }}
                        className={`p-2 rounded-xl transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)] shadow-sm border active:scale-90 flex-shrink-0 ${favorites.includes(s.sno) ? 'bg-amber-50 dark:bg-amber-500/20 text-amber-500 border-amber-200 dark:border-amber-500/30 scale-105' : 'bg-white dark:bg-slate-800 text-slate-300 dark:text-slate-600 hover:text-amber-400 border-gray-100 dark:border-white/5 hover:bg-amber-50 dark:hover:bg-slate-700'}`}
                        aria-label="收藏站點"
                      >
                        <Star size={14} className={favorites.includes(s.sno) ? "fill-current" : ""} />
                      </button>
                      <button
                        onClick={() => handleNavigate(s.latitude, s.longitude)}
                        className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm text-blue-500 active:scale-90 border border-gray-100 dark:border-white/5 hover:bg-blue-50 flex-shrink-0 transition-all duration-[400ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
                        aria-label="導航至站點"
                      >
                        <Navigation size={14} className="shrink-0" />
                      </button>
                    </div>
                  </div>
                  <div className="flex bg-white/50 dark:bg-black/20 rounded-xl p-2 border border-slate-100/50 dark:border-white/10 shadow-sm backdrop-blur-sm">
                    <div className="flex-1 flex flex-col items-center justify-center border-r border-gray-100 dark:border-white/5">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">可借</span>
                      <span className={`text-[22px] font-black ${s.rent > 0 ? (isElectric ? 'text-orange-500' : 'text-emerald-600') : 'text-gray-300'}`}>
                        {s.rent}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 mb-0.5">可還</span>
                      <span className={`text-[22px] font-black ${s.ret > 0 ? 'text-blue-500' : 'text-gray-300'}`}>
                        {s.ret}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      }

      {
        !loading && youbikeData.length === 0 && !error && (
          <p className="text-[13px] font-bold text-slate-500 dark:text-gray-500 text-center py-6 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            {RADIUS_M / 1000} km 內找不到 YouBike 站點
          </p>
        )
      }

      {
        !loading && sorted.length === 0 && youbikeData.length > 0 && (
          <p className="text-[13px] font-bold text-slate-500 dark:text-gray-500 text-center py-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
            附近沒有符合篩選的站點
          </p>
        )
      }
    </div>
  );
};


// 1. 交通導引組件 - 針對深色模式優化配色
const TransportGuide = ({ campusName, campusAddress, campusLat = '25.078410', campusLng = '121.587152' }) => {
  const busLines = ["0東", "21", "28", "214", "222", "247", "267", "278", "286", "287", "620", "652", "677", "681", "902", "藍2", "紅2", "紅31"];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 捷運 - 霓虹靛藍 (深色優化) */}
      <div className="bg-indigo-50 dark:bg-indigo-950/40 p-6 rounded-[32px] border border-indigo-200 dark:border-indigo-500/20 shadow-md transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-lg group">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-2xl text-indigo-700 dark:text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.1)] shrink-0">
            <TrainFront size={20} className="shrink-0" />
          </div>
          <h4 className="text-[17px] font-black text-indigo-900 dark:text-indigo-100">捷運文湖線</h4>
        </div>
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(129,140,248,0.6)]"></span>
            <p className="text-[14px] font-black text-indigo-900 dark:text-indigo-50">文德站 2 號出口</p>
          </div>
          <p className="text-[13px] font-bold text-slate-600 dark:text-indigo-200/60 leading-relaxed pl-4 border-l-2 border-indigo-500/20 ml-1">
            出站後向左轉，沿內湖路步行約 <span className="text-emerald-600 dark:text-indigo-400">3-5 分鐘</span> 即抵達校門。
          </p>
        </div>
      </div>

      {/* 公車 - 暖陽琥珀 (深色優化) */}
      <div className="bg-amber-50 dark:bg-amber-950/30 p-6 rounded-[32px] border border-amber-200 dark:border-amber-500/20 shadow-md transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-amber-500/40 hover:-translate-y-1 hover:shadow-lg group">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl text-amber-700 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.1)] shrink-0">
            <Bus size={20} className="shrink-0" />
          </div>
          <h4 className="text-[17px] font-black text-amber-900 dark:text-amber-100">公車站點：內湖高中</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {busLines.map(line => (
            <span key={line} className="px-2.5 py-1 bg-white dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-xl text-[11px] font-black text-amber-700 dark:text-amber-200 shadow-sm hover:bg-amber-600 hover:text-white transition-colors duration-[400ms]">
              {line}
            </span>
          ))}
        </div>
        <div className="mt-5 p-3 bg-amber-100/50 dark:bg-amber-500/5 rounded-2xl border border-amber-200/50 dark:border-amber-500/10">
          <p className="text-[11px] font-bold text-amber-800 dark:text-amber-200/50 flex items-center gap-2">
            <AlertCircle size={12} className="text-amber-600 shrink-0" /> 站牌位於校門口兩側，下車即抵達。
          </p>
        </div>
      </div>

      {/* 地址 - 鈦金冷灰 (全寬) */}
      <div className="md:col-span-2 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-2xl backdrop-saturate-150 p-6 rounded-[32px] border border-white/60 dark:border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8),0_8px_24px_rgba(0,0,0,0.04)] dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_8px_24px_rgba(0,0,0,0.2)] hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.9),0_16px_48px_rgba(0,0,0,0.08)] dark:hover:shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_16px_48px_rgba(0,0,0,0.3)] flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-1">
        <div className="flex items-center gap-5 w-full md:w-auto">
          <div className="p-3.5 bg-white dark:bg-white/5 rounded-2xl shadow-inner text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10">
            <MapPin size={26} className="shrink-0" />
          </div>
          <div>
            <h4 className="text-[16px] font-black text-slate-900 dark:text-white">地理位置</h4>
            <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 tracking-wide">{campusAddress || '未設定地址'}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto mt-4 md:mt-0">
          <button
            onClick={() => window.open(`https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[latitude]=${campusLat}&dropoff[longitude]=${campusLng}&dropoff[nickname]=${encodeURIComponent(campusName || '校園')}&dropoff[formatted_address]=${encodeURIComponent(campusAddress || '')}`, '_blank')}
            className="w-full sm:w-auto px-6 py-4 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-white rounded-[22px] text-[13px] font-black shadow-sm active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700"
          >
            <Car size={16} className="shrink-0" /> 叫車 (Uber)
          </button>
          <button
            onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&origin=My+Location&destination=${campusLat},${campusLng}&travelmode=transit`, '_blank')}
            className="w-full sm:w-auto px-6 py-4 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-[22px] text-[13px] font-black shadow-sm active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center gap-2 hover:bg-blue-100 dark:hover:bg-blue-500/30 border border-blue-200 dark:border-blue-500/30"
          >
            <Bus size={16} className="shrink-0" /> 公車動態
          </button>
          <button
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${campusLat},${campusLng}`, '_blank')}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-[22px] text-[13px] font-black shadow-lg shadow-emerald-500/30 active:scale-[0.98] transition-all duration-[600ms] ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center gap-2 hover:bg-emerald-500"
          >
            <Navigation size={14} fill="currentColor" className="shrink-0" /> 導航至校園
          </button>
        </div>
      </div>
    </div>
  );
};

// 3. 主要 Tab 組件 - 套用 animate-fadeIn
const TrafficTab = ({ campusName, campusAddress, campusLat = '25.078410', campusLng = '121.587152' }) => (
  <div className="space-y-8 flex flex-col w-full text-left animate-fadeIn mb-12">
    <div className="px-2">
      <h2 className="text-3xl font-black text-[var(--text-primary)] tracking-tight">交通資訊</h2>
      <p className="text-[14px] font-bold text-slate-400 mt-1">前往 {campusName} 的即時接駁與路徑指引</p>
    </div>

    <WeatherWidget lat={campusLat} lng={campusLng} />

    <section className="space-y-4">
      <div className="flex items-center gap-2 ml-2">
        <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
        <h3 className="text-[16px] font-black text-gray-800">周邊 YouBike 站點</h3>
      </div>
      <YoubikeWidget campusName={campusName} campusAddress={campusAddress} campusLat={campusLat} campusLng={campusLng} />
    </section>

    <div className="px-4">
      <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent"></div>
    </div>

    <section className="space-y-4">
      <div className="flex items-center gap-2 ml-2">
        <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
        <h3 className="text-[16px] font-black text-gray-800">捷運與公車指南</h3>
      </div>
      <TransportGuide campusName={campusName} campusAddress={campusAddress} campusLat={campusLat} campusLng={campusLng} />
    </section>
  </div>
);

export default TrafficTab;
