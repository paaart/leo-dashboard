import { modalOverlay } from "@/components/shared/ui";
import { X } from "lucide-react";
import type { Vehicle } from "@/lib/fuel-tracker/types";

function fmtDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN");
}

function fmtCurrency(value: number | null) {
  if (value === null) return "-";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function RenewalRow({
  label,
  lastRenewalDate,
  nextRenewalDate,
  amount,
  vendor,
}: {
  label: string;
  lastRenewalDate: string | null;
  nextRenewalDate: string | null;
  amount: number | null;
  vendor: string | null;
}) {
  return (
    <tr className="border-t border-edge text-sm">
      <td className="px-4 py-3 font-medium text-fg">
        {label}
      </td>
      <td className="px-4 py-3 text-fg-muted">
        {fmtDate(lastRenewalDate)}
      </td>
      <td className="px-4 py-3 text-fg-muted">
        {fmtDate(nextRenewalDate)}
      </td>
      <td className="px-4 py-3 text-fg-muted">
        {fmtCurrency(amount)}
      </td>
      <td className="px-4 py-3 text-fg-muted">
        {vendor ?? "-"}
      </td>
    </tr>
  );
}

export function VehicleRenewalsModal({
  vehicle,
  onClose,
}: {
  vehicle: Vehicle | null;
  onClose: () => void;
}) {
  if (!vehicle) return null;

  return (
    <div
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-renewals-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-xl border border-edge bg-surface shadow-overlay"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-edge px-5 py-4">
          <div>
            <h2
              id="vehicle-renewals-title"
              className="text-lg font-semibold text-fg"
            >
              Renewals
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              {vehicle.vehicle_no}
              {vehicle.company ? ` · ${vehicle.company}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-fg-muted hover:bg-surface-2 hover:text-fg"
            aria-label="Close renewals dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-4rem)] overflow-auto px-5 py-5">
          <p className="text-sm text-fg-muted">
            Alerts and urgency are driven from the next renewal date.
          </p>

          <div className="mt-4 overflow-x-auto rounded-lg border border-edge">
            <table className="min-w-max w-full text-left">
              <thead className="bg-surface-2 text-xs uppercase tracking-wide text-fg-muted">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Last Renewal</th>
                  <th className="px-4 py-3 font-semibold">Next Renewal</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-edge">
                <RenewalRow
                  label="National Permit"
                  lastRenewalDate={vehicle.national_permit_last_renewal_date}
                  nextRenewalDate={vehicle.national_permit_next_renewal_date}
                  amount={vehicle.national_permit_renewal_amount}
                  vendor={vehicle.national_permit_renewal_vendor}
                />
                <RenewalRow
                  label="Insurance"
                  lastRenewalDate={vehicle.insurance_last_renewal_date}
                  nextRenewalDate={vehicle.insurance_next_renewal_date}
                  amount={vehicle.insurance_renewal_amount}
                  vendor={vehicle.insurance_renewal_vendor}
                />
                <RenewalRow
                  label="Road Tax"
                  lastRenewalDate={vehicle.road_tax_last_renewal_date}
                  nextRenewalDate={vehicle.road_tax_next_renewal_date}
                  amount={vehicle.road_tax_renewal_amount}
                  vendor={vehicle.road_tax_renewal_vendor}
                />
              </tbody>
            </table>
          </div>

          <div className="mt-4 rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-accent-soft-fg">
            Last Renewal is the date payment was actually made. Next Renewal is
            the date used for alerts and urgency.
          </div>
        </div>
      </div>
    </div>
  );
}
