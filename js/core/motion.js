/**
 * 动效工具集：入场、倾斜、磁吸、数字滚动。
 * 全部在 prefers-reduced-motion 下自动降级为「直接到位」。
 */

import { qsa, clamp, prefersReducedMotion } from './dom.js';

/* ── 滚动入场 ───────────────────────────────────────────────── */

export function revealOnScroll(root = document) {
  const nodes = qsa('[data-reveal]', root);
  if (!nodes.length) return;

  if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
    nodes.forEach((n) => n.classList.add('is-in'));
    return;
  }

  // 同父级内自动错峰，视觉上更整齐
  const groups = new Map();
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!groups.has(parent)) groups.set(parent, []);
    groups.get(parent).push(node);
  }
  for (const group of groups.values()) {
    group.forEach((node, i) => {
      if (node.dataset.revealDelay != null) return;
      node.style.setProperty('--reveal-delay', `${Math.min(i, 8) * 70}ms`);
    });
  }

  // IO 对每个被观察元素至少会回调一次（即使不可见），
  // 所以「是否回调过」才是判断它是否正常工作的依据。
  let observerFired = false;

  const io = new IntersectionObserver(
    (entries) => {
      observerFired = true;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.06 }
  );

  nodes.forEach((node) => io.observe(node));

  // 安全网：IO 从未回调（极旧环境）时直接全部显示，
  // 绝不让内容因为动效而永久不可见。
  setTimeout(() => {
    if (observerFired) return;
    nodes.forEach((node) => node.classList.add('is-in'));
    io.disconnect();
  }, 1500);
}

/* ── 3D 倾斜（卡片） ────────────────────────────────────────── */

const TILT_MAX = 7;

export function attachTilt(nodes, { max = TILT_MAX } = {}) {
  if (prefersReducedMotion()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  for (const node of nodes) {
    let frame = 0;
    let rx = 0;
    let ry = 0;

    const onMove = (event) => {
      const rect = node.getBoundingClientRect();
      const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
      const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);

      // 供 CSS 的柔光定位使用
      node.style.setProperty('--mx', `${px * 100}%`);
      node.style.setProperty('--my', `${py * 100}%`);

      rx = (0.5 - py) * max;
      ry = (px - 0.5) * max * 1.25;

      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        node.style.transform = `perspective(1000px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      });
    };

    const onLeave = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      node.style.transform = '';
    };

    node.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onLeave, { passive: true });
  }
}

/* ── 磁吸按钮 ───────────────────────────────────────────────── */

export function attachMagnetic(nodes, { strength = 0.22, limit = 10 } = {}) {
  if (prefersReducedMotion()) return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  for (const node of nodes) {
    const onMove = (event) => {
      const rect = node.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      node.style.transform = `translate(${clamp(dx * strength, -limit, limit)}px, ${clamp(
        dy * strength,
        -limit,
        limit
      )}px)`;
    };
    const onLeave = () => {
      node.style.transform = '';
    };

    node.addEventListener('pointermove', onMove, { passive: true });
    node.addEventListener('pointerleave', onLeave, { passive: true });
    node.addEventListener('blur', onLeave);
  }
}

/* ── 数字滚动 ───────────────────────────────────────────────── */

export function countUp(node, target, { duration = 1300, format = String, round = true } = {}) {
  if (!node) return;

  const to = Number(target) || 0;
  const finish = (value) => format(round ? Math.round(value) : value);

  if (prefersReducedMotion()) {
    node.textContent = finish(to);
    return;
  }

  const startTime = performance.now();
  let frame = 0;

  const tick = (now) => {
    const t = clamp((now - startTime) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    node.textContent = finish(to * eased);
    if (t < 1) frame = requestAnimationFrame(tick);
    else node.textContent = finish(to);
  };

  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(tick);
}

/** 只执行一次（元素进入视口时），用于统计数字 */
export function onceVisible(node, fn) {
  if (!node) return;
  if (!('IntersectionObserver' in window) || prefersReducedMotion()) {
    fn();
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        io.unobserve(entry.target);
        fn();
      }
    },
    { threshold: 0.35 }
  );
  io.observe(node);
}
