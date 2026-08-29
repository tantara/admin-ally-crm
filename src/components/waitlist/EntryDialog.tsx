import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WAITLIST_STATUSES, STATUS_LABEL, type WaitlistEntry, type WaitlistStatus } from "@/lib/waitlist";

export type EntryFormValues = {
  name: string;
  email: string;
  company: string;
  status: WaitlistStatus;
  source: string;
  notes: string;
  priority: number;
};

const EMPTY: EntryFormValues = {
  name: "",
  email: "",
  company: "",
  status: "pending",
  source: "",
  notes: "",
  priority: 0,
};

export function EntryDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  saving,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: WaitlistEntry | null;
  onSubmit: (values: EntryFormValues) => Promise<void>;
  saving: boolean;
}) {
  const [values, setValues] = useState<EntryFormValues>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setValues(
      entry
        ? {
            name: entry.name,
            email: entry.email,
            company: entry.company ?? "",
            status: entry.status,
            source: entry.source ?? "",
            notes: entry.notes ?? "",
            priority: entry.priority,
          }
        : EMPTY,
    );
  }, [open, entry]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{entry ? "Edit entry" : "Add to waitlist"}</DialogTitle>
          <DialogDescription>
            {entry ? "Update the details for this person." : "Manually add someone to the waitlist."}
          </DialogDescription>
        </DialogHeader>

        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void onSubmit(values);
          }}
        >
          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={values.name}
                onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
                placeholder="Ada Lovelace"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                value={values.email}
                onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))}
                placeholder="ada@example.com"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={values.company}
                onChange={(e) => setValues((v) => ({ ...v, company: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="source">Source</Label>
              <Input
                id="source"
                value={values.source}
                onChange={(e) => setValues((v) => ({ ...v, source: e.target.value }))}
                placeholder="Landing page"
              />
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 sm:gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="status">Status</Label>
              <Select
                value={values.status}
                onValueChange={(value) => setValues((v) => ({ ...v, status: value as WaitlistStatus }))}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WAITLIST_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="priority">Priority</Label>
              <Input
                id="priority"
                type="number"
                min={0}
                max={10}
                value={values.priority}
                onChange={(e) => setValues((v) => ({ ...v, priority: Number(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              rows={3}
              value={values.notes}
              onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : entry ? "Save changes" : "Add entry"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
