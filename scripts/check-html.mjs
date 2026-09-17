// scripts/check-html.mjs —— 检查 index.html 是否含内联事件处理器
// 零依赖：仅用 Node 内置模块
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const violations = [];

// 匹配 onclick= / onload= / onerror= 等内联事件处理器
const inlineEvent = /\son[a-z]+\s*=\s*["'][^"']*["']/gi;
let m;
while ((m = inlineEvent.exec(html)) !== null) {
  const line = html.slice(0, m.index).split('\n').length;
  violations.push(`  L${line}: ${m[0].slice(0, 60)}`);
}

if (violations.length > 0) {
  console.error(`\n❌ index.html 含 ${violations.length} 处内联事件处理器（code-quality §3）：`);
  violations.forEach((v) => console.error(v));
  console.error('\n请改用 data-goto / data-toast + core/router.js 事件委托。\n');
  process.exit(1);
}
console.log('✅ index.html 无内联事件处理器');
