const fs = require('fs');
const path = require('path');

const files = [
  'src/app/page.tsx',
  'src/app/production/page.tsx',
  'src/app/daily-closing/page.tsx',
  'src/app/inventory/page.tsx',
  'src/app/reports/page.tsx',
  'src/app/masters/page.tsx',
  'src/app/audit/page.tsx',
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace common emerald patterns with Yellow & Black brand accents
  content = content
    // Buttons
    .replace(/bg-emerald-600 hover:bg-emerald-700 text-white/g, 'bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-black shadow-md shadow-yellow-400/20')
    .replace(/bg-emerald-600 text-white/g, 'bg-yellow-400 text-slate-950 font-black')
    .replace(/bg-emerald-500/g, 'bg-yellow-400')
    .replace(/text-emerald-600/g, 'text-yellow-600')
    .replace(/text-emerald-700/g, 'text-yellow-800')
    .replace(/text-emerald-800/g, 'text-slate-950')
    .replace(/bg-emerald-50/g, 'bg-yellow-50')
    .replace(/bg-emerald-100/g, 'bg-yellow-100')
    .replace(/border-emerald-200/g, 'border-yellow-300')
    .replace(/border-emerald-300/g, 'border-yellow-400')
    .replace(/border-emerald-500/g, 'border-yellow-400')
    .replace(/focus:ring-emerald-500/g, 'focus:ring-yellow-400 focus:border-yellow-400')
    .replace(/shadow-emerald-500\/20/g, 'shadow-yellow-400/20')
    .replace(/shadow-emerald-600\/30/g, 'shadow-yellow-400/30');

  fs.writeFileSync(file, content, 'utf8');
  console.log(`✔ Updated theme for ${file}`);
}
console.log('🎉 Yellow, Black, and White theme applied successfully across all pages!');
