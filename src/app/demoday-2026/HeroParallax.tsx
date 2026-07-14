"use client";

import { useEffect, useRef } from "react";

export default function HeroParallax() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY * 0.4;
        el.style.transform = `translate3d(0, ${y}px, 0) scale(1.15)`;
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute inset-0 bg-cover bg-center will-change-transform"
      style={{
        backgroundImage: "url(/demoday-hero.jpg)",
        transform: "translate3d(0, 0, 0) scale(1.15)",
      }}
      aria-hidden
    />
  );
}
