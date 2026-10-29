// src/modules/practice.js —— 对话模拟：重新表达 → 打分 → 关系养分换算 + 古树成长
//
// 交互规则照搬《知间UI改版效果图v4.html》第 640–672 行：
//   <60 不及格需重来；60-70 +1；70-80 +2；80-90 +3；90-99 +4；100 +5。
//   分数驱动一棵 5 档古树逐级点亮（v4 第 423–427 行的 5 档 SVG）。
// 写入：优先走 state.applyAnalysisToGarden(analysis, { gain }) 进关系账本；
//       无可用 analysis 时只更新总分 zhijian-nurture。
import { state, applyAnalysisToGarden } from '../core/state.js';
import { byId } from '../core/dom.js';
import { showToast } from '../core/utils.js';

/** 5 档古树 SVG（照搬 v4 效果图 423–427 行，viewBox 0 0 30 40） */
const TREE_STAGES = [
  '<svg viewBox="0 0 30 40"><path d="M15 40V30" stroke="#C98E63" stroke-width="2.4" stroke-linecap="round"/><circle cx="15" cy="27" r="5" fill="#AECBA3"/></svg>',
  '<svg viewBox="0 0 30 40"><path d="M15 40V26" stroke="#C98E63" stroke-width="2.6" stroke-linecap="round"/><circle cx="15" cy="22" r="7" fill="#AECBA3"/><circle cx="9" cy="24" r="4" fill="#8FB486"/></svg>',
  '<svg viewBox="0 0 30 40"><path d="M15 40V22" stroke="#C98E63" stroke-width="2.8" stroke-linecap="round"/><circle cx="15" cy="17" r="9" fill="#AECBA3"/><circle cx="8" cy="20" r="5" fill="#8FB486"/><circle cx="22" cy="19" r="5" fill="#AECBA3"/></svg>',
  '<svg viewBox="0 0 30 40"><path d="M15 40V18" stroke="#C98E63" stroke-width="3" stroke-linecap="round"/><circle cx="15" cy="13" r="10" fill="#AECBA3"/><circle cx="7" cy="16" r="6" fill="#8FB486"/><circle cx="23" cy="15" r="6" fill="#AECBA3"/><circle cx="15" cy="6" r="5" fill="#8FB486"/></svg>',
  '<svg viewBox="0 0 30 40"><path d="M15 40V14" stroke="#C98E63" stroke-width="3.2" stroke-linecap="round"/><circle cx="15" cy="9" r="11" fill="#AECBA3"/><circle cx="6" cy="13" r="7" fill="#8FB486"/><circle cx="24" cy="12" r="7" fill="#AECBA3"/><circle cx="15" cy="3" r="6" fill="#8FB486"/><circle cx="15" cy="9" r="2.4" fill="#F4B58F"/></svg>',
];

/** 每档成长形态词（Lv.1–5） */
const STAGE_WORDS = ['抽新芽', '长叶', '开枝', '繁茂', '满冠'];

/** 分数 → 养分 */
function gainOf(v) {
  if (v < 60) return 0;
  if (v < 70) return 1;
  if (v < 80) return 2;
  if (v < 90) return 3;
  if (v < 100) return 4;
  return 5;
}

/** 分数 → 古树档位（0–5，0 表示未点亮） */
function levelOf(v) {
  if (v < 60) return 0;
  if (v < 70) return 1;
  if (v < 80) return 2;
  if (v < 90) return 3;
  if (v < 100) return 4;
  return 5;
}

/** 古树 5 档 HTML（纯函数；level 以内的档位点亮 .on） */
function buildTreeStagesHTML(level) {
  return TREE_STAGES.map((svg, i) => {
    const lv = i + 1;
    const cls = lv <= level ? 'ts on' : 'ts';
    return (
      '<div class="' + cls + '" data-lv="' + lv + '">' + svg + '<span>' + lv + '</span></div>'
    );
  }).join('');
}

/** 换算反馈 HTML（纯函数；含 gain 数字与档位文案） */
function buildPracticeTierHTML(v) {
  if (v < 60) {
    return '不及格（' + v + ' 分）· 需重新表达再来一次';
  }
  const gain = gainOf(v);
  const level = levelOf(v);
  return '<b>+' + gain + ' 关系养分</b> · 关系古树' + STAGE_WORDS[level - 1] + '（Lv.' + level + '）';
}

/** 从最近一次分析里取一条「原话」用于练习 */
function extractQuote(analysis) {
  if (!analysis || typeof analysis !== 'object' || Array.isArray(analysis)) return null;
  const whatIf =
    analysis.whatIf && Array.isArray(analysis.whatIf.sideBySide) ? analysis.whatIf.sideBySide[0] : null;
  if (whatIf && whatIf.original) return { who: null, text: whatIf.original };
  const replay = Array.isArray(analysis.replay) ? analysis.replay[0] : null;
  if (replay && replay.text) return { who: null, text: replay.text };
  const entries =
    analysis.dualAnalysis && Array.isArray(analysis.dualAnalysis.entries)
      ? analysis.dualAnalysis.entries
      : null;
  if (entries && entries[0] && entries[0].said) {
    return { who: entries[0].label || null, text: entries[0].said };
  }
  return null;
}

/** 分数驱动：更新数字 / 状态 / 反馈 / 古树 / 养分值 */
function applyScore(v) {
  const gain = gainOf(v);
  const level = levelOf(v);

  const num = byId('practice-num');
  if (num) num.textContent = String(v);

  const stateEl = byId('practice-state');
  if (stateEl) stateEl.textContent = v < 60 ? '不及格' : '+' + gain + ' 养分';

  const tier = byId('practice-tier');
  if (tier) {
    tier.className = v < 60 ? 'sim-tier fail' : 'sim-tier pass';
    tier.innerHTML = buildPracticeTierHTML(v);
  }

  const tree = byId('practice-tree');
  if (tree) tree.innerHTML = buildTreeStagesHTML(level);

  const nut = byId('practice-nut');
  if (nut) nut.textContent = '+' + gain;
}

/** 打开练习页时的中性重置（不显示「不及格」等判定） */
function resetPracticeUI() {
  const num = byId('practice-num');
  if (num) num.textContent = '0';
  const stateEl = byId('practice-state');
  if (stateEl) stateEl.textContent = '拖动下方打分';
  const tier = byId('practice-tier');
  if (tier) {
    tier.className = 'sim-tier';
    tier.textContent = '打分后，系统会换算「关系养分」并反馈古树成长。';
  }
  const tree = byId('practice-tree');
  if (tree) tree.innerHTML = buildTreeStagesHTML(0);
  const nut = byId('practice-nut');
  if (nut) nut.textContent = '+0';
}

/** 把本次练习的养分写进关系账本（无 analysis 则只加总分） */
function commitGain(v) {
  const gain = gainOf(v);
  if (gain <= 0) {
    showToast('还没及格，先重新表达再来一次');
    return;
  }
  const analysis = state.shareAnalysisRef;
  if (analysis && typeof analysis === 'object' && !Array.isArray(analysis)) {
    applyAnalysisToGarden(analysis, { gain });
  } else {
    const prev = parseInt(localStorage.getItem('zhijian-nurture') || '0', 10);
    const base = Number.isNaN(prev) ? 0 : prev;
    localStorage.setItem('zhijian-nurture', String(base + gain));
  }
  showToast('+' + gain + ' 关系养分已记录');
}

/** 进入练习页时：取原话 + 重置交互态 */
function populatePractice() {
  const quote = extractQuote(state.shareAnalysisRef);
  const quoteEl = byId('practice-quote');
  if (quoteEl) {
    if (quote) {
      quoteEl.textContent = (quote.who ? quote.who + ' 说：' : '原话：') + '「' + quote.text + '」';
    } else {
      quoteEl.textContent = '把你最近一次对话里，那句「说出口却伤人的话」放到这里练习。';
    }
  }
  const input = byId('practice-input');
  if (input) input.value = '';
  const range = byId('practice-range');
  if (range) range.value = '0';
  resetPracticeUI();
}

export function initPractice() {
  const range = byId('practice-range');
  if (range) {
    range.addEventListener('input', () => {
      applyScore(parseInt(range.value, 10) || 0);
    });
  }

  const btn = byId('practice-btn');
  if (btn) {
    btn.addEventListener('click', () => {
      const rangeEl = byId('practice-range');
      const v = rangeEl ? parseInt(rangeEl.value, 10) || 0 : 0;
      commitGain(v);
    });
  }

  document.addEventListener('navigate', (e) => {
    if (e.detail && e.detail.screenId === 'practice-screen') {
      populatePractice();
    }
  });
}
