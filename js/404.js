/**
 * 404 页专用入口：只需要 i18n 与语言切换，不需要数据层与重特效。
 * 复用同一套 core，保证文案永远与主站一致。
 */

import { createBus } from './core/bus.js';
import { createI18n } from './core/i18n.js';
import { qs, qsa, on } from './core/dom.js';

const bus = createBus();
const i18n = createI18n({ bus });

function initLangButtons() {
  const wrap = qs('#js-lang');
  if (!wrap) return;

  const buttons = qsa('.lang__btn', wrap);
  const glider = qs('.lang__glider', wrap);

  function sync() {
    const current = i18n.getLocale();
    for (const button of buttons) {
      const active = button.dataset.locale === current;
      button.setAttribute('aria-pressed', String(active));
      if (active && glider) {
        glider.style.left = `${button.offsetLeft}px`;
        glider.style.width = `${button.offsetWidth}px`;
      }
    }
  }

  for (const button of buttons) {
    on(button, 'click', async () => {
      await i18n.setLocale(button.dataset.locale);
      sync();
    });
  }

  bus.on('locale:change', sync);
  window.addEventListener('resize', () => requestAnimationFrame(sync), { passive: true });
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(sync)).catch(() => {});
  }
  sync();
}

async function boot() {
  try {
    await i18n.init();
  } catch (err) {
    console.error('[404] i18n failed:', err);
  }
  initLangButtons();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
