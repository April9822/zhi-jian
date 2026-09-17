// scripts/check-nodes.mjs —— 节点 id 字面量守卫（零依赖：仅用 Node 内置模块）
//
// 目的：根治「节点集散落多处硬编码」的地雷。
//   V2 起，节点 id 字面量只允许出现在 src/core/nodes.js（唯一定义源）
//   与 src/core/relations.js 的 SCENE_KEYWORDS 词典声明区（词典天然需字面量键）。
//   禁止标识符 ROLE_NODES 与历史名词 'animal-zone' 复活（除非位于白名单文件的注释中）。
//   违反 -> 退出码非 0 -> CI/本地 lint 失败。
//
// 白名单：src/core/nodes.js、src/core/relations.js、所有 tests/**、以及任意 .js 的注释行。
//
// 可测试性：核心判定（lineHasNodeLiteral / lineHasHistoryName）已导出，
//   供 tests/check-nodes.test.js 直接断言，无需真的扫描文件系统。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** 全部节点 id（含 none） */
export const NODE_IDS = ['family', 'partner', 'friend', 'child', 'colleague', 'none'];

/** 具名节点 id（不含 none）——语义唯一，无条件拦截 */
export const NAMED_TEXT_IDS = NODE_IDS.filter((id) => id !== 'none');

export const NONE_LITERAL = /(['"])none\1/;

// 'none' 与 CSS 关键字（fill:'none' / display:'none' 等）高度冲突，但守卫必须 **fail-closed**
// （假阴性致命 —— 漏掉 `const X = 'none'` 这类裸字面量正是要根治的病；假阳性只是吵闹）。
// 故：'none' 出现时，**只有确证是 CSS 值（匹配下方属性名白名单）才放行**，否则一律按疑似节点字面量拦截。
export const NONE_VALUE_HINT = new RegExp(
  [
    'display',
    'pointerEvents',
    'pointer-events',
    'fill',
    'stroke',
    'stop-color',
    'animation',
    'animationName',
    'transition',
    'preserveAspectRatio',
    'visibility',
    'content',
    'listStyle',
    'list-style',
    'textDecoration',
    'text-decoration',
    'userSelect',
    'user-select',
    'filter',
    'outline',
    'border',
    'background',
    'boxShadow',
    'box-shadow',
    'transform',
    'opacity',
  ].join('|'),
  'i'
);

/** 允许出现节点字面量 / 历史名词的文件（相对项目根，normalize 为平台分隔符） */
const ALLOWED_FILE_PARTS = [
  ['src', 'core', 'nodes.js'].join(sep),
  ['src', 'core', 'relations.js'].join(sep),
];
const ALLOWED_PREFIXES = ['tests' + sep, 'scripts' + sep];

/**
 * 判断文件是否位于白名单。
 * @param {string} rel - 相对项目根路径（平台分隔符）
 * @returns {boolean}
 */
export function isAllowedFile(rel) {
  if (ALLOWED_FILE_PARTS.some((p) => rel === p || rel.endsWith(sep + p))) return true;
  return ALLOWED_PREFIXES.some((prefix) => rel.startsWith(prefix));
}

/**
 * 该行是否为「注释行」（仅行首 // 或 * 或 /* 起始的纯注释行）。
 * 行内注释（如 `const x = 1; // 'family'`）不豁免——与架构文档一致（更严格，无漏网）。
 * @param {string} line
 * @returns {boolean}
 */
export function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/**
 * 逐行检测节点 id 字面量（含 none 的 fail-closed 判定）。
 * @param {string} line
 * @returns {boolean}
 */
export function lineHasNodeLiteral(line) {
  // 5 个非 none 的 id：语义唯一，无条件拦截
  const nonNone = new RegExp(`(['"])(?:${NAMED_TEXT_IDS.join('|')})\\1`);
  if (nonNone.test(line)) return true;
  // none：fail-closed —— 只有确证是 CSS 值（行内出现白名单属性名）才放行；
  //       否则按疑似节点字面量拦截。
  if (NONE_LITERAL.test(line)) {
    return !NONE_VALUE_HINT.test(line);
  }
  return false;
}

/**
 * 构造历史名词拦截规则。
 * @param {boolean} animalZoneMigrated - index.html 是否已完成 animal-zone -> eco-stream 迁移
 * @returns {Array<{re: RegExp, label: string}>}
 */
export function buildHistoryNameRules(animalZoneMigrated) {
  const rules = [{ re: /\bROLE_NODES\b/, label: 'ROLE_NODES' }];
  if (animalZoneMigrated) {
    rules.push({ re: /(['"])animal-zone\1/, label: "'animal-zone'" });
  }
  return rules;
}

/**
 * 逐行检测历史名词。
 * @param {string} line
 * @param {Array<{re: RegExp, label: string}>} rules
 * @returns {string|null} 命中的 label，未命中返回 null
 */
export function lineHasHistoryName(line, rules) {
  for (const h of rules) {
    if (h.re.test(line)) return h.label;
  }
  return null;
}

/** 递归收集目录下所有 .js / .mjs 文件 */
function collectJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectJsFiles(full));
    } else if (/\.(js|mjs)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

/**
 * 扫描 src/ 收集全部违规。
 * @returns {{violations: string[], animalZoneMigrated: boolean}}
 */
export function collectViolations() {
  const files = collectJsFiles('src');
  const violations = [];

  for (const file of files) {
    const rel = relative(process.cwd(), file);
    if (isAllowedFile(rel)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      if (lineHasNodeLiteral(line)) {
        violations.push(`  ${rel}:${i + 1}  节点 id 字面量 —— ${line.trim().slice(0, 70)}`);
      }
    });
  }

  // 历史名词拦截：
  //   1. ROLE_NODES —— 已彻底删除，无条件拦截（防从 git 历史翻出复用，形成第二个节点来源）。
  //   2. 'animal-zone' —— T03 将把 #animal-zone 迁移为 #eco-stream × .stream-animals。
  //      为兼顾「T01 交付时 CI 必须绿」与「T03 迁移后必须拦截」，此处做**迁移感知**：
  //      仅当 index.html 已不再含 animal-zone（迁移完成）后，才对 .js 里的 animal-zone 字面量报错。
  //      迁移未完成时放行（否则 T01 阶段因未迁移的 DOM 引用而误报）。
  const indexHtml = readFileSync('index.html', 'utf8');
  const animalZoneMigrated = !indexHtml.includes('animal-zone');
  const historyRules = buildHistoryNameRules(animalZoneMigrated);

  for (const file of files) {
    const rel = relative(process.cwd(), file);
    if (isAllowedFile(rel)) continue;
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);
    lines.forEach((line, i) => {
      if (isCommentLine(line)) return;
      const hit = lineHasHistoryName(line, historyRules);
      if (hit) {
        violations.push(`  ${rel}:${i + 1}  历史名词 ${hit} —— ${line.trim().slice(0, 70)}`);
      }
    });
  }

  return { violations, animalZoneMigrated };
}

/** CLI 入口（仅当作为主模块直接运行时执行） */
function main() {
  const { violations, animalZoneMigrated } = collectViolations();
  if (violations.length > 0) {
    console.error(`\n❌ 发现 ${violations.length} 处节点字面量 / 历史名词违规：`);
    violations.forEach((v) => console.error(v));
    console.error('\n节点 id 只允许出现在 src/core/nodes.js（唯一定义源）与 src/core/relations.js 词典区。');
    console.error('要新增节点 -> 只改 src/core/nodes.js 一处。\n');
    process.exit(1);
  }
  if (!animalZoneMigrated) {
    console.log('✅ 节点字面量检查通过（仅存于白名单）· 注：animal-zone 迁移窗口未关闭（T03 完成后自动收紧）');
  } else {
    console.log('✅ 节点字面量检查通过（仅存于白名单）· animal-zone 迁移窗口已关闭');
  }
}

// 仅在被直接执行时运行 CLI（被测试 import 时不执行）
const invokedDirectly =
  process.argv[1] != null && process.argv[1].replace(/\\/g, '/').endsWith('scripts/check-nodes.mjs');

if (invokedDirectly) {
  main();
}
