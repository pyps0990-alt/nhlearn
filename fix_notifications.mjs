import fs from 'fs';

let content = fs.readFileSync('src/App.jsx', 'utf8');

// 1. Add contactBookRef around line 3126
const refInjection = `const scheduleRef = useRef(weeklySchedule);
  const contactBookRef = useRef(contactBook);`;
const refEffectInjection = `useEffect(() => { scheduleRef.current = weeklySchedule; }, [weeklySchedule]);
  useEffect(() => { contactBookRef.current = contactBook; }, [contactBook]);`;

content = content.replace(/const scheduleRef = useRef\(weeklySchedule\);/g, refInjection);
content = content.replace(/useEffect\(\(\) => \{ scheduleRef\.current = weeklySchedule; \}, \[weeklySchedule\]\);/g, refEffectInjection);

// 2. Replace notification interval
const newNotificationLogic = `useEffect(() => {
    // 智慧提醒系統
    const timer = setInterval(() => {
      const now = new Date();
      const day = now.getDay();
      const currentMins = now.getHours() * 60 + now.getMinutes();
      const dateStr = now.toDateString();
      
      const tomorrowStr = new Date(now.getTime() + 86400000).toISOString().split('T')[0];

      // --- 1. 課程通知 (提前 5 分鐘) ---
      const todayClasses = scheduleRef.current[day] || [];
      let lastClassEndMins = 0;
      
      todayClasses.forEach(c => {
        if (!c.startTime) return;
        const startMins = timeToMins(c.startTime);
        const endMins = timeToMins(c.endTime);
        
        if (endMins > lastClassEndMins) {
          lastClassEndMins = endMins;
        }

        const diff = startMins - currentMins;
        // 提前 5 分鐘
        if (diff > 0 && diff <= 5) {
          const notifKey = \`class-\${c.id}-\${dateStr}-5min\`;
          if (!notifiedSet.current.has(notifKey)) {
            notifiedSet.current.add(notifKey);
            triggerNotification(\`🔔 準備上課：\${String(c.subject)}\`, \`📍 地點：\${String(c.location || '未定')} | \${diff}分鐘後開始\`);
          }
        }
      });

      const allEntries = Object.values(contactBookRef.current || {}).flat();

      // --- 2. 聯絡簿通知 (放學後通知今日作業) ---
      // 放學後 (下課後約 5 分鐘)
      if (lastClassEndMins > 0 && currentMins >= lastClassEndMins + 5 && currentMins <= lastClassEndMins + 6) {
        const tomorrowHW = allEntries.filter(e => e.homeworkDeadline === tomorrowStr);
        if (tomorrowHW.length > 0) {
           const notifKey = \`hw-\${dateStr}\`;
           if (!notifiedSet.current.has(notifKey)) {
             notifiedSet.current.add(notifKey);
             triggerNotification(\`🎒 放學提醒：有 \${tomorrowHW.length} 項作業\`, \`記得確認明日應繳交的作業：\\n\${tomorrowHW.map(t=>t.content).join(', ')}\`);
           }
        }
      }

      // --- 3. 大考通知 (前一天晚上 19:00 = 1140 分鐘) ---
      if (currentMins >= 1140 && currentMins <= 1141) {
         const tomorrowExams = allEntries.filter(e => e.examDeadline === tomorrowStr);
         if (tomorrowExams.length > 0) {
           const notifKey = \`exam-\${dateStr}-1900\`;
           if (!notifiedSet.current.has(notifKey)) {
             notifiedSet.current.add(notifKey);
             triggerNotification(\`📝 明日大考提醒 (\${tomorrowExams.length}項)\`, \`請提早準備明日測驗：\\n\${tomorrowExams.map(t=>t.content).join(', ')}\`);
           }
         }
      }

    }, 30000); // 30秒檢查一次
    return () => clearInterval(timer);
  }, [triggerNotification]);`;

const oldBlockRegex = /useEffect\(\(\) => \{\s*const timer = setInterval\(\(\) => \{[\s\S]*?\}, 5000\);\s*return \(\) => clearInterval\(timer\);\s*\}, \[triggerNotification\]\);/;

if (oldBlockRegex.test(content)) {
    content = content.replace(oldBlockRegex, newNotificationLogic);
    
    // 3. UI/UX: Update Dashboard Class style
    // Look for: "bg-emerald-50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 rounded-xl"
    // Or similar strings in DashboardTab to soften it.
    
    // Find the dashboard item layout
    // We will let Tailwind classes be modified via `index.css` directly since React markup might vary too much,
    // but we can replace some hardcoded tailwind classes.
    
    // We'll replace the dashboard class block with a softer one.
    // Specifically: "bg-emerald-50 dark:bg-emerald-900/30" -> "bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-700/50"
    content = content.replace(
      /className="flex items-center gap-3 p-3 bg-white dark:bg-white\/5 rounded-2xl/g, 
      'className="flex items-center gap-3 p-3.5 bg-white dark:bg-white/5 rounded-[22px] border border-slate-100 dark:border-white/10 shadow-sm transition-all hover:scale-[1.01]'
    );
    
    // Enhanced Subject text contrast
    content = content.replace(
      /text-slate-700 dark:text-slate-200 font-bold/g,
      'text-slate-800 dark:text-white font-extrabold text-lg'
    );
    
    // Highlight location
    content = content.replace(
      /<span className="text-xs text-slate-500 flex items-center gap-1">/g,
      '<span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full">'
    );

    fs.writeFileSync('src/App.jsx', content, 'utf8');
    console.log("✅ App.jsx updated successfully for notifications and UI.");
} else {
    console.log("❌ Failed to find the target effect block to replace.", content.match(/const timer = setInterval/g)?.length);
}
