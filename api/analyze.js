/**
 * 知间 InBetween · AI 分析引擎
 * Vercel Serverless Function
 * 调用共享核心 runAnalysis（api/_core.js），本文件只负责 HTTP 收发
 */
import { runAnalysis, validateConversation } from './_core.js';

// ============================================================
// API Handler
// ============================================================
export default async function handler(req, res) {
  // CORS：默认不开放跨域（同域部署 + vite 代理均无需 CORS 头）。
  // 仅在配置 ALLOWED_ORIGINS 环境变量（逗号分隔）时才放行对应来源，
  // 防止按调用量计费的 DeepSeek 接口被任意第三方站点盗用。
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Vary', 'Origin');
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST' });
  }

  const { conversation, userRole } = req.body;

  // 校验复用共享口径（≥3 行有意义对话），与 vite.config.js 本地代理一致
  const verdict = validateConversation(conversation);
  if (!verdict.ok) {
    return res.status(400).json({ error: verdict.reason || '对话内容太短，请至少输入 3 行有意义的对话' });
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'API Key 未配置。请在 Vercel 环境变量中设置 DEEPSEEK_API_KEY。' });
  }

  try {
    const result = await runAnalysis(conversation, userRole, DEEPSEEK_API_KEY);
    return res.status(200).json(result);
  } catch (err) {
    console.error('分析失败:', err.message);
    return res.status(500).json({ error: '分析过程中出现错误，请稍后重试。' });
  }
}

// Vercel 配置
export const config = {
  maxDuration: 60, // 最长 60 秒
};
