'use client';

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
} from 'react';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Pause, Play } from 'lucide-react';
import {
  canRotateSlides,
  slideIndex,
  slideshowIntervalMs,
} from '@/lib/slideshow';

const scenes = [
  {
    id: 'homewares',
    title: 'Thoughtful homewares',
    detail: 'Every product deserves a clear path to the basket.',
    alt: 'Illustrative ceramics shop on a laptop in a sunlit home studio.',
  },
  {
    id: 'apparel',
    title: 'Independent style',
    detail: 'A buying journey that feels good on every screen.',
    alt: 'Illustrative linen clothing shop on a tablet beside folded fabric.',
  },
  {
    id: 'accessories',
    title: 'Everyday essentials',
    detail: 'Small storefront details. A more considered experience.',
    alt: 'Illustrative accessories shop on a laptop in a warm creative studio.',
  },
];

function subscribeToMotion(onChange: () => void) {
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  motion.addEventListener('change', onChange);
  return () => motion.removeEventListener('change', onChange);
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener('visibilitychange', onChange);
  return () => document.removeEventListener('visibilitychange', onChange);
}

function isPageVisible() {
  return !document.hidden;
}

// Hydration snapshots keep the server's still, disabled carousel consistent
// with the first client render before browser preferences become available.
const subscribeToHydration = () => () => {};
const hydratedSnapshot = () => true;
const serverSnapshot = () => false;
const reducedMotionServerSnapshot = () => true;

export function StorefrontSlideshow() {
  const region = useRef<HTMLElement>(null);
  const rotationBeforePointerFocus = useRef<boolean | null>(null);
  const [active, setActive] = useState(0);
  const ready = useSyncExternalStore(
    subscribeToHydration,
    hydratedSnapshot,
    serverSnapshot,
  );
  const [paused, setPaused] = useState(false);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    prefersReducedMotion,
    reducedMotionServerSnapshot,
  );
  const [hovered, setHovered] = useState(false);
  const visible = useSyncExternalStore(
    subscribeToVisibility,
    isPageVisible,
    serverSnapshot,
  );
  const [inView, setInView] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.2 },
    );
    if (region.current) observer.observe(region.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  const rotating = canRotateSlides({
    ready,
    paused,
    reducedMotion,
    hovered,
    visible,
    inView,
  });
  useEffect(() => {
    if (!rotating) return;
    const timer = window.setInterval(
      () => setActive((index) => slideIndex(index + 1, scenes.length)),
      slideshowIntervalMs,
    );
    return () => window.clearInterval(timer);
  }, [rotating]);

  function select(index: number) {
    const next = slideIndex(index, scenes.length);
    setActive(next);
    setPaused(true);
    setAnnouncement(`${next + 1} of ${scenes.length}: ${scenes[next].title}`);
  }

  function navigateWithKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      select(active + (event.key === 'ArrowRight' ? 1 : -1));
    }
  }

  return (
    <section
      ref={region}
      className="store-scene"
      aria-roledescription="carousel"
      aria-label="Online store inspiration"
      aria-describedby="store-scene-disclosure"
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="store-scene-label">
          <span className="scene-spark" aria-hidden="true" /> Behind every
          store, a good idea.
        </div>
        <div className="store-scene-depth">
          <div className="store-scene-frame">
            <div className="store-scene-images" aria-live="off">
              {scenes.map((scene, index) => (
                <figure
                  key={scene.id}
                  className="store-scene-slide"
                  data-active={index === active}
                  aria-roledescription="slide"
                  aria-label={`${index + 1} of ${scenes.length}: ${scene.title}`}
                  aria-hidden={index !== active}
                >
                  {(index === 0 || ready) && (
                    <picture>
                      <source
                        srcSet={`/images/stores/${scene.id}-640.webp 640w, /images/stores/${scene.id}-1200.webp 1200w`}
                        sizes="(min-width: 1024px) 46vw, (min-width: 640px) 85vw, 100vw"
                      />
                      <Image
                        src={`/images/stores/${scene.id}-1200.webp`}
                        alt={scene.alt}
                        width={1536}
                        height={1024}
                        unoptimized
                        loading={index === 0 ? 'eager' : 'lazy'}
                        fetchPriority={index === 0 ? 'high' : 'low'}
                        decoding="async"
                      />
                    </picture>
                  )}
                </figure>
              ))}
            </div>
            <div className="store-scene-caption">
              <div>
                <p className="store-scene-title">{scenes[active].title}</p>
                <p className="store-scene-detail">{scenes[active].detail}</p>
              </div>
              <span className="store-scene-count" aria-hidden="true">
                0{active + 1} / 03
              </span>
            </div>
          </div>
        </div>
        <div
          className="store-scene-controls"
          onFocusCapture={() => setPaused(true)}
        >
          <div
            className="flex items-center gap-1"
            aria-label="Choose a store scene"
          >
            {scenes.map((scene, index) => (
              <button
                type="button"
                key={scene.id}
                className="scene-dot"
                aria-label={`Show ${scene.title}`}
                aria-pressed={active === index}
                disabled={!ready}
                onKeyDown={navigateWithKeyboard}
                onClick={() => select(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="scene-control"
              disabled={!ready || reducedMotion}
              onKeyDown={navigateWithKeyboard}
              aria-label={
                reducedMotion
                  ? 'Automatic slideshow disabled for reduced motion'
                  : paused
                    ? 'Play slideshow'
                    : 'Pause slideshow'
              }
              onPointerDown={() => {
                rotationBeforePointerFocus.current = paused;
              }}
              onClick={() => {
                setPaused(!(rotationBeforePointerFocus.current ?? paused));
                rotationBeforePointerFocus.current = null;
              }}
            >
              {paused || reducedMotion ? (
                <Play size={15} aria-hidden="true" />
              ) : (
                <Pause size={15} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              className="scene-control"
              disabled={!ready}
              aria-label="Previous store scene"
              onKeyDown={navigateWithKeyboard}
              onClick={() => select(active - 1)}
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="scene-control"
              disabled={!ready}
              aria-label="Next store scene"
              onKeyDown={navigateWithKeyboard}
              onClick={() => select(active + 1)}
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
        <p id="store-scene-disclosure" className="store-scene-disclosure">
          AI-created illustrative stores. Not client work or testimonials.
        </p>
        <output className="sr-only" aria-live="polite">
          {announcement}
        </output>
      </div>
    </section>
  );
}
