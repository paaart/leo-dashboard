"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  EmptyState,
  LoadingState,
  SectionCard,
} from "@/components/shared/DashboardUI";
import { badgeClass, buttonPrimary, buttonSecondary } from "@/components/shared/ui";
import {
  listInventoryAssignments,
  listInventoryBranches,
  setInventoryAssignments,
} from "@/lib/inventory/client";
import type { InventoryAssignment, InventoryBranch } from "@/lib/inventory/types";

const chipBase =
  "rounded-full border px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";
const chipOn = `${chipBase} border-accent/40 bg-accent-soft text-accent-soft-fg`;
const chipOff = `${chipBase} border-edge bg-surface text-fg-muted hover:bg-surface-2 hover:text-fg`;

function sameSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((id) => set.has(id));
}

export default function SetupAssignments() {
  const [users, setUsers] = useState<InventoryAssignment[]>([]);
  const [branches, setBranches] = useState<InventoryBranch[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rows, activeBranches] = await Promise.all([
          listInventoryAssignments(),
          listInventoryBranches(),
        ]);
        setUsers(rows);
        setBranches(activeBranches);
        setDrafts(Object.fromEntries(rows.map((u) => [u.profileId, u.branchIds])));
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not load branch staff");
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const toggle = (profileId: string, branchId: string) => {
    setDrafts((prev) => {
      const current = prev[profileId] ?? [];
      const next = current.includes(branchId)
        ? current.filter((id) => id !== branchId)
        : [...current, branchId];
      return { ...prev, [profileId]: next };
    });
  };

  const save = async (u: InventoryAssignment) => {
    setSavingId(u.profileId);
    try {
      const row = await setInventoryAssignments(u.profileId, drafts[u.profileId] ?? []);
      setUsers((prev) => prev.map((x) => (x.profileId === row.profileId ? row : x)));
      setDrafts((prev) => ({ ...prev, [row.profileId]: row.branchIds }));
      toast.success("Assignments saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save assignments");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading branch staff" />;

  return (
    <SectionCard
      title="Branch staff"
      description="Who can report stock for which branches. A person can cover more than one branch. Accounts are created and approved as “Branch staff” in User Management."
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/25 bg-accent-soft p-3">
        <p className="text-sm text-accent-soft-fg">
          Need a new person? Create their account in User Management, then approve them as Branch staff.
        </p>
        <Link href="/dashboard/users" className={buttonSecondary}>
          Create branch staff user
        </Link>
      </div>
      {users.length === 0 ? (
        <EmptyState
          title="No branch-staff users yet"
          description="Approve a user as Branch staff in User Management, then assign their branches here."
        />
      ) : (
        <ul className="divide-y divide-edge">
          {users.map((u) => {
            const draft = drafts[u.profileId] ?? [];
            const dirty = !sameSet(draft, u.branchIds);
            const busy = savingId === u.profileId;

            return (
              <li
                key={u.profileId}
                className={`flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between ${
                  u.status === "active" ? "" : "opacity-60"
                }`}
              >
                <div className="min-w-0 sm:w-56 sm:shrink-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {u.fullName || u.username}
                  </p>
                  <p className="truncate text-xs text-fg-muted">{u.email}</p>
                  {u.status !== "active" ? (
                    <span className={`mt-1.5 ${badgeClass("neutral")}`}>Inactive</span>
                  ) : null}
                </div>

                <div className="flex flex-1 flex-wrap gap-2">
                  {branches.map((b) => {
                    const on = draft.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggle(u.profileId, b.id)}
                        disabled={busy}
                        aria-pressed={on}
                        className={on ? chipOn : chipOff}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                  {branches.length === 0 ? (
                    <p className="text-sm text-fg-muted">No active branches to assign.</p>
                  ) : null}
                </div>

                <div className="sm:shrink-0">
                  <button
                    type="button"
                    onClick={() => void save(u)}
                    disabled={busy || !dirty}
                    className={`${buttonPrimary} px-3 py-1.5 text-xs`}
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
