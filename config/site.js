/**
 * 斓世 / Irosekai — 站点单一配置源 (Single Source of Truth)
 * ------------------------------------------------------------------
 * 这里是唯一需要改的地方。新增模块、调整文案语言、隐藏某个仓库、
 * 改变排序策略，全部落在本文件里，不需要动 HTML 或 JS。
 *
 * 该文件是纯 ES Module，没有构建步骤，浏览器直接 import。
 */

export const site = {
  /* ── 组织身份 ─────────────────────────────────────────────── */
  org: 'Irosekai',
  repo: 'irosekai.github.io',
  siteUrl: 'https://irosekai.github.io',
  orgUrl: 'https://github.com/Irosekai',
  repoUrl: 'https://github.com/Irosekai/irosekai.github.io',
  /** 组织创建时间，用于计算「成立至今」 */
  founded: '2026-06-26T14:59:54Z',

  /* ── 对外链接 ─────────────────────────────────────────────── */
  links: {
    issues: 'https://github.com/Irosekai/irosekai.github.io/issues/new',
    issuesList: 'https://github.com/Irosekai/irosekai.github.io/issues',
    source: 'https://github.com/Irosekai/irosekai.github.io',
    orgEvents: 'https://github.com/Irosekai?tab=repositories',
  },

  /* ── 国际化 ───────────────────────────────────────────────── */
  defaultLocale: 'zh-CN',
  locales: [
    { code: 'zh-CN', label: '简体中文', short: '中', htmlLang: 'zh-Hans' },
    { code: 'ja', label: '日本語', short: '日', htmlLang: 'ja' },
    { code: 'en', label: 'English', short: 'EN', htmlLang: 'en' },
  ],

  /* ── 项目展示 ─────────────────────────────────────────────── */
  projects: {
    /** 不希望在「项目」区出现的仓库（站点自身通常无信息量） */
    exclude: ['irosekai.github.io'],
    /** 置顶仓库，会强制排在最前并加上 featured 标记 */
    pin: [],
    /** 最多渲染多少张卡片 */
    limit: 12,
    defaultSort: 'updated',
    sortOptions: ['updated', 'stars', 'name'],
    /**
     * 仓库文案覆盖：仓库本身没有 description 时用来补全，
     * 也支持按语言分别撰写。key 为仓库名。
     *
     * 例：
     * 'some-repo': {
     *   zh: { description: '中文简介' },
     *   ja: { description: '日本語の説明' },
     *   en: { description: 'English blurb' },
     *   tags: ['tool', 'rust'],
     * }
     */
    overrides: {},
  },

  /* ── 动态流 ───────────────────────────────────────────────── */
  activity: {
    enabled: true,
    limit: 8,
  },

  /* ── 数据层 ───────────────────────────────────────────────── */
  api: {
    base: 'https://api.github.com',
    /** 客户端缓存有效期（毫秒） */
    ttl: 10 * 60 * 1000,
    /** 失败时回退到的本地快照 */
    fallback: './data/fallback.json',
  },

  /* ── 特性开关（关掉即降级，不报错） ───────────────────────── */
  features: {
    aurora: true,   // 极光渐变背景
    sparks: true,   // 星尘粒子层
    cursor: true,   // 自定义光标
    tilt: true,     // 卡片 3D 倾斜
    marquee: true,  // 跑马灯
    counters: true, // 数字滚动
  },
};

export default site;
