"use client";

import { compactNumber } from "./chart-utils";

export interface HorizontalBarDatum {
  key: string;
  label: string;
  value: number;
  color?: string;
}

interface HorizontalBarChartProps {
  data: HorizontalBarDatum[];
  valueFormatter?: (value: number) => string;
}

export function HorizontalBarChart({
  data,
  valueFormatter = compactNumber,
}: HorizontalBarChartProps) {
  const maxValue = Math.max(...data.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => {
        const width = `${(item.value / maxValue) * 100}%`;
        return (
          <div key={item.key} className="space-y-1.5">
            <div className="flex items-center justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-foreground">{item.label}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="font-semibold text-foreground">
                  {valueFormatter(item.value)}
                </span>
              </div>
            </div>

            <div className="relative h-3 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full"
                style={{
                  width,
                  backgroundColor: item.color ?? `var(--chart-${(index % 4) + 1})`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
