"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@apollo/client/react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  HardDrive,
  LockKeyhole,
  RefreshCw,
  Server,
  ShieldAlert,
  Workflow,
} from "lucide-react";
import { ADMIN_SYSTEM_OVERVIEW } from "@/graphql/operations";
import type { AdminContent } from "@/graphql/types";
import { displayName, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type HealthResponse = {
  status: string;
  uptime: string;
  memory: string;
  services: {
    mongodb: string;
    redis: string;
    worker: string;
    mailgun: string;
    africastalking: string;
  };
  worker?: {
    apiWorkersEnabled: boolean;
    serviceOnline: boolean;
    lastHeartbeatAt?: string | null;
  };
  timestamp: string;
};

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint: string;
  tone?: "default" | "warning" | "danger" | "success";
}) {
  const iconTone = {
    default: "bg-primary-soft text-primary-strong",
    warning: "bg-warning-soft text-secondary-strong",
    danger: "bg-error-soft text-error",
    success: "bg-success-soft text-success",
  }[tone];

  return (
    <Card>
      <CardContent className="p-5">
        <div className={`flex size-11 items-center justify-center rounded-2xl ${iconTone}`}>
          <Icon className="size-5" />
        </div>
        <p className="mt-5 text-sm text-muted">{label}</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-2 text-xs text-muted">{hint}</p>
      </CardContent>
    </Card>
  );
}

function StatusDot({ healthy }: { healthy: boolean }) {
  return (
    <span
      className={`inline-flex size-2.5 rounded-full ${healthy ? "bg-success" : "bg-error"}`}
    />
  );
}

function ContentList({
  items,
  emptyLabel,
}: {
  items: AdminContent[];
  emptyLabel: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={item.id}
          className="rounded-2xl border border-border bg-background px-4 py-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">
                {item.title || item.caption || "Untitled post"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {item.processingError || item.status.replaceAll("_", " ")}
              </p>
            </div>
            <Badge variant={item.status === "FAILED" ? "destructive" : "accent"}>
              {item.status.replaceAll("_", " ")}
            </Badge>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted">
            <div className="flex items-center gap-2 min-w-0">
              <Avatar src={item.creator?.profile?.avatar} name={displayName(item.creator)} />
              <span className="truncate">{displayName(item.creator)}</span>
            </div>
            <span title={formatDate(item.createdAt)}>{formatRelative(item.createdAt)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function SystemPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<string | null>(null);

  const { data, loading, refetch } = useQuery(ADMIN_SYSTEM_OVERVIEW, {
    fetchPolicy: "cache-and-network",
  });

  async function fetchHealth() {
    setHealthLoading(true);
    setHealthError(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Health endpoint returned ${res.status}`);
      const payload = (await res.json()) as HealthResponse;
      setHealth(payload);
    } catch (error) {
      setHealthError(error instanceof Error ? error.message : "Failed to load health");
    } finally {
      setHealthLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchHealth();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([refetch(), fetchHealth()]);
    } finally {
      setRefreshing(false);
    }
  }

  const overview = data?.adminSystemOverview;
  const failingIntegrations = useMemo(
    () => overview?.integrations.filter((item) => !item.healthy) ?? [],
    [overview],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-strong">
            System
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            Keep the platform healthy before issues become visible to users
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted">
            Watch dependency health, pipeline backlogs, failed publishing, and admin auth risk in one place. The live service block below is pulled directly from the existing REST health endpoint.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void handleRefresh()}
          loading={refreshing}
        >
          {!refreshing && <RefreshCw className="size-4" />}
          {refreshing ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {loading && !overview ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-36 w-full" />
          ))}
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={Server}
              label="Dependency health"
              value={health?.status === "ok" ? "Healthy" : health?.status === "degraded" ? "Degraded" : healthLoading ? "Loading" : "Unknown"}
              hint={
                health
                  ? `REST health checked ${formatRelative(health.timestamp)}.`
                  : healthError ?? "Waiting for health endpoint."
              }
              tone={health?.status === "ok" ? "success" : "warning"}
            />
            <StatCard
              icon={Workflow}
              label="Worker service"
              value={overview.workerServiceOnline ? "Online" : "Offline"}
              hint={
                overview.workerLastHeartbeatAt
                  ? `Last heartbeat ${formatRelative(overview.workerLastHeartbeatAt)}.`
                  : "No recent worker heartbeat seen."
              }
              tone={overview.workerServiceOnline ? "success" : "warning"}
            />
            <StatCard
              icon={AlertTriangle}
              label="Failed posts"
              value={formatNumber(overview.failedContent)}
              hint="Content that failed processing or publish and may need intervention."
              tone={overview.failedContent > 0 ? "danger" : "success"}
            />
            <StatCard
              icon={LockKeyhole}
              label="Locked admin accounts"
              value={formatNumber(overview.lockedAdminAccounts)}
              hint={`${formatNumber(overview.totalAdmins)} admins exist across the cockpit.`}
              tone={overview.lockedAdminAccounts > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={ShieldAlert}
              label="Reported posts"
              value={formatNumber(overview.reportedContent)}
              hint="Reported content still waiting for moderation attention."
              tone={overview.reportedContent > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={Clock3}
              label="Pending approvals"
              value={formatNumber(overview.pendingReviewContent)}
              hint="Backlog still waiting on moderation before going live."
              tone={overview.pendingReviewContent > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={HardDrive}
              label="Processing backlog"
              value={formatNumber(overview.processingContent)}
              hint="Posts still in media processing or publish pipeline."
              tone={overview.processingContent > 0 ? "warning" : "success"}
            />
            <StatCard
              icon={CheckCircle2}
              label="Scheduled publishes"
              value={formatNumber(overview.scheduledPublishes)}
              hint={`${formatNumber(overview.failedSchedules)} failed schedules currently recorded.`}
              tone={overview.failedSchedules > 0 ? "warning" : "default"}
            />
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <Card>
              <CardHeader>
                <CardTitle>Live service health</CardTitle>
                <CardDescription>
                  Pulled from the existing REST <code>/health</code> endpoint.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {healthLoading && !health ? (
                  <div className="space-y-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Skeleton key={index} className="h-16 w-full" />
                    ))}
                  </div>
                ) : health ? (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-border bg-surface px-4 py-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-foreground">API status</p>
                          <p className="mt-1 text-xs text-muted">
                            Uptime {health.uptime} · memory {health.memory}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            API workers {health.worker?.apiWorkersEnabled ? "enabled here" : "disabled here"} · background worker service {health.worker?.serviceOnline ? "online" : "offline"}
                          </p>
                        </div>
                        <Badge variant={health.status === "ok" ? "success" : "warning"}>
                          {health.status}
                        </Badge>
                      </div>
                    </div>
                    {Object.entries(health.services).map(([key, value]) => {
                      const healthy =
                        value === "ok" || value === "configured";
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between rounded-2xl border border-border bg-background px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <StatusDot healthy={healthy} />
                            <div>
                              <p className="text-sm font-medium capitalize text-foreground">
                                {key}
                              </p>
                              <p className="text-xs text-muted">{value}</p>
                            </div>
                          </div>
                          <Badge variant={healthy ? "success" : "secondary"}>{value}</Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-muted">{healthError ?? "Health unavailable."}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Integration readiness</CardTitle>
                <CardDescription>
                  Quick view of whether background services and platform integrations are ready.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {overview.integrations.map((item) => (
                    <div
                      key={item.key}
                      className="flex items-start justify-between gap-3 rounded-2xl border border-border bg-background px-4 py-3"
                    >
                      <div className="flex items-start gap-3">
                        <StatusDot healthy={item.healthy} />
                        <div>
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <p className="mt-1 text-xs text-muted">{item.detail}</p>
                        </div>
                      </div>
                      <Badge variant={item.healthy ? "success" : "warning"}>
                        {item.healthy ? "Ready" : "Attention"}
                      </Badge>
                    </div>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl border border-border bg-surface px-4 py-3">
                  <p className="text-sm font-medium text-foreground">Deployment note</p>
                  <p className="mt-1 text-xs text-muted">
                    This API process reports <code>START_WORKERS={overview.apiWorkersEnabled ? "true" : "false"}</code>. That is separate from the real background worker service heartbeat above, so split deployments are now shown correctly.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Recent failed content</CardTitle>
                <CardDescription>
                  Newest failures first so you can inspect publish and media pipeline issues quickly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentList
                  items={overview.recentFailedContent}
                  emptyLabel="No failed content is currently recorded."
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Oldest processing items</CardTitle>
                <CardDescription>
                  Long-waiting processing jobs are often where media or publish pipelines need attention.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContentList
                  items={overview.oldestProcessingContent}
                  emptyLabel="Nothing is currently stuck in processing."
                />
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="p-8 text-sm text-muted">
            System data is not available right now.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
