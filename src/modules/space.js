// src/modules/space.js —— 知间空间页（消融转场）
import { state } from '../core/state.js';
import { byId } from '../core/dom.js';
import { goTo } from '../core/router.js';

/**
 * 空间页入场转场：从欢迎页当前按钮位置扩散涟漪。
 * 由 welcome.js 在点击「以后再说」时通过 navigate 事件之后调用（本模块只做落地）。
 */
export function goToSpaceTransition() {
  const intro = byId('intro-screen');
  if (!intro || intro.classList.contains('transitioning')) return;
  intro.classList.add('transitioning');

  const btn = document.querySelector('.intro-btn.secondary');
  const rect = btn ? btn.getBoundingClientRect() : null;
  const cx = rect ? rect.left + rect.width / 2 : state.lastClickX;
  const cy = rect ? rect.top + rect.height / 2 : state.lastClickY;

  const otherBtn = document.querySelector('.intro-btn.primary');
  if (otherBtn) {
    otherBtn.style.transition = 'opacity .4s ease';
    otherBtn.style.opacity = '0';
    otherBtn.style.pointerEvents = 'none';
  }

  const sw = document.createElement('div');
  sw.className = 'swallower';
  sw.style.left = `${cx}px`;
  sw.style.top = `${cy}px`;
  document.body.appendChild(sw);

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

  setTimeout(() => {
    requestAnimationFrame(() => sw.classList.add('expand'));
  }, 300);

  setTimeout(() => {
    intro.style.display = 'none';
    intro.classList.remove('active', 'transitioning');
    goTo('space-screen');
  }, 2500);

  setTimeout(() => {
    if (sw.parentNode) sw.remove();
  }, 5000);
}

/** 初始化空间页：仅负责暖光 canvas 已在全局初始化，此处保留扩展位。 */
export function initSpace() {
  // 空间页当前无独立交互；转场由 welcome.js 触发。保留为空实现以保证编排一致。
}
