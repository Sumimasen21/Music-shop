"use client";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "./hero-slider.module.css";

const SLIDE_DURATION = 5000;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(onChange: () => void) {
  const media = window.matchMedia(MOTION_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function subscribeToVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

type HeroSlide = {
  id: string;
  label: string;
  content: ReactNode;
  image: ReactNode;
};

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [cycle, setCycle] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocused, setKeyboardFocused] = useState(false);
  const remaining = useRef(SLIDE_DURATION);
  const reducedMotion = useSyncExternalStore(
    subscribeToMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => true,
  );
  const pageVisible = useSyncExternalStore(
    subscribeToVisibility,
    () => document.visibilityState === "visible",
    () => true,
  );
  const playing = !hovered && !keyboardFocused && !reducedMotion && pageVisible;

  useEffect(() => {
    remaining.current = SLIDE_DURATION;
  }, [activeIndex, cycle]);

  useEffect(() => {
    if (!playing || slides.length < 2) return;
    const started = performance.now();
    const timer = window.setTimeout(
      () => setActiveIndex((index) => (index + 1) % slides.length),
      remaining.current,
    );
    return () => {
      window.clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (performance.now() - started),
      );
    };
  }, [activeIndex, cycle, playing, slides.length]);

  function selectSlide(index: number) {
    setActiveIndex((index + slides.length) % slides.length);
    setCycle((value) => value + 1);
  }

  return (
    <section
      className={`container-shell ${styles.carousel}`}
      aria-label="Подборки музыкальных инструментов"
      aria-roledescription="карусель"
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={(event) =>
        setKeyboardFocused(
          event.target instanceof Element &&
            event.target.matches(":focus-visible"),
        )
      }
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setKeyboardFocused(false);
      }}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault();
          selectSlide(activeIndex + (event.key === "ArrowLeft" ? -1 : 1));
        }
      }}
    >
      <h1 className="sr-only">Найдите своё звучание в MinistryOfMusic</h1>
      <div className={styles.viewport} aria-live={playing ? "off" : "polite"}>
        {slides.map((slide, index) => (
          <div
            key={slide.id}
            id={slide.id}
            className={`${styles.slide} ${index === activeIndex ? styles.active : ""}`}
            role="group"
            aria-roledescription="слайд"
            aria-label={`${index + 1} из ${slides.length}: ${slide.label}`}
            aria-hidden={index !== activeIndex}
            inert={index !== activeIndex}
          >
            <div className={styles.panel}>
              {slide.content}
              <div className={styles.image}>{slide.image}</div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.navigation}>
        <button
          type="button"
          className={styles.controlButton}
          aria-label="Предыдущий слайд"
          onClick={() => selectSlide(activeIndex - 1)}
        >
          <ChevronLeft size={22} />
        </button>
        <button
          type="button"
          className={styles.controlButton}
          aria-label="Следующий слайд"
          onClick={() => selectSlide(activeIndex + 1)}
        >
          <ChevronRight size={22} />
        </button>
      </div>
      <div
        className={styles.indicators}
        role="group"
        aria-label="Выбрать слайд"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.id}
            type="button"
            className={styles.indicator}
            aria-label={`Показать: ${slide.label}`}
            aria-controls={slide.id}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => selectSlide(index)}
          >
            <span className={styles.track}>
              <span
                key={`${slide.id}-${index === activeIndex ? `active-${cycle}` : "idle"}`}
                className={`${styles.fill} ${index === activeIndex ? styles.filling : ""}`}
                style={{
                  animationDuration: `${SLIDE_DURATION}ms`,
                  animationPlayState: playing ? "running" : "paused",
                }}
              />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
