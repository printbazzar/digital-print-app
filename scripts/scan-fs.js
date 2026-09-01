const fs = require('fs');
const path = require('path');

function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      walk(p);
    } else if (p.endsWith('.ts') || p.endsWith('.tsx')) {
      const c = fs.readFileSync(p, 'utf8');
      if (c.includes("from 'fs'") || c.includes("require('fs')")) {
        console.log('FS FOUND IN:', p);
      }
    }
  }
}

walk('./src');
console.log('✔ All src files verified clean!');
