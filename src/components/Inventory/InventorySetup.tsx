"use client";

import { useState } from "react";
import { PageHeader, SegmentedTabs } from "@/components/shared/DashboardUI";
import {
  alertDanger,
  alertSuccess,
  buttonSecondary,
  cardPadded,
} from "@/components/shared/ui";
import SetupMaterials from "./SetupMaterials";
import SetupBranches from "./SetupBranches";
import SetupAssignments from "./SetupAssignments";

type SetupTab = "materials" | "branches" | "staff";

const tabs: { id: SetupTab; label: string }[] = [
  { id: "materials", label: "Materials" },
  { id: "branches", label: "Branches" },
  { id: "staff", label: "Branch staff" },
];

export default function InventorySetup() {
  const [tab, setTab] = useState<SetupTab>("materials");
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupMessage, setCleanupMessage] = useState("");
  const [cleanupError, setCleanupError] = useState("");

  async function deleteDemoData() {
    if (
      !window.confirm(
        "Delete all inventory records tagged as demo? Setup data and live records will not be changed.",
      )
    )
      return;
    setCleanupBusy(true);
    setCleanupMessage("");
    setCleanupError("");
    try {
      const response = await fetch("/api/inventory/demo", {
        method: "DELETE",
        credentials: "include",
      });
      const body = (await response.json()) as {
        ok?: boolean;
        error?: string;
        deleted?: {
          counts: number;
          purchases: number;
          dispatches: number;
          countRequests: number;
          vendors: number;
        };
      };
      if (!response.ok || !body.ok || !body.deleted)
        throw new Error(body.error ?? "Unable to delete demo data");
      const d = body.deleted;
      setCleanupMessage(
        `Deleted ${d.counts} count${d.counts === 1 ? "" : "s"}, ${d.purchases} purchase${d.purchases === 1 ? "" : "s"}, ${d.dispatches} dispatch${d.dispatches === 1 ? "" : "es"}, ${d.countRequests} count request${d.countRequests === 1 ? "" : "s"}, and ${d.vendors} vendor${d.vendors === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setCleanupError(
        error instanceof Error ? error.message : "Unable to delete demo data",
      );
    } finally {
      setCleanupBusy(false);
    }
  }

  return (
    <div className="min-h-full bg-canvas px-4 py-6 text-fg sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          eyebrow="Operations"
          title="Inventory Management"
          subtitle="Set up the packaging materials, the branches that hold them, and who reports stock for each branch."
        />

        <SegmentedTabs tabs={tabs} active={tab} onChange={setTab} />

        {tab === "materials" ? <SetupMaterials /> : null}
        {tab === "branches" ? <SetupBranches /> : null}
        {tab === "staff" ? <SetupAssignments /> : null}

        <section className={`${cardPadded} space-y-3`}>
          <div>
            <h2 className="font-semibold">Demo data cleanup</h2>
            <p className="mt-1 text-sm text-fg-muted">
              Records created by the username <code>test</code> are tagged with
              a [demo] note automatically. This removes only those inventory
              records; branches and materials are kept.
            </p>
          </div>
          {cleanupMessage ? (
            <div role="status" className={alertSuccess}>
              {cleanupMessage}
            </div>
          ) : null}
          {cleanupError ? (
            <div role="alert" className={alertDanger}>
              {cleanupError}
            </div>
          ) : null}
          <button
            type="button"
            className={buttonSecondary}
            disabled={cleanupBusy}
            onClick={() => void deleteDemoData()}
          >
            {cleanupBusy ? "Deleting demo data…" : "Delete all demo data"}
          </button>
        </section>
      </div>
    </div>
  );
}
