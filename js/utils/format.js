/**
 * 本地化格式化工具。
 * 一律走 Intl，避免手写「3 天前」这类会随语言变化的字符串。
 */

/** 数字紧凑格式：1200 → 1.2k / 1.2千 */
export function compactNumber(value, locale = 'zh-CN') {
  const n = Number(value) || 0;
  try {
    return new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(n);
  } catch {
    return String(n);
  }
}

/** 完整数字，带千分位 */
export function fullNumber(value, locale = 'zh-CN') {
  try {
    return new Intl.NumberFormat(locale).format(Number(value) || 0);
  } catch {
    return String(value ?? 0);
  }
}

const RELATIVE_UNITS = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1],
];

/** 相对时间：Intl.RelativeTimeFormat 自带各语言措辞 */
export function relativeTime(input, locale = 'zh-CN', now = Date.now()) {
  const ts = input instanceof Date ? input.getTime() : Date.parse(input);
  if (!Number.isFinite(ts)) return '';

  const diffSeconds = (ts - now) / 1000;
  const abs = Math.abs(diffSeconds);

  try {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    // 刚刚
    if (abs < 45) return rtf.format(0, 'second');

    for (const [unit, seconds] of RELATIVE_UNITS) {
      if (abs >= seconds) {
        return rtf.format(Math.round(diffSeconds / seconds), unit);
      }
    }
    return rtf.format(0, 'second');
  } catch {
    return '';
  }
}

/** 绝对日期，短格式 */
export function shortDate(input, locale = 'zh-CN') {
  const ts = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(ts.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(ts);
  } catch {
    return ts.toISOString().slice(0, 10);
  }
}

/** 两个日期相差的整年数（用于「成立至今」） */
export function yearsSince(input, now = new Date()) {
  const start = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(start.getTime())) return 0;
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years -= 1;
  return Math.max(0, years);
}

/** 由字符串稳定地生成一个色相，用于未知语言的圆点 */
function hashHue(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) % 360;
  }
  return h;
}

/**
 * GitHub 语言配色（取自 GitHub 官方色板）
 * 未知语言回退到按名字哈希的 HSL，保证每个语言都有稳定颜色。
 */
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Rust: '#dea584',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Ruby: '#701516',
  PHP: '#4F5D95',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  PowerShell: '#012456',
  HTML: '#e34c26',
  CSS: '#563d7c',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Lua: '#000080',
  Zig: '#ec915c',
  Nix: '#7e7eff',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Clojure: '#db5855',
  Scala: '#c22d40',
  'Objective-C': '#438eff',
  Assembly: '#6E4C13',
  Makefile: '#427819',
  Dockerfile: '#384d54',
  Astro: '#ff5a03',
  MDX: '#fcb32c',
  GLSL: '#5686a5',
  WGSL: '#1a5e9a',
  Wasm: '#654FF0',
};

export function languageColor(language) {
  if (!language) return '#7c5cff';
  if (LANGUAGE_COLORS[language]) return LANGUAGE_COLORS[language];
  return `hsl(${hashHue(language)} 72% 62%)`;
}

/** 把 locale 码转成 Intl 可用的标签 */
export function intlLocale(code) {
  if (code === 'zh-CN') return 'zh-CN';
  return code || 'en';
}
