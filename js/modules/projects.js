/**
 * 项目区：把 GitHub 组织仓库渲染成卡片墙。
 *
 * 具备：骨架屏 → 语言筛选 → 多键排序 → 置顶 → 空/错误状态 → 语言切换重绘。
 * 所有来自 API 的字符串都经过 esc() 转义。
 */

import { qs, qsa, esc, on } from '../core/dom.js';
import { revealOnScroll, attachTilt } from '../core/motion.js';
import { compactNumber, relativeTime, languageColor, intlLocale } from '../utils/format.js';

const NEW_WINDOW_DAYS = 45;
const SKELETON_COUNT = 6;

const ICON_STAR =
  '<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 1.3l2.02 4.09 4.51.66-3.26 3.18.77 4.49L8 11.6l-4.04 2.12.77-4.49L1.47 6.05l4.51-.66z"/></svg>';

const ICON_FORK =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="4" cy="3.6" r="1.9" fill="currentColor"/><circle cx="12" cy="3.6" r="1.9" fill="currentColor"/><circle cx="8" cy="12.4" r="1.9" fill="currentColor"/><path d="M4 5.6v1a2 2 0 002 2h4a2 2 0 002-2v-1M8 8.7v1.8" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>';

export function initProjects({ site, bus, i18n, data }) {
  const grid = qs('#js-projects-grid');
  if (!grid) return;

  const chipsWrap = qs('#js-project-chips');
  const sortSelect = qs('#js-sort');
  const countEl = qs('#js-project-count');
  const noteEl = qs('#js-projects-note');

  const state = {
    repos: [],
    language: 'all',
    sort: site.projects.defaultSort,
    loaded: false,
  };

  const locale = () => intlLocale(i18n.getLocale());
  const t = (key, params) => i18n.t(key, params);

  /* ── 文案：配置覆盖优先，其次仓库自身 description ── */
  function describe(repo) {
    const override = site.projects.overrides?.[repo.name];
    if (override) {
      const code = i18n.getLocale();
      const text =
        override[code]?.description ||
        override.zh?.description ||
        override.en?.description;
      if (text) return { text, custom: true };
    }
    return { text: repo.description || '', custom: false };
  }

  function tagsFor(repo) {
    const override = site.projects.overrides?.[repo.name];
    if (override?.tags?.length) return override.tags.slice(0, 5);
    return (repo.topics || []).slice(0, 5);
  }

  /* ── 列表加工 ── */
  function visibleRepos() {
    const excluded = new Set(site.projects.exclude || []);
    return state.repos.filter(
      (repo) => !excluded.has(repo.name) && !repo.fork
    );
  }

  function sortedRepos(list) {
    const pinned = site.projects.pin || [];
    return list.slice().sort((a, b) => {
      const ai = pinned.indexOf(a.name);
      const bi = pinned.indexOf(b.name);
      if (ai !== -1 || bi !== -1) {
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      }

      switch (state.sort) {
        case 'stars':
          return b.stars - a.stars || a.name.localeCompare(b.name);
        case 'name':
          return a.name.localeCompare(b.name, i18n.getLocale());
        default:
          return (
            Date.parse(b.pushedAt || b.updatedAt || 0) -
              Date.parse(a.pushedAt || a.updatedAt || 0) ||
            a.name.localeCompare(b.name)
          );
      }
    });
  }

  function currentList() {
    const base = visibleRepos();
    const filtered =
      state.language === 'all'
        ? base
        : base.filter((repo) => (repo.language || '__none__') === state.language);
    return sortedRepos(filtered).slice(0, site.projects.limit);
  }

  /* ── 卡片 ── */
  function cardHTML(repo) {
    const { text, custom } = describe(repo);
    const description = text
      ? esc(text)
      : `<span class="card__desc--empty">${esc(t('projects.card.noDescription'))}</span>`;

    const tags = tagsFor(repo);
    const topicsHTML = tags.length
      ? `<div class="card__topics">${tags
          .map((tag) => `<span class="card__topic">${esc(tag)}</span>`)
          .join('')}</div>`
      : '';

    const langHTML = repo.language
      ? `<span class="card__lang"><i class="card__lang-dot" style="--lang-color:${esc(
          languageColor(repo.language)
        )}"></i>${esc(repo.language)}</span>`
      : '';

    const starsHTML = repo.stars
      ? `<span class="card__meta-item" title="${esc(t('projects.card.stars'))}">${ICON_STAR}${esc(
          compactNumber(repo.stars, locale())
        )}</span>`
      : '';

    const forksHTML = repo.forks
      ? `<span class="card__meta-item" title="${esc(t('projects.card.forks'))}">${ICON_FORK}${esc(
          compactNumber(repo.forks, locale())
        )}</span>`
      : '';

    const updatedHTML = repo.pushedAt || repo.updatedAt
      ? `<span class="card__meta-item">${esc(t('projects.card.updated'))} ${esc(
          relativeTime(repo.pushedAt || repo.updatedAt, locale())
        )}</span>`
      : '';

    const ageDays = (Date.now() - Date.parse(repo.createdAt || 0)) / 86400000;
    const badges = [];
    if (repo.archived) {
      badges.push(`<span class="card__badge">${esc(t('projects.card.archived'))}</span>`);
    } else if (Number.isFinite(ageDays) && ageDays >= 0 && ageDays < NEW_WINDOW_DAYS) {
      badges.push(
        `<span class="card__badge card__badge--new">${esc(t('projects.card.new'))}</span>`
      );
    }

    const label = `${repo.name} — ${t('projects.card.open')}`;

    return `
      <a class="card" href="${esc(repo.url)}" target="_blank" rel="noopener noreferrer"
         aria-label="${esc(label)}" data-tilt data-reveal>
        <div class="card__head">
          <h3 class="card__name">${esc(repo.name)}</h3>
          ${badges.join('')}
          <span class="card__arrow" aria-hidden="true">↗</span>
        </div>
        <p class="card__desc">${description}</p>
        ${topicsHTML}
        <div class="card__meta">
          ${langHTML}
          ${starsHTML}
          ${forksHTML}
          ${updatedHTML}
        </div>
      </a>
    `;
  }

  /* ── 区块状态 ── */
  function renderSkeletons() {
    grid.innerHTML = Array.from(
      { length: SKELETON_COUNT },
      () => '<div class="skeleton" aria-hidden="true"><i></i><i></i><i></i><i></i></div>'
    ).join('');
    if (countEl) countEl.textContent = t('projects.state.loading');
  }

  function renderState({ glyph, title, body, hint, action }) {
    grid.innerHTML = `
      <div class="state">
        <span class="state__glyph" aria-hidden="true">${esc(glyph)}</span>
        <h3 class="state__title">${esc(title)}</h3>
        <p class="state__body">${esc(body)}</p>
        ${
          hint
            ? `<p class="state__hint">${esc(hint)}</p>`
            : ''
        }
        ${
          action
            ? `<button class="btn btn--ghost" type="button" data-action="retry"><span class="btn__label">${esc(
                action
              )}</span></button>`
            : ''
        }
      </div>
    `;
  }

  function paintNote(source, message) {
    if (!noteEl) return;
    const show = source === 'fallback' || source === 'stale';
    noteEl.hidden = !show;
    noteEl.textContent = show ? t('projects.state.error.body') : '';
    if (show && message) noteEl.title = String(message);
  }

  /* ── 控件 ── */
  function renderChips() {
    if (!chipsWrap) return;

    const base = visibleRepos();
    const tally = new Map();
    for (const repo of base) {
      const key = repo.language || '__none__';
      tally.set(key, (tally.get(key) || 0) + 1);
    }

    const chips = [
      `<button class="chip" type="button" data-lang="all" aria-pressed="${
        state.language === 'all'
      }">${esc(t('projects.filterAll'))}<span class="chip__count">${base.length}</span></button>`,
      ...[...tally.entries()]
        .sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
        .map(([lang, count]) => {
          const label = lang === '__none__' ? '—' : lang;
          return `<button class="chip" type="button" data-lang="${esc(lang)}" aria-pressed="${
            state.language === lang
          }">${esc(label)}<span class="chip__count">${count}</span></button>`;
        }),
    ];

    chipsWrap.innerHTML = chips.join('');
  }

  function renderSort() {
    if (!sortSelect) return;
    sortSelect.innerHTML = (site.projects.sortOptions || ['updated'])
      .map(
        (key) =>
          `<option value="${esc(key)}"${
            key === state.sort ? ' selected' : ''
          }>${esc(t(`projects.sort.${key}`))}</option>`
      )
      .join('');
    sortSelect.value = state.sort;
  }

  /* ── 主渲染 ── */
  function render() {
    if (!state.loaded) return;

    const list = currentList();
    renderChips();

    if (countEl) {
      countEl.textContent = t('projects.count', { count: visibleRepos().length });
    }

    if (!list.length) {
      renderState({
        glyph: '斓',
        title: t('projects.state.empty.title'),
        body: t('projects.state.empty.body'),
        hint: site.orgUrl.replace(/^https?:\/\//, ''),
        action: null,
      });
      return;
    }

    grid.innerHTML = list.map(cardHTML).join('');

    const cards = qsa('.card', grid);
    attachTilt(cards, { max: site.features.tilt ? 6 : 0 });
    revealOnScroll(grid);
  }

  /* ── 事件 ── */
  if (chipsWrap) {
    on(chipsWrap, 'click', (event) => {
      const button = event.target.closest('.chip');
      if (!button) return;
      state.language = button.dataset.lang;
      render();
    });
  }

  if (sortSelect) {
    on(sortSelect, 'change', () => {
      state.sort = sortSelect.value;
      render();
    });
  }

  on(grid, 'click', (event) => {
    const retry = event.target.closest('[data-action="retry"]');
    if (!retry) return;
    event.preventDefault();
    renderSkeletons();
    data?.refresh();
  });

  bus.on('data:loading', () => {
    if (!state.loaded) renderSkeletons();
  });

  bus.on('data:ready', (result) => {
    state.repos = result?.repos ?? [];
    state.loaded = true;
    renderSort();
    paintNote(result?.source, result?.error);
    render();
  });

  bus.on('data:error', (error) => {
    state.loaded = false;
    renderState({
      glyph: '⚡',
      title: t('projects.state.error.title'),
      body: t('projects.state.error.body'),
      hint: error?.message || '',
      action: t('projects.state.error.retry'),
    });
    if (countEl) countEl.textContent = '';
  });

  bus.on('locale:change', () => {
    renderSort();
    render();
  });

  renderSkeletons();
  renderSort();
}

export default initProjects;
