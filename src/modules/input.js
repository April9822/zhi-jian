// src/modules/input.js —— 输入页（Tab/上传/按钮态/分析发起）
// 注意：input.js 完全不参与关系账本写入，只负责 fetch + 跳转。
import { state } from '../core/state.js';
import { $, $$, byId } from '../core/dom.js';
import { showToast } from '../core/utils.js';
import { goTo } from '../core/router.js';

/** 加载动画定时器（模块内部状态，不进 state） */
let loadingTimer = null;
let loadingWarmTimer = null;
let loadingStopped = false;

/** 更新分析按钮可用态 */
export function updateAnalyzeButton() {
  const analyzeBtn = byId('analyze-btn');
  const inputHint = byId('input-hint');
  if (!analyzeBtn || !inputHint) return;

  const text = state.inputMode === 'paste' ? state.conversation || '' : state.ocrText || '';
  const lines = text.split('\n').filter((l) => l.trim().length > 0);

  if (text.includes('[OCR') || text.includes('[截图已上传]')) {
    analyzeBtn.disabled = true;
    inputHint.textContent = '请切换到「粘贴对话」输入文字内容';
    inputHint.style.color = '#fbbf24';
    return;
  }

  if (lines.length >= 5) {
    analyzeBtn.disabled = false;
    inputHint.textContent = `检测到 ${lines.length} 条对话，可以开始分析`;
    inputHint.style.color = '#4ade80';
  } else if (lines.length >= 1) {
    analyzeBtn.disabled = true;
    inputHint.textContent = `还需要至少 ${5 - lines.length} 条对话才能分析`;
    inputHint.style.color = '#fbbf24';
  } else {
    analyzeBtn.disabled = true;
    inputHint.textContent = '请输入至少 5 条对话';
    inputHint.style.color = '#94a3b8';
  }
}

/** 处理图片文件（V1 只提示切回粘贴） */
function handleImageFile(_file) {
  showToast('截图OCR功能V1.1上线。请切换到「粘贴对话」使用文字输入');
  state.inputMode = 'paste';
  const tabs = $$('.tab');
  const tabContents = $$('.tab-content');
  tabs.forEach((t) => t.classList.remove('active'));
  if (tabs[0]) tabs[0].classList.add('active');
  tabContents.forEach((c) => c.classList.remove('active'));
  $('#tab-paste')?.classList.add('active');
  byId('text-input')?.focus();
}

// ============================================================
// 加载动画 — 逐段浮现→停留→消失→下一段
// ============================================================
function startLoadingMessages() {
  loadingStopped = false;
  const msgs = [$('#lm1'), $('#lm2'), $('#lm3'), $('#lm4')];
  msgs.forEach((el) => {
    if (el) {
      el.style.opacity = '0';
      el.style.transition = 'opacity .6s ease';
    }
  });

  // 8 秒后背景变暖 —— 暗示用户「快好了」
  loadingWarmTimer = setTimeout(() => {
    if (!loadingStopped) {
      byId('loading-screen')?.classList.add('warm');
    }
  }, 8000);

  let idx = 0;
  function playNext() {
    if (loadingStopped || idx >= msgs.length) return;
    const el = msgs[idx];
    if (!el) return;

    requestAnimationFrame(() => {
      el.style.opacity = '1';
    });

    setTimeout(() => {
      if (loadingStopped) return;
      el.style.opacity = '0';
      idx += 1;
      setTimeout(() => playNext(), 600);
    }, 2500);
  }

  playNext();

  // 如果分析还没完成，循环播放
  loadingTimer = setTimeout(function loopAll() {
    if (loadingStopped) return;
    idx = 0;
    playNext();
    loadingTimer = setTimeout(loopAll, msgs.length * 3100 + 1000);
  }, msgs.length * 3100 + 1500);
}

function stopLoadingMessages() {
  loadingStopped = true;
  if (loadingTimer) {
    clearTimeout(loadingTimer);
    loadingTimer = null;
  }
  if (loadingWarmTimer) {
    clearTimeout(loadingWarmTimer);
    loadingWarmTimer = null;
  }
  byId('loading-screen')?.classList.remove('warm');
}

/**
 * 发起分析：调 API + 跳 loading → report。
 * 本函数不写入任何关系账本；写入由 report.js 的 renderReport() 负责。
 */
export async function startAnalysis() {
  const conversation = state.conversation || state.ocrText || '';
  if (!conversation || conversation.length < 10) {
    showToast('请先输入对话内容');
    return;
  }

  // 切换到加载状态 + 启动思考动画
  goTo('loading-screen');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  startLoadingMessages();

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);

  try {
    const response = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversation,
        userRole: 'auto',
      }),
      signal: controller.signal,
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || '分析失败');
    }

    stopLoadingMessages();
    // 解耦：不 import report.js（modules 间零 import）。
    // 把分析结果挂到 navigate 事件的 detail 上，report.js 监听 'analysis-ready' 自行接管。
    document.dispatchEvent(
      new CustomEvent('analysis-ready', { detail: { analysis: data.analysis } })
    );
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch (err) {
    stopLoadingMessages();
    goTo('input-screen');
    const message = err.name === 'AbortError' ? '分析超时，请缩短对话后重试' : err.message;
    showToast(`分析失败：${message}`);
    console.error('分析错误：', err);
  } finally {
    clearTimeout(timeoutId);
  }
}

/** 初始化输入页：Tab/上传/按钮事件绑定 */
export function initInput() {
  const tabs = $$('.tab');
  const tabContents = $$('.tab-content');
  const textInput = byId('text-input');
  const dropZone = byId('drop-zone');
  const imageInput = byId('image-input');
  const uploadBtn = byId('upload-btn');
  const analyzeBtn = byId('analyze-btn');

  // Tab 切换
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.tab;
      state.inputMode = target;

      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');

      tabContents.forEach((c) => c.classList.remove('active'));
      if (target === 'paste') {
        $('#tab-paste')?.classList.add('active');
      } else if (target === 'audio') {
        $('#tab-audio')?.classList.add('active');
      } else {
        $('#tab-image')?.classList.add('active');
      }

      updateAnalyzeButton();
    });
  });

  // 图片上传
  if (uploadBtn && imageInput) {
    uploadBtn.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) handleImageFile(file);
    });
  }

  // 拖拽上传
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('dragover');
    });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleImageFile(file);
      }
    });
  }

  // 文字输入监听
  if (textInput) {
    textInput.addEventListener('input', () => {
      state.conversation = textInput.value.trim();
      updateAnalyzeButton();
    });
  }

  // 分析按钮
  if (analyzeBtn) {
    analyzeBtn.addEventListener('click', startAnalysis);
  }
}
