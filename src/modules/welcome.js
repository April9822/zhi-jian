// src/modules/welcome.js —— 欢迎页（涟漪 + 消融转场）
import { state } from '../core/state.js';
import { byId } from '../core/dom.js';
import { goTo } from '../core/router.js';

/** 生成按钮涟漪（原 main.js 12-39） */
/**
 * @param {HTMLElement} btn
 * @param {MouseEvent} e
 */
export function rippleAt(btn, e) {
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const size = Math.max(rect.width, rect.height) * 2.5;

  const ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;

  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
}

/**
 * 消融转场：涟漪扩散盖满全屏后切换到目标页。
 * @param {HTMLElement|null} btn - 触发按钮（可为空）
 * @param {string} targetScreen - 目标 screen id
 */
function dissolveTo(btn, targetScreen) {
  const intro = byId('intro-screen');
  if (!intro || intro.classList.contains('transitioning')) return;
  intro.classList.add('transitioning');

  const rect = btn ? btn.getBoundingClientRect() : null;
  const cx = rect ? rect.left + rect.width / 2 : state.lastClickX;
  const cy = rect ? rect.top + rect.height / 2 : state.lastClickY;

  // 另一个按钮立即透明
  const otherBtn = btn
    ? btn.classList.contains('primary')
      ? document.querySelector('.intro-btn.secondary')
      : document.querySelector('.intro-btn.primary')
    : null;
  if (otherBtn) {
    otherBtn.style.transition = 'opacity .4s ease';
    otherBtn.style.opacity = '0';
    otherBtn.style.pointerEvents = 'none';
  }

  // 一圈涟漪
  const sw = document.createElement('div');
  sw.className = 'swallower';
  sw.style.left = `${cx}px`;
  sw.style.top = `${cy}px`;
  document.body.appendChild(sw);

  // 文字 + 当前按钮消散
  const s6 = document.querySelector('.s6');
  const allElts = [];
  if (s6) {
    s6.querySelectorAll('span').forEach((s) => allElts.push(s));
  }
  if (btn) allElts.push(btn);
  allElts.forEach((el, i) => {
    setTimeout(() => {
      el.style.transition = 'opacity 1s ease, filter 1s ease';
      el.style.opacity = '0';
      el.style.filter = 'blur(2px)';
    }, i * 90);
  });

  // 涟漪扩散
  setTimeout(() => {
    requestAnimationFrame(() => sw.classList.add('expand'));
  }, 300);

  // 涟漪盖满全屏后页面切换
  setTimeout(() => {
    intro.style.display = 'none';
    intro.classList.remove('active', 'transitioning');
    document.body.style.overflow = 'auto';
    // 样式（含 body 背景）统一由 goTo → body[data-screen] 承担
    goTo(targetScreen);
  }, 2500);

  setTimeout(() => {
    if (sw.parentNode) sw.remove();
  }, 5000);
}

/** 欢迎页主按钮 → 输入页转场 */
export function goToInputTransition() {
  dissolveTo(document.querySelector('.intro-btn.primary'), 'input-screen');
}

/** 欢迎页次按钮 → 空间页转场 */
export function goToSpaceTransition() {
  dissolveTo(document.querySelector('.intro-btn.secondary'), 'space-screen');
}

/** 初始化欢迎页：涟漪 + 按钮绑定 */
export function initWelcome() {
  state.lastClickX = window.innerWidth / 2;
  state.lastClickY = window.innerHeight * 0.85;

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.intro-btn');
    if (!btn) return;
    state.lastClickX = e.clientX;
    state.lastClickY = e.clientY;
    rippleAt(btn, e);
    // 「开始倾诉」→ 输入页；「以后再说」→ 空间页
    if (btn.classList.contains('primary')) {
      goToInputTransition();
    } else {
      goToSpaceTransition();
    }
  });
}
