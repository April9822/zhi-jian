// src/core/utils.js —— 通用工具（无业务、无 DOM 状态）
import { $ } from './dom.js';

/**
 * HTML 转义：转义 & < > " '
 * 任何用户输入 / AI 返回内容进入 DOM 前必须调用。
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 轻提示
 * @param {string} message
 * @param {number} [duration=3000]
 */
export function showToast(message, duration = 3000) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, duration);
}

/**
 * 防抖
 * @param {Function} fn
 * @param {number} [wait=200]
 * @returns {Function}
 */
export function debounce(fn, wait = 200) {
  let timer = null;
  return function debounced(...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  };
}
