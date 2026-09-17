// scripts/check-garden-dom.mjs —— 花园五区域 DOM 结构守卫（零依赖）
// 目的：把 T03 的 DOM 契约固化为可在 CI 运行的断言（不依赖浏览器）。
//   1. 五区域根元素 + self 锚点齐备：#eco-tree/#eco-flower/#eco-stream/#eco-nursery/#eco-camp/#eco-seedling
//   2. 溪边动物：.stream-animals 组 + 4 个 <button class="animal" data-animal=...> + aria-pressed
//   3. 旧结构已清除：.animal-zone / #animal-zone / .garden-midlayer / .garden-fore 不得出现
//   4. 无内联 onclick（无脚本注入点）
import { readFileSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const fail = [];

/** 必需的锚点 id */
const REQUIRED_IDS = ['eco-tree', 'eco-flower', 'eco-stream', 'eco-nursery', 'eco-camp', 'eco-seedling'];
for (const id of REQUIRED_IDS) {
  if (!new RegExp(`id="${id}"`).test(html)) fail.push(`缺锚点元素 #${id}`);
}

/** data-anchor 契约（节点 -> 锚点键） */
const REQUIRED_ANCHORS = ['family', 'partner', 'friend', 'child', 'colleague', 'self'];
for (const a of REQUIRED_ANCHORS) {
  if (!new RegExp(`data-anchor="${a}"`).test(html)) fail.push(`缺 data-anchor="${a}"`);
}

/** 溪边动物组 */
if (!/class="stream-animals"/.test(html)) fail.push('缺 .stream-animals 组');
const animalCount = (html.match(/class="animal"/g) || []).length;
if (animalCount !== 4) fail.push(`.animal 数量应为 4，实际 ${animalCount}`);
for (const animal of ['fox', 'rabbit', 'squirrel', 'deer']) {
  if (!new RegExp(`data-animal="${animal}"`).test(html)) fail.push(`缺 data-animal="${animal}"`);
}
const pressedCount = (html.match(/aria-pressed="false"/g) || []).length;
if (pressedCount < 4) fail.push(`aria-pressed 应至少 4 处，实际 ${pressedCount}`);
if (!/<button class="animal"/.test(html)) fail.push('.animal 必须是 <button>（无障碍键盘触发）');

/** 旧结构不得残留 */
for (const legacy of ['animal-zone', 'garden-midlayer', 'garden-fore']) {
  if (html.includes(legacy)) fail.push(`旧结构残留：${legacy}`);
}

/** 无内联事件处理器 */
if (/\son[a-z]+\s*=/i.test(html)) fail.push('index.html 含内联事件处理器');

if (fail.length > 0) {
  console.error(`\n❌ 花园 DOM 结构守卫失败（${fail.length} 项）：`);
  fail.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}
console.log('✅ 花园五区域 DOM 结构检查通过（6 锚点 + 溪边 4 动物 + 旧结构已清除）');
