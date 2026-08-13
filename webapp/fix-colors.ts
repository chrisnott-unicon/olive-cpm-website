import fs from 'fs';
import path from 'path';

const replaceColors = (dir: string) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceColors(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      const original = content;
      content = content.replace(/unicon-blue/g, 'architect-coal');
      content = content.replace(/unicon-orange/g, 'olive-primary');
      content = content.replace(/unicon-neutral/g, 'zinc-100');
      content = content.replace(/blue-50/g, 'zinc-50');
      content = content.replace(/orange-50/g, 'olive-light');
      content = content.replace(/emerald-500/g, 'olive-primary');
      // Just some minor cleanups of other classes that might cause weird combinations
      content = content.replace(/bg-architect-coal\/10/g, 'bg-zinc-100');
      content = content.replace(/text-architect-coal\/40/g, 'text-zinc-400');
      content = content.replace(/text-architect-coal\/30/g, 'text-zinc-500');
      content = content.replace(/border-architect-coal\/30/g, 'border-zinc-200');

      if (content !== original) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

replaceColors('./src');
