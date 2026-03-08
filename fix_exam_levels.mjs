import fs from 'fs';

let content = fs.readFileSync('public/teacher_vocab.html', 'utf8');

if (!content.includes('function loadExamLevel')) {
  const codeToInsert = `
    // ============================================
    // 大考級別單字載入 (補回遺失的點擊事件)
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('.level-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('active'));
          e.target.classList.add('active');
          loadExamLevel(e.target.dataset.level);
        });
      });
    });

    async function loadExamLevel(level) {
      const container = document.getElementById('examContent');
      container.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
      
      try {
        const result = await apiGet('getWordsByLevel', { level: level });
        if (result.success && result.records && result.records.length > 0) {
          container.innerHTML = result.records.map(record => renderRecordItem(record)).join('');
        } else {
          // If the API 'getWordsByLevel' didn't return properly, fetch everything and filter locally as fallback
          const allResult = await apiGet('searchRecords', { keyword: '' });
          if (allResult.success && allResult.records) {
              const levelWords = allResult.records.filter(r => String(r.level) === String(level));
              if (levelWords.length > 0) {
                  container.innerHTML = levelWords.map(record => renderRecordItem(record)).join('');
                  return;
              }
          }
          container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">這級別還沒有儲存單字喔！快去記錄吧</div></div>';
        }
      } catch (err) {
        container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><div class="empty-state-text">載入失敗，請檢查網路</div></div>';
      }
    }
`;
  
  // Insert before the closing script tag
  content = content.replace(/<\/script>\s*<\/body>/, codeToInsert + '\n  </script>\n</body>');
  fs.writeFileSync('public/teacher_vocab.html', content, 'utf8');
  console.log('✅ loadExamLevel logic injected successfully.');
} else {
  console.log('✅ loadExamLevel already exists.');
}
