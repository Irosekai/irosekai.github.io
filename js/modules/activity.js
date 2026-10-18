/**
 * 动态流：读取 GitHub 组织公开事件。
 * 只做呈现，不推断因果——事件里没有的信息就不显示。
 */

import { qs, esc } from '../core/dom.js';
import { relativeTime, intlLocale } from '../utils/format.js';

const GLYPHS = {
  PushEvent: '↑',
  CreateEvent: '+',
  DeleteEvent: '−',
  PullRequestEvent: '⇄',
  IssuesEvent: '!',
  IssueCommentEvent: '…',
  ReleaseEvent: '◆',
  WatchEvent: '★',
  ForkEvent: '⑂',
  PublicEvent: '◉',
  MemberEvent: '☰',
};

export function initActivity({ site, bus, i18n }) {
  const list = qs('#js-activity-list');
  if (!list) return;
  if (!site.activity.enabled) {
    list.closest('section')?.remove();
    return;
  }

  const locale = () => intlLocale(i18n.getLocale());
  const t = (key, params) => i18n.t(key, params);

  let events = [];

  function render() {
    const limit = site.activity.limit || 8;
    const visible = events.slice(0, limit);

    if (!visible.length) {
      list.innerHTML = `<li class="act"><span class="act__text">${esc(
        t('activity.empty')
      )}</span></li>`;
      return;
    }

    list.innerHTML = visible
      .map((event) => {
        const label = t(`activity.types.${event.type}`) || t('activity.unknown');
        const glyph = GLYPHS[event.type] || '•';
        const repo = event.repoSlug
          ? `<a class="act__repo" href="${esc(event.repoUrl)}" target="_blank" rel="noopener noreferrer">${esc(
              event.repoSlug
            )}</a>`
          : '';

        return `
          <li class="act">
            <span class="act__icon" aria-hidden="true">${esc(glyph)}</span>
            <span class="act__text">${esc(label)} ${repo}</span>
            <time class="act__time" datetime="${esc(event.createdAt || '')}">${esc(
              relativeTime(event.createdAt, locale())
            )}</time>
          </li>
        `;
      })
      .join('');
  }

  bus.on('data:ready', (result) => {
    events = result?.events ?? [];
    render();
  });

  bus.on('data:error', () => {
    events = [];
    render();
  });

  bus.on('locale:change', render);

  render();
}

export default initActivity;
