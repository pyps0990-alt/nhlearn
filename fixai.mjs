import { readFileSync, writeFileSync } from 'fs';
const c = readFileSync('src/App.jsx', 'utf8');

let result = c;
// Replace 1.5-flash with 2.5-flash
result = result.replace(
  'gemini-1.5-flash:generateContent',
  'gemini-2.5-flash:generateContent'
);

// Replace OpenRouter's 2.0-flash-exp:free with 2.5-flash? The user said "gemini 2.0改成2.5" 
// The OpenRouter string is "google/gemini-2.0-flash-exp:free" -> maybe user meant this one?
result = result.replace(
  '"google/gemini-2.0-flash-exp:free"',
  '"google/gemini-2.5-flash"'
);

writeFileSync('src/App.jsx', result, 'utf8');
console.log('AI model version updated.');
