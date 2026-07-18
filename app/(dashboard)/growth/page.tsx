"use client";

import { DashboardPlaceholder } from "@/components/shared/dashboard-placeholder";

export default function GrowthPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Growth"
      title="Track marketplace momentum beyond the headline overview"
      description="This section will expand the current analytics into a deeper operating view for retention, conversion, and supply-demand performance."
      readyNow={[
        "Overview already shows user growth, post growth, engagement, top counties, and top categories.",
        "Top creators and content-status mix are already available from admin analytics.",
        "Date-range switching is already supported in the current analytics query.",
      ]}
      plannedNext={[
        "Dedicated growth dashboard with deeper charts and filter controls",
        "Creator contribution and supply concentration analysis",
        "Funnel metrics from views to saves to conversations",
        "Retention and repeat-activity reporting once backend metrics land",
      ]}
    />
  );
}
