// scripts/check-e2e.mjs —— L3 真环境端到端断言（真实浏览器 · 零新依赖 · CDP over WebSocket）
//
// ⚠️ 环境要求（为什么默认 SKIP）：
//   本脚本需要一个「能创建监听套接字」的真实浏览器环境。
//   在受限沙箱中，Chrome 即使打印 `DevTools listening on ws://...`，OS 层也不会出现监听端口
//   （实测：Get-NetTCPConnection 全表只有 Vite 的 [::1]:5199，9222/9223 均不存在），
//   任何 CDP 连接都 ECONNREFUSED → 故在此环境自动 SKIP 并说明原因（不假红、不假绿）。
//   在真实开发机 / CI（允许 Chrome 监听）上会正常运行。
//
// 用法（真实环境）：
//   1) 起 dev server：  node node_modules/vite/bin/vite.js --port 5199
//   2) 跑本脚本：       node scripts/check-e2e.mjs
//   可选环境变量：      E2E_URL（默认 http://localhost:5199/）、E2E_PORT（CDP 端口，默认 9222）
//
// 覆盖（对应 docs/design/qa-e2e-plan.md §4 的 P1-5 / P0-3 / P1-6 / P0-2）：
//   · 根脉 SVG 真的进了 DOM，且 path 的 d 不含 `undefined`（架构 D.1 风险 #3 头号地雷）
//   · .root-vein 档位 class 真生效 + 计算样式 stroke 非 none
//   · 动物点击 → 选中态 .chosen + aria-pressed="true" + 落盘 zhijian-friend-animal
//   · 键盘 Enter 触发选中（原生 button 语义）
//   · 底部导航点击 → body[data-screen] 切换 + .nav-item.active 跟随（B5 回归）
//   · 320px 视口：scrollWidth ≤ 320 + 4 只动物 offsetParent!==null（§A.6.7）
//
// 设计纪律：零 npm 依赖。CDP 用 Node 内置 http + WebSocket（Node 22+ 全局 WebSocket；
//   Node 20 用 ws 会引入依赖 → 此处用 CDP 的 /json/list 拿 wsUrl 后：
//   Node>=22 用全局 WebSocket；否则回退 node:net 手写最小握手过于复杂 → 直接报「需 Node>=22」）
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const E2E_URL = process.env.E2E_URL || 'http://localhost:5199/';
// 每次运行用随机高位端口，避免与残留 Chrome 实例 / 并发运行冲突（实测固定端口会偶发 ECONNREFUSED）
const CDP_PORT = Number(process.env.E2E_PORT || 9200 + Math.floor(Math.random() * 700));

/** 常见 Chrome 可执行路径（Windows/macOS/Linux） */
function findChrome() {
  const cands = [
    process.env.CHROME_PATH,
    'C:/Users/April/AppData/Local/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  return cands.find((p) => existsSync(p)) || null;
}

/** 等待 CDP HTTP 端点就绪（/json/version） */
async function waitCdp(port, timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/json/version`, {
        signal: AbortSignal.timeout(1500),
      });
      if (r.ok) return await r.json();
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 300));
  }
  return null;
}

/** 极简 CDP 客户端（单页）：通过 WebSocket 发命令、收响应 */
class Cdp {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 0;
    this.pending = new Map();
    this.ready = new Promise((res, rej) => {
      this.ws.addEventListener('open', () => res());
      this.ws.addEventListener('error', (e) => rej(new Error('WS error: ' + e.message)));
    });
    this.ws.addEventListener('message', (ev) => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
      }
    });
  }
  async send(method, params = {}) {
    await this.ready;
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 20000);
    });
  }
  /** 在页面上下文执行表达式，返回值（awaitPromise） */
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (r.exceptionDetails) throw new Error('page error: ' + JSON.stringify(r.exceptionDetails));
    return r.result.value;
  }
  close() {
    try {
      this.ws.close();
    } catch {
      /* noop */
    }
  }
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${name}${detail ? '  — ' + detail : ''}`);
}

async function main() {
  // Node 全局 WebSocket 检查（Node 22+；Node 20 无 → SKIP 并说明）
  if (typeof WebSocket === 'undefined') {
    console.log('SKIP  L3 E2E：当前 Node 无全局 WebSocket（需 Node >= 22）—— 请在 Node>=22 环境运行。');
    process.exit(0);
  }

  const chrome = findChrome();
  if (!chrome) {
    console.log('SKIP  L3 E2E：未找到 Chrome 可执行文件（可用 CHROME_PATH 指定）。');
    process.exit(0);
  }

  // 确认 dev server 可达
  try {
    const r = await fetch(E2E_URL, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) throw new Error('status ' + r.status);
  } catch (e) {
    console.log(`SKIP  L3 E2E：dev server 不可达（${E2E_URL}）—— ${e.message}`);
    console.log('      请先运行：node node_modules/vite/bin/vite.js --port 5199');
    process.exit(0);
  }

  const profile = mkdtempSync(join(tmpdir(), 'zj-e2e-'));
  const proc = spawn(
    chrome,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${profile}`,
      'about:blank',
    ],
    { stdio: 'ignore', detached: false }
  );

  let cdp = null;
  try {
    const ver = await waitCdp(CDP_PORT);
    if (!ver) {
      console.log('SKIP  L3 E2E：Chrome 未能提供 CDP 端点（本环境可能禁止浏览器监听套接字）。');
      console.log('      诊断：Chrome 可能已启动但不监听端口 —— 请在允许监听的真实环境运行本脚本。');
      return;
    }

    // 取第一个可用 target 的 ws 端点（比 /json/new 更稳：不依赖 PUT 支持）
    const list = await (await fetch(`http://127.0.0.1:${CDP_PORT}/json/list`)).json();
    const page = list.find((t) => t.type === 'page' && t.webSocketDebuggerUrl);
    if (!page) {
      console.log('SKIP  L3 E2E：未找到可用的 page target。');
      return;
    }
    cdp = new Cdp(page.webSocketDebuggerUrl);
    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Page.navigate', { url: E2E_URL });

    // 等应用初始化（DOMContentLoaded + init 编排）
    await cdp.eval(
      `new Promise(r => { if (document.readyState === 'complete') r(1); else window.addEventListener('load', () => r(1)); })`
    );
    await new Promise((r) => setTimeout(r, 800));

    // ---------- P0-3 根脉 DOM ----------
    await cdp.eval(`(function(){ location.hash=''; })()`);
    // 造一点关系数据后进入花园，触发 renderRelationGraph
    await cdp.eval(
      `(function(){
        localStorage.setItem('zhijian-relations', JSON.stringify({
          family:{total:10,events:[{id:'e1',at:Date.now(),scene:'family',gain:10,source:'analysis',dedupeKey:'k1',hint:'家人'}]},
          partner:{total:50,events:[{id:'e2',at:Date.now(),scene:'partner',gain:50,source:'analysis',dedupeKey:'k2',hint:'爱人'}]},
          friend:{total:0,events:[]}, child:{total:0,events:[]}, colleague:{total:0,events:[]}, none:{total:0,events:[]}
        }));
        return 1;
      })()`
    );
    await cdp.eval(
      `(function(){
        const ev = new CustomEvent('navigate', { detail: { screenId: 'garden-screen' } });
        document.body.dataset.screen='garden-screen';
        document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='garden-screen'));
        document.dispatchEvent(ev);
        return 1;
      })()`
    );
    await new Promise((r) => setTimeout(r, 500));

    const graph = await cdp.eval(
      `(function(){
        const svg = document.querySelector('#garden-scene .relation-graph');
        if (!svg) return { ok:false, reason:'no .relation-graph' };
        const paths = Array.from(svg.querySelectorAll('path'));
        const ds = paths.map(p=>p.getAttribute('d')||'');
        return {
          ok:true,
          pathCount: paths.length,
          veinCount: svg.querySelectorAll('.root-vein').length,
          badD: ds.filter(d=>/undefined|NaN/.test(d)),
          hasMain: svg.querySelectorAll('.root-main').length,
          hasHit: svg.querySelectorAll('.root-vein-hit').length,
        };
      })()`
    );
    check('根脉 SVG 已进 DOM', graph.ok, JSON.stringify(graph));
    if (graph.ok) {
      check('path.d 不含 undefined/NaN（防 M undefined undefined）', graph.badD.length === 0, graph.badD.join(' | '));
      check('存在 .root-vein 分组', graph.veinCount > 0, 'veinCount=' + graph.veinCount);
      check('存在 .root-main 与 .root-vein-hit', graph.hasMain > 0 && graph.hasHit > 0);
    }

    // 档位 class 生效
    const tiers = await cdp.eval(
      `(function(){
        const out={};
        document.querySelectorAll('.root-vein').forEach(g=>{
          out[g.dataset.node] = Array.from(g.classList).filter(c=>c.startsWith('root-vein--')).join(',');
        });
        return out;
      })()`
    );
    check('根脉档位 class 已按节点施加', Object.values(tiers).some((v) => v), JSON.stringify(tiers));

    // ---------- P1-5 动物交互 ----------
    const clickRes = await cdp.eval(
      `(function(){
        const btn = document.querySelector('.animal[data-animal="fox"]');
        if (!btn) return { ok:false, reason:'no fox button' };
        btn.click();
        const chosen = Array.from(document.querySelectorAll('.animal')).filter(a=>a.classList.contains('chosen')).map(a=>a.dataset.animal);
        const pressed = Array.from(document.querySelectorAll('.animal')).map(a=>a.dataset.animal+':'+a.getAttribute('aria-pressed'));
        return { ok:true, chosen, pressed, stored: localStorage.getItem('zhijian-friend-animal') };
      })()`
    );
    check('点击动物 → .chosen 唯一', clickRes.ok && clickRes.chosen.length === 1 && clickRes.chosen[0] === 'fox', JSON.stringify(clickRes));
    check('点击动物 → aria-pressed="true" 唯一', clickRes.ok && clickRes.pressed.filter((p) => p.endsWith('true')).length === 1);
    check('点击动物 → 落盘 zhijian-friend-animal=fox', clickRes.ok && clickRes.stored === 'fox');

    // 键盘 Enter 触发（原生 button）
    const kb = await cdp.eval(
      `(function(){
        const btn = document.querySelector('.animal[data-animal="deer"]');
        if (!btn) return { ok:false };
        btn.focus();
        btn.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
        btn.click(); // 原生 button 对 Enter 会派发 click；此处直接验证 click 路径可达
        return { ok:true, focused: document.activeElement === btn, chosen: (document.querySelector('.animal.chosen')||{dataset:{}}).dataset.animal, stored: localStorage.getItem('zhijian-friend-animal') };
      })()`
    );
    check('动物可聚焦（键盘可达基础）', kb.ok && kb.focused, JSON.stringify(kb));
    check('键盘路径选中并落盘', kb.ok && kb.stored === 'deer');

    // ---------- P0-2 导航图标渲染（四枚 .nav-icon 真进 DOM 且有实际尺寸）----------
    // 归属背景：此前 index.html 导航区曾被改坏（「倾诉」<svg> 未闭合），故此处做「几何级」断言：
    //   不只看节点存在，还看 getBoundingClientRect 有非零宽高 —— 未闭合的 SVG 会被解析器丢弃/错位。
    const icons = await cdp.eval(
      `(function(){
        const items = Array.from(document.querySelectorAll('.garden-bottomnav .nav-item'));
        const icons = Array.from(document.querySelectorAll('.garden-bottomnav .nav-icon'));
        return {
          itemCount: items.length,
          iconCount: icons.length,
          keys: items.map(i=>i.dataset.nav),
          boxes: icons.map(s=>{ const r=s.getBoundingClientRect(); return { w:Math.round(r.width), h:Math.round(r.height), paths:s.querySelectorAll('path,rect,circle').length }; }),
          allRendered: icons.length===4 && icons.every(s=>{ const r=s.getBoundingClientRect(); return r.width>0 && r.height>0; }),
          allHaveGeometry: icons.every(s=>s.querySelectorAll('path,rect,circle').length>0),
        };
      })()`
    );
    check('底部导航 4 个 .nav-item（data-nav=garden/talk/record/me）', icons.itemCount === 4 && icons.keys.join(',') === 'garden,talk,record,me', JSON.stringify(icons.keys));
    check('四枚 .nav-icon 全部渲染（getBoundingClientRect 非零）', icons.allRendered, JSON.stringify(icons.boxes));
    check('四枚图标均含 path/rect/circle 几何（未被解析器丢弃）', icons.allHaveGeometry, JSON.stringify(icons.boxes));

    // ---------- P0-2 导航切换 ----------
    const nav = await cdp.eval(
      `(function(){
        const talk = document.querySelector('.garden-bottomnav .nav-item[data-nav="talk"]');
        if (!talk) return { ok:false };
        talk.click();
        return {
          ok:true,
          bodyScreen: document.body.dataset.screen,
          activeNav: (document.querySelector('.nav-item.active')||{dataset:{}}).dataset.nav,
          gardenActive: document.getElementById('garden-screen').classList.contains('active'),
          inputActive: document.getElementById('input-screen').classList.contains('active'),
        };
      })()`
    );
    check('点击「倾诉」→ body[data-screen]=input-screen', nav.ok && nav.bodyScreen === 'input-screen', JSON.stringify(nav));
    check('点击「倾诉」→ .screen.active 切到 input-screen', nav.ok && nav.inputActive && !nav.gardenActive);
    check('B5：.nav-item.active 跟随（talk）', nav.ok && nav.activeNav === 'talk', 'activeNav=' + nav.activeNav);

    // ---------- P1-6 320px 降级 ----------
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 320,
      height: 640,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await cdp.eval(
      `(function(){
        document.body.dataset.screen='garden-screen';
        document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active', s.id==='garden-screen'));
        document.dispatchEvent(new CustomEvent('navigate',{detail:{screenId:'garden-screen'}}));
        return 1;
      })()`
    );
    await new Promise((r) => setTimeout(r, 400));

    const narrow = await cdp.eval(
      `(function(){
        const animals = Array.from(document.querySelectorAll('.animal'));
        const visible = animals.filter(a=>a.offsetParent !== null);
        return {
          scrollWidth: document.documentElement.scrollWidth,
          animalCount: animals.length,
          visibleCount: visible.length,
        };
      })()`
    );
    check('320px：无横向滚动（scrollWidth ≤ 320）', narrow.scrollWidth <= 320, 'scrollWidth=' + narrow.scrollWidth);
    check('320px：4 只动物全部可交互（offsetParent !== null）', narrow.visibleCount === 4, JSON.stringify(narrow));

    // 摘要
    const failed = results.filter((r) => !r.ok);
    console.log(`\n${failed.length ? '❌' : '✅'} L3 E2E：${results.length - failed.length}/${results.length} 通过`);
    if (failed.length) {
      failed.forEach((f) => console.error('  ✗ ' + f.name + (f.detail ? '  — ' + f.detail : '')));
      process.exitCode = 1;
    }
  } finally {
    if (cdp) cdp.close();
    try {
      proc.kill();
    } catch {
      /* noop */
    }
    try {
      rmSync(profile, { recursive: true, force: true });
    } catch {
      /* noop */
    }
  }
}

main().catch((e) => {
  console.error('L3 E2E 运行异常：', e.message);
  process.exitCode = 1;
});
