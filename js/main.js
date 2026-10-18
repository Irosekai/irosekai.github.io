/**
 * 斓世 / Irosekai — 应用入口
 * ------------------------------------------------------------------
 * 启动顺序刻意保持简单：
 *   1. 先出海词条（否则首屏文案会闪）
 *   2. 依次挂载各模块（模块之间只通过事件总线通信）
 *   3. 最后才发数据请求，让骨架屏先出现
 *
 * 想加一个新区块？写一个 js/modules/xxx.js 导出 init(ctx)，
 * 然后加进下面 MODULES 数组即可，其余都不用改。
 */

import { site } from '../config/site.js';
import { createBus } from './core/bus.js';
import { createI18n } from './core/i18n.js';
import { createDataLoader } from './modules/data.js';

import { initNav } from './modules/nav.js';
import { initSparks } from './modules/sparks.js';
import { initCursor } from './modules/cursor.js';
import { initHero } from './modules/hero.js';
import { initMarquee } from './modules/marquee.js';
import { initLangSwitch } from './modules/lang-switch.js';
import { initProjects } from './modules/projects.js';
import { initActivity } from './modules/activity.js';
import { initStats } from './modules/stats.js';
import { initReveal } from './modules/reveal.js';

/** 模块注册表 —— 顺序即挂载顺序 */
const MODULES = [
  initNav,
  initSparks,
  initCursor,
  initHero,
  initMarquee,
  initLangSwitch,
  initProjects,
  initActivity,
  initStats,
  initReveal,
];

const bus = createBus();
const i18n = createI18n({ bus });
const data = createDataLoader({ bus });

const ctx = { site, bus, i18n, data, state: {} };

async function boot() {
  // 1) 语言
  try {
    await i18n.init();
  } catch (err) {
    console.error('[boot] i18n init failed:', err);
  }

  // 2) 模块
  for (const init of MODULES) {
    try {
      await init(ctx);
    } catch (err) {
      console.error(`[boot] module "${init.name}" failed:`, err);
    }
  }

  bus.emit('app:ready');

  // 3) 数据
  data.load();

  // 暴露给控制台，方便调试：window.IROSEKAI.data.refresh()
  window.IROSEKAI = {
    site,
    bus,
    i18n,
    data,
    version: '1.0.0',
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
