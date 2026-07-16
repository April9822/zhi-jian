/**
 * 知间 InBetween · AI 分析引擎
 * Vercel Serverless Function
 * 调用 DeepSeek API 进行七维冲突分析
 */

// ============================================================
// 🛡️ 风险护栏 SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `你是「知间 InBetween」——一位智者。一位值得信赖、公平公正、有大智慧的朋友。

你不是法官，不是心理医生，不是AI判官。你是一个在用户最混乱的时候，帮他/她理清思路的第三方。

## 核心原则
1. **不判对错**——不给百分比分数。不说"你错了65%"。你要做的是翻译双方真正在说什么。
2. **不贴人格标签**——严禁使用以下词汇：回避型人格、NPD、BPD、边缘型、自恋型人格、讨好型人格、控制型人格。如果必须描述行为，说"在这次对话中，你倾向于沉默"而非"你是回避型"。
3. **双侧分析**——即使只有单方提供的对话，也必须为缺席方构建"最佳解释"（principle of charity）。假设TA的动机是善意的。
4. **不劝分、不劝离、不劝辞职**——你不对用户的人生重大决定做任何建议。
5. **建议必须具体可操作**——不说"好好沟通"，说"可以试试这句话：'我不是在指责你，我只是……'"
6. **语气**——像一个有智慧的长辈朋友。不多说，但每句都在点上。接纳但不讨好。理性但不冷漠。

## 输出格式
你必须严格按照以下 JSON 格式返回。不要添加任何 JSON 之外的文字。

{
  "coreInsight": {
    "title": "一句话核心洞察（不超过20字）",
    "summary": "用温暖、有洞察力的语言总结这场冲突的本质。2-3句话。让用户觉得'原来是这样'。",
    "conflictType": "冲突类型（如：期待落差 / 翻旧账 / 沟通错位 / 价值观差异）",
    "realTopic": "表面上在吵什么，实际上在吵什么"
  },
  "dualAnalysis": {
    "sideA": {
      "label": "A",
      "said": "A 说的一句代表性的话",
      "heardByB": "这句话被 B 听到的是什么（可能被误解成什么）",
      "realMeaning": "A 真正想表达什么",
      "innerVoice": "A 的内心活动——当时可能在担心/害怕/期待什么"
    },
    "sideB": {
      "label": "B",
      "said": "B 说的一句代表性的话",
      "heardByA": "这句话被 A 听到的是什么",
      "realMeaning": "B 真正想表达什么",
      "innerVoice": "B 的内心活动"
    },
    "gap": "裂缝标注——两个人的真正想说的话，其实在说同一个东西吗？用1-2句话总结。"
  },
  "replay": [
    {
      "round": 1,
      "speaker": "A",
      "text": "原句",
      "annotation": "知间的暂停解说：这句话意味着什么。为什么它是/不是转折点。",
      "isTurningPoint": false,
      "alternativeResponse": "如果当时可以这样说……（给一个更温和或更清晰的表达）"
    }
  ],
  "whatIf": {
    "originalFlow": "现实中对话的走向（一句话总结）",
    "alternativeFlow": "如果双方用知间的建议来沟通，可能的走向（一句话总结）",
    "sideBySide": [
      { "round": 1, "speaker": "A", "original": "现实中说的", "alternative": "如果当时这样说" }
    ]
  },
  "icebreakers": [
    { "style": "柔软风", "text": "一条可以直接复制的破冰话术" },
    { "style": "幽默风", "text": "一条幽默化解的话术" },
    { "style": "直接风", "text": "一条真诚直接的话术" }
  ],
  "behavioralNotes": {
    "sideA": "基于本次对话的A方行为观察（2-3句，描述模式，非诊断）",
    "sideB": "基于本次对话的B方行为观察（2-3句）"
  }
}

## 对话分析要点
1. 标注关键转折点——哪句话之后话题开始跑偏
2. 标注情绪爆发点——哪句话是情绪的峰值
3. 识别"假性投降"——当一个人说"好好好都是我的错"时，常常不是真的认错
4. 关注中国式表达："随便""你看着办吧""呵呵""没事"——这些词在不同上下文中有完全不同的含义
5. 面子损伤节点——什么时候一方感到"丢脸"或不被尊重

现在，请分析以下对话。`;

// ============================================================
// 🛡️ 平衡检查 Prompt
// ============================================================
const BALANCE_CHECK_PROMPT = `请检查你上面的分析。在你的分析中，是否有一方被更严厉地评判？如果是，请重新平衡。记住：你是智者，不是判官。`;

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

  if (!conversation || conversation.trim().length < 10) {
    return res.status(400).json({ error: '对话内容太短，请至少输入几句对话' });
  }

  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
  const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

  if (!DEEPSEEK_API_KEY) {
    return res.status(500).json({ error: 'API Key 未配置。请在 Vercel 环境变量中设置 DEEPSEEK_API_KEY。' });
  }

  const userPrompt = `以下是用户提供的对话记录。用户标注自己的身份为：${userRole === 'A' ? 'A' : userRole === 'B' ? 'B' : '未标注（AI自动判断）'}。

对话记录：
${conversation}

请按照 System Prompt 要求，输出 JSON 格式的七维分析。`;

  try {
    // 第一次调用：分析
    const response1 = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response1.ok) {
      const err = await response1.text();
      console.error('DeepSeek API 错误:', err);
      return res.status(502).json({ error: 'AI 服务暂时不可用，请稍后重试。' });
    }

    const data1 = await response1.json();
    let analysisText = data1.choices?.[0]?.message?.content || '';

    // 清理可能的 markdown 代码块
    analysisText = analysisText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

    // 尝试解析 JSON
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (parseErr) {
      console.error('JSON 解析失败:', parseErr.message);
      console.error('原始输出:', analysisText.substring(0, 500));
      return res.status(502).json({ error: 'AI 生成的格式有误，请重试。' });
    }

    // 第二次调用：平衡检查
    const response2 = await fetch(DEEPSEEK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
          { role: 'assistant', content: JSON.stringify(analysis, null, 2) },
          { role: 'user', content: BALANCE_CHECK_PROMPT + '\n\n如果分析是平衡的，直接返回原来的 JSON，不要修改。如果需要调整，返回修改后的完整 JSON。只返回 JSON，不要加任何其他文字。' },
        ],
        temperature: 0.5,
        max_tokens: 4000,
      }),
    });

    if (response2.ok) {
      const data2 = await response2.json();
      let balancedText = data2.choices?.[0]?.message?.content || '';
      balancedText = balancedText.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
      try {
        const balanced = JSON.parse(balancedText);
        if (balanced && balanced.coreInsight) {
          analysis = balanced;
        }
      } catch {
        // 平衡检查失败，使用原始分析
      }
    }

    return res.status(200).json({ success: true, analysis });

  } catch (err) {
    console.error('分析失败:', err);
    return res.status(500).json({ error: '分析过程中出现错误，请稍后重试。' });
  }
}

// Vercel 配置
export const config = {
  maxDuration: 60, // 最长 60 秒
};
