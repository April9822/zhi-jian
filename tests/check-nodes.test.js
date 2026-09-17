// tests/check-nodes.test.js —— scripts/check-nodes.mjs 守卫逻辑单测
// 覆盖三条件（架构师裁定）：
//   ① 5 个非 none 的节点 id 无条件拦截
//   ② 'none' 为 fail-closed：仅确证是 CSS 值才放行，否则拦截
//   ③ 行内注释不豁免（`const x='family'; // note` 必须报错）
import { describe, it, expect } from 'vitest';
import {
  lineHasNodeLiteral,
  isCommentLine,
  buildHistoryNameRules,
  lineHasHistoryName,
} from '../scripts/check-nodes.mjs';

describe('lineHasNodeLiteral · 非 none 节点 id 无条件拦截', () => {
  const named = ['family', 'partner', 'friend', 'child', 'colleague'];

  it('单引号 / 双引号字面量均拦截', () => {
    for (const id of named) {
      expect(lineHasNodeLiteral(`const x = '${id}';`)).toBe(true);
      expect(lineHasNodeLiteral(`const x = "${id}";`)).toBe(true);
    }
  });

  it('裸字面量（无上下文语义词）也拦截', () => {
    // 这正是 fail-closed 要防的静默漏网场景：FALLBACK = 'family'
    expect(lineHasNodeLiteral(`const FALLBACK = 'family';`)).toBe(true);
    expect(lineHasNodeLiteral(`const FALLBACK = 'child';`)).toBe(true);
  });

  it('不作为字符串值时（变量名 / 子串）不误报', () => {
    expect(lineHasNodeLiteral('const familyTotal = 0;')).toBe(false);
    expect(lineHasNodeLiteral('const myFriend = null;')).toBe(false);
    // 子串（如 'children' / 'friendship'）不命中整词
    expect(lineHasNodeLiteral(`const s = 'children';`)).toBe(false);
    expect(lineHasNodeLiteral(`const s = 'friendship';`)).toBe(false);
  });
});

describe('lineHasNodeLiteral · none 为 fail-closed', () => {
  it('裸 none 字面量（无法证明是 CSS 值）→ 拦截', () => {
    expect(lineHasNodeLiteral(`const FALLBACK = 'none';`)).toBe(true);
    expect(lineHasNodeLiteral(`return { node: 'none' };`)).toBe(true);
    expect(lineHasNodeLiteral(`const x = "none";`)).toBe(true);
  });

  it('确证是 CSS 值（含白名单属性名）→ 放行', () => {
    expect(lineHasNodeLiteral(`svg.setAttribute('fill', 'none');`)).toBe(false);
    expect(lineHasNodeLiteral(`svg.setAttribute('preserveAspectRatio', 'none');`)).toBe(false);
    expect(lineHasNodeLiteral(`intro.style.display = 'none';`)).toBe(false);
    expect(lineHasNodeLiteral(`otherBtn.style.pointerEvents = 'none';`)).toBe(false);
    expect(lineHasNodeLiteral(`hint.style.animation = 'none';`)).toBe(false);
    expect(lineHasNodeLiteral(`el.style.visibility = 'none';`)).toBe(false);
    expect(lineHasNodeLiteral(`el.style.transform = 'none';`)).toBe(false);
    expect(lineHasNodeLiteral(`el.style.opacity = 'none';`)).toBe(false);
  });

  it('非 none 的 id 即便含 CSS 属性名仍拦截（CSS 白名单只豁免 none）', () => {
    expect(lineHasNodeLiteral(`el.style.display = 'family';`)).toBe(true);
  });
});

describe('isCommentLine · 注释行判定', () => {
  it('纯注释行（// / * / /* 起始）→ true', () => {
    expect(isCommentLine('// const x = 1;')).toBe(true);
    expect(isCommentLine('  // 说明')).toBe(true);
    expect(isCommentLine(' * 文档注释')).toBe(true);
    expect(isCommentLine('/* 块注释')).toBe(true);
  });

  it('代码行 → false', () => {
    expect(isCommentLine(`const x = 'family';`)).toBe(false);
  });
});

describe('行内注释不豁免（第 ③ 条）', () => {
  it('`const x = "family"; // note` 必须报错', () => {
    // 行首不是注释 → isCommentLine=false → 进入字面量检测 → 命中
    const line = `const x = 'family'; // note`;
    expect(isCommentLine(line)).toBe(false);
    expect(lineHasNodeLiteral(line)).toBe(true);
  });

  it('`const x = "none"; // note` 行内注释也报错（未确证 CSS 值）', () => {
    const line = `const x = 'none'; // note`;
    expect(isCommentLine(line)).toBe(false);
    expect(lineHasNodeLiteral(line)).toBe(true);
  });
});

describe('历史名词拦截规则', () => {
  it('ROLE_NODES 无条件拦截', () => {
    const rules = buildHistoryNameRules(false);
    expect(lineHasHistoryName('export const ROLE_NODES = [];', rules)).toBe('ROLE_NODES');
  });

  it("animal-zone 仅在迁移完成后拦截（迁移感知）", () => {
    const before = buildHistoryNameRules(false); // 迁移未完成
    const after = buildHistoryNameRules(true); // 迁移完成
    const line = `const el = byId('animal-zone');`;
    expect(lineHasHistoryName(line, before)).toBeNull(); // 放行
    expect(lineHasHistoryName(line, after)).toBe("'animal-zone'"); // 拦截
  });

  it('普通行不命中历史名词', () => {
    const rules = buildHistoryNameRules(true);
    expect(lineHasHistoryName(`const x = byId('eco-stream');`, rules)).toBeNull();
  });
});
