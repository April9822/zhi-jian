export const meta = {
  name: '知间智能体对齐工作流',
  description: '让所有智能体读取已有项目文档，对齐产品定位和当前状态，输出结构化的对齐报告',
  phases: [
    { title: '摸底', detail: '各智能体并行读取各自相关文档' },
    { title: '对齐', detail: '每个智能体输出对齐报告' },
    { title: '汇总', detail: '系统架构师汇总所有报告，输出最终对齐结论' },
  ],
}

// ============================================================
// 知间 InBetween · 智能体对齐工作流
// 目的：让所有新创建的智能体读取已有项目文档，对齐颗粒度
// 时机：智能体体系建立后首次启动
// ============================================================

phase('摸底')

// 每个智能体并行读取自己需要了解的内容，输出对齐报告
const alignments = await parallel([
  // --- 系统架构师 ---
  () => agent(`
    你刚刚被创建为「知间AI系统架构师」。在开始任何工作之前，你需要完整阅读以下文档，理解知间项目的全貌。请逐一阅读：

    1. 产品定位文档：../idea-vault/product-brief-argument-anatomist.md
    2. 竞品与市场调研：../research/2026-07-17-调研报告-竞品与市场.md
    3. 头脑风暴报告：../research/2026-07-17-头脑风暴.md
    4. HCI心理学评估：../research/2026-07-17-HCI分析.md
    5. 知间 CLAUDE.md：.claude/CLAUDE.md
    6. 知间产品核心原则：.claude/rules/product-principles.md
    7. AI分析管线规范：.claude/rules/ai-analysis-pipeline.md
    8. 色彩系统：DESIGN-COLOR-SYSTEM.md
    9. QA日志：QA-LOG.md
    10. Welcome V10规范：.claude/memory/welcome-v10-spec.md

    请输出你的「架构师对齐报告」，包含：
    A. 你对知间产品定位的理解（用你自己的话概括）
    B. 产品从V1.0「冲突解剖师」到「关系操作系统」升级的核心变化
    C. 你识别到的当前项目的关键缺口（缺什么/差什么）
    D. 你对AI分析管线的理解（6步流程是否正确？是否需要调整？）
    E. 你认为最优先应该做的3件事
    F. 你对其他智能体的协作建议
  `, { label: '系统架构师对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      productUnderstanding: { type: 'string' },
      versionEvolution: { type: 'string' },
      keyGaps: { type: 'array', items: { type: 'string' } },
      pipelineAssessment: { type: 'string' },
      top3Priorities: { type: 'array', items: { type: 'string' } },
      collaborationAdvice: { type: 'string' },
    },
    required: ['productUnderstanding', 'versionEvolution', 'keyGaps', 'pipelineAssessment', 'top3Priorities', 'collaborationAdvice']
  }}),

  // --- 产品设计师 ---
  () => agent(`
    你刚刚被创建为「知间产品设计师」。在开始任何工作之前，你需要完整理解知间的产品定位和用户流程。请逐一阅读：

    1. 产品定位文档：../idea-vault/product-brief-argument-anatomist.md
    2. 头脑风暴报告（重点读SCAMPER和延伸Idea）：../research/2026-07-17-头脑风暴.md
    3. HCI心理学评估（重点读理论地基和风险矩阵）：../research/2026-07-17-HCI分析.md
    4. 知间 CLAUDE.md：.claude/CLAUDE.md
    5. 知间产品核心原则：.claude/rules/product-principles.md
    6. AI分析管线规范：.claude/rules/ai-analysis-pipeline.md

    请输出你的「产品设计师对齐报告」，包含：
    A. 你对6阶段关系旅程的理解（每个阶段用户心理和设计目标）
    B. 个人层6模块和关系层5维度的设计思路
    C. 情境重演（阶段5）的交互设想
    D. 关系花园（阶段6）的设计方向
    E. 你识别到的产品设计中需要澄清的问题
    F. 对UX设计师的协作输入诉求
  `, { label: '产品设计师对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      journeyUnderstanding: { type: 'string' },
      moduleDesignApproach: { type: 'string' },
      scenarioReplayIdeas: { type: 'string' },
      gardenDirection: { type: 'string' },
      questionsToClarify: { type: 'array', items: { type: 'string' } },
      uxCollaborationNeeds: { type: 'string' },
    },
    required: ['journeyUnderstanding', 'moduleDesignApproach', 'scenarioReplayIdeas', 'gardenDirection', 'questionsToClarify', 'uxCollaborationNeeds']
  }}),

  // --- UX设计师 ---
  () => agent(`
    你刚刚被创建为「知间UX设计师」。你的视觉设计必须严格遵循已有规范。请逐一阅读：

    1. 色彩系统（必读！）：zhi-jian/DESIGN-COLOR-SYSTEM.md
    2. Welcome V10 动画规范：zhi-jian/.claude/memory/welcome-v10-spec.md
    3. 设计系统守护规则：zhi-jian/.claude/rules/design-system-guard.md
    4. 知间 CLAUDE.md：zhi-jian/.claude/CLAUDE.md
    5. 产品核心原则：zhi-jian/.claude/rules/product-principles.md
    6. 脑暴报告（声部图/可视化部分）：../research/2026-07-17-头脑风暴.md

    请输出你的「UX设计师对齐报告」，包含：
    A. 你对「从夜晚到黎明」色彩叙事的理解
    B. 你对Welcome V10动画规范的理解和如何延续到后续页面
    C. 「智者」品牌人格在视觉层面的体现方式
    D. 「关系花园」隐喻的视觉化方向
    E. 你发现的设计系统缺口（已有规范没覆盖的页面/组件）
    F. 对前端工程师的协作输入诉求
  `, { label: 'UX设计师对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      colorNarrativeUnderstanding: { type: 'string' },
      welcomeAnimationUnderstanding: { type: 'string' },
      sageVisualExpression: { type: 'string' },
      gardenVisualDirection: { type: 'string' },
      designSystemGaps: { type: 'array', items: { type: 'string' } },
      frontendCollaborationNeeds: { type: 'string' },
    },
    required: ['colorNarrativeUnderstanding', 'welcomeAnimationUnderstanding', 'sageVisualExpression', 'gardenVisualDirection', 'designSystemGaps', 'frontendCollaborationNeeds']
  }}),

  // --- 安全隐私审查 ---
  () => agent(`
    你刚刚被创建为「知间安全隐私审查」。你的职责是独立审查所有产出的安全与伦理。请逐一阅读：

    1. HCI心理学评估（重点读全部8项风险矩阵+干预策略）：../research/2026-07-17-HCI分析.md
    2. 竞品与市场调研（重点读竞品风险案例：AI劝分/贴标签被澎湃批评）：../research/2026-07-17-调研报告-竞品与市场.md
    3. 产品定位文档（重点读风险约束章节）：../idea-vault/product-brief-argument-anatomist.md
    4. 知间 CLAUDE.md：.claude/CLAUDE.md
    5. 产品核心原则：.claude/rules/product-principles.md
    6. AI分析管线规范（重点读禁止词汇库+安全检查清单）：.claude/rules/ai-analysis-pipeline.md

    请输出你的「安全隐私审查对齐报告」，包含：
    A. 你对8项风险矩阵的逐一评估（每项当前状态的判断）
    B. 禁止词汇库的完整性和覆盖度评估
    C. V1.0「零存储」策略的评价和V1.1+的隐私建议
    D. 你识别到的任何产品设计中可能遗漏的安全/伦理问题
    E. 对AI工程师的前置安全要求
    F. 对QA测试员的安全测试建议
  `, { label: '安全审查对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      riskMatrixAssessment: { type: 'string' },
      forbiddenTermsCoverage: { type: 'string' },
      privacyStrategyEvaluation: { type: 'string' },
      identifiedMissingIssues: { type: 'array', items: { type: 'string' } },
      aiEngineerSecurityReqs: { type: 'string' },
      qaSecuritySuggestions: { type: 'string' },
    },
    required: ['riskMatrixAssessment', 'forbiddenTermsCoverage', 'privacyStrategyEvaluation', 'identifiedMissingIssues', 'aiEngineerSecurityReqs', 'qaSecuritySuggestions']
  }}),

  // --- AI工程师 ---
  () => agent(`
    你刚刚被创建为「知间AI工程师」。你需要理解完整的AI分析流程和约束。请逐一阅读：

    1. AI分析管线规范（必读！）：.claude/rules/ai-analysis-pipeline.md
    2. 产品核心原则：.claude/rules/product-principles.md
    3. 产品定位文档（重点读AI分析维度章节）：../idea-vault/product-brief-argument-anatomist.md
    4. 脑暴报告（重点读Prompt Chaining/Few-shot/Constitutional AI）：../research/2026-07-17-头脑风暴.md
    5. HCI心理学评估（重点读理论→产品映射）：../research/2026-07-17-HCI分析.md
    6. 知间 CLAUDE.md：.claude/CLAUDE.md
    7. QA日志（了解之前的API实现情况）：QA-LOG.md

    请输出你的「AI工程师对齐报告」，包含：
    A. 你对6步分析流程的可行性评估
    B. Prompt链设计的初步思路（7个阶段的Prompt各自的关键约束）
    C. 禁止词汇库是否需要补充？
    D. 中文冲突信号词典的初步条目（至少列出10个你识别到的中文特有冲突信号）
    E. SQL/Prompt之外需要的技术基础设施
    F. 对系统架构师的技术问题和建议
  `, { label: 'AI工程师对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      pipelineFeasibility: { type: 'string' },
      promptChainApproach: { type: 'string' },
      forbiddenTermsAdditions: { type: 'array', items: { type: 'string' } },
      chineseConflictSignals: { type: 'array', items: { type: 'object', properties: { expression: { type: 'string' }, meaning: { type: 'string' }, context: { type: 'string' } }, required: ['expression', 'meaning', 'context'] } },
      techInfrastructureNeeds: { type: 'array', items: { type: 'string' } },
      architectQuestions: { type: 'string' },
    },
    required: ['pipelineFeasibility', 'promptChainApproach', 'chineseConflictSignals']
  }}),

  // --- 前端工程师 ---
  () => agent(`
    你刚刚被创建为「知间前端工程师」。你需要了解项目技术栈和设计规范。请逐一阅读：

    1. 设计系统守护规则（必读！）：.claude/rules/design-system-guard.md
    2. 代码质量规范（必读！）：.claude/rules/code-quality.md
    3. 色彩系统：DESIGN-COLOR-SYSTEM.md
    4. Welcome V10动画规范：.claude/memory/welcome-v10-spec.md
    5. 知间 CLAUDE.md：.claude/CLAUDE.md
    6. package.json（了解依赖和脚本）
    7. QA日志（了解之前的代码问题）：QA-LOG.md

    请输出你的「前端工程师对齐报告」，包含：
    A. 你对当前项目代码状态的描述（有什么/缺什么）
    B. 需要创建的文件清单（按优先级排列）
    C. 对Welcome V10动画的技术实现评估（是否可行？需要什么？）
    D. 情绪曲线的纯CSS实现方案
    E. 关系花园的可视化方案（不依赖JS库）
    F. 你发现的技术风险或疑问
  `, { label: '前端工程师对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      codeBaseState: { type: 'string' },
      fileCreationPriority: { type: 'array', items: { type: 'object', properties: { file: { type: 'string' }, priority: { type: 'string' }, description: { type: 'string' } }, required: ['file', 'priority', 'description'] } },
      welcomeAnimationAssessment: { type: 'string' },
      emotionCurveApproach: { type: 'string' },
      gardenVizApproach: { type: 'string' },
      technicalRisks: { type: 'array', items: { type: 'string' } },
    },
    required: ['codeBaseState', 'fileCreationPriority', 'welcomeAnimationAssessment', 'emotionCurveApproach', 'gardenVizApproach', 'technicalRisks']
  }}),

  // --- QA测试员 ---
  () => agent(`
    你刚刚被创建为「知间QA测试员」。你需要了解之前的测试历史和当前的测试基准。请逐一阅读：

    1. QA日志（必读！了解之前所有的测试发现和修复）：QA-LOG.md
    2. 产品核心原则（了解禁止项）：.claude/rules/product-principles.md
    3. AI分析管线规范（了解检查清单）：.claude/rules/ai-analysis-pipeline.md
    4. 设计系统守护规则（了解视觉检查点）：.claude/rules/design-system-guard.md
    5. 代码质量规范（了解代码检查点）：.claude/rules/code-quality.md
    6. 知间 CLAUDE.md：.claude/CLAUDE.md
    7. 产品定位文档：../idea-vault/product-brief-argument-anatomist.md

    请输出你的「QA测试员对齐报告」，包含：
    A. 从QA日志中学到的教训（之前出现过的bug模式）
    B. 基于8项风险矩阵的测试用例设计思路
    C. 4个标准场景的测试脚本框架
    D. 禁止词汇扫描的自动化方式建议
    E. 你认为最容易被忽视的测试盲区
    F. 对其他智能体的质量要求
  `, { label: 'QA测试员对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      lessonsFromQALog: { type: 'string' },
      riskBasedTestDesign: { type: 'string' },
      scenarioTestFrameworks: { type: 'string' },
      forbiddenScanAutomation: { type: 'string' },
      testBlindSpots: { type: 'array', items: { type: 'string' } },
      qualityRequirements: { type: 'string' },
    },
    required: ['lessonsFromQALog', 'riskBasedTestDesign', 'scenarioTestFrameworks', 'testBlindSpots']
  }}),

  // --- Idea馆长 ---
  () => agent(`
    你刚刚被创建为「知间Idea馆长」。你需要了解April的创业全貌和Idea Vault现状。请逐一阅读：

    1. Idea Vault 索引（必读！）：../idea-vault/INDEX.md
    2. Idea模板：../idea-vault/TEMPLATE.md
    3. 交叉分析：../idea-vault/cross-track-analysis.md
    4. 当前正在做的项目（知间）的产品文档：../idea-vault/product-brief-argument-anatomist.md
    5. 知间 CLAUDE.md：.claude/CLAUDE.md
    6. April的用户档案：../.claude/memory/user-profile.md
    7. Idea Vault 中所有9个Idea（逐一浏览，了解每个的定位）：../idea-vault/track-ai-*/**/*.md

    请输出你的「Idea馆长对齐报告」，包含：
    A. 对Idea Vault当前状态的整体描述
    B. 9个Idea的赛道分布和简要定位
    C. 各Idea之间的关联关系（哪些相关/互补/上下游）
    D. 你认为Idea Vault需要整理或补充的地方
    E. 对知间（当前项目）和其他Idea之间关系的看法
    F. 你的工作建议（怎么帮April管理这些Idea）
  `, { label: 'Idea馆长对齐', phase: '摸底', schema: {
    type: 'object',
    properties: {
      vaultStateDescription: { type: 'string' },
      ideaDistribution: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, name: { type: 'string' }, track: { type: 'string' }, positioning: { type: 'string' } }, required: ['id', 'name', 'track', 'positioning'] } },
      crossRelations: { type: 'string' },
      vaultImprovementSuggestions: { type: 'array', items: { type: 'string' } },
      currentProjectRelation: { type: 'string' },
      workSuggestions: { type: 'string' },
    },
    required: ['vaultStateDescription', 'ideaDistribution', 'crossRelations', 'vaultImprovementSuggestions', 'currentProjectRelation', 'workSuggestions']
  }}),
])

phase('汇总')

// 系统架构师阅读所有对齐报告后，给出最终汇总
const summary = await agent(`
  你是知间AI系统架构师。所有智能体已经完成了对齐阅读。请阅读以下各智能体的对齐报告，然后输出一份「最终对齐汇总」。

  各智能体报告如下：
  ${JSON.stringify(alignments, null, 2)}

  请输出：
  1. 整体对齐情况评估（所有智能体是否对产品定位理解一致？）
  2. 发现的共识和分歧（如果有分歧，是什么？怎么解决？）
  3. 识别到的关键缺口（综合所有智能体发现的问题）
  4. 优先级行动计划（下一步具体做什么，按优先级排列）
  5. 需要April确认的关键决策

  注意：用中文输出，语气温暖但不啰嗦。
`, { label: '最终汇总', phase: '汇总' })

log('='.repeat(60))
log('对齐工作流完成')
log('='.repeat(60))
log('')
log('📋 最终汇总结论：')
log(summary)
log('')
log('👉 请 April 审阅汇总结论，做出关键决策。')
log('👉 然后可以使用「知间开发工作流」进入正式设计和开发。')

return {
  alignments: alignments.filter(Boolean),
  summary,
  status: 'complete',
}
