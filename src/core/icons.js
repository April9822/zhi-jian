// src/core/icons.js —— 17 枚彩色负空间图标（Single Source of Truth）
//
// SVG path 数据照搬自《知间UI改版效果图v4.html》第 195–290 行，
// 颜色保留 v4 原文的 fill / stroke 值（暖色系 2–3 色 + 米白镂空）。
// 统一 viewBox="0 0 24 24"，含锁孔/气泡/叶脉/眼睛/胶囊/心形/年轮等负空间处理。
// 本文件为纯数据 + 纯函数，零 DOM 依赖。

const ICONS = Object.freeze({
  chat:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 5h13a2.4 2.4 0 0 1 2.4 2.4v6.2A2.4 2.4 0 0 1 18 16h-5l-3.4 2.6V16H5A2.4 2.4 0 0 1 2.6 13.6V7.4A2.4 2.4 0 0 1 5 5Z" fill="#FBD9CD"/><circle cx="9" cy="10" r="1.6" fill="#FFFDFA"/><circle cx="14" cy="10" r="1.6" fill="#FFFDFA"/><path d="M9.6 13c.9.9 3 .9 3.8 0" stroke="#F2A085" stroke-width="1.4" stroke-linecap="round" fill="none"/></svg>',
  report:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4.5" y="3.5" width="15" height="17" rx="3" fill="#FFFDFA" stroke="#C98E63" stroke-width="1.6"/><path d="M8 15.5l2.6-3 2 2.2L16 10.5" stroke="#F2A085" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="16" cy="10.5" r="2" fill="#AECBA3"/><circle cx="16" cy="10.5" r=".9" fill="#FFFDFA"/><path d="M8 7.2h5.5" stroke="#E0A878" stroke-width="1.6" stroke-linecap="round"/></svg>',
  growth:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5c0-4 0-6.5-2.4-9C7.2 9 5 9 5 9s.2 3.4 2.6 5.4C9.4 15.8 12 16.5 12 20.5Z" fill="#AECBA3"/><path d="M12 20.5c0-4 0-6.5 2.4-9 2.4-2.5 4.6-2.5 4.6-2.5s-.2 3.4-2.6 5.4C16.6 15.8 14 16.5 14 20.5Z" fill="#8FB486"/><path d="M12 20.5v-9" stroke="#C98E63" stroke-width="1.5" stroke-linecap="round"/><circle cx="12" cy="11.5" r="1.5" fill="#FFFDFA"/><circle cx="17.4" cy="6.4" r="1.7" fill="#F2A085"/></svg>',
  insight:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5a6 6 0 0 0-3.6 10.8c.5.4.8 1 .8 1.6V17h5.6v-1.1c0-.6.3-1.2.8-1.6A6 6 0 0 0 12 3.5Z" fill="#F4B58F"/><path d="M9.4 20h5.2" stroke="#C98E63" stroke-width="1.6" stroke-linecap="round"/><path d="M12 7v4" stroke="#FFFDFA" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="13" r="1.4" fill="#FFFDFA"/></svg>',
  space:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 11 12 5l8 6v8.5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" fill="#F8C3A6"/><path d="M4 11 12 5l8 6" stroke="#C98E63" stroke-width="1.6" stroke-linejoin="round" fill="none"/><rect x="9.6" y="13" width="4.8" height="5.5" rx="1.2" fill="#FFFDFA"/><path d="M10.4 16.2h3.2" stroke="#AECBA3" stroke-width="1.5" stroke-linecap="round"/></svg>',
  track:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 18c3-5 5-5 8 0s5 5 8 0" stroke="#F2A085" stroke-width="1.8" stroke-linecap="round" fill="none"/><circle cx="6.5" cy="16.5" r="2" fill="#E0A878"/><circle cx="6.5" cy="16.5" r=".8" fill="#FFFDFA"/><circle cx="12" cy="18" r="2" fill="#F4B58F"/><circle cx="12" cy="18" r=".8" fill="#FFFDFA"/><circle cx="17.5" cy="16.5" r="2" fill="#AECBA3"/><circle cx="17.5" cy="16.5" r=".8" fill="#FFFDFA"/></svg>',
  profile:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="8.5" r="3.6" fill="#F8C3A6"/><path d="M5.5 19.5c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" fill="#F2A085"/><circle cx="10.6" cy="8.2" r=".95" fill="#FFFDFA"/><circle cx="13.4" cy="8.2" r=".95" fill="#FFFDFA"/></svg>',
  lock:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="4.5" y="10" width="15" height="10.5" rx="3" fill="#E0A878"/><path d="M7.6 10V8a4.4 4.4 0 0 1 8.8 0v2" stroke="#C98E63" stroke-width="1.8" fill="none" stroke-linecap="round"/><circle cx="12" cy="14.3" r="1.7" fill="#FFFDFA"/><path d="M12 14.3v3.2" stroke="#FFFDFA" stroke-width="1.6" stroke-linecap="round"/></svg>',
  screenshot:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3.5" y="5" width="17" height="14" rx="3" fill="#FFFDFA" stroke="#C98E63" stroke-width="1.6"/><circle cx="9" cy="9.5" r="1.6" fill="#F2A085"/><path d="M4 16l4-3.5 3 2.6 4-3.8 5 4.6V17a2 2 0 0 1-2 2H5.5a2 2 0 0 1-2-2Z" fill="#F8C3A6"/><circle cx="15.5" cy="12" r="1.3" fill="#FFFDFA"/><path d="M13 14l2.4-2 2 1.6" stroke="#AECBA3" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
  record:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="9" y="3.5" width="6" height="11" rx="3" fill="#F2A085"/><path d="M12 14.5v3" stroke="#C98E63" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="9" r="1.7" fill="#FFFDFA"/><path d="M7.5 11a4.5 4.5 0 0 0 9 0" stroke="#F4B58F" stroke-width="1.6" fill="none"/><path d="M5.5 9a7 7 0 0 0 14 0" stroke="#AECBA3" stroke-width="1.6" fill="none"/></svg>',
  understand:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 12C5.5 8 8.5 6 12 6s6.5 2 8.5 6c-2 4-5 6-8.5 6S5.5 16 3.5 12Z" fill="#F2A085"/><circle cx="12" cy="12" r="3.2" fill="#FFFDFA"/><circle cx="12" cy="12" r="1.4" fill="#8FB486"/></svg>',
  change:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 9h10.5l-2.2-2.2" stroke="#F2A085" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M19 15H8.5l2.2 2.2" stroke="#AECBA3" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="5" cy="9" r="1.9" fill="#F4B58F"/><circle cx="5" cy="9" r=".8" fill="#FFFDFA"/><circle cx="19" cy="15" r="1.9" fill="#8FB486"/><circle cx="19" cy="15" r=".8" fill="#FFFDFA"/></svg>',
  translate:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 5.5h11A2.5 2.5 0 0 1 17.5 8v5.5H6.5A2.5 2.5 0 0 1 4 11Z" fill="#F8C3A6" stroke="#C98E63" stroke-width="1.4"/><path d="M9 14.5c-.6.8-1 1.6-1 2.5M7.4 17h3" stroke="#F2A085" stroke-width="1.5" stroke-linecap="round"/><path d="M9.6 9.4h-2.2M9.6 11.8h-2.2" stroke="#FFFDFA" stroke-width="1.4" stroke-linecap="round"/><path d="M14 9h3.2M15.6 9v5" stroke="#AECBA3" stroke-width="1.5" stroke-linecap="round"/></svg>',
  energy:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3.5c3.4 4 5.4 6.6 5.4 9.4A5.4 5.4 0 0 1 12 18 5.4 5.4 0 0 1 6.6 12.9C6.6 10.1 8.6 7.5 12 3.5Z" fill="#AECBA3"/><path d="M12 8.5c1.6 2 2.4 3.2 2.4 4.6A2.4 2.4 0 0 1 12 15.5 2.4 2.4 0 0 1 9.6 13.1C9.6 11.7 10.4 10.5 12 8.5Z" fill="#F2A085"/><circle cx="12" cy="12" r="1.3" fill="#FFFDFA"/></svg>',
  forms:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="7.5" cy="8" r="3.4" fill="#F2A085"/><circle cx="7.5" cy="8" r="1.3" fill="#FFFDFA"/><path d="M14 5.5c1.8 0 3 1.5 3 3.4 0 1.6-1 2.8-2.4 3.2.8 1.2.6 3-.6 4-1.6 1.3-4 .8-4.8-.8" fill="#AECBA3"/><circle cx="14" cy="8.5" r="1.2" fill="#FFFDFA"/><path d="M16.5 14.5c1.6 0 2.8 1.3 2.8 2.9 0 1.2-.7 2.2-1.8 2.7.6 1 .3 2.4-.8 3-1.4.9-3.2.3-3.9-1" fill="#F8C3A6"/><circle cx="17.6" cy="17" r="1.2" fill="#FFFDFA"/></svg>',
  companion:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 14c-2 0-3.4 1.4-3.4 3.2 0 1.5 1 2.8 2.4 3 .4 1.6 1.9 2.8 3.7 2.8 1.9 0 3.4-1.3 3.7-3 1.4-.2 2.4-1.5 2.4-3 0-1.8-1.4-3.2-3.4-3.2Z" fill="#F7B8A8"/><circle cx="6" cy="17.6" r="1.2" fill="#FFFDFA"/><path d="M19 6c-2 0-3.4 1.4-3.4 3.2 0 1.5 1 2.8 2.4 3 .4 1.6 1.9 2.8 3.7 2.8 1.9 0 3.4-1.3 3.7-3 1.4-.2 2.4-1.5 2.4-3 0-1.8-1.4-3.2-3.4-3.2Z" transform="translate(-2 -1.5)" fill="#F2A085"/><circle cx="17" cy="9.6" r="1.1" fill="#FFFDFA"/></svg>',
  garden:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 20.5v-7" stroke="#C98E63" stroke-width="1.7" stroke-linecap="round"/><circle cx="12" cy="9" r="4.2" fill="#AECBA3"/><circle cx="12" cy="9" r="2" fill="#FFFDFA"/><circle cx="12" cy="9" r=".8" fill="#8FB486"/><path d="M16.5 18.5c2-1.2 2.4-3 2.4-3s-1.8.2-3 1.4M7.5 18.5c-2-1.2-2.4-3-2.4-3s1.8.2 3 1.4" stroke="#F2A085" stroke-width="1.6" stroke-linecap="round" fill="none"/><circle cx="17.5" cy="6.5" r="1.8" fill="#F4B58F"/></svg>',
});

/**
 * 取指定名称的图标 SVG 字符串（供 innerHTML 注入，命名满足 build*HTML 纪律）。
 * @param {string} name - 图标名（chat/report/growth/... 之一）
 * @returns {string} SVG 字符串；未知名称返回空串
 */
export function buildIconHTML(name) {
  return ICONS[name] || '';
}

export { ICONS };
