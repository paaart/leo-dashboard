import type { VehicleStatus } from "@/lib/fuel-tracker/types";

export function FuelStatusBadge({
  status,
}: {
  status: VehicleStatus | "warning" | "normal";
}) {
  const styles =
    status === "active" || status === "normal"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
      : status === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
      : "border-gray-200 bg-gray-50 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300";

  const label =
    status === "warning"
      ? "Warning"
      : status === "normal"
      ? "Normal"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles}`}
    >
      {label}
    </span>
  );
}
