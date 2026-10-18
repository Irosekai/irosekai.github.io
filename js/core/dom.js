/**
 * DOM 小工具集合。
 * 只解决 90% 场景，不试图做一个框架。
 */

export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** HTML 转义 —— 所有来自 GitHub 的字符串都必须过一遍 */
export function esc(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 创建元素 */
export function el(tag, attrs = {}, text) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v === true ? '' : v);
  }
  if (text != null) node.textContent = text;
  return node;
}

/** 安全设置 innerHTML（仅用于我们自己的静态模板） */
export function setHTML(node, html) {
  if (node) node.innerHTML = html;
}

export function on(target, event, handler, options) {
  target.addEventListener(event, handler, options);
  return () => target.removeEventListener(event, handler, options);
}

/** 用 documentFragment 批量替换子节点，减少重排 */
export function replaceChildren(node, children) {
  if (!node) return;
  const frag = document.createDocumentFragment();
  for (const child of children) {
    if (child) frag.appendChild(child);
  }
  node.replaceChildren(frag);
}

export const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
export const lerp = (a, b, t) => a + (b - a) * t;

export function rafThrottle(fn) {
  let queued = false;
  let lastArgs;
  return (...args) => {
    lastArgs = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...lastArgs);
    });
  };
}

export function debounce(fn, wait = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

/** 是否偏好减少动态 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** 是否为精细指针设备 */
export function isFinePointer() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** 安全的会话存储（隐私模式会抛异常） */
export const safeStorage = {
  get(key) {
    try {
      return sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* 忽略：缓存失败不影响功能 */
    }
  },
  getLocal(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setLocal(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* 忽略 */
    }
  },
};
