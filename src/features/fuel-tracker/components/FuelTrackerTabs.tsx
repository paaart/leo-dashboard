import type { FuelTab } from "../types/fuelTracker.types";

const tabs: { id: FuelTab; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "vehicles", label: "Vehicles" },
  { id: "fuel-entries", label: "Fuel Entries" },
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
      <div className="inline-flex min-w-full gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-800 dark:bg-gray-900 sm:min-w-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`min-h-10 rounded-md px-4 text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-gray-950 shadow-sm dark:bg-gray-800 dark:text-gray-50"
                  : "text-gray-600 hover:text-gray-950 dark:text-gray-400 dark:hover:text-gray-100"
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
