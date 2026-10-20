import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';
import {
  canRotateSlides,
  slideIndex,
  slideshowIntervalMs,
} from '../lib/slideshow.ts';

void test('slideshow wraps in both directions', () => {
  assert.equal(slideIndex(-1, 3), 2);
  assert.equal(slideIndex(3, 3), 0);
  assert.equal(slideIndex(1, 3), 1);
});

void test('rotation stops for reduced motion, manual pause, focus pause, hover, hidden tabs and offscreen slides', () => {
  const active = {
    ready: true,
    paused: false,
    reducedMotion: false,
    hovered: false,
    visible: true,
    inView: true,
  };
  assert.equal(canRotateSlides(active), true);
  for (const key of ['paused', 'reducedMotion', 'hovered'] as const)
    assert.equal(canRotateSlides({ ...active, [key]: true }), false, key);
  for (const key of ['ready', 'visible', 'inView'] as const)
    assert.equal(canRotateSlides({ ...active, [key]: false }), false, key);
  assert.ok(slideshowIntervalMs >= 6000);
});

void test('photo assets are local, responsive and small; illustrative status is explicit', () => {
  for (const name of ['homewares', 'apparel', 'accessories']) {
    for (const width of [640, 1200]) {
      const asset = new URL(
        `../public/images/stores/${name}-${width}.webp`,
        import.meta.url,
      );
      const bytes = readFileSync(asset);
      assert.equal(new TextDecoder().decode(bytes.slice(8, 12)), 'WEBP');
      assert.ok(
        statSync(asset).size < 250_000,
        `${name}-${width} must stay below 250KB`,
      );
    }
  }
  const source = readFileSync(
    new URL('../components/storefront-slideshow.tsx', import.meta.url),
    'utf8',
  );
  assert.match(
    source,
    /AI-created illustrative stores\. Not client work or testimonials\./,
  );
  assert.match(source, /onFocusCapture/);
  assert.match(source, /Previous store scene/);
  assert.match(source, /Next store scene/);
  assert.match(source, /aria-pressed/);
  assert.doesNotMatch(source, /https?:\/\//);
});
