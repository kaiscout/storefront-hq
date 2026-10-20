export const slideshowIntervalMs = 6500;

export function slideIndex(index: number, count: number) {
  return ((index % count) + count) % count;
}

export function canRotateSlides(state: {
  ready: boolean;
  paused: boolean;
  reducedMotion: boolean;
  hovered: boolean;
  visible: boolean;
  inView: boolean;
}) {
  return (
    state.ready &&
    !state.paused &&
    !state.reducedMotion &&
    !state.hovered &&
    state.visible &&
    state.inView
  );
}
