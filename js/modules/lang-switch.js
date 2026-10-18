/**
 * 语言切换器：按钮组、滑块定位、aria 状态、键盘可达。
 */

import { qs, qsa, on, debounce } from '../core/dom.js';

export function initLangSwitch({ i18n, bus }) {
  const wrap = qs('#js-lang');
  if (!wrap) return;

  const buttons = qsa('.lang__btn', wrap);
  const glider = qs('.lang__glider', wrap);
  if (!buttons.length) return;

  function positionGlider(button) {
    if (!glider || !button) return;
    glider.style.left = `${button.offsetLeft}px`;
    glider.style.width = `${button.offsetWidth}px`;
  }

  function sync() {
    const current = i18n.getLocale();
    for (const button of buttons) {
      const active = button.dataset.locale === current;
      button.setAttribute('aria-pressed', String(active));
      if (active) {
        positionGlider(button);
        wrap.dataset.current = current;
      }
    }
  }

  async function choose(next) {
    if (!next || next === i18n.getLocale()) return;
    wrap.dataset.busy = 'true';
    for (const button of buttons) button.disabled = true;
    try {
      await i18n.setLocale(next);
    } catch (err) {
      console.error('[lang] switch failed:', err);
    } finally {
      for (const button of buttons) button.disabled = false;
      delete wrap.dataset.busy;
      sync();
    }
  }

  for (const button of buttons) {
    on(button, 'click', () => choose(button.dataset.locale));
  }

  // 左右方向键在按钮组内移动焦点
  on(wrap, 'keydown', (event) => {
    const index = buttons.indexOf(document.activeElement);
    if (index === -1) return;

    let nextIndex = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (index + 1) % buttons.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (index - 1 + buttons.length) % buttons.length;
    }
    if (nextIndex == null) return;

    event.preventDefault();
    buttons[nextIndex].focus();
    choose(buttons[nextIndex].dataset.locale);
  });

  bus?.on('locale:change', sync);
  window.addEventListener('resize', debounce(sync, 140), { passive: true });

  // 字体载入后按钮宽度会变，滑块需要重新对齐
  if (document.fonts?.ready) {
    document.fonts.ready.then(() => requestAnimationFrame(sync)).catch(() => {});
  }

  sync();
}

export default initLangSwitch;
