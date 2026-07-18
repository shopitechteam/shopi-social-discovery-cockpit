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
  valueFormatter?: (value: number) => string;
}

export function DonutChart({
  data,
  height = 260,
  centerLabel,
  centerValue,
  valueFormatter = (value) => value.toLocaleString(),
}: DonutChartProps) {
  const { ref, width } = useContainerWidth<HTMLDivElement>();
  const total = data.reduce((sum, item) => sum + item.value, 0);
  const size = Math.max(Math.min(width, height), 0);
  const stroke = 22;
  const radius = Math.max((size - stroke) / 2, 0);
  const circumference = 2 * Math.PI * radius;
  const segments = data.reduce<
    Array<{ key: string; color: string; dasharray: string; dashoffset: number }>
  >((acc, item) => {
    const priorLength = acc.reduce((sum, segment) => {
      const [length] = segment.dasharray.split(" ");
      return sum + Number(length);
    }, 0);
    const length = total > 0 ? (item.value / total) * circumference : 0;
    acc.push({
      key: item.key,
      color: item.color,
      dasharray: `${length} ${Math.max(circumference - length, 0)}`,
      dashoffset: -priorLength,
    });
    return acc;
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-center">
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
                    strokeLinecap="butt"
                    strokeDasharray={segment.dasharray}
                    strokeDashoffset={segment.dashoffset}
                  />
                );
              })}
            </g>
          </svg>
        )}

        {total > 0 && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {centerLabel && <p className="text-xs uppercase tracking-[0.18em] text-muted">{centerLabel}</p>}
            {centerValue && <p className="text-2xl font-semibold text-foreground">{centerValue}</p>}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {data.map((item) => {
          const pct = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <span className="size-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="truncate">{item.label}</span>
                </p>
                <p className="text-xs text-muted">{pct.toFixed(1)}%</p>
              </div>
              <p className="pl-3 text-sm font-semibold text-foreground">
                {valueFormatter(item.value)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
