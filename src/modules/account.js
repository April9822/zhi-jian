// src/modules/account.js —— 注册阶段：年龄持久化 + 关系偏好（18 岁门槛）
// 不破坏原有手机号注册主流程：本文件只做「读取并落盘年龄/偏好」，
// 导航仍由 core/router.js 的 [data-goto] 委托负责。
import { byId } from '../core/dom.js';

/** 由生日 ISO 字符串算周岁年龄；非法返回 null */
function computeAge(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age -= 1;
  return age;
}

/**
 * 注册界面初始化：
 *  - 选生日时实时显示年龄，并联动「爱人」选项的可用性（未满 18 禁用）
 *  - 点击「种下我的种子」时把年龄 + 关系偏好落盘（localStorage），随后走原导航
 */
export function initAccount() {
  const birthday = byId('account-birthday');
  const hint = byId('account-age-hint');
  const relation = byId('account-relation');
  const signupBtn = document.querySelector('#account-screen .btn-signup');

  // 选生日时实时显示年龄，并联动爱人选项可用性（未满 18 隐藏爱人小花）
  if (birthday) {
    birthday.addEventListener('input', () => {
      const age = computeAge(birthday.value);
      if (hint) {
        if (age == null) hint.textContent = '';
        else if (age < 0) hint.textContent = '生日好像还没到哦';
        else hint.textContent = `当前年龄：${age} 岁`;
      }
      if (relation) {
        const opt = relation.querySelector('option[data-age-restricted]');
        if (opt) opt.disabled = age != null && age > 0 && age < 18;
      }
    });
  }

  // 点击「种下我的种子」：先把年龄/偏好落盘，再走原有 data-goto 导航
  if (signupBtn) {
    signupBtn.addEventListener('click', () => {
      if (birthday && birthday.value) {
        const age = computeAge(birthday.value);
        if (age != null && age >= 0) {
          localStorage.setItem('zhijian-birthday', birthday.value);
          localStorage.setItem('zhijian-age', String(age));
        }
      }
      if (relation && relation.value) {
        localStorage.setItem('zhijian-relation-pref', relation.value);
      }
    });
  }
}
