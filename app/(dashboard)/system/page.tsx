"use client";

import { DashboardPlaceholder } from "@/components/shared/dashboard-placeholder";

export default function SystemPage() {
  return (
    <DashboardPlaceholder
      eyebrow="System"
      title="Monitor platform health, pipeline failures, and operational risk"
      description="This will become the internal reliability page for media processing, auth issues, and service health across Shopi."
      readyNow={[
        "The API already exposes a health resolver for core system status.",
        "Processing, failed, and pending content states are already visible in admin analytics.",
        "Session refresh and admin auth monitoring are already easier to validate from the dashboard.",
      ]}
      plannedNext={[
        "Operational health cards for key services and dependencies",
        "Media processing and publish failure summaries",
        "Auth/session anomaly indicators for expired or failing admin access",
        "Queue-level signals for background jobs and content pipelines",
      ]}
    />
  );
}
