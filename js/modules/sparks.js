/**
 * 星尘层：Canvas 粒子 + 近邻连线 + 指针排斥。
 * 目的不是炫技，而是让「世界」看起来是活的。
 * 低端设备 / 减少动态 / 小屏 会自动降低粒子数或直接退出。
 */

import { qs, prefersReducedMotion, clamp } from '../core/dom.js';

const PALETTE = [
  [124, 92, 255],
  [34, 217, 232],
  [182, 255, 92],
  [255, 179, 71],
  [255, 61, 154],
];

export function initSparks({ site }) {
  if (!site.features.sparks) return;

  const canvas = qs('#js-sparks');
  if (!canvas) return;
  if (prefersReducedMotion()) {
    canvas.remove();
    return;
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = 1;
  let particles = [];
  let frame = 0;
  let running = true;

  const pointer = { x: -9999, y: -9999, active: false };

  function particleCount() {
    const area = window.innerWidth * window.innerHeight;
    if (window.innerWidth < 640) return 26;
    return clamp(Math.round(area / 24000), 34, 96);
  }

  function seed() {
    const count = particleCount();
    particles = Array.from({ length: count }, () => {
      const color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.16,
        vy: (Math.random() - 0.5) * 0.16,
        r: Math.random() * 1.5 + 0.6,
        color,
        alpha: Math.random() * 0.45 + 0.25,
      };
    });
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!particles.length) seed();
  }

  function step() {
    if (!running) return;

    ctx.clearRect(0, 0, width, height);

    // 近邻连线
    const linkDist = width < 720 ? 96 : 132;
    for (let i = 0; i < particles.length; i += 1) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j += 1) {
        const b = particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy);
        if (dist > linkDist) continue;

        const opacity = (1 - dist / linkDist) * 0.11;
        const [r, g, bl] = a.color;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${bl}, ${opacity})`;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }

    // 粒子本体
    ctx.globalCompositeOperation = 'lighter';
    for (const p of particles) {
      // 指针排斥
      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 130 && dist > 0.01) {
          const force = (1 - dist / 130) * 0.55;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      }

      // 速度阻尼与上界
      p.vx *= 0.986;
      p.vy *= 0.986;
      p.vx = clamp(p.vx, -1.6, 1.6);
      p.vy = clamp(p.vy, -1.6, 1.6);

      p.x += p.vx;
      p.y += p.vy;

      // 环绕边界
      if (p.x < -20) p.x = width + 20;
      if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      if (p.y > height + 20) p.y = -20;

      const [r, g, bl] = p.color;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
      grad.addColorStop(0, `rgba(${r}, ${g}, ${bl}, ${p.alpha})`);
      grad.addColorStop(1, `rgba(${r}, ${g}, ${bl}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    frame = requestAnimationFrame(step);
  }

  function start() {
    if (running && !frame) frame = requestAnimationFrame(step);
  }

  function stop() {
    running = false;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  }

  resize();
  canvas.classList.add('is-ready');
  start();

  window.addEventListener('resize', () => {
    resize();
    seed();
  }, { passive: true });

  window.addEventListener(
    'pointermove',
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
    },
    { passive: true }
  );

  window.addEventListener('pointerleave', () => {
    pointer.active = false;
    pointer.x = -9999;
    pointer.y = -9999;
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      stop();
    } else {
      running = true;
      start();
    }
  });
}

export default initSparks;
