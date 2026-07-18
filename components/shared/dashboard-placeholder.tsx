"use client";

import { Clock3, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
  readyNow,
  plannedNext,
}: {
  eyebrow: string;
  title: string;
  description: string;
  readyNow: string[];
  plannedNext: string[];
}) {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
          {eyebrow}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted">{description}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Next build surface</CardTitle>
                <CardDescription>
                  This section is scaffolded in the admin and ready for the backend-backed workflows next.
                </CardDescription>
              </div>
              <Badge variant="outline">
                <Clock3 className="mr-1 size-3" />
                Planned
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {plannedNext.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-background px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-2xl bg-primary-soft text-primary-strong">
                <Sparkles className="size-4" />
              </div>
              <div>
                <CardTitle>Already supported today</CardTitle>
                <CardDescription>
                  These adjacent workflows already exist in the current admin and API.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {readyNow.map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-border bg-elevated px-4 py-3 text-sm text-foreground"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
