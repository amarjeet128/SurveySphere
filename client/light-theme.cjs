const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'src');

const replacements = [
  { regex: /bg-slate-900/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-950/g, replacement: 'bg-slate-100' },
  { regex: /bg-slate-800\/50/g, replacement: 'bg-white/60' },
  { regex: /bg-slate-800\/30/g, replacement: 'bg-white/40' },
  { regex: /bg-slate-800\/80/g, replacement: 'bg-white/80' },
  { regex: /bg-slate-800/g, replacement: 'bg-white' },
  { regex: /bg-slate-700\/50/g, replacement: 'bg-slate-100' },
  { regex: /bg-slate-700\/30/g, replacement: 'bg-slate-50' },
  { regex: /bg-slate-700/g, replacement: 'bg-slate-200' },
  { regex: /border-slate-800\/50/g, replacement: 'border-slate-200' },
  { regex: /border-slate-800/g, replacement: 'border-slate-200' },
  { regex: /border-slate-700\/50/g, replacement: 'border-slate-200' },
  { regex: /border-slate-700/g, replacement: 'border-slate-300' },
  { regex: /border-slate-600/g, replacement: 'border-slate-300' },
  { regex: /text-slate-200/g, replacement: 'text-slate-800' },
  { regex: /text-slate-300/g, replacement: 'text-slate-700' },
  { regex: /text-slate-400/g, replacement: 'text-slate-500' },
  { regex: /text-slate-500/g, replacement: 'text-slate-400' },
  { regex: /text-white/g, replacement: 'text-slate-900' },
  { regex: /text-indigo-300/g, replacement: 'text-indigo-600' },
  { regex: /text-indigo-400/g, replacement: 'text-indigo-600' },
  { regex: /hover:bg-slate-800\/50/g, replacement: 'hover:bg-slate-100/50' },
  { regex: /hover:bg-slate-800/g, replacement: 'hover:bg-slate-50' },
  { regex: /hover:bg-slate-700/g, replacement: 'hover:bg-slate-100' },
  { regex: /hover:text-white/g, replacement: 'hover:text-slate-900' },
];

function processDirectory(dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.jsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      replacements.forEach(({ regex, replacement }) => {
        content = content.replace(regex, replacement);
      });

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  });
}

processDirectory(directoryPath);
console.log('Light theme overhaul complete.');
