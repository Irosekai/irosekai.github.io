/**
 * 跑马灯：把 i18n 里的一行字拆成若干段，复制成两份实现无缝循环。
 * 语言切换时整体重建。
 */

import { qs, esc } from '../core/dom.js';

export function initMarquee({ site, i18n, bus }) {
  if (!site.features.marquee) return;

  const track = qs('#js-marquee');
  if (!track) return;

  /** 半份内容需要足够宽才能盖住视口，这里用重复次数保证 */
  const REPEAT = 2;

  function build() {
    const line = i18n.t('marquee.line') || 'IROSEKAI';
    const parts = line
      .split(/[·・|]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const segments = parts.length ? parts : [line];

    const half = Array.from({ length: REPEAT })
      .flatMap(() => segments)
      .map(
        (text) =>
          `<span class="marquee__item"><span>${esc(text)}</span><span class="marquee__dot"></span></span>`
      )
      .join('');

    // 两份完全相同的半份 → translateX(-50%) 即可无缝
    track.innerHTML = half + half;
  }

  build();
  bus?.on('locale:change', build);
}

export default initMarquee;
