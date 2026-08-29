import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Search, Trash2, LogOut } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  STATUS_CLASS,
  STATUS_LABEL,
  WAITLIST_STATUSES,
  formatDate,
  type WaitlistEntry,
  type WaitlistStatus,
} from "@/lib/waitlist";
import { EntryDialog, type EntryFormValues } from "@/components/waitlist/EntryDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Waitlist Console — Admin CRM" },
      {
        name: "description",
        content: "Track, triage and update every waitlist signup from one admin dashboard.",
      },
      { property: "og:title", content: "Waitlist Console — Admin CRM" },
      {
        property: "og:description",
        content: "Track, triage and update every waitlist signup from one admin dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ConsolePage,
});

function toPayload(values: EntryFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    company: values.company.trim() || null,
    status: values.status,
    source: values.source.trim() || null,
    notes: values.notes.trim() || null,
    priority: values.priority,
  };
}

function ConsolePage() {
  const { session, isAdmin, loading } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<WaitlistStatus | "all">("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<WaitlistEntry | null>(null);
  const [pendingDelete, setPendingDelete] = useState<WaitlistEntry | null>(null);

  const enabled = Boolean(session) && isAdmin;

  const entriesQuery = useQuery({
    queryKey: ["waitlist"],
    enabled,
    queryFn: async (): Promise<WaitlistEntry[]> => {
      const { data, error } = await supabase
        .from("waitlist_entries")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WaitlistEntry[];
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["waitlist"] });

  const saveMutation = useMutation({
    mutationFn: async (values: EntryFormValues) => {
      const payload = toPayload(values);
      if (editing) {
        const { error } = await supabase
          .from("waitlist_entries")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("waitlist_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: async () => {
      toast.success(editing ? "Entry updated" : "Entry added");
      setDialogOpen(false);
      setEditing(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: WaitlistStatus }) => {
      const { error } = await supabase.from("waitlist_entries").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Status updated");
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("waitlist_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: async () => {
      toast.success("Entry removed");
      setPendingDelete(null);
      await invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const entries = entriesQuery.data ?? [];

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesTerm =
        !term ||
        [entry.name, entry.email, entry.company ?? "", entry.source ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [entries, search, statusFilter]);

  const stats = useMemo(() => {
    const counts: Record<string, number> = { total: entries.length };
    for (const status of WAITLIST_STATUSES) {
      counts[status] = entries.filter((e) => e.status === status).length;
    }
    return counts;
  }, [entries]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="mt-6 h-64 w-full" />
      </main>
    );
  }

  if (!session || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="panel max-w-md p-8 text-center">
          <p className="label-caps">Waitlist Console</p>
          <h1 className="mt-2 text-2xl font-semibold">
            {session ? "Admin access required" : "Sign in to manage the waitlist"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {session
              ? "Your account doesn't have admin rights yet. Ask an existing admin to grant access."
              : "This console is for admins only. Sign in to view, add and triage waitlist signups."}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            {session ? (
              <Button variant="secondary" onClick={() => void supabase.auth.signOut()}>
                Sign out
              </Button>
            ) : (
              <Button asChild>
                <Link to="/auth">Sign in</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="label-caps">Admin CRM</p>
          <h1 className="mt-1 text-3xl font-semibold">Waitlist Console</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Signed in as {session.user.email}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" /> Add entry
          </Button>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={() => void supabase.auth.signOut()}>
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="Total" value={stats["total"] ?? 0} />
        {WAITLIST_STATUSES.map((status) => (
          <StatCard key={status} label={STATUS_LABEL[status]} value={stats[status] ?? 0} />
        ))}
      </section>

      <section className="panel mt-6 overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-border p-4">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search name, email, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value as WaitlistStatus | "all")}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {WAITLIST_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {STATUS_LABEL[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {entriesQuery.isLoading ? (
          <div className="space-y-3 p-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No entries match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="font-medium">{entry.name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{entry.email}</div>
                      {entry.notes ? (
                        <div className="mt-1 max-w-64 truncate text-xs text-muted-foreground/80">
                          {entry.notes}
                        </div>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{entry.company ?? "—"}</TableCell>
                    <TableCell className="text-sm">{entry.source ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatDate(entry.created_at)}</TableCell>
                    <TableCell className="text-sm">{entry.priority}</TableCell>
                    <TableCell>
                      <Select
                        value={entry.status}
                        onValueChange={(value) =>
                          statusMutation.mutate({ id: entry.id, status: value as WaitlistStatus })
                        }
                      >
                        <SelectTrigger className="h-8 w-36 border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge variant="outline" className={STATUS_CLASS[entry.status]}>
                            {STATUS_LABEL[entry.status]}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {WAITLIST_STATUSES.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABEL[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Edit entry"
                        onClick={() => {
                          setEditing(entry);
                          setDialogOpen(true);
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete entry"
                        onClick={() => setPendingDelete(entry)}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <EntryDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        entry={editing}
        saving={saveMutation.isPending}
        onSubmit={async (values) => {
          await saveMutation.mutateAsync(values).catch(() => undefined);
        }}
      />

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.email} will be permanently removed from the waitlist.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4">
      <p className="label-caps">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
