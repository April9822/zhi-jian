/**
 * 知间 InBetween · AI 分析引擎
 * Vercel Serverless Function
 * 调用共享核心 runAnalysis（api/_core.js），本文件只负责 HTTP 收发
 */
import { runAnalysis } from './_core.js';

// ============================================================
// API Handler
// ============================================================
export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: '仅支持 POST' });
  }

  const { conversation, userRole } = req.body;

  if (!conversation || conversation.trim().length < 20) {
    return res.status(400).json({ error: '对话内容太短，请至少输入几句有意义的对话' });
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
