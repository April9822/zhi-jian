// scripts/check-css.mjs —— 检查 style.css 的规范违规
// 豁免：@media (prefers-reduced-motion: reduce) 块内规则（无障碍兜底需要 !important）
import { readFileSync } from 'node:fs';

const raw = readFileSync('src/style.css', 'utf8');

// 移除 @media (prefers-reduced-motion: reduce) { ... } 块（U5 裁决豁免区间）
const css = raw.replace(/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?\n\}/g, '');

const checks = [
  { name: '!important（禁止）', re: /!important/g },
  { name: '禁用色值 #000/#000000/#fff/#FFFFFF', re: /#(000|000000|fff|ffffff)\b/gi },
  { name: 'ID 选择器做样式（#xxx{ ）', re: /#[a-zA-Z][\w-]*\s*\{/g },
];
let failed = false;
for (const c of checks) {
  const hits = css.match(c.re) || [];
  if (hits.length > 0) {
    console.error(`❌ ${c.name}：${hits.length} 处`);
    failed = true;
  }
}
if (failed) process.exit(1);
console.log('✅ CSS 规范检查通过');
