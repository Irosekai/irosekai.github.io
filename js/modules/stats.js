/**
 * 统计数字：仓库数 / 星标总数 / 关注者 / 成立时长。
 * 数字在第一次进入视口时滚动到位；成立不足一年时保留一位小数。
 */

import { qs } from '../core/dom.js';
import { countUp, onceVisible } from '../core/motion.js';
import { compactNumber } from '../utils/format.js';
import { site } from '../../config/site.js';

const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;

/** 成立至今的精确年数（可能小于 1） */
function orgAgeYears(now = Date.now()) {
  const start = Date.parse(site.founded);
  if (!Number.isFinite(start)) return 0;
  return Math.max(0, (now - start) / YEAR_MS);
}

export function initStats({ bus, i18n }) {
  const root = qs('#js-stats');
  if (!root) return;

  const fields = {
    repos: qs('[data-stat="repos"]', root),
    stars: qs('[data-stat="stars"]', root),
    followers: qs('[data-stat="followers"]', root),
    age: qs('[data-stat="age"]', root),
  };

  let latest = null;

  /** 按字段决定精度：年龄保留小数，其余取整后再压缩 */
  function formatValue(value, key) {
    const locale = i18n.getLocale();
    const numeric = Number(value) || 0;
    if (key === 'age') {
      return compactNumber(numeric < 1 ? Number(numeric.toFixed(1)) : Math.round(numeric), locale);
    }
    return compactNumber(Math.round(numeric), locale);
  }

  function paint() {
    if (!latest) return;
    for (const [key, node] of Object.entries(fields)) {
      if (!node) continue;
      const target = latest[key] ?? 0;
      onceVisible(node, () =>
        countUp(node, target, {
          round: false,
          format: (value) => formatValue(value, key),
        })
      );
    }
  }

  bus.on('data:ready', (result) => {
    const repos = result?.repos ?? [];
    latest = {
      repos: result?.org?.publicRepos ?? repos.length,
      stars: repos.reduce((sum, repo) => sum + (repo.stars || 0), 0),
      followers: result?.org?.followers ?? 0,
      age: orgAgeYears(),
    };
    paint();
  });

  // 语言变化只影响数字格式（1.2k / 1.2千），直接重绘
  bus.on('locale:change', () => {
    if (!latest) return;
    for (const [key, node] of Object.entries(fields)) {
      if (node) node.textContent = formatValue(latest[key] ?? 0, key);
    }
  });

  bus.on('data:error', () => {
    for (const node of Object.values(fields)) {
      if (node) node.textContent = '—';
    }
  });
}

export default initStats;
