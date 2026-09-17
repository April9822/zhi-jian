// scripts/check-constitution.mjs —— 产品宪法静态扫描（零依赖：仅用 Node 内置模块）
//
// 职责边界（⚠️ 与 QA 的 E2E 运行测试明确分工）：
//   本脚本只扫【静态源码文本】——会写进仓库、能被 review 的字符串：
//     · index.html —— 文本节点 + 属性值（aria-label/title/placeholder/alt/value），剔除 HTML 注释
//     · src/**.js  —— 字符串字面量（单引号/双引号/模板串），剔除代码注释
//     · src/style.css —— 仅 content: 的值，剔除 CSS 注释
//   本脚本【不扫】运行时动态拼接文案（toast/错误信息运行时结果）——那是 QA 的 E2E 层。
//   二者互补，不重叠：静态在写代码时拦截，动态在跑起来后拦截。
//
// 实现要点：**逐行处理以保持行号准确**，绝不整文件 strip（整文件正则替换会破坏行号 → 误报）。
// 依据：`.claude/rules/product-principles.md`（宪法）+ PRD §5 术语纪律 / §8 宪法适配 / §10.3。
// 违反 -> 退出码非 0 -> CI/本地 lint 失败。
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

// ─────────────────────────── 规则表 ───────────────────────────
/** 🔴 无条件禁止（宪法 §2/§3/§8）：术语违反 + 侮辱标签 + 人格诊断 + 破坏性建议 + 道德审判 */
const FORBIDDEN_TERMS = [
  // —— 术语纪律（宪法 §8 右列）——
  { word: '数据看板', why: '禁止术语（宪法 §8）→ 应为「关系花园」' },
  { word: '看板', why: '禁止术语（宪法 §8）→ 应为「关系花园」' },
  { word: '分析仪表盘', why: '禁止术语（宪法 §8）→ 应为「关系花园」' },
  { word: '仪表盘', why: '禁止术语（宪法 §8）→ 应为「关系花园」' },
  { word: '关系能量', why: '禁止术语（宪法 §8）→ 应为「关系养分」' },
  { word: '关系分数', why: '禁止术语（宪法 §8）→ 应为「关系养分」' },
  { word: '分析报告', why: '禁止术语（宪法 §8）→ 应为「情境回顾」' },
  { word: '裁决书', why: '禁止术语（宪法 §8）→ 应为「情境回顾」' },
  { word: '改进计划', why: '禁止术语（宪法 §8）→ 应为「成长建议」' },
  { word: '训练方案', why: '禁止术语（宪法 §8）→ 应为「成长建议」' },
  { word: '正确率', why: '禁止术语（宪法 §8）→ 应为「理解度/倾听度」' },
  { word: '准确度', why: '禁止术语（宪法 §8）→ 应为「理解度/倾听度」' },
  { word: '性格类型', why: '禁止术语（宪法 §8）→ 应为「表达风格/沟通风格」' },
  { word: '人格特征', why: '禁止术语（宪法 §8）→ 应为「表达风格/沟通风格」' },
  { word: '错误节点', why: '禁止术语（宪法 §8）→ 应为「关系转折点」' },
  { word: '败局', why: '禁止术语（宪法 §8）→ 应为「关系转折点」' },
  { word: '吵架等级', why: '禁止术语（宪法 §8）→ 应为「冲突值」' },
  { word: '火药指数', why: '禁止术语（宪法 §8）→ 应为「冲突值」' },
  { word: '挽回概率', why: '禁止术语（宪法 §8）→ 应为「修复度」' },
  { word: '和好几率', why: '禁止术语（宪法 §8）→ 应为「修复度」' },
  { word: '可信度评分', why: '禁止术语（宪法 §8）→ 应为「信任度」' },
  { word: '责任判定', why: '禁止术语（宪法 §8）→ 应为「行为责任分析」' },
  { word: '对错判断', why: '禁止术语（宪法 §8）→ 应为「行为责任分析」' },
  { word: '判官', why: '禁止术语（宪法 §2 禁止2）→ 知间不是裁判' },
  { word: '法官', why: '禁止术语（宪法 §2 禁止2）→ 知间不是裁判' },
  { word: '法庭', why: '禁止术语（宪法 §2 禁止2）→ 知间不是裁判' },
  // —— 侮辱性标签（宪法 §2 禁止3 / §3 红区）——
  { word: '渣男', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '渣女', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '妈宝男', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '妈宝女', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '扶弟魔', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '凤凰男', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '孔雀女', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '巨婴', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '白眼狼', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '没良心', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '公主病', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '王子病', why: '侮辱性标签（宪法 §2 禁止3）' },
  { word: '冷暴力', why: '侮辱性标签（宪法 §2 禁止3，应改为行为描述）' },
  // —— 人格诊断 / 临床术语（宪法 §2 禁止1 / §3 红区，无条件禁止）——
  { word: 'NPD', why: '临床诊断术语（宪法 §2 禁止1）— AI 无诊断权' },
  { word: 'BPD', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '边缘型人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '自恋型人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '反社会人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '回避型人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '依赖型人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '躁郁症', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '人格障碍', why: '临床诊断术语（宪法 §2 禁止1）' },
  { word: '回避型人格', why: '人格诊断标签（宪法 §2 禁止1）' },
  { word: '焦虑型依恋', why: '人格诊断标签（宪法 §2 禁止1）' },
  // —— 破坏性建议（宪法 §3 红区）——
  { word: '你应该分手', why: '破坏性建议（宪法 §3）' },
  { word: '建议分手', why: '破坏性建议（宪法 §3）' },
  { word: '建议离婚', why: '破坏性建议（宪法 §3）' },
  { word: '建议辞职', why: '破坏性建议（宪法 §3）' },
  { word: '断绝关系', why: '破坏性建议（宪法 §3）' },
  { word: '这人不行', why: '破坏性建议（宪法 §3）' },
  { word: '他不配', why: '破坏性建议（宪法 §3）' },
  { word: '离开他', why: '破坏性建议（宪法 §3）' },
  { word: '关系没救了', why: '破坏性建议（宪法 §3）' },
  // —— 道德审判（宪法 §2 禁止2 / §3 红区）——
  { word: '你错了', why: '道德审判（宪法 §2 禁止2）' },
  { word: '是你的问题', why: '道德审判（宪法 §2 禁止2）' },
  { word: '你的错', why: '道德审判（宪法 §2 禁止2）' },
  { word: '你不对', why: '道德审判（宪法 §2 禁止2）' },
  { word: '他错了', why: '道德审判（宪法 §2 禁止2）' },
  { word: '他太过分了', why: '道德审判（宪法 §2 禁止2）' },
  // —— 术语纪律（V2 追加：产品规范用「爱人」，禁用「伴侣」）——
  { word: '伴侣', why: '术语纪律（架构 C.4 / PRD）：产品规范用「爱人」，禁用「伴侣」' },
];

/** 白名单：合法上下文（命中即豁免该行）——仅宪法明确允许的用法 */
const TERM_ALLOWLIST = [/不代表长期人格/, /不代表人格/];

/** 百分比/分数模式（宪法 §6 / PRD §10.3 D1/D3：禁数字分数与进度外显） */
const SCORE_PATTERNS = [
  { re: /\d+(?:\.\d+)?\s*%/, why: '禁止百分比数字外显' },
  { re: /得分|评分|打分结果|满分|总分/, why: '禁止分数类术语（应用定性词）' },
];

/**
 * 疑似 CSS / SVG 值片段（不参与「分数外显」判定）——避免 `width:100%` / `rgba(...)` 误报。
 * 命中即跳过「分数」类检查（但仍参与禁用词与 emoji 检查）。
 */
const CSS_LIKE_RE =
  /(position\s*:|width\s*:|height\s*:|left\s*:|top\s*:|right\s*:|bottom\s*:|z-index|rgba?\(|hsla?\(|transform\s*:|opacity\s*:|font-size|line-height|padding|margin)/;

/**
 * emoji / 象形符号（**仅真 emoji 区段**）。
 * ⚠️ 刻意【不含】U+2190–U+21FF（Arrows）与 U+2B05–U+2B07：
 *   `→` `↓` 是本产品的合法排版字形（arrow-layer / what-if-arrow），不是 emoji。
 * 注：变体选择符 U+FE0F 单独用 `|` 拼接（不放进字符类，避免 eslint no-misleading-character-class）。
 */
const EMOJI_RE = new RegExp(
  '[\\u{1F000}-\\u{1FAFF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}' +
    '\\u{2B00}-\\u{2B04}\\u{2B08}-\\u{2BFF}\\u{1F1E6}-\\u{1F1FF}]|\\u{FE0F}',
  'u'
);

// ─────────────────────── 文本提取（只取「用户可见文本」） ───────────────────────
/**
 * 逐行剥离 JS 行内注释（引号感知）：只在「引号外」且遇到 `//` 时截断。
 * 不整文件替换 → 行号保持不变。
 * @param {string} line
 * @returns {string}
 */
function stripInlineComment(line) {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (quote) {
      if (ch === '\\') i += 1; // 跳过转义字符
      else if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch;
    } else if (ch === '/' && line[i + 1] === '/') {
      return line.slice(0, i);
    }
  }
  return line;
}

/** 该行是否为纯注释行（行首 // 或 * 或 /*） */
function isCommentLine(line) {
  const t = line.trim();
  return t.startsWith('//') || t.startsWith('*') || t.startsWith('/*');
}

/** 从单行 JS 源码中提取字符串字面量内容（单引号/双引号/模板串） */
function extractJsStrings(line) {
  const clean = stripInlineComment(line);
  const out = [];
  const re = /'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
  let m;
  while ((m = re.exec(clean)) !== null) out.push(m[1] ?? m[2] ?? m[3] ?? '');
  return out;
}

/** 从单行 HTML 中提取文本片段 + 可见属性值（剔除标签） */
function extractHtmlText(line) {
  const out = [];
  out.push(...line.replace(/<[^>]*>/g, '\n').split('\n'));
  const attrRe = /\b(?:aria-label|title|placeholder|alt|value)\s*=\s*"([^"]*)"/gi;
  let m;
  while ((m = attrRe.exec(line)) !== null) out.push(m[1]);
  return out;
}

// ─────────────────────────── 扫描 ───────────────────────────
const violations = [];

/**
 * 对一段「用户可见文本」做宪法检查。
 * @param {string} text - 待检文本片段
 * @param {string} loc  - 位置标签（file:line）
 * @param {boolean} isCopy - 是否为「产品文案」（true）/仅匹配词典或非文案（false，跳过禁用词检查）
 */
function checkText(text, loc, isCopy = true) {
  if (!text) return;
  const allowed = TERM_ALLOWLIST.some((re) => re.test(text));
  // 1) 禁用术语 —— 仅对「产品文案」检查（匹配词典里的同形词不算违规，见下）
  if (isCopy && !allowed) {
    for (const t of FORBIDDEN_TERMS) {
      if (text.includes(t.word)) {
        violations.push(`  ${loc}  【禁用词】「${t.word}」 —— ${t.why}`);
      }
    }
    // 2) 分数/百分比 —— 跳过疑似 CSS/SVG 值（避免 width:100% 误报）
    if (!CSS_LIKE_RE.test(text)) {
      for (const p of SCORE_PATTERNS) {
        if (p.re.test(text)) {
          violations.push(`  ${loc}  【分数外显】/ ${p.re.source} / —— ${p.why}`);
        }
      }
    }
  }
  // 3) emoji —— 无条件（词典里出现 emoji 同样是 bug）
  if (EMOJI_RE.test(text)) {
    violations.push(`  ${loc}  【emoji】 —— 宪法禁 emoji（PRD §10.3 D1/D3）`);
  }
}

/** 递归收集目录下所有 .js 文件 */
function collectJsFiles(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...collectJsFiles(full));
    else if (/\.(js|mjs)$/.test(name)) out.push(full);
  }
  return out;
}

// —— 扫 index.html（逐行，先剥 HTML 注释块：用状态机保持行号）——
{
  const rel = 'index.html';
  const raw = readFileSync(rel, 'utf8').split(/\r?\n/);
  let inComment = false;
  raw.forEach((line, i) => {
    let text = line;
    if (inComment) {
      const end = text.indexOf('-->');
      if (end === -1) return;
      text = text.slice(end + 3);
      inComment = false;
    }
    // 处理本行内可能出现的注释段
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');
    const open = text.indexOf('<!--');
    if (open !== -1) {
      inComment = true;
      text = text.slice(0, open);
    }
    for (const seg of extractHtmlText(text)) checkText(seg, `${rel}:${i + 1}`);
  });
}

// ── 匹配词典区豁免 ──
// relations.js 的 `SCENE_KEYWORDS` 是「场景关键词匹配词典」，其字符串是**用来识别用户输入**的，
// 不是产品文案。故该区块内的字符串【跳过禁用词检查】（但仍查 emoji）。
// 边界：从 `SCENE_KEYWORDS = {` 起，到下一个「顶格 `};`」止。
const isDictRegion = (rel, line, state) => {
  if (!rel.endsWith('core/relations.js')) return false;
  if (/SCENE_KEYWORDS\s*=\s*\{/.test(line)) state.inDict = true;
  if (state.inDict && /^\};/.test(line)) {
    const was = true;
    state.inDict = false;
    return was;
  }
  return state.inDict;
};

// —— 扫 src/**.js（逐行，行号准确）——
for (const file of collectJsFiles('src')) {
  const rel = relative(process.cwd(), file).split('\\').join('/');
  const dictState = { inDict: false };
  readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (isCommentLine(line)) return; // 纯注释行整行豁免
      const inDict = isDictRegion(rel, line, dictState);
      for (const s of extractJsStrings(line)) checkText(s, `${rel}:${i + 1}`, !inDict);
    });
}

// —— 扫 src/style.css（逐行，仅 content: 值）——
{
  const rel = 'src/style.css';
  readFileSync(rel, 'utf8')
    .split(/\r?\n/)
    .forEach((line, i) => {
      if (isCommentLine(line)) return;
      const m = /content\s*:\s*(['"])(.*?)\1/.exec(stripInlineComment(line));
      if (m) checkText(m[2], `${rel}:${i + 1}`);
    });
}

if (violations.length > 0) {
  console.error(`\n❌ 发现 ${violations.length} 处宪法违规（静态源码文本）：`);
  violations.forEach((v) => console.error(v));
  console.error('\n依据：.claude/rules/product-principles.md（宪法）。');
  console.error('术语对照见宪法 §8；三大禁止见宪法 §2；禁分数/emoji 见 PRD §10.3。\n');
  process.exit(1);
}
console.log('✅ 宪法静态扫描通过（无禁用术语 / 无分数外显 / 无 emoji）');
