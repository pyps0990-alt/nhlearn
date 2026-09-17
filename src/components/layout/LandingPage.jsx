import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarSync, BookMarked, NotebookPen, ClipboardList,
  Store, TrainFront, Github, ArrowRight
} from 'lucide-react';

/*
 * 前導頁設計概念：高三教室後牆的「倒數牌」 × 螢光筆筆記
 * ──────────────────────────────────────────────────────
 * 主視覺是真正在跑的學測倒數，而不是裝飾性的數字。
 * 色塊取自螢光筆，粗框線與實心位移陰影取自手帳／貼紙質感。
 */

// 大考中心公告之學測日期（暫定日期以官方簡章為準）
const EXAM_DATES = [
  { year: 116, label: '116 學測', start: '2027-01-22T08:00:00+08:00', end: '2027-01-24T23:59:59+08:00' },
  { year: 117, label: '117 學測', start: '2028-01-21T08:00:00+08:00', end: '2028-01-23T23:59:59+08:00' },
];

function useExamCountdown() {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    // 每秒更新一次。頁面在背景時瀏覽器會自動節流，成本可忽略。
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  return useMemo(() => {
    const target = EXAM_DATES.find(e => new Date(e.end).getTime() > now);
    if (!target) return null;

    const startMs = new Date(target.start).getTime();
    const diff = startMs - now;

    if (diff <= 0) return { label: target.label, inProgress: true };

    const totalSeconds = Math.floor(diff / 1000);
    return {
      label: target.label,
      inProgress: false,
      days: Math.floor(totalSeconds / 86400),
      hours: Math.floor((totalSeconds % 86400) / 3600),
      minutes: Math.floor((totalSeconds % 3600) / 60),
      seconds: totalSeconds % 60,
      dateText: new Date(target.start).toLocaleDateString('zh-TW', {
        year: 'numeric', month: 'long', day: 'numeric'
      }),
    };
  }, [now]);
}

const FEATURES = [
  {
    icon: CalendarSync,
    tone: 'blue',
    title: '課表跟著班級一起變',
    desc: '臨時調課由班級幹部更新後，全班立刻收到推播。當天的代課隔天會自動恢復原課表。',
  },
  {
    icon: BookMarked,
    tone: 'pink',
    title: '單字照遺忘曲線排複習',
    desc: '答錯的字會更常出現，記熟的往後排。AI 會拆解字根，把同源的字放在一起記。',
  },
  {
    icon: ClipboardList,
    tone: 'mint',
    title: '聯絡簿存在雲端',
    desc: '作業與小考登記全班共用一份，換手機或重灌都還在。',
  },
  {
    icon: NotebookPen,
    tone: 'yellow',
    title: '段考考程自動帶入',
    desc: '考前一晚八點後，課表區會換成隔天的考科明細。',
  },
  {
    icon: Store,
    tone: 'pink',
    title: '校園周邊特約',
    desc: '出示畫面就能用學生折扣，不必再另外帶卡。',
  },
  {
    icon: TrainFront,
    tone: 'blue',
    title: '通勤與天氣',
    desc: '上學前先看 YouBike 剩幾台、要不要帶傘。',
  },
];

const LandingPage = ({ onStart, onGuestStart }) => {
  const countdown = useExamCountdown();

  return (
    <div className="lp">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <header className="lp-nav">
        <div className="lp-brand">
          <span className="lp-brand-mark" aria-hidden="true">G</span>
          <span className="lp-brand-name">GSAT&nbsp;Pro</span>
        </div>
        <nav className="lp-nav-links">
          <a href="#features">功能</a>
          <a href="/privacy.html">隱私</a>
          <a href="/terms.html">條款</a>
        </nav>
      </header>

      <main>
        {/* ── 主視覺：倒數牌 ─────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-board" role="timer" aria-live="off">
            {countdown ? (
              countdown.inProgress ? (
                <>
                  <p className="lp-board-label">{countdown.label}</p>
                  <p className="lp-board-now">考試中</p>
                  <p className="lp-board-foot">剩下的交給實力，加油。</p>
                </>
              ) : (
                <>
                  <p className="lp-board-label">距離 {countdown.label} 還有</p>
                  <p className="lp-board-days">
                    <span className="lp-board-num">{countdown.days}</span>
                    <span className="lp-board-unit">天</span>
                  </p>
                  <p className="lp-board-clock">
                    {String(countdown.hours).padStart(2, '0')}
                    <span className="lp-tick">:</span>
                    {String(countdown.minutes).padStart(2, '0')}
                    <span className="lp-tick">:</span>
                    {String(countdown.seconds).padStart(2, '0')}
                  </p>
                  <p className="lp-board-foot">{countdown.dateText}起考三天</p>
                </>
              )
            ) : (
              <p className="lp-board-foot">考程更新中</p>
            )}
          </div>

          <div className="lp-hero-copy">
            <h1>
              高三很短，<br />
              別把時間花在<mark>找資訊</mark>上。
            </h1>
            <p className="lp-lede">
              課表、作業、單字、考程、特約商店，散在五個群組和三個網站裡。
              GSAT Pro 把它們收在同一個地方，需要的時候自己跳出來。
            </p>
            <div className="lp-cta">
              <button type="button" className="lp-btn lp-btn-primary" onClick={onStart}>
                用 Google 帳號開始
                <ArrowRight size={20} strokeWidth={2.75} aria-hidden="true" />
              </button>
              <button type="button" className="lp-btn lp-btn-ghost" onClick={onGuestStart}>
                先看看不登入
              </button>
            </div>
            <p className="lp-note">不登入也能用，只是資料留在這台裝置上。</p>
          </div>
        </section>

        {/* ── 功能 ──────────────────────────────────── */}
        <section className="lp-features" id="features">
          <h2 className="lp-h2">它幫你記著這些事</h2>
          <ul className="lp-grid">
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <li key={feature.title} className={`lp-card lp-tone-${feature.tone}`}>
                  <span className="lp-card-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={2.5} />
                  </span>
                  <h3>{feature.title}</h3>
                  <p>{feature.desc}</p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* ── 專案 ──────────────────────────────────── */}
        <section className="lp-open">
          <div className="lp-open-inner">
            <h2 className="lp-h2">一個學生寫給同學用的工具</h2>
            <p>
              GSAT Pro 是開源的，沒有廣告、不賣資料。
              覺得哪裡難用或想到該加什麼，直接開一則 issue 告訴我。
            </p>
            <a
              className="lp-btn lp-btn-dark"
              href="https://github.com/pyps0990-alt/nhlearn"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github size={20} strokeWidth={2.5} aria-hidden="true" />
              到 GitHub 看原始碼
            </a>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-footer-links">
          <a href="/privacy.html">隱私政策</a>
          <a href="/terms.html">服務條款</a>
          <a href="mailto:support@gsat-pro.web.app">聯絡我們</a>
        </div>
        <p>© 2026 GSAT Pro</p>
      </footer>
    </div>
  );
};

const CSS = `
.lp {
  /* 螢光筆色系 */
  --ink: #16161d;
  --paper: #f4f3ef;
  --card: #ffffff;
  --line: #16161d;
  --muted: #5d5d68;
  --yellow: #ffe600;
  --pink: #ff4d6d;
  --blue: #2b4cff;
  --mint: #00d68f;

  --shadow: 5px 5px 0 var(--line);
  --shadow-sm: 3px 3px 0 var(--line);

  background: var(--paper);
  color: var(--ink);
  min-height: 100vh;
  font-family: 'Noto Sans TC', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}

/* 夜讀用 */
@media (prefers-color-scheme: dark) {
  .lp {
    --ink: #f2f2f0;
    --paper: #111116;
    --card: #1c1c23;
    --line: #000000;
    --muted: #a0a0ad;
  }
}

.lp *, .lp *::before, .lp *::after { box-sizing: border-box; }
.lp a { color: inherit; text-decoration: none; }
.lp h1, .lp h2, .lp h3, .lp p, .lp ul { margin: 0; }
.lp ul { list-style: none; padding: 0; }

.lp :focus-visible {
  outline: 3px solid var(--blue);
  outline-offset: 3px;
}

/* ── 導覽列 ─────────────────────────────── */
.lp-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  max-width: 68rem;
  margin: 0 auto;
  padding: 1.25rem 1.25rem;
}
.lp-brand { display: flex; align-items: center; gap: .6rem; }
.lp-brand-mark {
  display: grid;
  place-items: center;
  width: 2.1rem;
  height: 2.1rem;
  background: var(--yellow);
  color: #16161d;
  border: 2.5px solid var(--line);
  border-radius: .55rem;
  font-family: Nunito, sans-serif;
  font-weight: 900;
  font-size: 1.1rem;
  box-shadow: var(--shadow-sm);
}
.lp-brand-name { font-weight: 800; font-size: 1.05rem; letter-spacing: -.01em; }
.lp-nav-links { display: flex; gap: 1.4rem; font-size: .9rem; font-weight: 600; color: var(--muted); }
.lp-nav-links a:hover { color: var(--ink); }

/* ── 主視覺 ─────────────────────────────── */
.lp-hero {
  max-width: 68rem;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 4rem;
  display: grid;
  gap: 2.5rem;
  align-items: center;
}
@media (min-width: 62rem) {
  .lp-hero {
    grid-template-columns: 22rem 1fr;
    gap: 3.5rem;
    padding-top: 3rem;
    padding-bottom: 6rem;
  }
}

.lp-board {
  background: var(--yellow);
  color: #16161d;
  border: 3px solid #16161d;
  border-radius: 1.1rem;
  box-shadow: 8px 8px 0 #16161d;
  padding: 1.75rem 1.5rem;
  text-align: center;
  transform: rotate(-1.4deg);
}
.lp-board-label { font-size: .9rem; font-weight: 800; }
.lp-board-days {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: .3rem;
  margin: .2rem 0 .1rem;
}
.lp-board-num {
  font-family: Nunito, sans-serif;
  font-weight: 900;
  font-size: clamp(5rem, 22vw, 8.5rem);
  line-height: .88;
  letter-spacing: -.045em;
  font-variant-numeric: tabular-nums;
}
.lp-board-unit { font-size: 1.5rem; font-weight: 900; }
.lp-board-now {
  font-family: Nunito, sans-serif;
  font-weight: 900;
  font-size: clamp(3rem, 14vw, 4.5rem);
  line-height: 1;
  margin: .3rem 0;
}
.lp-board-clock {
  font-family: Nunito, sans-serif;
  font-weight: 800;
  font-size: 1.3rem;
  font-variant-numeric: tabular-nums;
  letter-spacing: .02em;
}
.lp-tick { animation: lp-blink 1s steps(1, end) infinite; }
@keyframes lp-blink { 50% { opacity: .25; } }
.lp-board-foot {
  margin-top: .75rem;
  padding-top: .7rem;
  border-top: 2px dashed rgba(22,22,29,.35);
  font-size: .82rem;
  font-weight: 700;
}

.lp-hero-copy h1 {
  font-size: clamp(2.1rem, 7.5vw, 3.5rem);
  font-weight: 900;
  line-height: 1.18;
  letter-spacing: -.025em;
}
.lp-hero-copy mark {
  background: linear-gradient(transparent 58%, var(--pink) 58%);
  color: inherit;
  padding: 0 .1em;
}
.lp-lede {
  margin-top: 1.1rem;
  max-width: 34rem;
  font-size: 1.02rem;
  line-height: 1.8;
  color: var(--muted);
}
.lp-cta { display: flex; flex-wrap: wrap; gap: .8rem; margin-top: 1.9rem; }
.lp-note { margin-top: .9rem; font-size: .84rem; color: var(--muted); }

.lp-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
  padding: .9rem 1.5rem;
  border: 3px solid var(--line);
  border-radius: .75rem;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--shadow);
  transition: transform .12s ease, box-shadow .12s ease;
}
.lp-btn:hover { transform: translate(2px, 2px); box-shadow: var(--shadow-sm); }
.lp-btn:active { transform: translate(5px, 5px); box-shadow: 0 0 0 var(--line); }
.lp-btn-primary { background: var(--blue); color: #fff; }
.lp-btn-ghost { background: var(--card); color: var(--ink); }
.lp-btn-dark { background: var(--ink); color: var(--paper); }

/* ── 功能 ───────────────────────────────── */
.lp-features { max-width: 68rem; margin: 0 auto; padding: 0 1.25rem 4rem; }
.lp-h2 {
  font-size: clamp(1.5rem, 5vw, 2.1rem);
  font-weight: 900;
  letter-spacing: -.02em;
  margin-bottom: 1.6rem;
}
.lp-grid { display: grid; gap: 1rem; }
@media (min-width: 40rem) { .lp-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 62rem) { .lp-grid { grid-template-columns: repeat(3, 1fr); } }

.lp-card {
  background: var(--card);
  border: 3px solid var(--line);
  border-radius: 1rem;
  box-shadow: var(--shadow);
  padding: 1.4rem;
}
.lp-card h3 { margin-top: .9rem; font-size: 1.08rem; font-weight: 800; }
.lp-card p { margin-top: .5rem; font-size: .92rem; line-height: 1.75; color: var(--muted); }
.lp-card-icon {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  border: 2.5px solid #16161d;
  border-radius: .6rem;
  color: #16161d;
}
.lp-tone-yellow .lp-card-icon { background: var(--yellow); }
.lp-tone-pink   .lp-card-icon { background: var(--pink); }
.lp-tone-blue   .lp-card-icon { background: var(--blue); color: #fff; }
.lp-tone-mint   .lp-card-icon { background: var(--mint); }

/* ── 專案 ───────────────────────────────── */
.lp-open { max-width: 68rem; margin: 0 auto; padding: 0 1.25rem 4rem; }
.lp-open-inner {
  background: var(--mint);
  color: #16161d;
  border: 3px solid #16161d;
  border-radius: 1.25rem;
  box-shadow: 8px 8px 0 #16161d;
  padding: 2.25rem 1.75rem;
}
.lp-open-inner p {
  margin: .9rem 0 1.6rem;
  max-width: 38rem;
  font-size: 1rem;
  line-height: 1.8;
  font-weight: 500;
}
.lp-open .lp-btn-dark { background: #16161d; color: #fff; border-color: #16161d; }

/* ── 頁尾 ───────────────────────────────── */
.lp-footer {
  border-top: 3px solid var(--line);
  padding: 2rem 1.25rem 2.5rem;
  text-align: center;
  font-size: .86rem;
  color: var(--muted);
}
.lp-footer-links { display: flex; flex-wrap: wrap; justify-content: center; gap: 1.4rem; margin-bottom: .9rem; font-weight: 700; }
.lp-footer-links a:hover { color: var(--ink); }

@media (prefers-reduced-motion: reduce) {
  .lp *, .lp *::before, .lp *::after {
    animation-duration: .001ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: .001ms !important;
  }
}
`;

export default LandingPage;
