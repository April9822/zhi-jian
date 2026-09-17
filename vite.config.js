import { defineConfig, loadEnv } from 'vite';
import { runAnalysis, validateConversation } from './api/_core.js';

/**
 * 本地 API 代理插件（模拟 Vercel Serverless Function）。
 *
 * 与生产环境 api/analyze.js 保持同一套校验：复用 `validateConversation()`，
 * 避免两处规则漂移。环境变量由 vite 官方 `loadEnv()` 读取（取代手写解析）。
 * @returns {import('vite').Plugin}
 */
function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    config(config, env) {
      // 加载 .env / .env.local / .env.[mode]，仅使用 VITE_ 前缀之外的名字也一并注入
      const loaded = loadEnv(env.mode, process.cwd(), '');
      for (const [key, value] of Object.entries(loaded)) {
        if (process.env[key] === undefined) process.env[key] = value;
      }
      return config;
    },
    configureServer(server) {
      server.middlewares.use('/api/analyze', async (req, res) => {
        if (req.method === 'OPTIONS') {
          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          });
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          res.writeHead(405, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '仅支持 POST' }));
          return;
        }

        // 读取请求体（流式拼接）
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        // JSON.parse 必须容错：非法请求体不允许让中间件抛错
        let payload = null;
        try {
          payload = JSON.parse(body);
        } catch {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '请求体必须是合法 JSON' }));
          return;
        }

        const conversation = payload && typeof payload.conversation === 'string' ? payload.conversation : '';
        const userRole = payload ? payload.userRole : undefined;

        // 校验复用生产同一函数（≥3 行有意义对话）
        const verdict = validateConversation(conversation);
        if (!verdict.ok) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: verdict.reason || '对话内容不合法' }));
          return;
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'API Key 未配置' }));
          return;
        }

        // 调用共享核心分析逻辑（与 Vercel 生产环境一致）
        try {
          const result = await runAnalysis(conversation, userRole, apiKey);
          res.writeHead(200, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          });
          res.end(JSON.stringify(result));
        } catch (err) {
          console.error('分析失败:', err.message);
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'AI 服务暂时不可用: ' + err.message }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [apiProxyPlugin()],
  server: {
    port: 3000,
  },
  build: {
    outDir: 'dist',
  },
});
