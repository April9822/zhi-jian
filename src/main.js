/**
 * 知间 InBetween V1.0
 * 前端主逻辑
 */

// ============================================================
// 按钮涟漪效果 + 记录点击位置供页面切换使用
// ============================================================
var lastClickX = window.innerWidth / 2;
var lastClickY = window.innerHeight * 0.85;

document.addEventListener('click', function(e) {
  var btn = e.target.closest('.intro-btn');
  if (!btn) return;

  // 记录点击在屏幕上的位置（供吞没涟漪使用）
  lastClickX = e.clientX;
  lastClickY = e.clientY;

  // 计算涟漪起点（相对按钮）
  var rect = btn.getBoundingClientRect();
  var x = e.clientX - rect.left;
  var y = e.clientY - rect.top;
  var size = Math.max(rect.width, rect.height) * 2.5;

  var ripple = document.createElement('span');
  ripple.className = 'ripple';
  ripple.style.left = x + 'px';
  ripple.style.top = y + 'px';
  ripple.style.width = size + 'px';
  ripple.style.height = size + 'px';

  btn.appendChild(ripple);

  // 动画结束后清理
  ripple.addEventListener('animationend', function() {
    ripple.remove();
  });
});

// ============================================================
// 全局跳转函数
// ============================================================
window.goToInput = function(e) {
  var intro = document.getElementById('intro-screen');
  if (!intro || intro.classList.contains('transitioning')) return;
  intro.classList.add('transitioning');

  var btn = e ? e.target : null;
  var rect = btn ? btn.getBoundingClientRect() : null;
  var cx = rect ? rect.left + rect.width / 2 : lastClickX;
  var cy = rect ? rect.top + rect.height / 2 : lastClickY;

  // 另一个按钮立即透明
  var otherBtn = document.querySelector('.intro-btn.secondary');
  if (otherBtn) {
    otherBtn.style.transition = 'opacity .4s ease';
    otherBtn.style.opacity = '0';
    otherBtn.style.pointerEvents = 'none';
  }

  // 一圈涟漪
  var sw = document.createElement('div');
  sw.className = 'swallower';
  sw.style.left = cx + 'px';
  sw.style.top = cy + 'px';
  document.body.appendChild(sw);

  // 文字 + 当前按钮消散
  var s6 = document.querySelector('.s6');
  var allElts = [];
  if (s6) {
    var spans = s6.querySelectorAll('span');
    spans.forEach(function(s) { allElts.push(s); });
  }
  if (btn) allElts.push(btn);
  allElts.forEach(function(el, i) {
    setTimeout(function() {
      el.style.transition = 'opacity 1s ease, filter 1s ease';
      el.style.opacity = '0';
      el.style.filter = 'blur(2px)';
    }, i * 90);
  });

  // 涟漪扩散
  setTimeout(function() {
    requestAnimationFrame(function() {
      sw.classList.add('expand');
    });
  }, 300);

  // 涟漪盖满全屏（~2.5s，opacity=1）后页面切换
  setTimeout(function() {
    intro.style.display = 'none';
    intro.classList.remove('active', 'transitioning');
    document.body.style.background = '#F8F6F2';
    document.body.style.color = '#2B2B2B';
    document.body.style.overflow = 'hidden';
    var input = document.getElementById('input-screen');
    input.classList.add('active');
    window.scrollTo({ top: 0 });
  }, 2500);

  setTimeout(function() {
    if (sw.parentNode) sw.remove();
  }, 5000);
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
window.goToSpace = function(e) {
  var intro = document.getElementById('intro-screen');
  if (!intro || intro.classList.contains('transitioning')) return;
  intro.classList.add('transitioning');

  var btn = e ? e.target : null;
  var rect = btn ? btn.getBoundingClientRect() : null;
  var cx = rect ? rect.left + rect.width / 2 : lastClickX;
  var cy = rect ? rect.top + rect.height / 2 : lastClickY;

  var otherBtn = document.querySelector('.intro-btn.primary');
  if (otherBtn) {
    otherBtn.style.transition = 'opacity .4s ease';
    otherBtn.style.opacity = '0';
    otherBtn.style.pointerEvents = 'none';
  }

  var sw = document.createElement('div');
  sw.className = 'swallower';
  sw.style.left = cx + 'px';
  sw.style.top = cy + 'px';
  document.body.appendChild(sw);

  var s6 = document.querySelector('.s6');
  var allElts = [];
  if (s6) {
    var spans = s6.querySelectorAll('span');
    spans.forEach(function(s) { allElts.push(s); });
  }
  if (btn) allElts.push(btn);
  allElts.forEach(function(el, i) {
    setTimeout(function() {
      el.style.transition = 'opacity 1s ease, filter 1s ease';
      el.style.opacity = '0';
      el.style.filter = 'blur(2px)';
    }, i * 90);
  });

  setTimeout(function() {
    requestAnimationFrame(function() {
      sw.classList.add('expand');
    });
  }, 300);

  setTimeout(function() {
    intro.style.display = 'none';
    intro.classList.remove('active', 'transitioning');
    document.body.style.background = '#F8EBDD';
    document.body.style.color = '#3D332C';
    document.body.style.overflow = 'hidden';
    document.getElementById('space-screen').classList.add('active');
    window.scrollTo({ top: 0 });
  }, 2500);

  setTimeout(function() {
    if (sw.parentNode) sw.remove();
  }, 5000);
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
// 🏡 暮光暖庭 — 午后阳光 + 光雾 + 微尘 + 关系连接曲线
// ============================================================
(function(){
  var wc = document.getElementById('warmCanvas');
  if (!wc) return;
  var ctx2 = wc.getContext('2d');
  var W2 = innerWidth, H2 = innerHeight;
  wc.width = W2; wc.height = H2;
  addEventListener('resize', function(){ W2 = wc.width = innerWidth; H2 = wc.height = innerHeight; });

  // 阳光微尘
  var dust = [];
  for (var i = 0; i < 25; i++) {
    dust.push({
      x: Math.random() * W2, y: Math.random() * H2,
      ox: Math.random() * W2, oy: Math.random() * H2,
      r: 0.8 + Math.random() * 2.2,
      b: 0.06 + Math.random() * 0.18,
      sp: 0.2 + Math.random() * 0.6,
      ph: Math.random() * 6.28
    });
  }

  function renderWarm(ts) {
    var ms = ts * 0.001;
    ctx2.clearRect(0, 0, W2, H2);

    // 基底渐变：暖米 → 蜜桃 → 暖琥珀
    var bgGrad = ctx2.createLinearGradient(0, 0, 0, H2);
    bgGrad.addColorStop(0, '#F8EBDD');
    bgGrad.addColorStop(0.45, '#F4D8B8');
    bgGrad.addColorStop(0.75, '#ECCA9F');
    bgGrad.addColorStop(1, '#E3BD88');
    ctx2.fillStyle = bgGrad;
    ctx2.fillRect(0, 0, W2, H2);

    // 光雾层 — 阳光穿过窗帘，下午暖光
    var hazeBreathe = 1 + Math.sin(ms * 0.12) * 0.2;
    var hazeX = W2 * 0.55 + Math.sin(ms * 0.04) * W2 * 0.2;
    var hazeY = H2 * 0.15 + Math.sin(ms * 0.05) * H2 * 0.12;
    var haze = ctx2.createRadialGradient(hazeX, hazeY, 0, hazeX, hazeY, Math.max(W2, H2) * 1.1 * hazeBreathe);
    haze.addColorStop(0, 'rgba(250,210,150,0.28)');
    haze.addColorStop(0.3, 'rgba(245,195,135,0.14)');
    haze.addColorStop(0.65, 'rgba(235,170,110,0.04)');
    haze.addColorStop(1, 'rgba(220,150,90,0)');
    ctx2.fillStyle = haze;
    ctx2.fillRect(0, 0, W2, H2);

    // 第二层光雾 — 右上角暖光
    var haze2X = W2 * 0.72 + Math.sin(ms * 0.06) * W2 * 0.12;
    var haze2Y = H2 * 0.08;
    var haze2 = ctx2.createRadialGradient(haze2X, haze2Y, 0, haze2X, haze2Y, Math.max(W2, H2) * 0.75);
    haze2.addColorStop(0, 'rgba(252,220,172,0.2)');
    haze2.addColorStop(1, 'rgba(240,180,120,0)');
    ctx2.fillStyle = haze2;
    ctx2.fillRect(0, 0, W2, H2);

    // 阳光微尘
    dust.forEach(function(d) {
      d.x = d.ox + Math.sin(ms * d.sp + d.ph) * 25;
      d.y = d.oy + Math.cos(ms * d.sp * 0.6 + d.ph) * 15 - ms * 0.01;
      if (d.y < -20) { d.y = H2 + 20; d.oy = H2 + 20; d.ox = Math.random() * W2; }
      if (d.y > H2 + 20) { d.y = -20; d.oy = -20; }
      var a = d.b + Math.sin(ms * 0.7 + d.ph) * 0.05;
      var g = ctx2.createRadialGradient(d.x, d.y, 0, d.x, d.y, d.r * 2.5);
      g.addColorStop(0, 'rgba(217,166,106,' + Math.max(0.02, a) + ')');
      g.addColorStop(1, 'rgba(200,150,90,0)');
      ctx2.beginPath(); ctx2.arc(d.x, d.y, d.r * 2.5, 0, 6.28); ctx2.fillStyle = g; ctx2.fill();
    });

    // 关系连接曲线 — 极淡，代表"人与人之间"
    ctx2.strokeStyle = 'rgba(216,168,120,0.06)';
    ctx2.lineWidth = 1.5;
    for (var k = 0; k < 3; k++) {
      ctx2.beginPath();
      var cx1 = W2 * (0.25 + k * 0.2);
      var cy1 = H2 * (0.55 + Math.sin(ms * 0.03 + k) * 0.25);
      var cx2 = W2 * (0.45 + k * 0.15);
      var cy2 = H2 * (0.35 + Math.cos(ms * 0.04 + k) * 0.2);
      ctx2.moveTo(cx1, cy1);
      ctx2.quadraticCurveTo(
        W2 * (0.4 + k * 0.1),
        H2 * (0.45 + Math.sin(ms * 0.035 + k) * 0.15),
        cx2, cy2
      );
      ctx2.stroke();
    }

    requestAnimationFrame(renderWarm);
  }
  requestAnimationFrame(renderWarm);
})();

// ============================================================
// Canvas 星空 — 呼吸感闪烁 + 固定星 + 漂浮星
// ============================================================
(function(){
  var c=document.getElementById("starCanvas");
  if(!c)return;
  var x=c.getContext("2d"),W=innerWidth,H=innerHeight;
  c.width=W;c.height=H;
  addEventListener("resize",function(){W=c.width=innerWidth;H=c.height=innerHeight});

  var coolColors = [
    {r:210,g:215,b:255},
    {r:190,g:200,b:250},
    {r:230,g:235,b:255},
  ];
  var warmColors = [
    {r:255,g:230,b:200},
    {r:255,g:220,b:180},
  ];

  var S=[];
  // 固定星星：只在原位闪烁，均匀分布全屏
  for(var i=0;i<24;i++){
    var isWarm = Math.random() < 0.2;
    var palette = isWarm ? warmColors : coolColors;
    var color = palette[Math.floor(Math.random() * palette.length)];
    var fy = Math.random()*H*0.88;
    S.push({
      type:'fixed',
      x:Math.random()*W,
      y:fy,
      r:0.3+Math.random()*2.2,
      b:0.04+Math.random()*0.28,
      p:Math.random()*6.28,
      sp:0.15+Math.random()*0.5,
      sa:0.05+Math.random()*0.18,
      color:color,
      ox:Math.random()*W,
      oy:fy  // 正确存储初始 Y 坐标
    });
  }
  // 漂浮星星：上下缓慢浮动，均匀分布全屏
  for(var j=0;j<16;j++){
    var isWarm2 = Math.random() < 0.25;
    var palette2 = isWarm2 ? warmColors : coolColors;
    var color2 = palette2[Math.floor(Math.random() * palette2.length)];
    var fy2 = Math.random()*H*0.85;
    var fx2 = Math.random()*W;
    S.push({
      type:'floating',
      x:fx2,
      y:fy2,
      ox:fx2,
      oy:fy2,
      r:0.4+Math.random()*2.0,
      b:0.04+Math.random()*0.25,
      p:Math.random()*6.28,
      sp:0.12+Math.random()*0.4,
      sa:0.05+Math.random()*0.15,
      color:color2,
      floatAmp:15+Math.random()*40,
      floatSp:0.08+Math.random()*0.2,
      floatPhase:Math.random()*6.28
    });
  }

  function D(t){
    x.clearRect(0,0,W,H);
    var ms = t * 0.001;
    S.forEach(function(s){
      var a = Math.max(0.02, s.b + Math.sin(ms * s.sp + s.p) * s.sa);

      if (s.type === 'floating') {
        // 上下缓慢浮动
        s.y = s.oy + Math.sin(ms * s.floatSp + s.floatPhase) * s.floatAmp;
        s.x = s.ox + Math.cos(ms * s.floatSp * 0.6 + s.floatPhase) * s.floatAmp * 0.3;
        // 边界回卷
        if (s.y < -20) s.y = H + 20;
        if (s.y > H + 20) s.y = -20;
      } else {
        // 固定星星：极微弱的呼吸位移
        s.y = s.oy + Math.sin(ms * 0.08 + s.p) * 0.5;
      }

      // 光晕
      var g = x.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 4);
      g.addColorStop(0, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+','+Math.min(0.8, a)+')');
      g.addColorStop(0.4, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+','+Math.max(0, a*0.35)+')');
      g.addColorStop(1, 'rgba('+s.color.r+','+s.color.g+','+s.color.b+',0)');
      x.beginPath();x.arc(s.x, s.y, s.r * 5, 0, 6.28);x.fillStyle=g;x.fill();

      // 核心
      x.beginPath();x.arc(s.x, s.y, s.r * 0.6, 0, 6.28);
      x.fillStyle = 'rgba(255,255,255,'+Math.min(0.7, a*1.2)+')';
      x.fill();
    });
    requestAnimationFrame(D);
  }
  requestAnimationFrame(D);
})();
