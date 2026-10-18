/**
 * 刷新离线兜底快照 data/fallback.json。
 *
 *   node tools/snapshot.mjs
 *
 * 什么时候需要跑？
 *   - 组织刚加了重要仓库，希望「API 挂掉时」显示的也是最新内容
 *   - 想固定一份可离线预览的数据
 * 平时并不需要：页面本身是实时读取 GitHub 的。
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT = resolve(ROOT, 'data/fallback.json');

/** 从 config/site.js 里抠出组织名，免得两处维护 */
function readOrg() {
  try {
    const source = readFileSync(resolve(ROOT, 'config/site.js'), 'utf8');
    const match = source.match(/^\s*org:\s*'([^']+)'/m);
    if (match) return match[1];
  } catch {
    /* 忽略 */
  }
  return 'Irosekai';
}

const ORG = readOrg();
const HEADERS = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'irosekai-snapshot',
};
if (process.env.GITHUB_TOKEN) {
  HEADERS.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function get(path) {
  const res = await fetch(`https://api.github.com${path}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`${path} → HTTP ${res.status}`);
  return res.json();
}

/** 只保留渲染需要的字段，快照体积可控 */
function trimRepo(repo) {
  return {
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    language: repo.language,
    stargazers_count: repo.stargazers_count,
    forks_count: repo.forks_count,
    topics: repo.topics ?? [],
    html_url: repo.html_url,
    homepage: repo.homepage,
    created_at: repo.created_at,
    updated_at: repo.updated_at,
    pushed_at: repo.pushed_at,
    archived: repo.archived,
    fork: repo.fork,
    size: repo.size,
    license: repo.license ? { spdx_id: repo.license.spdx_id } : null,
    default_branch: repo.default_branch,
  };
}

function trimEvent(event) {
  return {
    id: event.id,
    type: event.type,
    repo: event.repo ? { name: event.repo.name, url: event.repo.url } : null,
    payload: {
      action: event.payload?.action,
      ref: event.payload?.ref,
      commits: event.payload?.commits ? { length: event.payload.commits.length } : undefined,
    },
    created_at: event.created_at,
  };
}

async function main() {
  console.log(`→ 读取组织 ${ORG} …`);

  const [org, repos, events] = await Promise.all([
    get(`/orgs/${ORG}`),
    get(`/orgs/${ORG}/repos?per_page=100&sort=updated`),
    get(`/orgs/${ORG}/events?per_page=30`).catch(() => []),
  ]);

  const snapshot = {
    _comment:
      '离线兜底快照：GitHub API 不可达或被限流时使用。由 tools/snapshot.mjs 生成。',
    generatedAt: new Date().toISOString(),
    org: {
      login: org.login,
      name: org.name,
      description: org.description,
      avatar_url: org.avatar_url,
      html_url: org.html_url,
      public_repos: org.public_repos,
      followers: org.followers,
      created_at: org.created_at,
    },
    repos: repos.map(trimRepo),
    events: events.map(trimEvent),
  };

  mkdirSync(dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');

  console.log(`✓ ${OUTPUT}`);
  console.log(`  repos: ${snapshot.repos.length}, events: ${snapshot.events.length}`);
}

main().catch((err) => {
  console.error('✗ 快照失败:', err.message);
  process.exitCode = 1;
});
