// tests/utils.test.js —— core/utils.js 单测
// 覆盖 escapeHtml（XSS 防线）与 debounce。showToast 依赖 DOM，不在此覆盖。
import { describe, it, expect, vi } from 'vitest';
import { escapeHtml, debounce } from '../src/core/utils.js';

describe('escapeHtml · XSS 防线', () => {
  it('转义 & < > " \'', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
    expect(escapeHtml("it's")).toBe('it&#39;s');
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('先转 & 再转其它，避免二次转义 (&lt; 不会变成 &amp;lt;)', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('null / undefined → 空串', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });

  it('纯文本原样返回', () => {
    expect(escapeHtml('妈妈说的话')).toBe('妈妈说的话');
  });

  it('数字被 String 化', () => {
    expect(escapeHtml(42)).toBe('42');
  });
});

describe('debounce', () => {
  it('短时间多次调用只执行最后一次', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 100);

    debounced('a');
    debounced('b');
    debounced('c');
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith('c');

    vi.useRealTimers();
  });

  it('超过等待时长后再次调用会重新计时', () => {
    vi.useFakeTimers();
    const fn = vi.fn();
    const debounced = debounce(fn, 50);

    debounced(1);
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledTimes(1);

    debounced(2);
    vi.advanceTimersByTime(60);
    expect(fn).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});
