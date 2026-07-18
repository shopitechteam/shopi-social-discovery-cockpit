"use client";

import { useMemo, useState } from "react";
import {
  useContainerWidth,
  niceTicks,
  compactNumber,
  shortDay,
  pickLabelIndexes,
} from "./chart-utils";

export interface TimeSeries {
  name: string;
  /** CSS color — use a chart token, e.g. "var(--chart-1)" */
  color: string;
  values: number[];
}

interface TimeSeriesChartProps {
  /** UTC day keys ("YYYY-MM-DD"), shared by all series. */
  dates: string[];
  series: TimeSeries[];
  height?: number;
  /** "line" (default) · "area" (single-series wash) · "bars" (daily columns) */
  kind?: "line" | "area" | "bars";
  valueFormatter?: (value: number) => string;
}

const PAD = { top: 12, right: 16, bottom: 24, left: 44 };

/**
 * Dependency-free SVG time-series chart following the dataviz mark specs:
 * 2px lines, ~10%-opacity area washes, ≤24px columns with 4px rounded data-ends
 * and a 2px surface gap, hairline gridlines, crosshair + tooltip on hover, and
 * a legend for ≥2 series (a single series is named by the card title).
 */
export function TimeSeriesChart({
  dates,
  series,
  height = 220,
  kind = "line",
  valueFormatter = (v) => v.toLocaleString(),
}: TimeSeriesChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotW = Math.max(width - PAD.left - PAD.right, 0);
  const plotH = height - PAD.top - PAD.bottom;

  const { ticks, maxTick } = useMemo(() => {
    const maxValue = Math.max(1, ...series.flatMap((s) => s.values));
    const t = niceTicks(maxValue);
    return { ticks: t, maxTick: t[t.length - 1] };
  }, [series]);

  const n = dates.length;
  const x = (i: number) => (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
  const y = (v: number) => plotH - (v / maxTick) * plotH;

  const labelIndexes = useMemo(() => pickLabelIndexes(n), [n]);

  // Bars geometry: ≤24px thick, 2px surface gap between neighbours.
  const band = n > 0 ? plotW / n : 0;
  const barW = Math.min(24, Math.max(band - 2, 1));

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left - PAD.left;
    if (n === 0 || plotW === 0) return;
    const i = kind === "bars" ? Math.floor(px / band) : Math.round((px / plotW) * (n - 1));
    setHoverIndex(Math.min(Math.max(i, 0), n - 1));
  }

  const hover = hoverIndex !== null && hoverIndex < n ? hoverIndex : null;
  const hoverX = hover !== null ? (kind === "bars" ? hover * band + band / 2 : x(hover)) : 0;
  // Flip the tooltip to the left side once past the midpoint so it never clips.
  const tooltipLeft = hover !== null && width > 0 ? PAD.left + hoverX : 0;
  const tooltipFlip = hover !== null && hoverX > plotW / 2;

  return (
    <div className="relative">
      {series.length >= 2 && (
        <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-xs text-muted">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}

      <div ref={ref} className="w-full" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIndex(null)}
            role="img"
          >
            <g transform={`translate(${PAD.left},${PAD.top})`}>
              {/* Gridlines + y ticks */}
              {ticks.map((t) => (
                <g key={t}>
                  <line
                    x1={0}
                    x2={plotW}
                    y1={y(t)}
                    y2={y(t)}
                    stroke="var(--chart-grid)"
                    strokeWidth={1}
                  />
                  <text
                    x={-8}
                    y={y(t)}
                    dy="0.32em"
                    textAnchor="end"
                    className="fill-muted"
                    fontSize={11}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {compactNumber(t)}
                  </text>
                </g>
              ))}

              {/* X labels */}
              {labelIndexes.map((i) => (
                <text
                  key={i}
                  x={kind === "bars" ? i * band + band / 2 : x(i)}
                  y={plotH + 16}
                  textAnchor="middle"
                  className="fill-muted"
                  fontSize={11}
                >
                  {shortDay(dates[i])}
                </text>
              ))}

              {/* Marks */}
              {kind === "bars"
                ? series.slice(0, 1).map((s) => (
                    <g key={s.name}>
                      {s.values.map((v, i) => {
                        const h = plotH - y(v);
                        const r = Math.min(4, barW / 2, h);
                        const bx = i * band + (band - barW) / 2;
                        // Rounded data-end (top), square at the baseline.
                        const d = `M ${bx} ${plotH} V ${y(v) + r} Q ${bx} ${y(v)} ${bx + r} ${y(v)} H ${bx + barW - r} Q ${bx + barW} ${y(v)} ${bx + barW} ${y(v) + r} V ${plotH} Z`;
                        return v > 0 ? (
                          <path
                            key={i}
                            d={d}
                            fill={s.color}
                            opacity={hover === null || hover === i ? 1 : 0.45}
                          />
                        ) : null;
                      })}
                    </g>
                  ))
                : series.map((s) => {
                    const line = s.values
                      .map((v, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`)
                      .join(" ");
                    const area = `${line} L ${x(n - 1)} ${plotH} L ${x(0)} ${plotH} Z`;
                    const last = s.values.length - 1;
                    return (
                      <g key={s.name}>
                        {kind === "area" && <path d={area} fill={s.color} opacity={0.1} />}
                        <path
                          d={line}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                        {/* End marker with a 2px surface ring */}
                        {last >= 0 && (
                          <circle
                            cx={x(last)}
                            cy={y(s.values[last])}
                            r={4}
                            fill={s.color}
                            stroke="rgb(var(--color-bg-elevated))"
                            strokeWidth={2}
                          />
                        )}
                      </g>
                    );
                  })}

              {/* Crosshair + hover markers */}
              {hover !== null && (
                <g pointerEvents="none">
                  {kind !== "bars" && (
                    <line
                      x1={hoverX}
                      x2={hoverX}
                      y1={0}
                      y2={plotH}
                      stroke="rgb(var(--color-border-strong))"
                      strokeWidth={1}
                    />
                  )}
                  {kind !== "bars" &&
                    series.map((s) => (
                      <circle
                        key={s.name}
                        cx={hoverX}
                        cy={y(s.values[hover])}
                        r={4}
                        fill={s.color}
                        stroke="rgb(var(--color-bg-elevated))"
                        strokeWidth={2}
                      />
                    ))}
                </g>
              )}
            </g>
          </svg>
        )}
      </div>

      {/* Tooltip */}
      {hover !== null && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-border bg-elevated px-3 py-2 text-xs shadow-md"
          style={{
            top: PAD.top,
            left: tooltipFlip ? undefined : tooltipLeft + 10,
            right: tooltipFlip ? width - tooltipLeft + 10 : undefined,
          }}
        >
          <p className="mb-1 font-semibold text-foreground">{shortDay(dates[hover])}</p>
          {series.map((s) => (
            <p key={s.name} className="flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}:{" "}
              <span className="font-medium text-foreground">
                {valueFormatter(s.values[hover])}
              </span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
