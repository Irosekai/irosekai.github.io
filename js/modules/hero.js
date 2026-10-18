/**
 * 英雄区：指针视差 + 滚动视差。
 * 位移量刻意很小——目标是「有呼吸感」，不是晕。
 */

import { qs, clamp, prefersReducedMotion, rafThrottle } from '../core/dom.js';

export function initHero() {
  const hero = qs('#top');
  if (!hero) return;

  const glow = qs('#js-hero-glow');
  const word = qs('.hero__word');
  const latin = qs('.hero__latin');

  if (prefersReducedMotion()) return;

  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ── 指针视差 ── */
  if (finePointer && (glow || word)) {
    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let frame = 0;

    const tick = () => {
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;

      if (glow) {
        glow.style.transform = `translate(calc(-50% + ${currentX * 42}px), calc(-50% + ${currentY * 30}px))`;
      }
      if (word) {
        word.style.transform = `translate3d(${currentX * 12}px, ${currentY * 9}px, 0)`;
      }
      if (latin) {
        latin.style.transform = `translate3d(${currentX * -7}px, ${currentY * -5}px, 0)`;
      }

      frame = requestAnimationFrame(tick);
    };

    window.addEventListener(
      'pointermove',
      (event) => {
        targetX = clamp((event.clientX / window.innerWidth - 0.5) * 2, -1, 1);
        targetY = clamp((event.clientY / window.innerHeight - 0.5) * 2, -1, 1);
        if (!frame) frame = requestAnimationFrame(tick);
      },
      { passive: true }
    );

    document.addEventListener('visibilitychange', () => {
      if (document.hidden && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
    });
  }

  /* ── 滚动视差（仅光晕，避免文字糊掉） ── */
  if (glow) {
    const onScroll = rafThrottle(() => {
      const y = Math.min(window.scrollY, window.innerHeight);
      const ratio = y / (window.innerHeight || 1);
      glow.style.opacity = String(clamp(1 - ratio * 0.85, 0.12, 1));
    });
    window.addEventListener('scroll', onScroll, { passive: true });
  }
}

export default initHero;
