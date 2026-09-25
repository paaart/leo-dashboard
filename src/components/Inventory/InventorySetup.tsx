"use client";

import { useState } from "react";
import { PageHeader, SegmentedTabs } from "@/components/shared/DashboardUI";
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
      </div>
    </div>
  );
}
