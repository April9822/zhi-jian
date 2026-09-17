// src/core/router.js —— 统一路由（消灭内联 onclick）
import { byId } from './dom.js';
import { showToast } from './utils.js';

/** 合法 screen id 列表 */
export const SCREEN_IDS = [
  'intro-screen',
  'space-screen',
  'account-screen',
  'login-screen',
  'garden-screen',
  'input-screen',
  'loading-screen',
  'report-screen',
];

/**
 * screenId → 底部导航 data-nav 键 的映射。
 * 仅当目标屏幕在底部导航中有对应项时才高亮；无对应项（如 loading/report）则全部取消高亮。
 * 说明：「记录 / 我的」为占位入口（data-toast），不切换屏幕，故此处不出现。
 * @type {Record<string,string>}
 */
export const NAV_BY_SCREEN = {
  'garden-screen': 'garden',
  'input-screen': 'talk',
};

/**
 * 同步底部导航高亮（.nav-item.active）——修复「切屏后导航高亮不跟随」。
 * 用事件委托同款的「查询 + classList.toggle」实现，零内联 onclick、零 window 挂载。
 * @param {string} screenId - 当前屏幕 id
 */
function syncNavActive(screenId) {
  const navKey = NAV_BY_SCREEN[screenId] || '';
  document.querySelectorAll('.garden-bottomnav .nav-item').forEach((item) => {
    item.classList.toggle('active', navKey !== '' && item.dataset.nav === navKey);
  });
}

/**
 * 唯一页面切换入口。
 * 样式由 CSS 的 body[data-screen="xxx"] 规则承担（附录 C.4 裁决），JS 中零色值。
 * @param {string} screenId
 */
export function goTo(screenId) {
  if (!SCREEN_IDS.includes(screenId)) return;
  SCREEN_IDS.forEach((id) => byId(id)?.classList.toggle('active', id === screenId));
  document.body.dataset.screen = screenId;
  syncNavActive(screenId);
  window.scrollTo({ top: 0 });
  document.dispatchEvent(new CustomEvent('navigate', { detail: { screenId } }));
}

/**
 * 底部导航 data-nav 键 → screenId 的反向映射（由 NAV_BY_SCREEN 派生，单一事实源）。
 * @type {Record<string,string>}
 */
const SCREEN_BY_NAV = Object.fromEntries(
  Object.entries(NAV_BY_SCREEN).map(([screen, nav]) => [nav, screen])
);

/**
 * 全局点击委托：
 * - 任何 [data-goto] 元素被点击 → goTo
 * - 任何处于底部导航内、且映射到真实屏幕的 [data-nav] 元素被点击 → goTo（如「花园」返回花园页）
 *   （未映射的 data-nav，如占位「记录/我的」，交由其 data-toast 处理）
 * - 任何 [data-toast] 元素被点击 → showToast
 */
export function initRouter() {
  document.addEventListener('click', (e) => {
    const gotoEl = e.target.closest('[data-goto]');
    if (gotoEl) {
      goTo(gotoEl.dataset.goto);
      return;
    }
    const navEl = e.target.closest('.garden-bottomnav .nav-item[data-nav]');
    if (navEl) {
      const target = SCREEN_BY_NAV[navEl.dataset.nav];
      if (target) {
        goTo(target);
        return;
      }
    }
    const toastEl = e.target.closest('[data-toast]');
    if (toastEl) {
      showToast(toastEl.dataset.toast);
    }
  });
}
