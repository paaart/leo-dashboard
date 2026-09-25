"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  EmptyState,
  LoadingState,
  SectionCard,
} from "@/components/shared/DashboardUI";
import {
  badgeClass,
  buttonPrimary,
  buttonSecondary,
  fieldHint,
  fieldLabel,
  inputField,
  tableBase,
  tableHead,
  tableHeadCell,
  tableRow,
  tableWrapper,
} from "@/components/shared/ui";
import {
  createInventoryBranch,
  listInventoryBranches,
  updateInventoryBranch,
} from "@/lib/inventory/client";
import type { InventoryBranch } from "@/lib/inventory/types";

const rowInput =
  "h-9 w-full rounded-lg border border-edge bg-surface px-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25";

export default function SetupBranches() {
  const [branches, setBranches] = useState<InventoryBranch[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listInventoryBranches({ includeInactive: true });
      setBranches(rows);
      setNames(Object.fromEntries(rows.map((b) => [b.id, b.name])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load branches");
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleAdd = async () => {
    setAdding(true);
    try {
      const row = await createInventoryBranch({ name: newName.trim() });
      setBranches((prev) => [...prev, row]);
      setNames((prev) => ({ ...prev, [row.id]: row.name }));
      setNewName("");
      toast.success("Branch added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add branch");
    } finally {
      setAdding(false);
    }
  };

  const patchBranch = async (
    b: InventoryBranch,
    patch: Parameters<typeof updateInventoryBranch>[1],
    successMessage: string
  ) => {
    setSavingId(b.id);
    try {
      const row = await updateInventoryBranch(b.id, patch);
      // Making a branch central un-flags the previous one, so reload the list
      // rather than patching a single row.
      if (patch.isCentral) {
        await load();
      } else {
        setBranches((prev) => prev.map((x) => (x.id === row.id ? row : x)));
        setNames((prev) => ({ ...prev, [row.id]: row.name }));
      }
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update branch");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading branches" />;

  return (
    <>
      <SectionCard
        title="Add branch"
        description="Every location that holds packaging material."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-2">
            <label className={fieldLabel}>Branch name</label>
            <input
              type="text"
              className={inputField}
              placeholder="e.g. Mysuru"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <p className={fieldHint}>
              Deactivated branches keep their history but stop appearing in stock forms.
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-edge pt-5">
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !newName.trim()}
            className={buttonPrimary}
          >
            {adding ? "Adding…" : "Add branch"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Branches"
        description="The central store is where vendor purchases arrive and dispatches to other branches leave from. There is always exactly one."
      >
        {branches.length === 0 ? (
          <EmptyState title="No branches yet" description="Add the branches that hold stock." />
        ) : (
          <div className={tableWrapper}>
            <table className={`${tableBase} min-w-[640px]`}>
              <thead className={tableHead}>
                <tr>
                  <th className={tableHeadCell}>Branch</th>
                  <th className={`${tableHeadCell} w-40`}>Role</th>
                  <th className={`${tableHeadCell} w-28`}>Status</th>
                  <th className={`${tableHeadCell} w-72 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => {
                  const draft = names[b.id] ?? b.name;
                  const dirty = draft.trim() !== b.name && draft.trim() !== "";
                  const busy = savingId === b.id;

                  return (
                    <tr key={b.id} className={`${tableRow} ${b.isActive ? "" : "opacity-60"}`}>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          className={rowInput}
                          value={draft}
                          onChange={(e) =>
                            setNames((prev) => ({ ...prev, [b.id]: e.target.value }))
                          }
                          aria-label={`Name for ${b.name}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        {b.isCentral ? (
                          <span className={badgeClass("accent")}>Central store</span>
                        ) : (
                          <span className="text-sm text-fg-muted">Branch</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={badgeClass(b.isActive ? "success" : "neutral")}>
                          {b.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              void patchBranch(b, { name: draft.trim() }, "Saved")
                            }
                            disabled={busy || !dirty}
                            className={`${buttonPrimary} px-3 py-1.5 text-xs`}
                          >
                            {busy ? "Saving…" : "Save"}
                          </button>
                          {!b.isCentral && b.isActive ? (
                            <button
                              type="button"
                              onClick={() =>
                                void patchBranch(
                                  b,
                                  { isCentral: true },
                                  `${b.name} is now the central store`
                                )
                              }
                              disabled={busy}
                              className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                            >
                              Make central
                            </button>
                          ) : null}
                          {!b.isCentral ? (
                            <button
                              type="button"
                              onClick={() =>
                                void patchBranch(
                                  b,
                                  { isActive: !b.isActive },
                                  b.isActive ? "Branch deactivated" : "Branch reactivated"
                                )
                              }
                              disabled={busy}
                              className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                            >
                              {b.isActive ? "Deactivate" : "Reactivate"}
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );
}
