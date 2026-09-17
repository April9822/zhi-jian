import { defineConfig } from 'vitest/config';

/**
 * Vitest 配置。
 * 刻意不引入 jsdom / happy-dom（保持零运行时依赖哲学）。
 * 需要 DOM 的少量 API（localStorage / crypto.subtle）由 tests/setup.js 以最小桩实现。
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    setupFiles: ['tests/setup.js'],
    globals: false,
    reporters: 'default',
  },
});
