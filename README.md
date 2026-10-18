# 斓世 · Irosekai

> 以代码织就，一整个斑斓世界。

[Irosekai](https://github.com/Irosekai)（イロセカイ / 斓世）开发者组织的官方主页。
一个**零构建**的静态站点：没有打包步骤、没有依赖树、没有 CI —— push 到 `main` 就是上线。

线上地址：**https://irosekai.github.io/**

---

## 目录

- [特点](#特点)
- [为什么是零构建](#为什么是零构建)
- [目录结构](#目录结构)
- [本地开发](#本地开发)
- [配置指南](#配置指南)
- [项目展示是怎么工作的](#项目展示是怎么工作的)
- [国际化](#国际化)
- [扩展：加一个新区块](#扩展加一个新区块)
- [设计系统](#设计系统)
- [部署](#部署)
- [工具脚本](#工具脚本)
- [已知限制](#已知限制)
- [许可](#许可)

---

## 特点

| | |
|---|---|
| **零构建** | 纯 ES Module + 原生 CSS，源码即产物。改完刷新即可见。 |
| **数据驱动** | 项目区实时读取 GitHub REST API，新仓库自动出现，无需手改 HTML。 |
| **三级降级** | 内存缓存 → 实时请求（带 ETag 条件请求）→ 本地快照。API 挂了也不会白屏。 |
| **三语 i18n** | 简体中文 / 日本語 / English，自动探测 + URL 深链 + 本地记忆。 |
| **渐进增强** | HTML 内联了中文原文，JS 或网络失效时页面依然可读，且利于 SEO。 |
| **无障碍** | 语义化结构、跳转链接、可见焦点环、`aria` 状态同步、键盘可达。 |
| **尊重设置** | 完整响应 `prefers-reduced-motion`，动效一律降级为直接到位。 |
| **可扩展** | 模块注册表 + 单一配置源，加区块只需写一个文件加一行注册。 |

---

## 为什么是零构建

这不是省事，而是刻意的取舍：

- **部署即仓库内容**。GitHub Pages 直接从 `main` 根目录提供服务，不存在「忘了跑构建」「构建产物没提交」这类事故。
- **没有依赖腐化**。三年后你回来改一行文案，不需要先修 `node_modules`。
- **首屏足够轻**。没有框架运行时，全部 JS 合计约 40 KB 源码（未压缩），且按需加载。
- **调试路径最短**。浏览器看到的，就是仓库里的。

代价是少了一些框架的便利（组件复用、scoped CSS）。对这个体量的站点，这个交换是划算的。

`tools/` 里的三个脚本用于生成资源与本地预览，它们**不参与构建**，线上不需要 Node。

---

## 目录结构

```text
.
├── index.html              # 首页（内联简体中文原文，作为默认与兜底）
├── 404.html                # 自定义 404（必须使用绝对路径）
├── manifest.webmanifest    # PWA 清单
├── .nojekyll               # 关掉 GitHub Pages 的 Jekyll 处理
├── .gitattributes          # 统一 LF，避免 Windows 行尾污染
├── package.json            # 仅用于 npm scripts，无 dependencies
│
├── config/
│   └── site.js             # ★ 单一配置源：组织、链接、语言、项目规则、特性开关
│
├── i18n/
│   ├── zh-CN.json          # 简体中文
│   ├── ja.json             # 日本語
│   └── en.json             # English
│
├── data/
│   └── fallback.json       # 离线快照（API 不可达时的兜底）
│
├── assets/
│   ├── favicon.svg
│   ├── logo.svg
│   └── og.png              # 1200×630 社交分享图
│
├── styles/
│   ├── tokens.css          # ★ 设计令牌：颜色、字体、间距、动效曲线
│   ├── base.css            # 重置、排版原子、按钮、容器
│   ├── components.css      # 导航 / 英雄区 / 项目卡 / 动态 / 页脚
│   └── effects.css         # 极光背景 / 星尘 / 光标 / 入场 / 减弱动态
│
├── js/
│   ├── main.js             # 启动入口：模块注册表在这里
│   ├── 404.js              # 404 页专用入口（只加载 i18n）
│   │
│   ├── core/               # 与业务无关的基础设施
│   │   ├── bus.js          # 事件总线（模块间唯一通信方式）
│   │   ├── dom.js          # qs/qsa/esc/安全存储/媒体查询
│   │   ├── i18n.js         # 词典加载、点路径取值、DOM 应用
│   │   ├── github.js       # 数据层：归一化 + 三级缓存
│   │   └── motion.js       # 入场、倾斜、磁吸、数字滚动
│   │
│   ├── modules/            # 每个文件 = 一个可插拔功能块
│   │   ├── data.js         # 统一取数，结果广播给所有订阅者
│   │   ├── nav.js          # 导航滚动态 / 移动菜单 / 进度条
│   │   ├── hero.js         # 英雄区指针与滚动视差
│   │   ├── sparks.js       # Canvas 星尘粒子
│   │   ├── cursor.js       # 自定义光标
│   │   ├── marquee.js      # 跑马灯
│   │   ├── lang-switch.js  # 语言切换器
│   │   ├── projects.js     # 项目卡片墙（筛选 / 排序 / 空态）
│   │   ├── activity.js     # 公开事件动态流
│   │   ├── stats.js        # 统计数据与滚动数字
│   │   └── reveal.js       # 入场与交互绑定
│   │
│   └── utils/
│       └── format.js       # Intl 数字/相对时间、语言配色
│
└── tools/
    ├── serve.mjs           # 零依赖静态服务器
    ├── generate-og.mjs     # 手写 PNG 编码器，生成 og.png
    └── snapshot.mjs        # 刷新 fallback.json
```

> **ES Module 必须通过 HTTP 访问**，直接双击 `index.html`（`file://`）会因为 CORS 而无法加载脚本。用下面的本地预览方式。

---

## 本地开发

需要 Node 18+（仅用于本地起服务和生成资源）。

```bash
# 起一个本地服务器（默认 4173 端口）
npm run serve
# 或指定端口
node tools/serve.mjs 8080
```

然后访问 <http://localhost:4173>。

改样式直接刷新；改 JS 需要重新加载页面（没有 HMR，这也是零构建的一部分）。

---

## 配置指南

日常改动 95% 都发生在 **`config/site.js`**。

```js
export const site = {
  org: 'Irosekai',            // GitHub 组织名
  repo: 'irosekai.github.io', // 站点仓库
  founded: '2026-06-26T...',  // 用于计算「成立至今」

  links: { /* 页脚与 CTA 的各种外链 */ },

  defaultLocale: 'zh-CN',
  locales: [ /* 语言列表 */ ],

  projects: {
    exclude: ['irosekai.github.io'], // 不在项目区显示（站点自身通常无信息量）
    pin: [],                         // 置顶仓库，强制排最前
    limit: 12,                       // 最多渲染多少张卡
    defaultSort: 'updated',
    sortOptions: ['updated', 'stars', 'name'],
    overrides: {
      'some-repo': {
        zh: { description: '中文简介' },
        ja: { description: '日本語の説明' },
        en: { description: 'English blurb' },
        tags: ['tool', 'rust'],
      },
    },
  },

  activity: { enabled: true, limit: 8 },

  api: {
    base: 'https://api.github.com',
    ttl: 10 * 60 * 1000,               // 会话缓存有效期
    fallback: './data/fallback.json',
  },

  features: {
    aurora: true,   // 极光背景
    sparks: true,   // 星尘粒子
    cursor: true,   // 自定义光标
    tilt: true,     // 卡片 3D 倾斜
    marquee: true,  // 跑马灯
    counters: true, // 数字滚动
  },
};
```

**关掉某个特效**：把 `features` 里对应项设为 `false` 即可，对应模块会安静退出，不会报错。

**给仓库补简介**：GitHub 上没写 description 的仓库，用 `overrides` 补全，支持按语言分别撰写。这样卡片不会显示「尚未撰写简介」。

**置顶某个仓库**：把它加进 `pin` 数组，顺序即展示顺序。

---

## 项目展示是怎么工作的

数据流是单向的，所有区块共用一次请求：

```text
main.js
  └─ data.js  ── loadOrgData()  ──┬─ sessionStorage（10 分钟 TTL + ETag）
                                  ├─ api.github.com（/orgs/:org, /repos, /events）
                                  └─ data/fallback.json（离线兜底）
                                        │
                                        ▼
                                 bus.emit('data:ready', payload)
                                        │
                        ┌───────────────┼───────────────┐
                        ▼               ▼               ▼
                   projects.js     activity.js      stats.js
```

返回的数据被统一归一化成：

```ts
{
  org:    { login, name, avatarUrl, publicRepos, followers, createdAt },
  repos:  [{ name, description, language, stars, forks, topics, url,
             updatedAt, pushedAt, createdAt, archived, license, ... }],
  events: [{ type, repoSlug, repoUrl, createdAt, commitCount, ref, action }],
  source: 'live' | 'cache' | 'stale' | 'fallback',
}
```

`source` 会驱动 UI：当数据来自缓存或快照时，项目区上方会出现一条琥珀色提示条，如实告诉访客「这是旧数据」。

**匿名 API 限流**是 60 次/小时/IP。上面的缓存策略配合条件请求（`If-None-Match`），正常访问几乎不会触碰上限。真要提额，可以在 GitHub Pages 之外加一层代理——`js/core/github.js` 里换掉 `base` 即可。

---

## 国际化

### 加一种语言

1. 复制 `i18n/en.json` 为 `i18n/ko.json` 并翻译。
2. 在 `config/site.js` 的 `locales` 里追加一项：

   ```js
   { code: 'ko', label: '한국어', short: 'KO', htmlLang: 'ko' }
   ```

3. 在 `js/core/i18n.js` 的 `normalizeLocale()` 里加一条前缀匹配：

   ```js
   if (tag.startsWith('ko')) return 'ko';
   ```

4. 在 `index.html` 与 `404.html` 的语言切换器里加一个按钮：

   ```html
   <button class="lang__btn" type="button" data-locale="ko" lang="ko">KO</button>
   ```

其余全部自动完成：词典加载、DOM 应用、`<html lang>` 同步、`?lang=ko` 深链、本地记忆。

### 词条怎么绑到 DOM

| 属性 | 作用 |
|---|---|
| `data-i18n="hero.tagline"` | 设置 `textContent` |
| `data-i18n-html="some.html"` | 设置 `innerHTML`（仅用于自己的词条，不要用于外部数据） |
| `data-i18n-attr="aria-label:a11y.nav; title:meta.title"` | 批量设置属性 |
| `data-i18n-aria="a11y.langSwitch"` | `aria-label` 的快捷写法 |

词条支持点路径与数组下标：`values.items.0.title`、`about.body.1`。

**关键设计**：`index.html` 里内联了简体中文原文。i18n 只覆盖「查到了翻译」的节点，查不到就保留原文。所以：

- 禁用 JavaScript → 显示中文原文（不是空白）
- 词典 404 → 显示中文原文
- 搜索引擎 → 抓到真实文本

### 语言探测优先级

1. URL 参数 `?lang=ja`
2. `localStorage` 里的上次选择
3. `navigator.languages`（`zh*` → `zh-CN`，`ja*` → `ja`，`en*` → `en`）
4. 默认 `zh-CN`

切换语言会同步更新 URL（用 `history.replaceState`，不刷新页面），所以链接可以直接分享特定语言版本。

---

## 扩展：加一个新区块

新增一个区块只需要两个动作。

**1. 写模块 `js/modules/contributors.js`**

```js
import { qs, esc } from '../core/dom.js';

export function initContributors({ bus, i18n }) {
  const root = qs('#js-contributors');
  if (!root) return;

  const render = (list = []) => {
    root.innerHTML = list
      .map((c) => `<li>${esc(c.login)}</li>`)
      .join('');
  };

  bus.on('data:ready', (result) => render(result.repos));
  bus.on('locale:change', () => render([]));
}

export default initContributors;
```

**2. 注册到 `js/main.js`**

```js
import { initContributors } from './modules/contributors.js';

const MODULES = [
  // …
  initContributors,
];
```

再在 HTML 里放一个 `<section id="js-contributors">`，以及在三个 i18n 文件里补上对应词条即可。

模块之间**只通过事件总线通信**，所以顺序无关紧要，单个模块抛错会被捕获并记录，不会拖垮整页（见 `main.js` 的 try/catch）。

### 现有事件

| 事件 | 载荷 | 时机 |
|---|---|---|
| `app:ready` | — | 所有模块挂载完毕 |
| `data:loading` | — | 开始请求 |
| `data:ready` | 归一化数据 | 数据就绪（含缓存命中） |
| `data:error` | `Error` | 请求彻底失败 |
| `locale:change` | `'zh-CN' \| 'ja' \| 'en'` | 语言已切换 |

---

## 设计系统

### 令牌

所有视觉决策集中在 `styles/tokens.css`：

```css
--ink-0 … --ink-4     /* 五级暗色 */
--paper / --mute      /* 文字层级 */
--violet … --rose     /* 光谱五色 */
--grad-spectrum       /* 收尾回到紫色，可无缝平铺 */
--font-display / --font-mono / --font-cjk
--fs-* / --space-* / --r-* / --ease-* / --dur-*
```

改主色只需改 `--violet` 等五个变量，全站（包括渐变、辉光、卡片顶部细线）会一起变。

### 排版

- 拉丁展示字：**Space Grotesk**
- 等宽标签：**JetBrains Mono**
- 正文拉丁：**Inter**
- **CJK 一律使用系统字体**（PingFang SC / 微软雅黑 / Hiragino / Yu Gothic），
  避免为了两个汉字下载几 MB 的字体包。

Google Fonts 用 `media="print" onload="this.media='all'"` 异步加载，不阻塞首屏渲染；`<noscript>` 里保留了同步版本。

### 动效原则

所有动效都遵循同一套降级策略：

```css
@media (prefers-reduced-motion: reduce) {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
}
```

JS 侧同样会检查 `prefersReducedMotion()`，直接渲染终态而不是动画播放。

### 无障碍清单

- 语义化标签（`header` / `main` / `section` / `footer` / `nav`）
- 跳转到主内容的链接（键盘 Tab 第一个可达）
- `.sr-only` 提供的屏幕阅读器文本（巨型字形本身是 `aria-hidden`）
- 所有交互元素有可见的 `:focus-visible` 焦点环
- 语言切换器为 `role="group"` + `aria-pressed`，支持左右方向键
- 移动菜单收起时 `visibility: hidden`，链接会退出 Tab 顺序
- 数字变化区有 `aria-live="polite"`
- 减少动态偏好下禁用粒子层与自定义光标

---

## 部署

仓库名 `<org>.github.io` 属于**组织主页**，直接从默认分支根目录发布。

1. 推送到 `main`：

   ```bash
   git add -A
   git commit -m "feat: 站点上线"
   git push origin main
   ```

2. 如果 `https://irosekai.github.io/` 没有自动生效，去仓库设置里手动开启：

   **Settings → Pages → Source: Deploy from a branch → Branch: `main` / `(root)` → Save**

3. 首次发布通常 1–2 分钟内生效。之后每次 push 到 `main` 会自动重新发布（约 30 秒）。

> **不需要** `.github/workflows`，也**不需要**构建产物分支。
> `.nojekyll` 已存在，确保 `_` 开头的文件/目录不被 Jekyll 忽略。

### 自定义域名

在仓库根目录加一个 `CNAME` 文件，内容为你的域名（例如 `irosekai.dev`），然后在 DNS 里配置 `CNAME → irosekai.github.io`，并在 Pages 设置里勾选 Enforce HTTPS。

### 404 页

`404.html` 必须使用**绝对路径**引用资源（`/styles/...`、`/js/...`）。因为 GitHub Pages 会对任意不存在的路径返回这个文件，相对路径在深层路径下会解析错误。文件内已有注释说明。

---

## 工具脚本

```bash
npm run serve      # 本地预览服务器
npm run og         # 重新生成 assets/og.png
npm run snapshot   # 刷新 data/fallback.json
```

### `tools/generate-og.mjs`

手写了 PNG 编码器（zlib + CRC32 + IHDR/IDAT/IEND），逐像素渲染光谱丝带与光环，用 4×4 Bayer 有序抖动抑制色带——比随机噪点的压缩率高一个数量级（783 KB vs 1.1 MB）。

想换成带文字的正式设计？把你的成品导出为 1200×630 PNG 覆盖 `assets/og.png` 即可，脚本可以不管。

### `tools/snapshot.mjs`

拉取组织当前状态写入 `data/fallback.json`。平时**不需要**跑——页面本身是实时的。适用的场景是：组织刚加了一批重要仓库，希望「API 挂掉时」显示的也是最新内容。

设置 `GITHUB_TOKEN` 环境变量可以避免撞限流：

```bash
GITHUB_TOKEN=ghp_xxx node tools/snapshot.mjs
```

---

## 已知限制

- **匿名 API 限流** 60 次/小时/IP。缓存已把实际请求压到很低，但极端情况下（多人共用一个出口 IP）仍可能触发，此时会显示快照 + 提示条。
- **动态流取决于 GitHub 公开事件**：组织没有任何公开活动时，动态区会显示空态文案。这是如实呈现，不是 bug。
- **`data/fallback.json` 会过期**。它只是兜底，不追求实时；需要时手动跑 `npm run snapshot`。
- **中文本地化断行**：CSS 无法像处理西文那样避免 CJK 词内断行（如「极/简」），已用 `text-wrap: pretty/balance` 尽量改善。
- **自定义光标不影响移动端**：`@media (hover: none)` 下会直接隐藏并恢复系统光标。
- **`og.png` 为抽象视觉**，不含文字。需要在社交平台显示标题的话请替换为带文字的成品图。

---

## 致谢

- 数据来自 [GitHub REST API](https://docs.github.com/rest)
- 字体来自 [Google Fonts](https://fonts.google.com/)（Space Grotesk / JetBrains Mono / Inter）
- 无第三方 JS 依赖

---

## 许可

[MIT](./LICENSE) © Irosekai

---

<p align="center">
  <sub>斓世 / Irosekai · いろせかい</sub><br>
  <sub>以代码织就，一整个斑斓世界。</sub>
</p>
