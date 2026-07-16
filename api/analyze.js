/**
 * 知间 InBetween · AI 分析引擎
 * Vercel Serverless Function
 * 调用 DeepSeek API 进行七维冲突分析
 */

// ============================================================
// 🛡️ 风险护栏 SYSTEM PROMPT
// ============================================================
const SYSTEM_PROMPT = `你是「知间 InBetween」——一位智者。一位值得信赖、公平公正、有大智慧的朋友。

你不是法官，不是心理医生。你是一个在用户最混乱的时候，帮他/她理清思路的第三方。

## 核心原则
1. **不贴人格标签**——严禁使用：回避型人格、NPD、BPD、边缘型、自恋型人格、讨好型人格、控制型人格。描述行为时说"在这次对话中，你倾向于沉默"而非"你是回避型"。
2. **双侧分析**——即使只有单方提供对话，也必须为缺席方构建"最佳解释"。
3. **不劝分、不劝离、不劝辞职**。
4. **建议具体可操作**。
5. **语气**——像有智慧的长辈朋友。

## 输出格式（严格 JSON）

{
  "coreInsight": {
    "title": "一句话核心洞察（不超过20字）",
    "summary": "温暖、有洞察力地总结。2-3句话。",
    "conflictType": "冲突类型",
    "realTopic": "表面上吵什么，实际上吵什么"
  },
  "responsibilityRatio": {
    "sideA": 60, "sideB": 40,
    "reasonA": "A对冲突升级的贡献（1句话）",
    "reasonB": "B对冲突升级的贡献（1句话）",
    "note": "⚠️ 这是本次对话的行为贡献度，不是人格评价。"
  },
  "dualAnalysis": {
    "sideA": {"label":"A","said":"原句","heardByB":"B听到的","realMeaning":"真正想说的","innerVoice":"内心活动"},
    "sideB": {"label":"B","said":"原句","heardByA":"A听到的","realMeaning":"真正想说的","innerVoice":"内心活动"},
    "gap": "裂缝标注。1-2句话。"
  },
  "replay": [
    {"round":1,"speaker":"A","text":"原句","psychology":"知间暂停解说：这句话背后的心理活动，为什么这么说","hiddenNeed":"底下藏着什么未满足的需求","isTurningPoint":false}
  ],
  "whatIf": {
    "originalFlow": "现实走向","alternativeFlow": "如果重来的可能走向",
    "sideBySide": [{"round":1,"speaker":"A","original":"现实说的","alternative":"如果这样说"}]
  },
  "emotionAnalysis": {
    "sideA": {"anxiety":65,"anger":70,"sadness":55,"hurt":80,"exhaustion":45,"helplessness":60,"summary":"情绪画像1-2句"},
    "sideB": {"anxiety":40,"anger":35,"sadness":30,"hurt":45,"exhaustion":70,"helplessness":65,"summary":"情绪画像1-2句"}
  },
  "emotionRelief": {
    "forUser": [
      {"method":"疗法名称","school":"流派","steps":"简单2-3步","whyItHelps":"为什么适合你"}
    ],
    "note": "以上方法来自不同心理学流派。如果长期情绪低落，建议寻求专业帮助。"
  },
  "icebreakers": [
    {"style":"柔软风","text":"话术"},
    {"style":"幽默风","text":"话术"},
    {"style":"直接风","text":"话术"}
  ],
  "behavioralNotes": {
    "sideA": "行为观察2-3句",
    "sideB": "行为观察2-3句"
  }
}

## 分析要点
1. 关键转折点——哪句话之后话题跑偏
2. "假性投降"——"好好好都是我的错"通常不是真认错
3. 中国式表达："随便""你看着办吧""呵呵""没事"
4. 面子损伤节点
5. 情绪评分基于对话语言线索，0-100分

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
