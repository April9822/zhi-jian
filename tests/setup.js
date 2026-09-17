// tests/setup.js —— 最小测试环境桩（零依赖）
//
// 为什么不用 jsdom：项目硬约束「零运行时依赖」，测试环境也刻意保持轻量。
// 被测单元（core/relations.js、core/state.js）只依赖 localStorage 与 crypto.subtle，
// 这里用最小桩即可，无需完整 DOM 实现。
import { beforeEach } from 'vitest';

/** 简易 localStorage 桩（Map 支撑，接口与浏览器一致） */
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  get length() {
    return this.store.size;
  }
  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key) {
    const k = String(key);
    return this.store.has(k) ? this.store.get(k) : null;
  }
  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = new MemoryStorage();
}

// crypto.subtle 桩：Node 20+ 原生提供 globalThis.crypto，若缺失则降级为 undefined，
// 被测代码会自动走 FNV-1a 分支（两条路径都应可用）。
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = {};
}

/** 每个用例前清空账本，保证用例相互独立 */
beforeEach(() => {
  globalThis.localStorage.clear();
});
