"use client";

import { DashboardPlaceholder } from "@/components/shared/dashboard-placeholder";

export default function ConversationsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Conversations"
      title="Surface buyer intent, response quality, and closed deals"
      description="Direct messages are where real commerce happens on Shopi. This section is reserved for the admin-wide conversation and deal view."
      readyNow={[
        "The API already supports unread counts, deal marking, reporting, and blocking inside direct conversations.",
        "Conversation health is one of the strongest next commercial signals to expose.",
        "Users and posts are already browsable from the admin for manual investigation.",
      ]}
      plannedNext={[
        "Platform-wide conversation inbox for admins",
        "Reported conversation and participant review queue",
        "Deal-marked conversation metrics and seller response health",
        "Commercial-intent views linking conversations back to creators and listings",
      ]}
    />
  );
}
