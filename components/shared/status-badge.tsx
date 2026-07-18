import { Badge } from "@/components/ui/badge";
import { ContentStatus } from "@/graphql/types";

const STATUS_STYLES: Record<
  ContentStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  [ContentStatus.ACTIVE]: { label: "Live", variant: "success" },
  [ContentStatus.PENDING_REVIEW]: { label: "Pending review", variant: "warning" },
  [ContentStatus.PROCESSING]: { label: "Processing", variant: "accent" },
  [ContentStatus.UNDER_REVIEW]: { label: "Hidden", variant: "secondary" },
  [ContentStatus.REJECTED]: { label: "Rejected", variant: "destructive" },
  [ContentStatus.REMOVED]: { label: "Removed", variant: "destructive" },
  [ContentStatus.DRAFT]: { label: "Draft", variant: "secondary" },
  [ContentStatus.FAILED]: { label: "Failed", variant: "destructive" },
};

export function StatusBadge({ status }: { status: ContentStatus }) {
  const style = STATUS_STYLES[status] ?? { label: status, variant: "outline" as const };
  return <Badge variant={style.variant}>{style.label}</Badge>;
}
