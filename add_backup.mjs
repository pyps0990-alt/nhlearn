import { readFileSync, writeFileSync } from 'fs';
let c = readFileSync('src/App.jsx', 'utf8');

c = c.replace(/\r\n/g, '\n');

// 1. Add handleExportBackup into MainApp or SettingsTab
// Actually SettingsTab is a standalone component around line 2057?
// Let's check where to inject. I'll search for "const SettingsTab = " or Similar.
const settingsCompStart = c.indexOf('// ================= 設定分頁 (SettingsTab) =================');
if (settingsCompStart === -1) {
    console.log('Could not find SettingsTab start');
    process.exit(1);
}

const exportFunc = `
  const handleExportBackup = () => {
    try {
      const backupData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('gsat_') || key.startsWith('nhsh'))) {
          backupData[key] = localStorage.getItem(key);
        }
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", \`gsat_pro_backup_\${new Date().toISOString().split('T')[0]}.json\`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      triggerNotification('下載成功', '本機資料已備份為 JSON 檔案');
    } catch (e) {
      triggerNotification('備份失敗', e.message);
    }
  };
`;

// Insert handleExportBackup just after `const [clearDialogOpen, setClearDialogOpen] = useState(false);` or similar state in SettingsTab.
// Actually just insert it before `return (` in SettingsTab.
const settingsReturnIdx = c.indexOf('return (', settingsCompStart);
if (settingsReturnIdx !== -1) {
    c = c.slice(0, settingsReturnIdx) + exportFunc + '\n  ' + c.slice(settingsReturnIdx);
}

// 2. Add the button below Google account section
const targetSyncSection = `            <div className="bg-gray-50 rounded-2xl p-4 flex items-center justify-between border border-gray-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-gray-100 flex-shrink-0">
                  <Cloud className="text-blue-500" size={24} />
                </div>
                <div>
                  <div className="text-[14px] font-black text-gray-900">Google 帳號同步</div>
                  <div className="text-[12px] font-bold text-gray-500 mt-1">雲端備份至 Drive</div>
                </div>
              </div>
              <button
                onClick={isGoogleConnected ? handleGoogleSignOut : handleGoogleSignIn}
                className={\`px-4 py-2 font-black text-[13px] rounded-xl transition-all shadow-sm active:scale-95 \${isGoogleConnected ? 'bg-red-50 text-red-600 border border-red-100 hover:bg-red-100' : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'}\`}
              >
                {isGoogleConnected ? '取消連結' : '前往連結'}
              </button>
            </div>`;

const targetSyncSectionMatch = c.indexOf(targetSyncSection) !== -1;

const backupButtonHtml = `
            <div className="bg-emerald-50/50 rounded-2xl p-4 flex items-center justify-between border border-emerald-100">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-sm border border-emerald-100 flex-shrink-0">
                  <FileText className="text-emerald-500" size={24} />
                </div>
                <div>
                  <div className="text-[14px] font-black text-emerald-900">完整本機備份 (導出)</div>
                  <div className="text-[12px] font-bold text-emerald-600 mt-1">下載全系統資料 JSON</div>
                </div>
              </div>
              <button
                onClick={handleExportBackup}
                className="px-4 py-2 bg-emerald-500 text-white font-black text-[13px] rounded-xl transition-all shadow-md shadow-emerald-500/30 active:scale-95 hover:bg-emerald-600"
              >
                下載
              </button>
            </div>
`;

if (targetSyncSectionMatch) {
    c = c.replace(targetSyncSection, targetSyncSection + '\n' + backupButtonHtml);
} else {
    // Attempt fallback pattern
    const fallbackTarget = '<div className="text-[14px] font-black text-gray-900">Google 帳號同步</div>';
    const indexOfFallback = c.indexOf(fallbackTarget);
    if(indexOfFallback !== -1) {
       const blockEnd = c.indexOf('</div>', c.indexOf('</button>', indexOfFallback)) + 6;
       c = c.slice(0, blockEnd) + '\n' + backupButtonHtml + '\n' + c.slice(blockEnd);
    }
}

writeFileSync('src/App.jsx', c, 'utf8');
console.log('✅ Backup logic and UI injected successfully');
