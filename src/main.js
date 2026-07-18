/**
 * 知间 InBetween V1.0
 * 前端主逻辑
 */

// ============================================================
// 全局跳转函数
// ============================================================
window.goToInput = function() {
  var intro = document.getElementById('intro-screen');
  if (!intro || intro.classList.contains('fade-out')) return;

  // 路灯扩散光
  var glow = document.createElement('div');
  glow.className = 'lamp-glow';
  document.body.appendChild(glow);

  // 文字逐个消散（像写在空气中化开）
  var s6 = document.querySelector('.s6');
  if (s6) {
    var elts = s6.querySelectorAll('span, .scene-buttons');
    elts.forEach(function(el, i) {
      setTimeout(function() {
        el.style.transition = 'opacity 1.2s ease, filter 1.2s ease';
        el.style.opacity = '0';
        el.style.filter = 'blur(4px)';
      }, i * 80);
    });
  }

  // 光晕扩散
  setTimeout(function() { glow.classList.add('spread'); }, 100);

  // 背景渐变照亮
  setTimeout(function() {
    if (bg) { bg.style.transition = 'background 2s ease'; bg.style.background = '#F8F6F2'; }
    document.body.style.color = '#2B2B2B';
  }, 500);

  // 切换页面
  setTimeout(function() {
    intro.style.display = 'none';
    intro.classList.remove('active');
    document.getElementById('input-screen').classList.add('active');
    window.scrollTo({ top: 0 });
    setTimeout(function() { if (glow) glow.remove(); }, 1000);
  }, 1500);
};

// ============================================================
// 状态管理
// ============================================================
const state = {
  conversation: '',
  userRole: null, // 'A' | 'B' | 'observer' | 'auto'
  ocrText: '',
  inputMode: 'paste', // 'paste' | 'image'
  imageFile: null,
};

// ============================================================
// DOM 引用
// ============================================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
  inputScreen: $('#input-screen'),
  loadingScreen: $('#loading-screen'),
  reportScreen: $('#report-screen'),
  textInput: $('#text-input'),
  dropZone: $('#drop-zone'),
  imageInput: $('#image-input'),
  uploadBtn: $('#upload-btn'),
  ocrPreview: $('#ocr-preview'),
  ocrText: $('#ocr-text'),
  identitySection: $('#identity-section'),
  identityHint: $('#identity-hint'),
  analyzeBtn: $('#analyze-btn'),
  inputHint: $('#input-hint'),
  tabs: $$('.tab'),
  tabContents: $$('.tab-content'),
};

// ============================================================
// Tab 切换
// ============================================================
dom.tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    state.inputMode = target;

    dom.tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    dom.tabContents.forEach((c) => c.classList.remove('active'));
    if (target === 'paste') {
      $('#tab-paste').classList.add('active');
    } else if (target === 'audio') {
      $('#tab-audio').classList.add('active');
    } else {
      $('#tab-image').classList.add('active');
    }

    updateAnalyzeButton();
  });
});

// ============================================================
// 图片上传
// ============================================================
dom.uploadBtn.addEventListener('click', () => dom.imageInput.click());

dom.imageInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) handleImageFile(file);
});

// 拖拽上传
dom.dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dom.dropZone.classList.add('dragover');
});

dom.dropZone.addEventListener('dragleave', () => {
  dom.dropZone.classList.remove('dragover');
});

dom.dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dom.dropZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    handleImageFile(file);
  }
});

function handleImageFile(file) {
  showToast('📸 截图OCR功能V1.1上线。请切换到「粘贴对话」使用文字输入');
  // 自动切回粘贴 tab
  state.inputMode = 'paste';
  dom.tabs.forEach(t => t.classList.remove('active'));
  dom.tabs[0].classList.add('active');
  dom.tabContents.forEach(c => c.classList.remove('active'));
  $('#tab-paste').classList.add('active');
  dom.textInput.focus();
}

// ============================================================
// 文字输入监听
// ============================================================
dom.textInput.addEventListener('input', () => {
  state.conversation = dom.textInput.value.trim();
  updateAnalyzeButton();
  updateIdentitySection();
});

// OCR 文字变化也监听
if (dom.ocrText) {
  dom.ocrText.addEventListener('input', () => {
    state.ocrText = dom.ocrText.value.trim();
    updateAnalyzeButton();
    updateIdentitySection();
  });
}

function updateIdentitySection() {
  const text = state.inputMode === 'paste' ? (state.conversation || '') : (state.ocrText || '');
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  if (lines.length >= 3) {
    dom.identitySection.classList.remove('hidden');
  } else {
    dom.identitySection.classList.add('hidden');
  }
}

function updateAnalyzeButton() {
  const text = state.inputMode === 'paste' ? (state.conversation || '') : (state.ocrText || '');
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  if (text.includes('[OCR') || text.includes('[截图已上传]')) {
    // OCR placeholder text - don't count
    dom.analyzeBtn.disabled = true;
    dom.inputHint.textContent = '请切换到「粘贴对话」输入文字内容';
    dom.inputHint.style.color = '#fbbf24';
    return;
  }

  if (lines.length >= 5) {
    dom.analyzeBtn.disabled = false;
    dom.inputHint.textContent = `检测到 ${lines.length} 条对话，可以开始分析`;
    dom.inputHint.style.color = '#4ade80';
  } else if (lines.length >= 1) {
    dom.analyzeBtn.disabled = true;
    dom.inputHint.textContent = `还需要至少 ${5 - lines.length} 条对话才能分析`;
    dom.inputHint.style.color = '#fbbf24';
  } else {
    dom.analyzeBtn.disabled = true;
    dom.inputHint.textContent = '请输入至少 5 条对话';
    dom.inputHint.style.color = '#94a3b8';
  }
}

// ============================================================
// 身份标注
// ============================================================
$$('.identity-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.identity-btn').forEach((b) => b.classList.remove('selected'));
    btn.classList.add('selected');
    state.userRole = btn.dataset.role;

    const labels = { A: '你是对话中更主动的一方', B: '你是对话中回应和防御更多的一方', auto: 'AI 正在分析对话角色...' };
    dom.identityHint.textContent = labels[state.userRole] || '';
  });
});

// ============================================================
// 开始分析
// ============================================================
dom.analyzeBtn.addEventListener('click', startAnalysis);

async function startAnalysis() {
  const conversation = state.conversation || (dom.ocrText ? dom.ocrText.value.trim() : '');
  if (!conversation || conversation.length < 10) {
    showToast('请先输入对话内容');
    return;
  }

  // 切换到加载状态 + 启动思考动画
  dom.inputScreen.classList.remove('active');
  dom.loadingScreen.classList.add('active');
  dom.reportScreen.classList.remove('active');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  startLoadingMessages();

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation,
        userRole: state.userRole || 'auto',
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '分析失败');
    }

    stopLoadingMessages();
    dom.loadingScreen.classList.remove('active');
    // 显示角色选择
    showRolePicker(data.analysis, function() {
      renderReport(data.analysis);
      dom.reportScreen.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });

  } catch (err) {
    dom.loadingScreen.classList.remove('active');
      stopLoadingMessages();
    dom.inputScreen.classList.add('active');
    showToast(`分析失败：${err.message}`);
    console.error('分析错误：', err);
  }
}

// ============================================================
// 渲染报告
// ============================================================
function renderReport(analysis) {
  renderCoreInsight(analysis.coreInsight);
  renderResponsibilityRatio(analysis.responsibilityRatio);
  renderDualColumns(analysis.dualAnalysis);
  renderReplay(analysis.replay);
  renderWhatIf(analysis.whatIf);
  renderEmotionAnalysis(analysis.emotionAnalysis);
  renderEmotionRelief(analysis.emotionRelief);
  renderIcebreakers(analysis.icebreakers, analysis.behavioralNotes);
  setupShare(analysis);
}

function renderCoreInsight(insight) {
  if (!insight) return;
  $('#core-insight').innerHTML = `
    <div class="insight-tag">${insight.conflictType || ''}</div>
    <h3 class="insight-title">🧠 ${insight.title || ''}</h3>
    <p class="insight-summary">${insight.summary || ''}</p>
    <div class="insight-real-topic">
      <span class="label">表面上在吵：</span>
      <span>${insight.realTopic || ''}</span>
    </div>
  `;
}

// ============================================================
// 🆕 冲突贡献度
// ============================================================
function renderResponsibilityRatio(ratio) {
  if (!ratio) return;
  const a = ratio.sideA || 50;
  const b = ratio.sideB || 50;
  $('#screen-responsibility').classList.remove('hidden');
  $('#responsibility-container').innerHTML = `
    <div class="ratio-bar-wrap">
      <div class="ratio-side">
        <span class="ratio-label">👤 A</span>
        <div class="ratio-bar-bg"><div class="ratio-bar-fill a" style="width:${a}%"></div></div>
        <span class="ratio-pct">${a}%</span>
        <p class="ratio-reason">${ratio.reasonA || ''}</p>
      </div>
      <div class="ratio-side">
        <span class="ratio-label">👤 B</span>
        <div class="ratio-bar-bg"><div class="ratio-bar-fill b" style="width:${b}%"></div></div>
        <span class="ratio-pct">${b}%</span>
        <p class="ratio-reason">${ratio.reasonB || ''}</p>
      </div>
    </div>
    <p class="ratio-note">${ratio.note || ''}</p>
  `;
}

// ============================================================
// 双向双栏（增强视觉区分）
// ============================================================
function renderDualColumns(dual) {
  if (!dual) return;
  const { sideA, sideB, gap } = dual;

  $('#dual-columns').innerHTML = `
    <div class="column column-a">
      <div class="column-header">🟠 ${sideA?.label || 'A'} 的世界</div>
      <div class="layer"><span class="layer-label">💬 说了</span><p class="layer-said">${sideA?.said || ''}</p></div>
      <div class="layer arrow-layer">⬇ 对方听到的</div>
      <div class="layer"><p class="layer-heard">${sideA?.heardByB || ''}</p></div>
      <div class="layer arrow-layer">⬇ 内心活动</div>
      <div class="layer"><p class="layer-inner">${sideA?.innerVoice || ''}</p></div>
      <div class="layer arrow-layer">⬇</div>
      <div class="layer layer-real"><span class="layer-label">❤️ 真正想说的</span><p>${sideA?.realMeaning || ''}</p></div>
    </div>
    <div class="column column-b">
      <div class="column-header">🔵 ${sideB?.label || 'B'} 的世界</div>
      <div class="layer"><span class="layer-label">💬 说了</span><p class="layer-said">${sideB?.said || ''}</p></div>
      <div class="layer arrow-layer">⬇ 对方听到的</div>
      <div class="layer"><p class="layer-heard">${sideB?.heardByA || ''}</p></div>
      <div class="layer arrow-layer">⬇ 内心活动</div>
      <div class="layer"><p class="layer-inner">${sideB?.innerVoice || ''}</p></div>
      <div class="layer arrow-layer">⬇</div>
      <div class="layer layer-real"><span class="layer-label">❤️ 真正想说的</span><p>${sideB?.realMeaning || ''}</p></div>
    </div>
  `;

  $('#gap-annotation').innerHTML = gap ? `
    <div class="gap-card">
      <div class="gap-icon">🔍</div>
      <p>${gap}</p>
    </div>
  ` : '';
}

// ============================================================
// 对话回放（纯心理分析 + 隐藏需求）
// ============================================================
function renderReplay(replayList) {
  if (!replayList || !Array.isArray(replayList)) return;

  const html = replayList.map((r) => {
    const turnClass = r.isTurningPoint ? 'replay-item turning-point' : 'replay-item';
    const turnBadge = r.isTurningPoint ? '<span class="turn-badge">⚡ 转折点</span>' : '';

    return `
      <div class="${turnClass}">
        <div class="replay-header">
          <span class="replay-round">第${r.round}句</span>
          <span class="replay-speaker">${r.speaker === 'A' ? '🟠 A' : '🔵 B'}</span>
          ${turnBadge}
        </div>
        <p class="replay-text">${r.text || ''}</p>
        ${r.psychology ? `<div class="replay-psychology">🧠 知间解说：${r.psychology}</div>` : ''}
        ${r.hiddenNeed ? `<div class="replay-need">💎 未说出口的需求：${r.hiddenNeed}</div>` : ''}
      </div>
    `;
  }).join('');

  $('#replay-container').innerHTML = html;
}

// ============================================================
// 如果重来
// ============================================================
function renderWhatIf(whatIf) {
  if (!whatIf) return;

  const sideBySide = whatIf.sideBySide || [];
  const rows = sideBySide.map((row) => `
    <div class="what-if-row">
      <div class="what-if-speaker">${row.speaker === 'A' ? '🟠 A' : '🔵 B'}</div>
      <div class="what-if-original">${row.original || ''}</div>
      <div class="what-if-arrow">→</div>
      <div class="what-if-alt">${row.alternative || ''}</div>
    </div>
  `).join('');

  $('#what-if-container').innerHTML = `
    <div class="what-if-summary">
      <div class="what-if-flow"><span class="flow-label">🔴 现实中</span><p>${whatIf.originalFlow || ''}</p></div>
      <div class="what-if-flow"><span class="flow-label">🟢 如果重来</span><p>${whatIf.alternativeFlow || ''}</p></div>
    </div>
    <div class="what-if-table">
      <div class="what-if-header"><span>现实中说的</span><span>如果这样说</span></div>
      ${rows}
    </div>
  `;
}

// ============================================================
// 🆕 情绪量化分析
// ============================================================
function renderEmotionAnalysis(emotion) {
  if (!emotion) return;
  $('#screen-emotion').classList.remove('hidden');

  const renderSide = (data, label) => {
    if (!data) return '';
    const dims = [
      { key: 'anxiety', label: '😰 焦虑', color: '#f59e0b' },
      { key: 'anger', label: '😤 愤怒', color: '#ef4444' },
      { key: 'sadness', label: '😢 悲伤', color: '#3b82f6' },
      { key: 'hurt', label: '💔 委屈', color: '#8b5cf6' },
      { key: 'exhaustion', label: '😮‍💨 疲惫', color: '#6b7280' },
      { key: 'helplessness', label: '😶 无力感', color: '#94a3b8' },
    ];
    const bars = dims.map(d => `
      <div class="emotion-bar-row">
        <span class="emotion-label">${d.label}</span>
        <div class="emotion-bar-bg"><div class="emotion-bar-fill" style="width:${data[d.key]||0}%;background:${d.color}"></div></div>
        <span class="emotion-score">${data[d.key]||0}</span>
      </div>
    `).join('');
    return `<div class="emotion-card"><h4>${label}</h4>${bars}<p class="emotion-summary">${data.summary||''}</p></div>`;
  };

  $('#emotion-container').innerHTML = `
    <div class="emotion-grid">
      ${renderSide(emotion.sideA, '🟠 A 的情绪画像')}
      ${renderSide(emotion.sideB, '🔵 B 的情绪画像')}
    </div>
  `;
}

// ============================================================
// 🆕 多流派情绪调节建议
// ============================================================
function renderEmotionRelief(relief) {
  if (!relief) return;
  $('#screen-relief').classList.remove('hidden');

  const methods = (relief.forUser || []).map(m => `
    <div class="relief-card">
      <div class="relief-header">
        <span class="relief-method">🌿 ${m.method||''}</span>
        <span class="relief-school">${m.school||''}</span>
      </div>
      <p class="relief-steps">${m.steps||''}</p>
      <p class="relief-why">💡 ${m.whyItHelps||''}</p>
    </div>
  `).join('');

  $('#relief-container').innerHTML = methods;
  if (relief.note) {
    $('#relief-note').textContent = relief.note;
    $('#relief-note').classList.remove('hidden');
  }
}

function renderIcebreakers(icebreakers, notes) {
  if (!icebreakers || !Array.isArray(icebreakers)) return;

  const cards = icebreakers.map((ib) => `
    <div class="icebreaker-card">
      <span class="icebreaker-style">${ib.style || ''}</span>
      <p class="icebreaker-text">${ib.text || ''}</p>
      <button class="btn-copy-icebreaker" data-text="${escapeHtml(ib.text || '')}">📋 复制</button>
    </div>
  `).join('');

  let notesHtml = '';
  if (notes) {
    notesHtml = `
      <div class="behavioral-notes">
        <h3>📋 本次对话行为观察</h3>
        <div class="notes-grid">
          <div class="note-card">
            <span class="note-label">👤 A 的沟通模式</span>
            <p>${notes.sideA || ''}</p>
          </div>
          <div class="note-card">
            <span class="note-label">👤 B 的沟通模式</span>
            <p>${notes.sideB || ''}</p>
          </div>
        </div>
        <p class="note-disclaimer">⚠️ 以上是基于本次对话的行为观察，不代表长期人格。</p>
      </div>
    `;
  }

  $('#icebreaker-container').innerHTML = `
    <div class="icebreaker-cards">${cards}</div>
    ${notesHtml}
  `;

  // 复制按钮事件
  $$('.btn-copy-icebreaker').forEach((btn) => {
    btn.addEventListener('click', () => {
      const text = btn.dataset.text || '';
      navigator.clipboard.writeText(text).then(() => {
        btn.textContent = '✅ 已复制';
        setTimeout(() => { btn.textContent = '📋 复制'; }, 2000);
      });
    });
  });
}

function setupShare(analysis) {
  $('#share-btn').addEventListener('click', () => {
    const shareData = {
      sideB: analysis.dualAnalysis?.sideB,
      whatIfB: analysis.whatIf?.sideBySide?.filter(function(r) { return r.speaker === 'B'; }),
      icebreakerForB: analysis.icebreakers?.[0],
    };
    // URL-safe base64
    const raw = btoa(encodeURIComponent(JSON.stringify(shareData)));
    const encoded = raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    const url = window.location.origin + '?share=' + encoded;
    // 复制
    navigator.clipboard.writeText(url).then(function() {
      showToast('🔗 TA 的链接已复制，可以直接发送给TA');
    });
  });
}

// ============================================================
// 辅助功能
// ============================================================
$('#new-analysis-btn').addEventListener('click', () => {
  state.conversation = '';
  state.userRole = null;
  state.ocrText = '';
  state.imageFile = null;
  dom.textInput.value = '';
  if (dom.ocrText) dom.ocrText.value = ''
  dom.identitySection.classList.add('hidden');
  if (dom.ocrPreview) dom.ocrPreview.classList.add('hidden');
  dom.analyzeBtn.disabled = true;
  dom.inputHint.textContent = '请输入至少 5 条对话';
  dom.inputHint.style.color = '#94a3b8';
  dom.reportScreen.classList.remove('active');
  dom.inputScreen.classList.add('active');
  $$('.identity-btn').forEach((b) => b.classList.remove('selected'));
  $('#share-link-box').classList.add('hidden');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

$('#register-teaser-link').addEventListener('click', (e) => {
  e.preventDefault();
  showToast('📬 账号功能即将上线，敬请期待！');
});

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  toast.classList.add('show');
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ============================================================
// 分享链接处理（接收方）
// ============================================================
function handleSharedLink() {
  const params = new URLSearchParams(window.location.search);
  const share = params.get('share');
  if (share) {
    try {
      var fixed = share.replace(/-/g,"+").replace(/_/g,"/");var data = JSON.parse(decodeURIComponent(atob(fixed)));
      renderSharedView(data);
    } catch (e) {
      // 无效的分享链接，显示正常首页
    }
  }
}

function renderSharedView(data) {
  dom.inputScreen.classList.remove('active');
  dom.reportScreen.classList.add('active');

  $('#core-insight').innerHTML = `
    <div class="shared-banner">🔗 有人委托知间，帮你看看这段对话。</div>
    <p class="shared-intro">这是你的部分。你不会看到对方的信息。</p>
  `;

  // 渲染 TA 那半
  if (data.sideB) {
    const sb = data.sideB;
    $('#dual-columns').innerHTML = `
      <div class="column column-b single-column">
        <div class="column-header">👤 你的世界</div>
        <div class="layer">
          <span class="layer-label">你说了</span>
          <p class="layer-said">${sb.said || ''}</p>
        </div>
        <div class="layer arrow-layer">⬇</div>
        <div class="layer">
          <span class="layer-label">对方可能听到的</span>
          <p class="layer-heard">${sb.heardByA || sb.heardByB || ''}</p>
        </div>
        <div class="layer arrow-layer">⬇</div>
        <div class="layer layer-real">
          <span class="layer-label">❤️ 你可能真正想说的</span>
          <p>${sb.realMeaning || ''}</p>
        </div>
      </div>
    `;
  }

  // 隐藏分享按钮（接收方不需要再分享）
  $('#share-section').classList.add('hidden');
  $('#screen-3').classList.add('hidden');
  $('#screen-4').classList.add('hidden');

  // 底部增加回传入口
  $('.report-footer').innerHTML = `
    <div class="shared-cta">
      <p>你也想看看对方是怎么听到你这句话的吗？</p>
      <button class="btn-primary" onclick="location.href='/'">📤 上传你的聊天记录</button>
      <p class="shared-cta-hint">双方都上传后，知间可以合成更完整的报告。</p>
    </div>
    <p class="footer-brand">知间 InBetween · 理解人与人之间</p>
  `;
}

// ============================================================
// 初始化
// ============================================================
handleSharedLink();

// ============================================================
// 思考动画：渐进式消息
// ============================================================
var loadingTimer = null;
function startLoadingMessages() {
  var msgs = ['#lm1','#lm2','#lm3','#lm4'];
  var idx = 0;
  // 隐藏所有
  msgs.forEach(function(s) { var el = document.querySelector(s); if (el) el.style.opacity = '0'; });
  function showNext() {
    var el = document.querySelector(msgs[idx]);
    if (el) { el.style.transition = 'opacity 1s ease'; el.style.opacity = '1'; }
    idx++;
  }
  showNext();
  loadingTimer = setInterval(function() {
    if (idx < msgs.length) showNext();
  }, 3500);
}
function stopLoadingMessages() {
  if (loadingTimer) { clearInterval(loadingTimer); loadingTimer = null; }
}

// ============================================================
// 知间空间
// ============================================================
window.goToSpace = function() {
  var intro = document.getElementById('intro-screen');
  if (intro) {
    intro.classList.add('fade-out');
    document.body.style.background = '#FFF6E8';
    document.body.style.color = '#2B2B2B';
    setTimeout(function() {
      intro.style.display = 'none';
      intro.classList.remove('active', 'fade-out');
      document.getElementById('space-screen').classList.add('active');
      window.scrollTo({ top: 0 });
    }, 600);
  }
};

// ============================================================
// 粒子生成
// ============================================================

// ============================================================
// 光点随场景移动
// ============================================================

// ============================================================
// 情绪色彩时间轴
// ============================================================

// ============================================================
// 星空 + 背景随场景变化
// ============================================================

// ============================================================
// 角色选择
// ============================================================
function showRolePicker(analysis, callback) {
  var dual = analysis.dualAnalysis;
  var sideA = dual ? dual.sideA : null;
  var sideB = dual ? dual.sideB : null;

  // 创建选择界面
  var picker = document.createElement('div');
  picker.id = 'role-picker';
  picker.innerHTML = '<div class="picker-card">'+
    '<h2>👥 AI 识别到这段对话中有两个人</h2>'+
    '<p class="picker-sub">请选择你更像哪一方，知间会从你的视角展开报告</p>'+
    '<div class="picker-options">'+
      '<button class="picker-btn picker-a">'+
        '<span class="picker-label">🙋 角色 A</span>'+
        '<span class="picker-desc">'+(sideA ? (sideA.realMeaning || sideA.innerVoice || '更主动表达的一方') : '')+'</span>'+
      '</button>'+
      '<button class="picker-btn picker-b">'+
        '<span class="picker-label">💬 角色 B</span>'+
        '<span class="picker-desc">'+(sideB ? (sideB.realMeaning || sideB.innerVoice || '更多回应的一方') : '')+'</span>'+
      '</button>'+
    '</div>'+
    '<button class="picker-btn picker-both" style="margin-top:8px;width:100%;background:transparent;border:1px dashed #ccc;color:#94a3b8;padding:12px;border-radius:12px;font-size:14px">👀 我只是旁观者，都看看</button>'+
  '</div>';
  picker.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;z-index:200;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;padding:20px';
  picker.querySelector('.picker-a').onclick = function(){ picker.remove(); callback(); };
  picker.querySelector('.picker-b').onclick = function(){ picker.remove(); callback(); };
  picker.querySelector('.picker-both').onclick = function(){ picker.remove(); callback(); };
  document.body.appendChild(picker);
}

// ============================================================
// 🌌 连续时间函数天空渲染器
// 颜色随时间连续流动，不可察觉的自然渐变
// ============================================================
(function(){
  var sky = document.getElementById('skyCanvas');
  if (!sky) return;
  var ctx = sky.getContext('2d');
  var W = innerWidth, H = innerHeight;
  sky.width = W; sky.height = H;
  addEventListener('resize', function(){ W = sky.width = innerWidth; H = sky.height = innerHeight; });

  // 颜色插值 (RGB 通道分别 lerp)
  function lerpColor(c1, c2, t) {
    return [
      Math.round(c1[0] + (c2[0] - c1[0]) * t),
      Math.round(c1[1] + (c2[1] - c1[1]) * t),
      Math.round(c1[2] + (c2[2] - c1[2]) * t)
    ];
  }

  // easeInOutCubic
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  // easeInOutSine
  function easeInOutSine(t) {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  // 获取某时刻的天空色 (返回 [topR,topG,topB], [midR,midG,midB], [horizonR,horizonG,horizonB])
  function skyColorsAt(elapsed) {
    var t = Math.min(elapsed, 30); // 0-30秒

    // Phase 1: 0-8s 深夜 → #050816 → #111936
    var p1 = Math.min(Math.max((t - 0) / 8, 0), 1);
    p1 = easeInOutSine(p1);
    var deepNight = [5, 8, 22];
    var lateNight = [17, 25, 54];

    // Phase 2: 8-18s 夜色苏醒 → blue indigo → soft purple gray
    var p2 = Math.min(Math.max((t - 8) / 10, 0), 1);
    p2 = easeInOutCubic(p2);
    var indigoBlue = [25, 30, 65];
    var softPurple = [45, 35, 75];

    // Phase 3: 18-26s 黎明前暖意
    var p3 = Math.min(Math.max((t - 18) / 8, 0), 1);
    p3 = easeInOutCubic(p3);
    var dawnBlue = [60, 55, 90];
    var dawnWarm = [80, 68, 95];

    // Phase 4: 26-30s 稳定黎明前
    var p4 = Math.min(Math.max((t - 26) / 4, 0), 1);
    p4 = easeInOutSine(p4);
    var finalSky = [75, 68, 95];

    var top, mid, horizon;
    if (t < 8) {
      top = lerpColor(deepNight, lateNight, p1);
      mid = top;
      horizon = top;
    } else if (t < 18) {
      top = lerpColor(lateNight, indigoBlue, p2);
      mid = lerpColor(lateNight, softPurple, p2);
      horizon = mid;
    } else if (t < 26) {
      top = lerpColor(indigoBlue, dawnBlue, p3);
      mid = lerpColor(softPurple, dawnBlue, p3);
      horizon = lerpColor(softPurple, dawnWarm, p3);
    } else {
      top = lerpColor(dawnBlue, finalSky, p4);
      mid = lerpColor(dawnBlue, finalSky, p4);
      horizon = lerpColor(dawnWarm, finalSky, p4);
    }

    return { top: top, mid: mid, horizon: horizon };
  }

  // 低频噪声 (让天空有微弱的自然波动)
  function noise(t) {
    return Math.sin(t * 0.05) * 0.02 + Math.sin(t * 0.13) * 0.01;
  }

  var startTime = performance.now() / 1000;
  function renderSky(now) {
    var elapsed = now / 1000 - startTime;
    var colors = skyColorsAt(elapsed);
    var n = noise(elapsed);

    ctx.clearRect(0, 0, W, H);

    // Layer 1: 深空基底
    var g1 = ctx.createLinearGradient(0, 0, 0, H);
    var tR = Math.min(255, Math.max(0, colors.top[0] + Math.round(n * 40)));
    var tG = Math.min(255, Math.max(0, colors.top[1] + Math.round(n * 30)));
    var tB = Math.min(255, Math.max(0, colors.top[2] + Math.round(n * 20)));
    g1.addColorStop(0, 'rgb(' + tR + ',' + tG + ',' + tB + ')');
    g1.addColorStop(0.5, 'rgb(' + colors.mid[0] + ',' + colors.mid[1] + ',' + colors.mid[2] + ')');
    g1.addColorStop(1, 'rgb(' + colors.horizon[0] + ',' + colors.horizon[1] + ',' + colors.horizon[2] + ')');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // Layer 2: 缓慢移动的大气层 (indigo atmosphere)
    if (elapsed > 2) {
      var g2 = ctx.createRadialGradient(
        W * 0.5 + Math.sin(elapsed * 0.02) * W * 0.15, H * 0.6,
        H * 0.1,
        W * 0.5, H * 0.4,
        H * 1.2
      );
      var opacity2 = Math.min(0.25, elapsed / 30 * 0.3);
      g2.addColorStop(0, 'rgba(40,45,90,' + opacity2 + ')');
      g2.addColorStop(1, 'rgba(20,25,60,0)');
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, W, H);
    }

    // Layer 3: 底部暖光 (只在18s后出现)
    if (elapsed > 14) {
      var warmOpacity = Math.min(0.18, Math.max(0, (elapsed - 14) / 16 * 0.18));
      var g3 = ctx.createRadialGradient(
        W * 0.5 + Math.sin(elapsed * 0.03) * W * 0.1, H * 0.85,
        H * 0.02,
        W * 0.5, H * 0.55,
        H * 0.8
      );
      g3.addColorStop(0, 'rgba(180,140,100,' + warmOpacity + ')');
      g3.addColorStop(0.4, 'rgba(140,100,70,' + (warmOpacity * 0.5) + ')');
      g3.addColorStop(1, 'rgba(80,60,50,0)');
      ctx.fillStyle = g3;
      ctx.fillRect(0, 0, W, H);
    }

    requestAnimationFrame(renderSky);
  }

  requestAnimationFrame(renderSky);
})();

// ============================================================
// Canvas 星空 — 闪烁 + 漂浮 + 冷暖双色星星
// ============================================================
(function(){
  var c=document.getElementById("starCanvas");
  if(!c)return;
  var x=c.getContext("2d"),W=innerWidth,H=innerHeight;
  c.width=W;c.height=H;
  addEventListener("resize",function(){W=c.width=innerWidth;H=c.height=innerHeight});

  // 冷暖两种星星颜色
  var coolColors = [
    {r:210,g:215,b:255}, // 冷白偏蓝
    {r:190,g:200,b:250}, // 淡蓝
    {r:230,g:235,b:255}, // 纯冷白
  ];
  var warmColors = [
    {r:255,g:230,b:200}, // 暖白偏黄
    {r:255,g:220,b:180}, // 淡金
    {r:255,g:210,b:170}, // 暖金
  ];

  var S=[];
  for(var i=0;i<70;i++){
    var isWarm = Math.random() < 0.25; // 25% 暖色星星
    var palette = isWarm ? warmColors : coolColors;
    var color = palette[Math.floor(Math.random() * palette.length)];

    S.push({
      x:Math.random()*W,
      y:Math.random()*H*0.8,
      r:0.3+Math.random()*2.8,          // 大小范围更大
      b:0.03+Math.random()*0.35,         // 基础亮度范围更大
      p:Math.random()*6.28,              // 闪烁相位
      sp:0.6+Math.random()*3.5,          // 闪烁速度
      sa:0.08+Math.random()*0.3,         // 闪烁振幅
      dx:(Math.random()-0.5)*0.5,        // 水平漂移
      dy:-0.02-Math.random()*0.25,       // 垂直漂浮速度
      color:color,
      flashTimer:Math.random()*10,       // 偶尔闪亮计时器
      flashChance:0.002+Math.random()*0.006
    });
  }

  function D(t){
    x.clearRect(0,0,W,H);
    var ms = t * 0.001; // 秒为单位
    S.forEach(function(s){
      // 闪烁：正弦波动 + 偶尔爆闪
      var twinkle = Math.sin(ms * s.sp + s.p) * s.sa;
      s.flashTimer += s.flashChance;
      var flash = 0;
      if (s.flashTimer > 1) {
        flash = Math.max(0, 0.6 - (s.flashTimer - 1) * 3); // 快速衰减的爆闪
        if (s.flashTimer > 1.2) s.flashTimer = 0;
      }
      var a = Math.max(0.02, s.b + twinkle + flash);

      // 漂浮移动
      s.x += s.dx * 0.015;
      s.y += s.dy * 0.015;
      if (s.y < -10) { s.y = H * 0.8; s.x = Math.random() * W; }
      if (s.y > H * 0.85) s.y = H * 0.85;
      if (s.x < -5) s.x = W + 5;
      if (s.x > W + 5) s.x = -5;

      // 光晕
      var g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      g.addColorStop(0, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+','+Math.min(1,a)+')');
      g.addColorStop(0.3, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+','+Math.max(0,a*0.5)+')');
      g.addColorStop(1, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+',0)');
      x.beginPath();x.arc(s.x, s.y, s.r * 6, 0, 6.28);x.fillStyle=g;x.fill();

      // 核心亮点
      x.beginPath();x.arc(s.x, s.y, s.r * 0.7, 0, 6.28);
      x.fillStyle = 'rgba(255,255,255,'+Math.min(0.9, a*1.3)+')';
      x.fill();
    });
    requestAnimationFrame(D);
  }
  requestAnimationFrame(D);
})();
