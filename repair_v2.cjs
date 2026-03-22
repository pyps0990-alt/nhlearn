
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/tabs/VocabularyTab.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Header Fix & dbError Banner
const oldHeader = `{/* Header */}\n      <div className="flex justify-between items-center px-1 shrink-0">`;
const newHeader = `      {/* Header (Sticky) */}
      <div className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md pt-2 px-1">
        <div className="flex justify-between items-center shrink-0">`;

const oldHeader2 = `          <button onClick={() => setIsDebugMode(!isDebugMode)} className={\`hidden sm:block p-2 rounded-xl transition-all \${isDebugMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'}\`} title="切換偵錯模式"><Bug size={16} /></button>\n        </div>\n      </div>`;
const newHeader2 = `          <button onClick={() => setIsDebugMode(!isDebugMode)} className={\`hidden sm:block p-2 rounded-xl transition-all \${isDebugMode ? 'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' : 'bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500'}\`} title="切換偵錯模式"><Bug size={16} /></button>
        </div>

        {/* 錯誤提示 (Sticky Notice) */}
        {dbError && (
          <div className="mt-2 p-3 bg-red-100/80 dark:bg-red-900/40 backdrop-blur-lg border border-red-200 dark:border-red-800/50 rounded-2xl flex items-center gap-3 animate-slide-up-fade shadow-lg mx-1">
            <AlertCircle size={18} className="text-red-500 shrink-0" />
            <span className="text-[13px] font-black text-red-700 dark:text-red-300 min-w-0 break-words leading-tight">{dbError}</span>
            <button onClick={() => setDbError('')} className="ml-auto p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors">
              <X size={14} className="text-red-400" />
            </button>
          </div>
        )}
      </div>`;

if (content.includes(oldHeader)) {
    content = content.replace(oldHeader, newHeader);
    console.log('Fixed Header start');
}
if (content.includes(oldHeader2)) {
    content = content.replace(oldHeader2, newHeader2);
    console.log('Fixed Header end & dbError');
}

// 2. Notification Animation fix
const oldNotify = `animate-slide-up-fade filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)]`;
const newNotify = `animate-toast-pop-up filter drop-shadow-[0_20px_40px_rgba(0,0,0,0.15)]`;

if (content.includes(oldNotify)) {
    content = content.replace(oldNotify, newNotify);
    console.log('Fixed Notification Animation');
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated VocabularyTab.jsx');
