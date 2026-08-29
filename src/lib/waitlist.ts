export const WAITLIST_STATUSES = ["pending", "invited", "approved", "rejected"] as const;

export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

export type WaitlistEntry = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: WaitlistStatus;
  source: string | null;
  notes: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
};

export const STATUS_LABEL: Record<WaitlistStatus, string> = {
  pending: "Pending",
  invited: "Invited",
  approved: "Approved",
  rejected: "Rejected",
};

export const STATUS_CLASS: Record<WaitlistStatus, string> = {
  pending: "border-status-pending/40 text-status-pending bg-status-pending/10",
  invited: "border-status-invited/40 text-status-invited bg-status-invited/10",
  approved: "border-status-approved/40 text-status-approved bg-status-approved/10",
  rejected: "border-status-rejected/40 text-status-rejected bg-status-rejected/10",
};

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
