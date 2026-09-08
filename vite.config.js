import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';
import { runAnalysis } from './api/_core.js';

// 读取 .env.local 中的环境变量（本地开发用）
function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const [key, ...rest] = line.split('=');
      if (key && rest.length) {
        process.env[key.trim()] = rest.join('=').trim();
      }
    }
  }
}

// 本地 API 代理插件（模拟 Vercel Serverless Function）
function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      loadEnvLocal();

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
          res.writeHead(405);
          res.end(JSON.stringify({ error: '仅支持 POST' }));
          return;
        }

        // 读取请求体
        let body = '';
        for await (const chunk of req) {
          body += chunk;
        }

        const { conversation, userRole } = JSON.parse(body);

        if (!conversation || conversation.trim().length < 20) {
          res.writeHead(400);
          res.end(JSON.stringify({ error: '对话内容太短，请至少输入几句有意义的对话' }));
          return;
        }

        const apiKey = process.env.DEEPSEEK_API_KEY;
        if (!apiKey) {
          res.writeHead(500);
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
          res.writeHead(502);
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
