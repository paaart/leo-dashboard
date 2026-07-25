import { badgeClass } from "@/components/shared/ui";
import type { VehicleStatus } from "@/lib/fuel-tracker/types";

export function FuelStatusBadge({
  status,
}: {
  status: VehicleStatus | "warning" | "normal";
}) {
  const styles =
    status === "active" || status === "normal"
      ? badgeClass("success")
      : status === "warning"
      ? badgeClass("warning")
      : badgeClass("neutral");

  const label =
    status === "warning"
      ? "Warning"
      : status === "normal"
      ? "Normal"
      : status.charAt(0).toUpperCase() + status.slice(1);

  return <span className={styles}>{label}</span>;
}
