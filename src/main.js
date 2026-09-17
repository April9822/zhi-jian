// src/main.js —— 编排层（只做 import + init，不含业务逻辑）
import { initRouter } from './core/router.js';
import { initWelcome } from './modules/welcome.js';
import { initInput } from './modules/input.js';
import { initReport } from './modules/report.js';
import { initSpace } from './modules/space.js';
import { initGarden, initGardenCanvas } from './modules/garden.js';
import { initAccount } from './modules/account.js';

document.addEventListener('DOMContentLoaded', () => {
  initRouter();
  initWelcome();
  initInput();
  initReport();
  initSpace();
  initAccount();
  initGarden();

  // 进入花园页时启动光斑动画（监听 navigate，不硬编码在按钮回调里）
  document.addEventListener('navigate', (e) => {
    if (e.detail && e.detail.screenId === 'garden-screen') {
      initGardenCanvas();
    }
  });
});
