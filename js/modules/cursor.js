/**
 * 自定义光标：实心点即时跟随，外环缓动追赶。
 * 失败安全 —— 只有在确认 JS 与指针事件都正常时才隐藏系统光标。
 */

import { qs, prefersReducedMotion } from '../core/dom.js';

export function initCursor({ site }) {
  if (!site.features.cursor) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (prefersReducedMotion()) return;

  const wrap = qs('#js-cursor');
  if (!wrap) return;

  const dot = qs('.cursor__dot', wrap);
  const ring = qs('.cursor__ring', wrap);
  if (!dot || !ring) return;

  let targetX = 0;
  let targetY = 0;
  let ringX = 0;
  let ringY = 0;
  let dotX = 0;
  let dotY = 0;
  let frame = 0;
  let armed = false;

  const INTERACTIVE = 'a, button, [role="button"], .card, input, select, textarea, [data-cursor="hover"]';

  function tick() {
    // 外环缓动
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;
    // 内点几乎即刻
    dotX += (targetX - dotX) * 0.62;
    dotY += (targetY - dotY) * 0.62;

    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    dot.style.transform = `translate3d(${dotX}px, ${dotY}px, 0)`;

    frame = requestAnimationFrame(tick);
  }

  window.addEventListener(
    'pointermove',
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;

      if (!armed) {
        // 首次移动才接管光标，避免页面加载后光标消失却没有替代
        armed = true;
        dotX = targetX;
        dotY = targetY;
        ringX = targetX;
        ringY = targetY;
        wrap.classList.add('is-active');
        document.body.classList.add('has-custom-cursor');
        frame = requestAnimationFrame(tick);
      }

      const interactive = event.target.closest?.(INTERACTIVE);
      wrap.classList.toggle('is-hovering', Boolean(interactive));
    },
    { passive: true }
  );

  window.addEventListener('pointerdown', () => wrap.classList.add('is-pressed'), {
    passive: true,
  });
  window.addEventListener('pointerup', () => wrap.classList.remove('is-pressed'), {
    passive: true,
  });

  document.addEventListener('mouseleave', () => {
    wrap.classList.remove('is-active');
  });
  document.addEventListener('mouseenter', () => {
    if (armed) wrap.classList.add('is-active');
  });

  // 减少动画时释放光标
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener?.('change', (event) => {
    if (event.matches) {
      cancelAnimationFrame(frame);
      wrap.classList.remove('is-active');
      document.body.classList.remove('has-custom-cursor');
    }
  });
}

export default initCursor;
