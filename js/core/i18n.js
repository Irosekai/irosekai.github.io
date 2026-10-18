/**
 * i18n —— 轻量、无依赖的多语言运行时。
 *
 * 设计要点
 *  1. HTML 里内联了简体中文原文，所以 JS 或网络失败时页面依然可读（也利于 SEO）。
 *  2. 只有「查到了翻译」才覆盖节点，查不到就保留内联原文，永不出现空白。
 *  3. 词条支持点路径与数组下标：`values.items.0.title`。
 *  4. 切换语言只做一次 DOM 扫描，不重建节点，也没有虚拟 DOM 开销。
 */

import { site } from '../../config/site.js';
import { qsa, safeStorage } from './dom.js';

const STORAGE_KEY = 'irosekai:locale';

/** 把各种语言标记归一到站点支持的 code */
export function normalizeLocale(raw) {
  if (!raw) return null;
  const tag = String(raw).trim().toLowerCase().replace('_', '-');
  if (tag.startsWith('zh')) return 'zh-CN';
  if (tag.startsWith('ja')) return 'ja';
  if (tag.startsWith('en')) return 'en';
  const exact = site.locales.find((l) => l.code.toLowerCase() === tag);
  return exact ? exact.code : null;
}

/** 点路径取值，支持数组下标 */
function resolvePath(source, path) {
  return path.split('.').reduce((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) {
      const idx = Number(key);
      return Number.isInteger(idx) ? acc[idx] : undefined;
    }
    return typeof acc === 'object' ? acc[key] : undefined;
  }, source);
}

function interpolate(text, params) {
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
  );
}

export function createI18n({ bus }) {
  const cache = new Map();
  const available = site.locales.map((l) => l.code);

  let locale = site.defaultLocale;
  let dict = {};
  let baseDict = {};
  let ready = false;

  const url = (code) => new URL(`../../i18n/${code}.json`, import.meta.url).href;

  async function fetchDictionary(code) {
    if (cache.has(code)) return cache.get(code);
    const res = await fetch(url(code), { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`[i18n] ${code} → HTTP ${res.status}`);
    const json = await res.json();
    cache.set(code, json);
    return json;
  }

  /** 读取词条；缺失返回 null，由调用方决定回退策略 */
  function lookup(key, params) {
    let value = resolvePath(dict, key);
    if (value === undefined) value = resolvePath(baseDict, key);
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return interpolate(value, params);
    return value;
  }

  /** 对外 API：始终返回字符串（缺失则为空串） */
  function t(key, params) {
    const value = lookup(key, params);
    if (value == null) return '';
    return typeof value === 'string' ? value : String(value);
  }

  /** 是否真的存在该词条（用于可选渲染） */
  function has(key) {
    return lookup(key) != null;
  }

  function localeMeta() {
    return site.locales.find((l) => l.code === locale) ?? site.locales[0];
  }

  /**
   * 把词典应用到 DOM。
   *  - data-i18n           → textContent
   *  - data-i18n-html      → innerHTML（仅用于我们自己的词条，不含外部数据）
   *  - data-i18n-attr      → "aria-label:nav.aria; title:meta.title"
   *  - data-i18n-aria      → aria-label 快捷写法
   */
  function apply(root = document, { includeRoot = false } = {}) {
    const scope = root instanceof Element ? root : document;

    const textNodes = [
      ...(includeRoot && scope.matches?.('[data-i18n]') ? [scope] : []),
      ...qsa('[data-i18n]', scope),
    ];
    for (const node of textNodes) {
      const value = lookup(node.dataset.i18n);
      if (typeof value === 'string') node.textContent = value;
    }

    const htmlNodes = [
      ...(includeRoot && scope.matches?.('[data-i18n-html]') ? [scope] : []),
      ...qsa('[data-i18n-html]', scope),
    ];
    for (const node of htmlNodes) {
      const value = lookup(node.dataset.i18nHtml);
      if (typeof value === 'string') node.innerHTML = value;
    }

    const attrNodes = [
      ...(includeRoot && scope.matches?.('[data-i18n-attr]') ? [scope] : []),
      ...qsa('[data-i18n-attr]', scope),
    ];
    for (const node of attrNodes) {
      for (const pair of node.dataset.i18nAttr.split(';')) {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (!attr || !key) continue;
        const value = lookup(key);
        if (typeof value === 'string') node.setAttribute(attr, value);
      }
    }

    for (const node of qsa('[data-i18n-aria]', scope)) {
      const value = lookup(node.dataset.i18nAria);
      if (typeof value === 'string') node.setAttribute('aria-label', value);
    }

    // 文档级元信息
    const title = lookup('meta.title');
    if (title) document.title = title;

    const desc = lookup('meta.description');
    if (desc) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'description';
        document.head.appendChild(meta);
      }
      meta.content = desc;
      const ogDesc = document.querySelector('meta[property="og:description"]');
      if (ogDesc) ogDesc.setAttribute('content', desc);
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle && title) ogTitle.setAttribute('content', title);
      const twTitle = document.querySelector('meta[name="twitter:title"]');
      if (twTitle && title) twTitle.setAttribute('content', title);
      const twDesc = document.querySelector('meta[name="twitter:description"]');
      if (twDesc) twDesc.setAttribute('content', desc);
    }

    document.documentElement.lang = localeMeta().htmlLang;
  }

  function detectInitialLocale() {
    const fromQuery = normalizeLocale(new URLSearchParams(location.search).get('lang'));
    if (fromQuery && available.includes(fromQuery)) return fromQuery;

    const stored = normalizeLocale(safeStorage.getLocal(STORAGE_KEY));
    if (stored && available.includes(stored)) return stored;

    const candidates = navigator.languages?.length
      ? navigator.languages
      : [navigator.language].filter(Boolean);
    for (const candidate of candidates) {
      const matched = normalizeLocale(candidate);
      if (matched && available.includes(matched)) return matched;
    }
    return site.defaultLocale;
  }

  function syncUrl(code) {
    try {
      const params = new URLSearchParams(location.search);
      if (code === site.defaultLocale) params.delete('lang');
      else params.set('lang', code);
      const qs = params.toString();
      const next = `${location.pathname}${qs ? `?${qs}` : ''}${location.hash}`;
      history.replaceState(null, '', next);
    } catch {
      /* file:// 下可能不可用，忽略 */
    }
  }

  /**
   * 切换语言。
   * @param {string} code
   * @param {{persist?: boolean, emit?: boolean, animate?: boolean}} opts
   */
  async function setLocale(code, opts = {}) {
    const { persist = true, emit = true, animate = true } = opts;
    const target = available.includes(code) ? code : site.defaultLocale;

    if (!baseDict || Object.keys(baseDict).length === 0) {
      try {
        baseDict = await fetchDictionary(site.defaultLocale);
      } catch {
        baseDict = {};
      }
    }

    if (target !== locale || !ready) {
      try {
        dict = await fetchDictionary(target);
      } catch (err) {
        console.warn('[i18n] falling back to default dictionary:', err);
        dict = baseDict;
      }
      locale = target;
    }

    if (animate) {
      document.documentElement.classList.add('is-locale-switching');
      setTimeout(
        () => document.documentElement.classList.remove('is-locale-switching'),
        340
      );
    }

    apply(document);
    ready = true;

    if (persist) safeStorage.setLocal(STORAGE_KEY, locale);
    if (persist) syncUrl(locale);
    if (emit) bus?.emit('locale:change', locale);
  }

  /** 启动：检测 → 加载 → 应用 */
  async function init() {
    const initial = detectInitialLocale();
    await setLocale(initial, { persist: false, emit: true, animate: false });
    return locale;
  }

  return {
    init,
    t,
    has,
    apply,
    lookup,
    setLocale,
    getLocale: () => locale,
    getMeta: localeMeta,
    getLocales: () => site.locales,
    isReady: () => ready,
    normalizeLocale,
  };
}
