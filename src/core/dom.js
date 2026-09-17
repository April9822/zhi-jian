// src/core/dom.js —— 惰性 DOM 查询层
// 设计要点：导出「函数」不是「结果」，杜绝模块顶层立即查询。
// 这样就不依赖 <script type="module"> 的 defer 语义，脚本放在 <head> 也不会崩。

/** 单元素查询（惰性，调用时才查） */
export const $ = (sel, root = document) => root.querySelector(sel);

/** 多元素查询（返回数组，便于 forEach/map） */
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * 按 id 查询（惰性 + 空值容错）
 * 用法：const el = byId('garden-screen'); if (el) { ... }
 */
export const byId = (id) => document.getElementById(id);

/**
 * 批量取元素对象（惰性 getter，避免顶层立即查询）
 * 返回的对象每个属性是 getter：访问 dom.textInput 时才执行查询。
 * @param {Record<string,string>} map - { 属性名: CSS 选择器 }
 * @returns {Record<string, Element|null>}
 */
export function lazyDom(map) {
  const out = {};
  for (const [key, sel] of Object.entries(map)) {
    Object.defineProperty(out, key, {
      get: () => $(sel),
      enumerable: true,
    });
  }
  return out;
}
