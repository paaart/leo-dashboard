import type { FuelTab } from "@/lib/fuel-tracker/types";

const tabs: { id: FuelTab; label: string }[] = [
  { id: "dashboard", label: "Performance" },
  { id: "vehicles", label: "Vehicles" },
  { id: "fuel-entries", label: "Fuel Entries" },
  { id: "vendor-invoices", label: "Vendor Invoices" },
  { id: "vendor-payments", label: "Vendor Payments" },
];

export function FuelTrackerTabs({
  activeTab,
  onChange,
}: {
  activeTab: FuelTab;
  onChange: (tab: FuelTab) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-edge bg-surface-2 p-1 sm:min-w-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-10 whitespace-nowrap rounded-md px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-surface text-fg shadow-card"
                  : "text-fg-muted hover:text-fg"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
