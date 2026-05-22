import { Injectable } from '@angular/core';
import { animate, stagger, createTimeline } from 'animejs';

export const EASING = {
  out: 'outCubic',
  outExpo: 'outExpo',
  outBack: 'outBack',
  inOut: 'inOutCubic',
  spring: 'spring(1, 90, 12, 0)'
} as const;

export const DUR = { xs: 250, sm: 350, md: 500, lg: 700 } as const;

@Injectable({ providedIn: 'root' })
export class AnimationService {

  fadeUp(targets: string | Element | NodeList, delay = 0, duration = DUR.md) {
    animate(targets as any, {
      opacity: [0, 1],
      translateY: [20, 0],
      duration,
      ease: EASING.out,
      delay
    });
  }

  fadeIn(targets: string | Element | NodeList, delay = 0) {
    animate(targets as any, {
      opacity: [0, 1],
      duration: DUR.sm,
      ease: EASING.out,
      delay
    });
  }

  scaleIn(targets: string | Element | NodeList, delay = 0) {
    animate(targets as any, {
      opacity: [0, 1],
      scale: [0.92, 1],
      duration: DUR.sm,
      ease: EASING.outBack,
      delay
    });
  }

  slideInLeft(targets: string | Element | NodeList, delay = 0) {
    animate(targets as any, {
      opacity: [0, 1],
      translateX: [-24, 0],
      duration: DUR.md,
      ease: EASING.out,
      delay
    });
  }

  staggerFadeUp(targets: string | NodeList, staggerMs = 70, delay = 0) {
    animate(targets as any, {
      opacity: [0, 1],
      translateY: [16, 0],
      duration: DUR.md,
      ease: EASING.out,
      delay: stagger(staggerMs, { start: delay })
    });
  }

  staggerScaleIn(targets: string | NodeList, staggerMs = 60) {
    animate(targets as any, {
      opacity: [0, 1],
      scale: [0.88, 1],
      duration: DUR.sm,
      ease: EASING.outBack,
      delay: stagger(staggerMs)
    });
  }

  entrance(containerEl: Element) {
    const tl = createTimeline({ defaults: { ease: EASING.out } });
    const children = Array.from(containerEl.querySelectorAll('[data-anim]'));
    if (!children.length) return;
    children.forEach((el, i) => {
      tl.add(el as any, {
        opacity: [0, 1],
        translateY: [16, 0],
        duration: DUR.md
      }, i * 80);
    });
    return tl;
  }

  pulse(target: string | Element) {
    animate(target as any, {
      scale: [1, 1.04, 1],
      duration: 400,
      ease: EASING.inOut
    });
  }

  // Hide elements before animating them in
  hide(targets: string | NodeList | Element[]) {
    const els = typeof targets === 'string'
      ? document.querySelectorAll(targets)
      : targets;
    (els as NodeList).forEach((el: any) => { el.style.opacity = '0'; });
  }
}
