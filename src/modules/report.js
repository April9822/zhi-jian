// src/modules/report.js —— 报告渲染 + 分享 + 视角切换
// 依赖：report.js → core/state.js + core/utils.js + core/router.js（modules → core 单向）
// modules 之间零 import。
import { state } from '../core/state.js';
import { $, $$, byId } from '../core/dom.js';
import { escapeHtml, showToast } from '../core/utils.js';
import { goTo } from '../core/router.js';

// ============================================================
// 参与者映射 helper —— 全链路统一「id → label → 名字」
// ============================================================
/**
 * 构建 id → 名字 映射表（label 优先，兜底用 id 本身）
 * @param {Array<{id:string,label?:string}>} parties
 * @returns {Record<string,string>}
 */
export function buildPartyLabelMap(parties) {
  const map = {};
  if (parties && Array.isArray(parties)) {
    parties.forEach((p) => {
      map[p.id] = p.label || p.id;
    });
  }
  return map;
}

/**
 * 根据 id 取参与者名字
 * @param {Record<string,string>} labelMap
 * @param {string} id
 * @returns {string}
 */
export function partyName(labelMap, id) {
  return (labelMap && labelMap[id]) || id || '';
}

// ============================================================
// innerHTML 硬纪律：右值来自 buildXxxHTML() 纯函数，每个插值经 escapeHtml()
// ============================================================
function buildCoreInsightHTML(insight) {
  return `<div class="insight-tag">${escapeHtml(insight.conflictType || '')}</div>
    <h3 class="insight-title">${escapeHtml(insight.title || '')}</h3>
    <p class="insight-summary">${escapeHtml(insight.summary || '')}</p>
    <div class="insight-real-topic">
      <span class="label">表面上在吵：</span>
      <span>${escapeHtml(insight.realTopic || '')}</span>
    </div>`;
}

function buildResponsibilityHTML(ratio, parties) {
  const labelMap = buildPartyLabelMap(parties);
  // v4 暖色双色条分段色板（左=珊瑚 #F2A085，右=叶绿 #8FB486，超出两位时循环取色）
  const palette = ['#F2A085', '#8FB486', '#E0A878', '#C98E63', '#AECBA3'];
  const segments = [];
  const reasons = [];

  if (ratio.ratios && Array.isArray(ratio.ratios) && ratio.ratios.length > 0) {
    ratio.ratios.forEach((r, i) => {
      const pct = Number(r.percent) || 0;
      const label = partyName(labelMap, r.party) || `参与方 ${i + 1}`;
      segments.push({ pct, label, color: palette[i % palette.length] });
      if (r.reason) reasons.push(escapeHtml(r.reason));
    });
  } else {
    // 兼容旧格式（sideA / sideB）
    const a = Number(ratio.sideA ?? 50);
    const b = Number(ratio.sideB ?? 50);
    segments.push({ pct: a, label: '一方', color: palette[0] });
    segments.push({ pct: b, label: '另一方', color: palette[1] });
    if (ratio.reasonA) reasons.push(escapeHtml(ratio.reasonA));
    if (ratio.reasonB) reasons.push(escapeHtml(ratio.reasonB));
  }

  // div100 双色条：各段按百分比 flex 占比，合计 100%
  const bars = segments
    .map(
      (s) =>
        '<span style="flex:' +
        s.pct +
        ';background:' +
        s.color +
        '">' +
        escapeHtml(s.label) +
        ' ' +
        s.pct +
        '%</span>'
    )
    .join('');

  const total = segments.reduce((sum, s) => sum + s.pct, 0);
  const top =
    '<div class="ratio-top"><span class="rn">双方各自可能引发冲突的占比</span>' +
    '<span class="rp">合计 ' +
    Math.round(total) +
    '%</span></div>';

  const reason = reasons.length
    ? '<div class="ratio-reason">' + reasons.join('；') + '</div>'
    : '';

  return (
    '<div class="ratio-wrap">' +
    top +
    '<div class="div100">' +
    bars +
    '</div>' +
    reason +
    '</div>' +
    '<p class="ratio-note">' +
    escapeHtml(ratio.totalNote || ratio.note || '以上仅针对本次对话中的表达方式，不是对人的评价') +
    '</p>'
  );
}

function buildDualColumnsHTML(dual, parties) {
  const labelMap = buildPartyLabelMap(parties);
  let cols = '';
  if (dual.entries && Array.isArray(dual.entries)) {
    const colors = ['column-a', 'column-b', 'column-c', 'column-d', 'column-e'];
    dual.entries.forEach((e, i) => {
      const label = escapeHtml(e.label || partyName(labelMap, e.party) || `参与方 ${i + 1}`);
      cols +=
        '<div class="column ' +
        colors[i] +
        '">' +
        '<div class="column-header">' +
        label +
        '</div>' +
        '<div class="layer"><span class="layer-label">说了</span><p class="layer-said">' +
        escapeHtml(e.said || '') +
        '</p></div>' +
        '<div class="layer arrow-layer">↓ 对方可能听到的</div>' +
        '<div class="layer"><p class="layer-heard">' +
        escapeHtml(e.heardAs || '') +
        '</p></div>' +
        '<div class="layer arrow-layer">↓ 内心活动</div>' +
        '<div class="layer"><p class="layer-inner">' +
        escapeHtml(e.innerVoice || '') +
        '</p></div>' +
        '<div class="layer arrow-layer">↓</div>' +
        '<div class="layer layer-real"><span class="layer-label">真正想说的</span><p>' +
        escapeHtml(e.realMeaning || '') +
        '</p></div>' +
        '</div>';
    });
  } else {
    const sideA = dual.sideA || {};
    const sideB = dual.sideB || {};
    cols =
      '<div class="column column-a"><div class="column-header">' +
      escapeHtml(sideA.label || '一方') +
      '</div>' +
      '<div class="layer"><span class="layer-label">说了</span><p class="layer-said">' +
      escapeHtml(sideA.said || '') +
      '</p></div>' +
      '<div class="layer arrow-layer">↓ 对方听到的</div>' +
      '<div class="layer"><p class="layer-heard">' +
      escapeHtml(sideA.heardByB || '') +
      '</p></div>' +
      '</div>' +
      '<div class="column column-b"><div class="column-header">' +
      escapeHtml(sideB.label || '另一方') +
      '</div>' +
      '<div class="layer"><span class="layer-label">说了</span><p class="layer-said">' +
      escapeHtml(sideB.said || '') +
      '</p></div>' +
      '<div class="layer arrow-layer">↓ 对方听到的</div>' +
      '<div class="layer"><p class="layer-heard">' +
      escapeHtml(sideB.heardByA || '') +
      '</p></div>' +
      '</div>';
  }
  return cols;
}

function buildGapHTML(dual) {
  if (!dual.gap) return '';
  return `<div class="gap-card"><p>${escapeHtml(dual.gap)}</p></div>`;
}

/**
 * 左右对照卡（v4 .lr-card）：原话 → 左「原本想表达」→ 右「实际听到」。
 * 数据源：dualAnalysis.entries[].{said, realMeaning, heardAs}。
 * @param {object} dual
 * @param {Array} parties
 * @returns {string} 无有效数据时返回空串
 */
function buildLrCardsHTML(dual, parties) {
  const entries = dual && Array.isArray(dual.entries) ? dual.entries : null;
  if (!entries || entries.length === 0) return '';
  const labelMap = buildPartyLabelMap(parties);
  return entries
    .map((e) => {
      const who = escapeHtml(e.label || partyName(labelMap, e.party) || '一方');
      return (
        '<div class="lr-card">' +
        '<div class="lr-quote"><span class="who">' +
        who +
        ' 说</span>「' +
        escapeHtml(e.said || '') +
        '」</div>' +
        '<div class="lr-body">' +
        '<div class="lr-side lr-left"><div class="lr-lab">原本想表达</div>' +
        escapeHtml(e.realMeaning || '') +
        '</div>' +
        '<div class="lr-mid">→</div>' +
        '<div class="lr-side lr-right"><div class="lr-lab">实际听到</div>' +
        escapeHtml(e.heardAs || '') +
        '</div>' +
        '</div></div>'
      );
    })
    .join('');
}

function buildReplayHTML(replayList, parties) {
  const labelMap = buildPartyLabelMap(parties);
  return replayList
    .map((r) => {
      const turnClass = r.isTurningPoint ? 'replay-item turning-point' : 'replay-item';
      const turnBadge = r.isTurningPoint ? '<span class="turn-badge">转折点</span>' : '';
      const speakerLabel = escapeHtml(partyName(labelMap, r.speaker));
      return (
        '<div class="' +
        turnClass +
        '">' +
        '<div class="replay-header">' +
        '<span class="replay-round">第' +
        Number(r.round) +
        '句</span>' +
        '<span class="replay-speaker">' +
        speakerLabel +
        '</span>' +
        turnBadge +
        '</div>' +
        '<p class="replay-text">' +
        escapeHtml(r.text || '') +
        '</p>' +
        (r.psychology
          ? '<div class="replay-psychology">心声解读：' + escapeHtml(r.psychology) + '</div>'
          : '') +
        (r.hiddenNeed
          ? '<div class="replay-need">未说出口的需求：' + escapeHtml(r.hiddenNeed) + '</div>'
          : '') +
        '</div>'
      );
    })
    .join('');
}

function buildWhatIfHTML(whatIf, parties) {
  const labelMap = buildPartyLabelMap(parties);
  const sideBySide = whatIf.sideBySide || [];
  const rows = sideBySide
    .map((row) => {
      const label = escapeHtml(partyName(labelMap, row.speaker));
      return (
        '<div class="what-if-row">' +
        '<div class="what-if-speaker">' +
        label +
        '</div>' +
        '<div class="what-if-original">' +
        escapeHtml(row.original || '') +
        '</div>' +
        '<div class="what-if-arrow">→</div>' +
        '<div class="what-if-alt">' +
        escapeHtml(row.alternative || '') +
        '</div></div>'
      );
    })
    .join('');
  return `<div class="what-if-summary">
      <div class="what-if-flow"><span class="flow-label">现实中</span><p>${escapeHtml(whatIf.originalFlow || '')}</p></div>
      <div class="what-if-flow"><span class="flow-label">如果重来</span><p>${escapeHtml(whatIf.alternativeFlow || '')}</p></div>
    </div>
    <div class="what-if-table">
      <div class="what-if-header"><span>现实中说的</span><span>如果这样说</span></div>
      ${rows}
    </div>`;
}

function buildEmotionHTML(emotion, parties) {
  const labelMap = buildPartyLabelMap(parties);
  let entries = emotion.entries;
  if (!entries && emotion.sideA) {
    // 兼容旧格式
    entries = [
      {
        party: 'A',
        label: '一方',
        anxiety: emotion.sideA.anxiety,
        anger: emotion.sideA.anger,
        sadness: emotion.sideA.sadness,
        hurt: emotion.sideA.hurt,
        exhaustion: emotion.sideA.exhaustion,
        helplessness: emotion.sideA.helplessness,
        summary: emotion.sideA.summary,
      },
    ];
    if (emotion.sideB) {
      entries.push({
        party: 'B',
        label: '另一方',
        anxiety: emotion.sideB.anxiety,
        anger: emotion.sideB.anger,
        sadness: emotion.sideB.sadness,
        hurt: emotion.sideB.hurt,
        exhaustion: emotion.sideB.exhaustion,
        helplessness: emotion.sideB.helplessness,
        summary: emotion.sideB.summary,
      });
    }
  }
  // 8 维情绪画像对齐 v4 口径：焦虑/委屈/疲惫/愤怒/受伤/无助/失望/孤独。
  // 后端仅提供 anxiety/anger/sadness/hurt/exhaustion/helplessness 六字段：
  //   · 「受伤」「孤独」无对应字段 -> 就近映射仍缺失，故跳过（不编造数值）。
  //   · 「失望」就近映射到 sadness（后端无独立 disappointment 字段）。
  //   · 「无助」即原 helplessness（旧标签「无力感」更名）。
  const dims = [
    { key: 'anxiety', label: '焦虑', color: '#F2A085' },
    { key: 'hurt', label: '委屈', color: '#F8C3A6' },
    { key: 'exhaustion', label: '疲惫', color: '#E0A878' },
    { key: 'anger', label: '愤怒', color: '#D98C6A' },
    { key: 'helplessness', label: '无助', color: '#C98E63' },
    { key: 'sadness', label: '失望', color: '#8FB486' },
  ];
  let html = '';
  if (entries && Array.isArray(entries)) {
    html = entries
      .map((data) => {
        const label = escapeHtml(data.label || partyName(labelMap, data.party));
        const bars = dims
          .map(
            (d) =>
              '<div class="emotion-bar-row"><span class="emotion-label">' +
              d.label +
              '</span>' +
              '<div class="emotion-bar-bg"><div class="emotion-bar-fill" style="width:' +
              Number(data[d.key] ?? 0) +
              '%;background:' +
              d.color +
              '"></div></div>' +
              '<span class="emotion-score">' +
              Number(data[d.key] ?? 0) +
              '</span></div>'
          )
          .join('');
        return (
          '<div class="emotion-card"><h4>' +
          label +
          '</h4>' +
          bars +
          '<p class="emotion-summary">' +
          escapeHtml(data.summary || '') +
          '</p></div>'
        );
      })
      .join('');
  }
  return '<div class="emotion-grid">' + html + '</div>';
}

function buildReliefHTML(relief) {
  return (relief.forUser || [])
    .map(
      (m) => `
    <div class="relief-card">
      <div class="relief-header">
        <span class="relief-method">${escapeHtml(m.method || '')}</span>
        <span class="relief-school">${escapeHtml(m.school || '')}</span>
      </div>
      <p class="relief-steps">${escapeHtml(m.steps || '')}</p>
      <p class="relief-why">${escapeHtml(m.whyItHelps || '')}</p>
    </div>
  `
    )
    .join('');
}

function buildIcebreakersHTML(icebreakers, notes, parties) {
  const partyLabelMap = buildPartyLabelMap(parties);
  const distinct = {};
  icebreakers.forEach((ib) => {
    if (ib.party) distinct[ib.party] = true;
  });
  const showPartyLabel = Object.keys(distinct).length > 1;

  const cards = icebreakers
    .map((ib) => {
      const styleLabel =
        showPartyLabel && ib.party
          ? escapeHtml(partyName(partyLabelMap, ib.party)) + ' · ' + escapeHtml(ib.style || '')
          : escapeHtml(ib.style || '');
      return `
    <div class="icebreaker-card">
      <span class="icebreaker-style">${styleLabel}</span>
      <p class="icebreaker-text">${escapeHtml(ib.text || '')}</p>
      <button class="btn-copy-icebreaker" data-text="${escapeHtml(ib.text || '')}">复制</button>
    </div>
  `;
    })
    .join('');

  let notesHtml = '';
  if (notes && notes.entries && Array.isArray(notes.entries)) {
    const labelMap = buildPartyLabelMap(parties);
    const noteCards = notes.entries
      .map((entry) => {
        const label = escapeHtml(entry.label || partyName(labelMap, entry.party) || '参与者');
        return (
          '<div class="note-card">' +
          '<span class="note-label">' +
          label +
          ' 的沟通模式</span>' +
          '<p>' +
          escapeHtml(entry.note || '') +
          '</p></div>'
        );
      })
      .join('');
    notesHtml = `
      <div class="behavioral-notes">
        <h3>本次对话行为观察</h3>
        <div class="notes-grid">${noteCards}</div>
        <p class="note-disclaimer">以上是基于本次对话的行为观察，不代表长期人格。</p>
      </div>
    `;
  } else if (notes && (notes.sideA || notes.sideB)) {
    notesHtml = `
      <div class="behavioral-notes">
        <h3>本次对话行为观察</h3>
        <div class="notes-grid">
          <div class="note-card"><span class="note-label">一方的沟通模式</span><p>${escapeHtml(notes.sideA || '')}</p></div>
          <div class="note-card"><span class="note-label">另一方的沟通模式</span><p>${escapeHtml(notes.sideB || '')}</p></div>
        </div>
        <p class="note-disclaimer">以上是基于本次对话的行为观察，不代表长期人格。</p>
      </div>
    `;
  }

  return `<div class="icebreaker-cards">${cards}</div>${notesHtml}`;
}

// ============================================================
// 总体报告
// ============================================================
/**
 * 由情绪分析计算关系养分分值（术语合规：原 calcEnergyScore 更名）。
 * @param {object} analysis
 * @returns {{score:number, energy:number}}
 */
export function calcNurtureScore(analysis) {
  let score = 50;
  const emotion = analysis.emotionAnalysis;
  if (emotion && emotion.entries && Array.isArray(emotion.entries) && emotion.entries.length > 0) {
    const count = emotion.entries.length;
    const avgAnxiety = emotion.entries.reduce((sum, e) => sum + (e.anxiety || 0), 0) / count;
    const avgAnger = emotion.entries.reduce((sum, e) => sum + (e.anger || 0), 0) / count;
    score = Math.round(100 - (avgAnxiety * 0.3 + avgAnger * 0.5));
  } else if (emotion && (emotion.sideA || emotion.sideB)) {
    const a = emotion.sideA || {};
    const b = emotion.sideB || {};
    const avgAnxiety = ((a.anxiety || 0) + (b.anxiety || 0)) / 2;
    const avgAnger = ((a.anger || 0) + (b.anger || 0)) / 2;
    score = Math.round(100 - (avgAnxiety * 0.3 + avgAnger * 0.5));
  }
  score = Math.max(5, Math.min(95, score));

  let energy = 0;
  if (score >= 80) energy = 5;
  else if (score >= 60) energy = 2;
  else if (score >= 40) energy = 1;
  else if (score >= 20) energy = 0.5;
  else energy = 0;

  return { score, energy };
}

function buildTotalReportHTML(analysis) {
  const result = calcNurtureScore(analysis);
  const insights = analysis.coreInsight || {};
  const energyLabel =
    result.energy >= 2
      ? '这次沟通获得了较多的关系养分'
      : result.energy > 0
        ? '这次沟通获得了一些关系养分'
        : '这次沟通需要更多理解';

  return (
    '<div class="total-summary">' +
    '<h3>这次对话的核心</h3>' +
    '<p>' +
    escapeHtml(insights.summary || '你们真正在意的，是彼此是否被看见。') +
    '</p>' +
    '</div>' +
    '<div class="total-energy">' +
    '<div class="energy-circle">' +
    '<span class="energy-num">' +
    result.score +
    '</span>' +
    '<span class="energy-unit">分</span>' +
    '</div>' +
    '<p class="energy-desc">' +
    energyLabel +
    '</p>' +
    '<p class="energy-value">+' +
    result.energy +
    ' 关系养分</p>' +
    '</div>' +
    '<div class="total-sim">' +
    '<h3>情景模拟练习</h3>' +
    '<p>想试试换个方式回应，会带来什么不同吗？</p>' +
    '<button class="btn-primary btn-sim" data-toast="情景模拟即将上线">开始模拟对话</button>' +
    '</div>'
  );
}

// ============================================================
// 分层渲染
// ============================================================
function renderCoreInsight(insight) {
  const el = $('#core-insight');
  if (!el || !insight) return;
  el.innerHTML = buildCoreInsightHTML(insight);
}

function renderResponsibilityRatio(ratio, parties) {
  if (!ratio) return;
  byId('screen-responsibility')?.classList.remove('hidden');
  const el = $('#responsibility-container');
  if (el) el.innerHTML = buildResponsibilityHTML(ratio, parties);
}

function renderDualColumns(dual, parties) {
  if (!dual) return;
  const el = $('#dual-columns');
  if (el) el.innerHTML = buildDualColumnsHTML(dual, parties);
  const gap = $('#gap-annotation');
  if (gap) gap.innerHTML = buildGapHTML(dual);
}

function renderLrCards(dual, parties) {
  const entries = dual && Array.isArray(dual.entries) ? dual.entries : null;
  if (!entries || entries.length === 0) return;
  byId('screen-lr')?.classList.remove('hidden');
  const el = $('#lr-container');
  if (el) el.innerHTML = buildLrCardsHTML(dual, parties);
}

function renderReplay(replayList, parties) {
  if (!replayList || !Array.isArray(replayList)) return;
  const el = $('#replay-container');
  if (el) el.innerHTML = buildReplayHTML(replayList, parties);
}

function renderWhatIf(whatIf, parties) {
  if (!whatIf) return;
  const el = $('#what-if-container');
  if (el) el.innerHTML = buildWhatIfHTML(whatIf, parties);
}

function renderEmotionAnalysis(emotion, parties) {
  if (!emotion) return;
  byId('screen-emotion')?.classList.remove('hidden');
  const el = $('#emotion-container');
  if (el) el.innerHTML = buildEmotionHTML(emotion, parties);
}

function renderEmotionRelief(relief) {
  if (!relief) return;
  byId('screen-relief')?.classList.remove('hidden');
  const el = $('#relief-container');
  if (el) el.innerHTML = buildReliefHTML(relief);
  if (relief.note) {
    const note = $('#relief-note');
    if (note) {
      note.textContent = relief.note;
      note.classList.remove('hidden');
    }
  }
}

function renderIcebreakers(icebreakers, notes, parties) {
  if (!icebreakers || !Array.isArray(icebreakers)) return;
  const el = $('#icebreaker-container');
  if (el) el.innerHTML = buildIcebreakersHTML(icebreakers, notes, parties);

  // 复制按钮事件
  $$('.btn-copy-icebreaker').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const text = btn.dataset.text || '';
      try {
        await navigator.clipboard.writeText(text);
        btn.textContent = '已复制';
        setTimeout(() => {
          btn.textContent = '复制';
        }, 2000);
      } catch (err) {
        console.warn('复制失败', err);
      }
    });
  });
}

function renderTotalReport(view) {
  const el = $('#total-container');
  if (!el) return;
  el.innerHTML = buildTotalReportHTML(view);
  byId('screen-total')?.classList.remove('hidden');
}

// ============================================================
// 报告总编排
// ============================================================
/**
 * 渲染报告（含视角过滤）。
 * 尾部 fire-and-forget 调用 state.applyAnalysisToGarden()（唯一写入口），随后 setupShare()。
 * @param {object} analysis
 */
export function renderReport(analysis) {
  const parties = analysis.parties || [];

  // 深拷贝一份用于渲染：切换视角只过滤副本，绝不改坏原始分析数据。
  const view = JSON.parse(JSON.stringify(analysis));

  if (state.currentViewParty && state.currentViewParty !== 'both' && parties.length > 0) {
    const selParty = state.currentViewParty;
    if (view.dualAnalysis && view.dualAnalysis.entries) {
      view.dualAnalysis.entries = view.dualAnalysis.entries.filter((e) => e.party === selParty);
    }
    if (view.emotionAnalysis && view.emotionAnalysis.entries) {
      view.emotionAnalysis.entries = view.emotionAnalysis.entries.filter(
        (e) => e.party === selParty
      );
    }
    if (view.behavioralNotes && view.behavioralNotes.entries) {
      view.behavioralNotes.entries = view.behavioralNotes.entries.filter(
        (e) => e.party === selParty
      );
    }
    if (view.responsibilityRatio && view.responsibilityRatio.ratios) {
      view.responsibilityRatio.ratios = view.responsibilityRatio.ratios.filter(
        (r) => r.party === selParty
      );
    }
    if (view.replay && Array.isArray(view.replay)) {
      view.replay = view.replay.map((r) => {
        if (r.speaker !== selParty) {
          const stripped = JSON.parse(JSON.stringify(r));
          delete stripped.psychology;
          delete stripped.hiddenNeed;
          return stripped;
        }
        return r;
      });
    }
    if (view.whatIf && view.whatIf.sideBySide && Array.isArray(view.whatIf.sideBySide)) {
      view.whatIf.sideBySide = view.whatIf.sideBySide.filter((row) => row.speaker === selParty);
    }
    if (view.icebreakers && Array.isArray(view.icebreakers)) {
      view.icebreakers = view.icebreakers.filter((ib) => ib.party === selParty);
    }
    if (
      view.coreInsight &&
      view.coreInsight.perParty &&
      Array.isArray(view.coreInsight.perParty)
    ) {
      const mine = view.coreInsight.perParty.find((p) => p.party === selParty);
      if (mine) {
        view.coreInsight.title = mine.title || view.coreInsight.title;
        view.coreInsight.summary = mine.summary || view.coreInsight.summary;
      }
    }
  }

  renderCoreInsight(view.coreInsight);
  renderResponsibilityRatio(view.responsibilityRatio, view.parties);
  renderDualColumns(view.dualAnalysis, view.parties);
  renderLrCards(view.dualAnalysis, view.parties);
  renderReplay(view.replay, view.parties);
  renderWhatIf(view.whatIf, view.parties);
  renderEmotionAnalysis(view.emotionAnalysis, view.parties);
  renderEmotionRelief(view.emotionRelief);
  renderIcebreakers(view.icebreakers, view.behavioralNotes, view.parties);
  renderTotalReport(view);

  // 写入关系账本：fire-and-forget，不 await。
  // 1) await 会阻塞「报告渲染完成」时序，写入不该骑在渲染路径上
  // 2) 写入失败不影响用户看到报告，异常已在 applyAnalysisToGarden 内部吞掉
  // 3) 不写 .catch() 也不写 void——函数内部已 try/catch，无需在此兜底
  state.applyAnalysisToGarden(analysis, { conversation: state.conversation });

  setupShare(analysis); // 写入发起后立即继续，不等它完成
}

// ============================================================
// 角色选择 — 选择要看谁的视角
// ============================================================
/**
 * 弹出角色选择器。
 * @param {object} analysis
 * @param {() => void} callback - 选择完成后回调
 */
export function showRolePicker(analysis, callback) {
  const parties =
    analysis && analysis.parties && Array.isArray(analysis.parties) ? analysis.parties : [];
  const participantCount = parties.length || 2;

  let btns = '';
  if (parties.length > 0) {
    btns = parties
      .map((p, i) => {
        const label = escapeHtml(p.label || `参与方 ${i + 1}`);
        const quote = p.quote ? escapeHtml(p.quote) : '';
        return (
          '<button class="picker-btn" data-party="' +
          escapeHtml(p.id) +
          '">' +
          '<span class="picker-label">' +
          label +
          '</span>' +
          (quote ? '<span class="picker-desc">' + quote + '</span>' : '') +
          '</button>'
        );
      })
      .join('');
  } else {
    const dual = analysis && analysis.dualAnalysis;
    const sideA = dual ? dual.sideA : null;
    const sideB = dual ? dual.sideB : null;
    const labelA = escapeHtml(sideA && sideA.label ? sideA.label : '一方');
    const labelB = escapeHtml(sideB && sideB.label ? sideB.label : '另一方');
    btns =
      '<button class="picker-btn" data-party="A"><span class="picker-label">' +
      labelA +
      '</span></button>' +
      '<button class="picker-btn" data-party="B"><span class="picker-label">' +
      labelB +
      '</span></button>';
  }

  const picker = document.createElement('div');
  picker.id = 'role-picker';
  picker.innerHTML = buildRolePickerHTML(btns, participantCount);
  picker.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;background:rgba(0,0,0,.75);display:flex;align-items:center;justify-content:center;padding:20px';

  picker.querySelectorAll('.picker-btn[data-party]').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.currentViewParty = btn.dataset.party;
      picker.remove();
      callback();
    });
  });
  const bothBtn = picker.querySelector('#picker-both-btn');
  if (bothBtn) {
    bothBtn.addEventListener('click', () => {
      state.currentViewParty = 'both';
      picker.remove();
      callback();
    });
  }

  document.body.appendChild(picker);
}

// ============================================================
// 分享
// ============================================================
function setupShare(analysis) {
  state.shareAnalysisRef = analysis;

  if (state.shareBound) return;
  state.shareBound = true;

  const shareBtn = byId('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', async () => {
      const current = state.shareAnalysisRef;
      if (!current) return;
      const parties = current.parties || [];
      const otherParty =
        state.currentViewParty && state.currentViewParty !== 'both'
          ? parties.find((p) => p.id !== state.currentViewParty)
          : parties[1];
      const otherId = otherParty ? otherParty.id : null;

      const shareData = {
        sideB: current.dualAnalysis?.entries?.find((e) => e.party === otherId) || null,
        whatIfB: current.whatIf?.sideBySide?.filter((r) => r.speaker === otherId) || [],
        icebreakerForB: current.icebreakers?.[0],
      };
      const raw = btoa(encodeURIComponent(JSON.stringify(shareData)));
      const encoded = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const url = window.location.origin + '?share=' + encoded;
      try {
        await navigator.clipboard.writeText(url);
        showToast('TA 的链接已复制，可以直接发送给TA');
      } catch (err) {
        console.warn('复制分享链接失败', err);
      }
    });
  }
}

// ============================================================
// 分享链接处理（接收方）
// ============================================================
/**
 * 角色选择器卡片 HTML（纯函数）。
 * btns 与 participantCount 均由调用方已转义/为数字，这里只做结构拼装。
 * @param {string} btns - 已转义的按钮串
 * @param {number} participantCount - 参与者数量
 * @returns {string}
 */
function buildRolePickerHTML(btns, participantCount) {
  return (
    '<div class="picker-card">' +
    '<h2>这段对话中有 ' +
    escapeHtml(participantCount) +
    ' 位参与者</h2>' +
    '<p class="picker-sub">选择你想先看谁的视角</p>' +
    '<div class="picker-options">' +
    btns +
    '</div>' +
    '<button class="picker-btn picker-both" id="picker-both-btn">先看整体结论</button>' +
    '</div>'
  );
}

/**
 * 分享视图顶部提示条 HTML（纯函数，全静态文案）。
 * @returns {string}
 */
function buildSharedBannerHTML() {
  return (
    '<div class="shared-banner">有人委托知间，帮你看看这段对话。</div>' +
    '<p class="shared-intro">这是你的部分。你不会看到对方的信息。</p>'
  );
}

/**
 * 分享视图页脚 CTA HTML（纯函数，全静态文案）。
 * @returns {string}
 */
function buildSharedFooterHTML() {
  return (
    '<div class="shared-cta">' +
    '<p>你也想看看对方是怎么听到你这句话的吗？</p>' +
    '<button class="btn-primary" data-goto="input-screen">上传你的聊天记录</button>' +
    '<p class="shared-cta-hint">双方都上传后，知间可以合成更完整的报告。</p>' +
    '</div>' +
    '<p class="footer-brand">知间 InBetween · 理解人与人之间</p>'
  );
}

function buildSharedViewHTML(data) {
  const sb = data.sideB;
  let columns = '';
  if (sb) {
    columns =
      '<div class="column column-b single-column">' +
      '<div class="column-header">' +
      escapeHtml(sb.label || '你的世界') +
      '</div>' +
      '<div class="layer"><span class="layer-label">你说了</span><p class="layer-said">' +
      escapeHtml(sb.said || '') +
      '</p></div>' +
      '<div class="layer arrow-layer">↓</div>' +
      '<div class="layer"><span class="layer-label">对方可能听到的</span><p class="layer-heard">' +
      escapeHtml(sb.heardAs || sb.heardByA || sb.heardByB || '') +
      '</p></div>' +
      '<div class="layer arrow-layer">↓</div>' +
      '<div class="layer layer-real"><span class="layer-label">你可能真正想说的</span><p>' +
      escapeHtml(sb.realMeaning || '') +
      '</p></div>' +
      '</div>';
  }
  return columns;
}

/**
 * 处理 ?share= 参数（接收方视图）。
 * @returns {boolean} 是否为分享链接
 */
export function handleSharedLink() {
  const params = new URLSearchParams(window.location.search);
  const share = params.get('share');
  if (!share) return false;
  try {
    const fixed = share.replace(/-/g, '+').replace(/_/g, '/');
    const data = JSON.parse(decodeURIComponent(atob(fixed)));
    renderSharedView(data);
    return true;
  } catch {
    return false; // 无效的分享链接，显示正常首页
  }
}

function renderSharedView(data) {
  goTo('report-screen');

  const coreEl = $('#core-insight');
  if (coreEl) {
    coreEl.innerHTML = buildSharedBannerHTML();
  }

  const dualEl = $('#dual-columns');
  if (dualEl) dualEl.innerHTML = buildSharedViewHTML(data);

  $('#share-section')?.classList.add('hidden');
  $('#screen-3')?.classList.add('hidden');
  $('#screen-4')?.classList.add('hidden');

  const footer = $('.report-footer');
  if (footer) {
    footer.innerHTML = buildSharedFooterHTML();
  }
}

// ============================================================
// 初始化
// ============================================================
export function initReport() {
  // 分享链接（接收方）
  handleSharedLink();

  // 切换视角
  document.addEventListener('click', (e) => {
    if (e.target.id !== 'switch-view-btn') return;
    const analysis = state.shareAnalysisRef || {};
    const parties = analysis.parties || [];
    const partyIds = parties.map((p) => p.id);
    partyIds.push('both');
    const idx = partyIds.indexOf(state.currentViewParty || 'both');
    const nextIdx = (idx + 1) % partyIds.length;
    state.currentViewParty = partyIds[nextIdx];
    const nextLabel =
      state.currentViewParty === 'both'
        ? '总览全部'
        : (parties.find((p) => p.id === state.currentViewParty) || {}).label ||
          state.currentViewParty;
    e.target.textContent = `切换视角: ${nextLabel}`;
    const intro = byId('intro-screen');
    if (intro) intro.style.display = 'none';
    renderReport(analysis);
  });

  // 开始新的分析 → 回花园
  const newAnalysisBtn = byId('new-analysis-btn');
  if (newAnalysisBtn) {
    newAnalysisBtn.addEventListener('click', () => {
      state.conversation = '';
      state.ocrText = '';
      const textInput = byId('text-input');
      if (textInput) textInput.value = '';
      const analyzeBtn = byId('analyze-btn');
      if (analyzeBtn) analyzeBtn.disabled = true;
      const inputHint = byId('input-hint');
      if (inputHint) {
        inputHint.textContent = '请输入至少 5 条对话';
        inputHint.style.color = '#94a3b8';
      }
      goTo('garden-screen');
    });
  }

  // 注册引导
  const teaserLink = byId('register-teaser-link');
  if (teaserLink) {
    teaserLink.addEventListener('click', (e) => {
      e.preventDefault();
      showToast('账号功能即将上线，敬请期待！');
    });
  }

  // 分析完成（由 input.js 派发）→ 弹出角色选择，选择后渲染报告
  document.addEventListener('analysis-ready', (e) => {
    const analysis = e.detail && e.detail.analysis;
    if (!analysis) return;
    state.lastClickX = window.innerWidth / 2;
    showRolePicker(analysis, () => {
      renderReport(analysis);
      goTo('report-screen');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
