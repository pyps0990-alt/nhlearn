import { readFileSync, writeFileSync } from 'fs';
const c = readFileSync('src/App.jsx', 'utf8');
const target = `    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);`;
const replacement = `    let timeoutId;
    const tick = () => {
      setCurrentTime(new Date());
      timeoutId = setTimeout(tick, 1000 - (Date.now() % 1000));
    };
    tick();
    return () => clearTimeout(timeoutId);`;
const result = c.replace(target, replacement);
if (result === c) {
  console.log('NOT FOUND - trying CRLF');
  const target2 = target.replace(/\n/g, '\r\n');
  const result2 = c.replace(target2, replacement);
  if (result2 === c) {
    console.log('STILL NOT FOUND. First setInterval occurrence:');
    const idx = c.indexOf('setInterval');
    console.log(JSON.stringify(c.substring(idx - 10, idx + 100)));
  } else {
    writeFileSync('src/App.jsx', result2, 'utf8');
    console.log('Done (CRLF)');
  }
} else {
  writeFileSync('src/App.jsx', result, 'utf8');
  console.log('Done');
}
