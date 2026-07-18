"use client";

import { useContainerWidth } from "./chart-utils";

export interface DonutDatum {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  height?: number;
  centerLabel?: string;
  centerValue?: string;
  centerHint?: string;
  valueFormatter?: (value: number) => string;
}

export function DonutChart({
  data,
  height = 260,
  centerLabel,
  centerValue,
  centerHint,
  valueFormatter = (value) => value.toLocaleString(),
}: DonutChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = Math.max(Math.min(width, height), 0);
  const stroke = 18;
  const radius = Math.max((size - stroke) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const gap = Math.min(10, circumference * 0.015);
  const segments = data.reduce<
    Array<{ key: string; color: string; dasharray: string; dashoffset: number }>
  >((acc, item) => {
    const priorLength = data
      .slice(0, acc.length)
      .reduce((sum, datum) => sum + (total > 0 ? (datum.value / total) * circumference : 0), 0);
    const rawLength = total > 0 ? (item.value / total) * circumference : 0;
    const visibleLength = Math.max(rawLength - gap, 0);
    acc.push({
      key: item.key,
      color: item.color,
      dasharray: `${visibleLength} ${Math.max(circumference - visibleLength, 0)}`,
      dashoffset: -(priorLength + gap / 2),
    });
    return acc;
  }, []);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
      <div
        ref={ref}
        className="relative mx-auto flex w-full items-center justify-center"
        style={{ height }}
      >
        {width > 0 && total > 0 && (
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img">
            <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="var(--chart-neutral-soft)"
                strokeWidth={stroke}
              />
              {segments.map((segment) => {
                return (
                  <circle
                    key={segment.key}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={segment.color}
                    strokeWidth={stroke}
                    strokeLinecap="round"
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
                  />
                );
              })}
            </g>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={Math.max(radius - stroke / 2 - 8, 0)}
              fill="rgb(var(--color-bg-elevated))"
              stroke="rgb(var(--color-border))"
              strokeWidth="1"
            />
          </svg>
        )}

        {total > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && (
              <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted">
                {centerLabel}
              </p>
            )}
            {centerValue && <p className="mt-2 text-3xl font-semibold text-foreground">{centerValue}</p>}
            {centerHint ? <p className="mt-1 text-xs text-muted">{centerHint}</p> : null}
          </div>
        )}
      </div>

      <div className="space-y-2.5">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-2xl border border-border bg-surface px-3 py-3"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span
                    className="size-2.5 rounded-full ring-4 ring-[rgb(var(--color-bg-elevated))]"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate">{item.label}</span>
                </p>
                <p className="mt-1 text-xs text-muted">{pct.toFixed(1)}% of posts</p>
              </div>
              <div className="pl-3 text-right">
                <p className="text-sm font-semibold text-foreground">{valueFormatter(item.value)}</p>
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">count</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
