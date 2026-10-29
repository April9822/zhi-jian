// src/main.js —— 编排层（只做 import + init，不含业务逻辑）
import { $$ } from './core/dom.js';
import { buildIconHTML } from './core/icons.js';
import { initRouter } from './core/router.js';
import { initWelcome } from './modules/welcome.js';
import { initInput } from './modules/input.js';
import { initReport } from './modules/report.js';
import { initSpace } from './modules/space.js';
import { initGarden, initGardenCanvas } from './modules/garden.js';
import { initPractice } from './modules/practice.js';
import { initAccount } from './modules/account.js';

document.addEventListener('DOMContentLoaded', () => {
  // 图标注入：把 [data-icon] 占位替换为 icons.js 的彩色负空间 SVG（单一事实源）。
  $$('[data-icon]').forEach((el) => {
    el.innerHTML = buildIconHTML(el.dataset.icon);
  });

  initRouter();
  initWelcome();
  initInput();
  initReport();
  initSpace();
  initAccount();
  initGarden();
  initPractice();

  // 进入花园页时启动光斑动画（监听 navigate，不硬编码在按钮回调里）
  document.addEventListener('navigate', (e) => {
    if (e.detail && e.detail.screenId === 'garden-screen') {
      initGardenCanvas();
    }
  });
});
