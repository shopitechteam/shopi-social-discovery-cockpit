"use client";

import { DashboardPlaceholder } from "@/components/shared/dashboard-placeholder";

export default function LocationsPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Locations"
      title="See where Shopi is strongest and where supply still needs building"
      description="This section will turn your county-level marketplace signals into an operating map for expansion, promotion, and seller support."
      readyNow={[
        "Top counties are already available in admin analytics.",
        "The API already has a strong Kenya location hierarchy and search surface.",
        "Posts already capture county and place-level location metadata.",
      ]}
      plannedNext={[
        "County leaderboard for content supply and creator density",
        "Hot and under-served counties for marketplace strategy",
        "County-by-category concentration analysis",
        "Geo-performance views for creators, saves, and views",
      ]}
    />
  );
}
