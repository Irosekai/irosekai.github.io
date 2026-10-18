/**
 * GitHub 数据层
 * ------------------------------------------------------------------
 * 三级策略，保证任何情况下页面都有内容：
 *   1. sessionStorage 缓存（10 分钟 TTL，带 ETag 条件请求）
 *   2. 实时请求 api.github.com（匿名 60 次/小时）
 *   3. 本地快照 data/fallback.json（离线 / 限流也不空）
 *
 * 所有返回值都被归一化成同一套形状，UI 层无需关心数据来源。
 */

import { site } from '../../config/site.js';
import { safeStorage } from './dom.js';

const CACHE_KEY = `irosekai:data:${site.org}`;

export class ApiError extends Error {
  constructor(message, { status = 0 } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/* ── 归一化 ─────────────────────────────────────────────────── */

function normalizeOrg(raw) {
  if (!raw) return null;
  return {
    login: raw.login,
    name: raw.name || raw.login,
    description: raw.description || '',
    avatarUrl: raw.avatar_url,
    url: raw.html_url,
    publicRepos: raw.public_repos ?? 0,
    followers: raw.followers ?? 0,
    createdAt: raw.created_at,
  };
}

function normalizeRepo(raw) {
  return {
    name: raw.name,
    fullName: raw.full_name,
    description: raw.description || '',
    language: raw.language || null,
    stars: raw.stargazers_count ?? 0,
    forks: raw.forks_count ?? 0,
    topics: Array.isArray(raw.topics) ? raw.topics : [],
    url: raw.html_url,
    homepage: raw.homepage || '',
    updatedAt: raw.updated_at,
    pushedAt: raw.pushed_at,
    createdAt: raw.created_at,
    archived: Boolean(raw.archived),
    fork: Boolean(raw.fork),
    size: raw.size ?? 0,
    license: raw.license?.spdx_id && raw.license.spdx_id !== 'NOASSERTION'
      ? raw.license.spdx_id
      : null,
    defaultBranch: raw.default_branch || 'main',
  };
}

function normalizeEvent(raw) {
  const repoName = raw.repo?.name || '';
  return {
    id: String(raw.id ?? ''),
    type: raw.type || 'UnknownEvent',
    repo: repoName,
    repoSlug: repoName.includes('/') ? repoName.split('/')[1] : repoName,
    repoUrl: repoName ? `${site.orgUrl.replace(/\/$/, '')}/${repoName.split('/')[1]}` : '',
    createdAt: raw.created_at,
    commitCount: raw.payload?.commits?.length ?? 0,
    ref: raw.payload?.ref || '',
    action: raw.payload?.action || '',
  };
}

/* ── HTTP ───────────────────────────────────────────────────── */

async function getJSON(path, { etag } = {}) {
  const headers = { Accept: 'application/vnd.github+json' };
  if (etag) headers['If-None-Match'] = etag;

  const res = await fetch(`${site.api.base}${path}`, { headers });

  if (res.status === 304) return { notModified: true, etag };
  if (res.status === 403 || res.status === 429) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    throw new ApiError('rate_limited', { status: res.status, remaining });
  }
  if (!res.ok) throw new ApiError(`http_${res.status}`, { status: res.status });

  return {
    data: await res.json(),
    etag: res.headers.get('etag'),
    link: res.headers.get('link'),
  };
}

/** 跟随 Link: rel="next" 翻页，最多 maxPages 页，防止失控 */
async function getAllPages(path, maxPages = 3, etag) {
  const results = [];
  let next = path;
  let page = 0;
  let firstEtag = etag;

  while (next && page < maxPages) {
    const out = await getJSON(next, { etag: page === 0 ? etag : undefined });
    if (out.notModified) return { notModified: true, etag: firstEtag };
    const items = Array.isArray(out.data) ? out.data : [out.data];
    results.push(...items);
    page += 1;

    const link = out.link || '';
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    next = match ? match[1].replace(site.api.base, '') : null;

    if (page === 1 && !firstEtag) firstEtag = out.etag;
  }

  return { data: results, etag: firstEtag, partial: page >= maxPages };
}

/* ── 缓存与快照 ─────────────────────────────────────────────── */

function readCache() {
  const raw = safeStorage.get(CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(payload) {
  safeStorage.set(CACHE_KEY, JSON.stringify({ ...payload, storedAt: Date.now() }));
}

async function loadFallback() {
  try {
    const res = await fetch(new URL(`../../${site.api.fallback}`, import.meta.url).href, {
      cache: 'no-cache',
    });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      org: normalizeOrg(json.org),
      repos: (json.repos || []).map(normalizeRepo),
      events: (json.events || []).map(normalizeEvent),
      fetchedAt: json.generatedAt || null,
    };
  } catch {
    return null;
  }
}

/* ── 主入口 ─────────────────────────────────────────────────── */

/**
 * @param {{force?: boolean}} opts
 * @returns {Promise<{org: object|null, repos: object[], events: object[],
 *                    source: 'live'|'cache'|'stale'|'fallback', error?: string}>}
 */
export async function loadOrgData({ force = false } = {}) {
  const cached = readCache();
  const isFresh = cached && Date.now() - (cached.storedAt || 0) < site.api.ttl;

  if (isFresh && !force) {
    return {
      org: cached.org ?? null,
      repos: cached.repos ?? [],
      events: cached.events ?? [],
      source: 'cache',
      fetchedAt: cached.fetchedAt,
    };
  }

  try {
    const [orgOut, reposOut, eventsOut] = await Promise.all([
      getJSON(`/orgs/${site.org}`, { etag: cached?.etags?.org }),
      getAllPages(`/orgs/${site.org}/repos?per_page=100&sort=updated`, 3, cached?.etags?.repos),
      getAllPages(`/orgs/${site.org}/events?per_page=30`, 1, cached?.etags?.events),
    ]);

    // 全部 304：缓存仍然有效
    if (orgOut.notModified && reposOut.notModified) {
      const payload = {
        org: cached.org,
        repos: cached.repos,
        events: cached.events,
        fetchedAt: cached.fetchedAt,
        storedAt: Date.now(),
        etags: { org: orgOut.etag, repos: reposOut.etag, events: eventsOut.etag },
      };
      writeCache(payload);
      return { ...payload, source: 'cache' };
    }

    const payload = {
      org: orgOut.notModified ? cached.org : normalizeOrg(orgOut.data),
      repos: reposOut.notModified ? cached.repos : (reposOut.data || []).map(normalizeRepo),
      events: eventsOut.notModified ? cached.events : (eventsOut.data || []).map(normalizeEvent),
      fetchedAt: new Date().toISOString(),
      storedAt: Date.now(),
      etags: {
        org: orgOut.etag ?? cached?.etags?.org,
        repos: reposOut.etag ?? cached?.etags?.repos,
        events: eventsOut.etag ?? cached?.etags?.events,
      },
    };

    writeCache(payload);
    return { ...payload, source: 'live' };
  } catch (err) {
    // 有缓存先用缓存，哪怕过期
    if (cached?.repos?.length || cached?.org) {
      return {
        org: cached.org ?? null,
        repos: cached.repos ?? [],
        events: cached.events ?? [],
        source: 'stale',
        fetchedAt: cached.fetchedAt,
        error: err?.message || 'unknown',
      };
    }

    const fallback = await loadFallback();
    if (fallback) {
      return { ...fallback, source: 'fallback', error: err?.message || 'unknown' };
    }

    throw err;
  }
}

export default { loadOrgData, ApiError };
