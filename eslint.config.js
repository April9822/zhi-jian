// eslint.config.js —— ESLint 9 flat config
// 目标：把 .claude/rules/code-quality.md 的禁令翻译成可执行规则
import js from '@eslint/js';

export default [
  // 忽略生成产物与第三方
  // 额外忽略「工作过程产物」：临时探针/日志/浏览器 profile（约定见 .gitignore）
  //   _*          —— 工作过程落盘的探针与命令输出
  //   .*out*.txt  —— 命令输出重定向（PowerShell stdout 捕获不可靠时的落盘）
  //   *.log       —— lint / test / dev server 日志
  //   .tmp-backup-* —— 已归档的临时产物备份目录
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'public/**',
      '.claude/**',
      'docs/**',
      'qa-screenshots/**',
      '.tmp-backup-*/**',
      '_*',
      '.*out*.txt',
      '*.log',
    ],
  },

  // 全局推荐规则
  js.configs.recommended,

  // 主配置：源码与测试
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        // 浏览器全局（不用 globals 包，手写最小集合，保持零额外依赖）
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        requestAnimationFrame: 'readonly',
        cancelAnimationFrame: 'readonly',
        CustomEvent: 'readonly',
        AbortController: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        navigator: 'readonly',
        getComputedStyle: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        crypto: 'readonly',
        TextEncoder: 'readonly',
        MutationObserver: 'readonly',
        performance: 'readonly',
        innerWidth: 'readonly',
        innerHeight: 'readonly',
        addEventListener: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      // —— 变量声明 ——
      'no-var': 'error',              // code-quality §5（13 处违规）
      'prefer-const': 'error',        // code-quality §5
      'no-implicit-globals': 'error', // code-quality §5 禁止全局变量

      // —— 禁止危险 API ——
      'no-eval': 'error',             // code-quality §10
      'no-implied-eval': 'error',
      'no-new-func': 'error',

      // —— 禁止挂载 window 全局（4 处违规）——
      // 允许读取 window.scrollTo 等，但禁止 window.xxx = ...
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'eval', message: '禁止 eval（code-quality §10）' },
      ],
      'no-restricted-syntax': [
        'error',
        {
          // 禁止 window.xxx = ...（全局挂载）
          selector: "AssignmentExpression[left.object.name='window']",
          message: '禁止挂载 window 全局（code-quality §5）。请用 ES module 具名导出 + addEventListener。',
        },
        {
          // 禁止 innerHTML = 直接赋值，但放行 buildXxxHTML() 纯函数调用。
          // esquery 属性正则：right 为 CallExpression 且 callee.name 匹配 /^build[A-Za-z]*HTML$/。
          // 该函数的内部实现必须保证每个插值经 escapeHtml()（见 report.js 顶部硬纪律）。
          selector:
            "AssignmentExpression[left.property.name='innerHTML']:not([right.callee.name=/^build[A-Za-z]*HTML$/])",
          message:
            '禁止 innerHTML= 直接赋值（code-quality §10）。右值必须是 buildXxxHTML() 纯函数调用，且每个插值经 escapeHtml()。',
        },
        {
          // 禁止 outerHTML / insertAdjacentHTML
          selector: "AssignmentExpression[left.property.name='outerHTML']",
          message: '禁止 outerHTML= 赋值，请用 DOM API 构建。',
        },
        {
          selector: "CallExpression[callee.property.name='insertAdjacentHTML']",
          message: '禁止 insertAdjacentHTML，请用 createElement/append。',
        },
        {
          // 禁止 document.write
          selector: "CallExpression[callee.object.name='document'][callee.property.name='write']",
          message: '禁止 document.write（code-quality §10）。',
        },
        {
          // 禁止 .then().catch() 链式（要求 async/await）
          selector: "CallExpression[callee.property.name='catch'][callee.object.callee.property.name='then']",
          message: '禁止 fetch().then().catch()（code-quality §10）。请用 async/await + try/catch。',
        },
      ],

      // —— 其他质量规则（与规范精神一致）——
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off', // 允许 console.error 用于错误上报

      // —— 异步规范（code-quality §5）——
      'require-await': 'warn', // async 函数应有 await
      'no-await-in-loop': 'warn',
    },
  },

  // 脚本文件（Node 环境）
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: {
        process: 'readonly',
        console: 'readonly',
        // Node 18+ 内置（check-e2e.mjs 的 CDP 驱动需要；零额外依赖）
        fetch: 'readonly',
        WebSocket: 'readonly',
        AbortSignal: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },

  // 测试文件：放宽
  {
    files: ['tests/**/*.js', '**/*.test.js'],
    languageOptions: {
      globals: {
        // vitest 测试环境桩涉及的额外全局
        globalThis: 'readonly',
        beforeEach: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      'no-unused-expressions': 'off',
      'require-await': 'off',
    },
  },
];
