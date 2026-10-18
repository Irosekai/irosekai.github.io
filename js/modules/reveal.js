/**
 * 入场与交互绑定：滚动显现、磁吸按钮、静态卡片的倾斜。
 * 动态生成的卡片由各自模块调用同样的工具函数。
 */

import { qsa } from '../core/dom.js';
import { revealOnScroll, attachMagnetic, attachTilt } from '../core/motion.js';

export function initReveal({ site, bus }) {
  revealOnScroll();
  attachMagnetic(qsa('[data-magnetic]'));
  attachTilt(qsa('[data-tilt]'), { max: site.features.tilt ? 6 : 0 });

  // 语言切换会改变文本高度，重新观测一遍未显现的节点
  bus?.on('locale:change', () => {
    requestAnimationFrame(() => revealOnScroll());
  });
}

export default initReveal;
