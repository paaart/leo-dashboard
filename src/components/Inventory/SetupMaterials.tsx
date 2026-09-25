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
  createInventoryMaterial,
  listInventoryMaterials,
  updateInventoryMaterial,
} from "@/lib/inventory/client";
import type { InventoryMaterial } from "@/lib/inventory/types";

/* What the row inputs hold; strings so the user can clear a field mid-edit. */
type Draft = { name: string; unit: string; minStock: string };

const rowInput =
  "h-9 w-full rounded-lg border border-edge bg-surface px-2 text-sm text-fg outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25";

function draftFrom(m: InventoryMaterial): Draft {
  return {
    name: m.name,
    unit: m.unit,
    minStock: m.minStock === null ? "" : String(m.minStock),
  };
}

/* "" → null (no minimum); anything else must be a whole number ≥ 0. */
function parseMinStock(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : undefined;
}

export default function SetupMaterials() {
  const [materials, setMaterials] = useState<InventoryMaterial[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Add form
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [minStock, setMinStock] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listInventoryMaterials({ includeInactive: true });
      setMaterials(rows);
      setDrafts(Object.fromEntries(rows.map((m) => [m.id, draftFrom(m)])));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load materials");
      setMaterials([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const applyRow = (row: InventoryMaterial) => {
    setMaterials((prev) => prev.map((m) => (m.id === row.id ? row : m)));
    setDrafts((prev) => ({ ...prev, [row.id]: draftFrom(row) }));
  };

  const handleAdd = async () => {
    const parsedMin = parseMinStock(minStock);
    if (parsedMin === undefined) {
      toast.error("Minimum stock must be a whole number");
      return;
    }

    setAdding(true);
    try {
      const row = await createInventoryMaterial({
        name: name.trim(),
        unit: unit.trim() || "pcs",
        minStock: parsedMin,
      });
      setMaterials((prev) => [...prev, row]);
      setDrafts((prev) => ({ ...prev, [row.id]: draftFrom(row) }));
      setName("");
      setUnit("pcs");
      setMinStock("");
      toast.success("Material added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add material");
    } finally {
      setAdding(false);
    }
  };

  const isDirty = (m: InventoryMaterial) => {
    const d = drafts[m.id];
    if (!d) return false;
    const base = draftFrom(m);
    return d.name !== base.name || d.unit !== base.unit || d.minStock !== base.minStock;
  };

  const saveRow = async (m: InventoryMaterial) => {
    const d = drafts[m.id];
    if (!d) return;

    const parsedMin = parseMinStock(d.minStock);
    if (parsedMin === undefined) {
      toast.error("Minimum stock must be a whole number");
      return;
    }
    if (!d.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Only send what changed so the API's "no updates" check stays meaningful.
    const patch: Parameters<typeof updateInventoryMaterial>[1] = {};
    if (d.name.trim() !== m.name) patch.name = d.name.trim();
    if (d.unit.trim() !== m.unit) patch.unit = d.unit.trim() || "pcs";
    if (parsedMin !== m.minStock) patch.minStock = parsedMin;

    setSavingId(m.id);
    try {
      applyRow(await updateInventoryMaterial(m.id, patch));
      toast.success("Saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save material");
    } finally {
      setSavingId(null);
    }
  };

  const toggleActive = async (m: InventoryMaterial) => {
    setSavingId(m.id);
    try {
      applyRow(await updateInventoryMaterial(m.id, { isActive: !m.isActive }));
      toast.success(m.isActive ? "Material deactivated" : "Material reactivated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update material");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) return <LoadingState label="Loading materials" />;

  return (
    <>
      <SectionCard
        title="Add material"
        description="Anything the company buys or counts. Deactivated materials keep their history but disappear from forms."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className={fieldLabel}>Name</label>
            <input
              type="text"
              className={inputField}
              placeholder="e.g. Wardrobe Boxes"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className={fieldLabel}>Unit</label>
            <input
              type="text"
              className={inputField}
              placeholder="pcs"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
            <p className={fieldHint}>How it&apos;s counted: pcs, rolls, kg…</p>
          </div>
          <div>
            <label className={fieldLabel}>Minimum stock</label>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              className={inputField}
              placeholder="Optional"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
            />
            <p className={fieldHint}>Company-wide restock threshold.</p>
          </div>
        </div>

        <div className="mt-5 flex justify-end border-t border-edge pt-5">
          <button
            type="button"
            onClick={() => void handleAdd()}
            disabled={adding || !name.trim()}
            className={buttonPrimary}
          >
            {adding ? "Adding…" : "Add material"}
          </button>
        </div>
      </SectionCard>

      <SectionCard
        title="Materials"
        description="Edit a row and press Save. The order here is the order they appear in stock forms."
      >
        {materials.length === 0 ? (
          <EmptyState
            title="No materials yet"
            description="Add the packaging materials the branches count each month."
          />
        ) : (
          <div className={tableWrapper}>
            <table className={`${tableBase} min-w-[760px]`}>
              <thead className={tableHead}>
                <tr>
                  <th className={tableHeadCell}>Material</th>
                  <th className={`${tableHeadCell} w-32`}>Unit</th>
                  <th className={`${tableHeadCell} w-40`}>Min stock</th>
                  <th className={`${tableHeadCell} w-28`}>Status</th>
                  <th className={`${tableHeadCell} w-56 text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {materials.map((m) => {
                  const d = drafts[m.id] ?? draftFrom(m);
                  const busy = savingId === m.id;
                  const setDraft = (patch: Partial<Draft>) =>
                    setDrafts((prev) => ({ ...prev, [m.id]: { ...d, ...patch } }));

                  return (
                    <tr key={m.id} className={`${tableRow} ${m.isActive ? "" : "opacity-60"}`}>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          className={rowInput}
                          value={d.name}
                          onChange={(e) => setDraft({ name: e.target.value })}
                          aria-label={`Name for ${m.name}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="text"
                          className={rowInput}
                          value={d.unit}
                          onChange={(e) => setDraft({ unit: e.target.value })}
                          aria-label={`Unit for ${m.name}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          className={rowInput}
                          placeholder="—"
                          value={d.minStock}
                          onChange={(e) => setDraft({ minStock: e.target.value })}
                          aria-label={`Minimum stock for ${m.name}`}
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={badgeClass(m.isActive ? "success" : "neutral")}>
                          {m.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => void saveRow(m)}
                            disabled={busy || !isDirty(m)}
                            className={`${buttonPrimary} px-3 py-1.5 text-xs`}
                          >
                            {busy ? "Saving…" : "Save"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void toggleActive(m)}
                            disabled={busy}
                            className={`${buttonSecondary} px-3 py-1.5 text-xs`}
                          >
                            {m.isActive ? "Deactivate" : "Reactivate"}
                          </button>
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
