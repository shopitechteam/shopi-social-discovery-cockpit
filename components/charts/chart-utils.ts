"use client";

import { useEffect, useRef, useState } from "react";

/** Observe a container's width so SVG charts render crisp at any size. */
export function useContainerWidth<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      setWidth(Math.floor(w));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

/**
 * "Nice" axis ticks: 0..max rounded up to a clean step (1/2/2.5/5 × 10ⁿ).
 * Returns ~`count` ticks including 0 and the padded max.
 */
export function niceTicks(maxValue: number, count = 4): number[] {
  if (maxValue <= 0) return [0, 1];
  const rawStep = maxValue / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const residual = rawStep / magnitude;
  const step =
    residual <= 1 ? magnitude
    : residual <= 2 ? 2 * magnitude
    : residual <= 2.5 ? 2.5 * magnitude
    : residual <= 5 ? 5 * magnitude
    : 10 * magnitude;
  const top = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return ticks;
}

/** 1284 → "1.3K", 4200000 → "4.2M" — for axis ticks and compact labels. */
export function compactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(value)}`;
}

/** "2026-07-18" → "18 Jul" */
export function shortDay(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

/** Evenly-spaced index picks for x-axis labels (always includes first + last). */
export function pickLabelIndexes(length: number, maxLabels = 6): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, i) => i);
  const step = (length - 1) / (maxLabels - 1);
  const picked = new Set<number>();
  for (let i = 0; i < maxLabels; i++) picked.add(Math.round(i * step));
  return [...picked].sort((a, b) => a - b);
}
