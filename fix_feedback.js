const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

c = c.replace(/\r\n/g, '\n');

const targetStr = `        <a
          href="https://forms.gle/gJyuP7ZEBjdo2MFK9"
          target="_blank"
          rel="noreferrer"
          className="inline-block bg-white text-emerald-700 font-black px-7 py-3 rounded-2xl active:scale-95 transition-all shadow-lg text-sm hover:-translate-y-0.5"
        >
          意見回饋表單 →
        </a>`;

const replacement = `        <button
          onClick={() => setIsFeedbackOpen(true)}
          className="inline-block bg-white text-emerald-700 font-black px-7 py-3 rounded-2xl active:scale-95 transition-all shadow-lg text-sm hover:-translate-y-0.5"
        >
          意見回饋表單 →
        </button>
      </div>
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} />`;

if (c.includes(targetStr)) {
  c = c.replace(targetStr, replacement);
  fs.writeFileSync('src/App.jsx', c, 'utf8');
  console.log('✅ Feedback Button injected successfully!');
} else {
  console.log('❌ Target string not found in App.jsx. Check exact wording.');
}
