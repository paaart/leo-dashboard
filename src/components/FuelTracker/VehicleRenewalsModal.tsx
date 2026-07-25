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
    <tr className="border-t border-gray-200 text-sm dark:border-gray-800">
      <td className="px-4 py-3 font-medium text-gray-950 dark:text-gray-50">
        {label}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
        {fmtDate(lastRenewalDate)}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
        {fmtDate(nextRenewalDate)}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
        {fmtCurrency(amount)}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vehicle-renewals-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-950"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <div>
            <h2
              id="vehicle-renewals-title"
              className="text-lg font-semibold text-gray-950 dark:text-gray-50"
            >
              Renewals
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {vehicle.vehicle_no}
              {vehicle.company ? ` · ${vehicle.company}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            aria-label="Close renewals dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[calc(90vh-4rem)] overflow-auto px-5 py-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Alerts and urgency are driven from the next renewal date.
          </p>

          <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800">
            <table className="w-full text-left">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Last Renewal</th>
                  <th className="px-4 py-3 font-semibold">Next Renewal</th>
                  <th className="px-4 py-3 font-semibold">Amount</th>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
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

          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            Last Renewal is the date payment was actually made. Next Renewal is
            the date used for alerts and urgency.
          </div>
        </div>
      </div>
    </div>
  );
}
