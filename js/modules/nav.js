/**
 * 导航：滚动态、下滑隐藏、移动菜单、当前区块高亮、顶部进度条。
 */

import { qs, qsa, rafThrottle, on } from '../core/dom.js';

export function initNav({ bus, i18n }) {
  const nav = qs('#nav');
  if (!nav) return;

  const progress = qs('#js-progress');
  const toggle = qs('#navToggle');
  const mobile = qs('#navMobile');

  let lastY = window.scrollY;
  let open = false;

  /* ── 滚动状态 ── */
  const onScroll = rafThrottle(() => {
    const y = window.scrollY;

    // 玻璃拟态
    nav.classList.toggle('nav--scrolled', y > 24);

    // 下滑隐藏（仅在大幅滚动且菜单未开时）
    if (!open && y > 220) {
      nav.classList.toggle('nav--hidden', y > lastY + 6);
    } else {
      nav.classList.remove('nav--hidden');
    }

    // 进度条
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(y / max, 1) : 0;
      progress.style.transform = `scaleX(${ratio})`;
    }

    lastY = y;
  });

  on(window, 'scroll', onScroll, { passive: true });
  onScroll();

  /* ── 移动端菜单 ── */
  function setOpen(next) {
    open = next;
    nav.classList.toggle('nav--open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    if (mobile) mobile.setAttribute('aria-hidden', String(!open));
    document.body.style.overflow = open ? 'hidden' : '';
  }

  if (toggle) {
    on(toggle, 'click', () => setOpen(!open));
  }

  // 点击菜单内链接后自动收起
  qsa('a', mobile || nav).forEach((link) => {
    on(link, 'click', () => {
      if (open) setOpen(false);
    });
  });

  on(document, 'keydown', (event) => {
    if (event.key === 'Escape' && open) setOpen(false);
  });

  // 视口变宽时复位
  const mq = window.matchMedia('(min-width: 880px)');
  mq.addEventListener?.('change', (event) => {
    if (event.matches && open) setOpen(false);
  });

  /* ── 当前区块高亮 ── */
  const links = qsa('.nav__links a[href^="#"]');
  const sections = links
    .map((link) => {
      const id = link.getAttribute('href').slice(1);
      return { link, section: document.getElementById(id) };
    })
    .filter((item) => item.section);

  if (sections.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.id;
          for (const { link, section } of sections) {
            const active = section.id === id;
            link.dataset.active = String(active);
            if (active) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
          }
        }
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 }
    );
    sections.forEach(({ section }) => io.observe(section));
  }

  // 语言切换后重新同步一次（导航文案长度会变化）
  bus?.on('locale:change', () => onScroll());
}

export default initNav;
