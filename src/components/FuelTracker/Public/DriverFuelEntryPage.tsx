"use client";

import { CheckCircle2, ImagePlus, Loader2, Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { uploadFuelImage } from "@/lib/fuel-tracker/uploads";

type PublicVehicle = {
  id: string;
  vehicleNo: string;
  vehicleType: string;
};

type PublicVehiclesResponse =
  | { ok: true; data: PublicVehicle[] }
  | { ok: false; error: string };

const initialForm = {
  vehicleId: "",
  fuelDate: new Date().toISOString().slice(0, 10),
  fuelAmount: "",
  fuelLiters: "",
  odometerReading: "",
  driverName: "",
  driverMobile: "",
  remarks: "",
};

async function fetchPublicVehicles() {
  const response = await fetch("/api/vehicles/public", { cache: "no-store" });
  const json = (await response.json()) as PublicVehiclesResponse;

  if (!response.ok || !json.ok) {
    throw new Error(json.ok ? "Failed to load vehicles" : json.error);
  }

  return json.data;
}

async function submitPublicFuelEntry(payload: {
  vehicleId: string;
  fuelDate: string;
  fuelAmount: number;
  fuelLiters: number;
  odometerReading: number;
  billImagePath: string | null;
  meterImagePath: string | null;
  driverName: string | null;
  driverMobile: string | null;
  remarks: string | null;
}) {
  const response = await fetch("/api/fuel-entries/public", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await response.json()) as
    | { ok: true; data: { id: string } }
    | { ok: false; error: string };

  if (!response.ok || !json.ok) {
    throw new Error(json.ok ? "Fuel entry submission failed" : json.error);
  }

  return json.data;
}

function FilePicker({
  id,
  label,
  file,
  onChange,
}: {
  id: string;
  label: string;
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-fg">
        {label}
      </span>
      <div className="flex min-h-12 items-center gap-3 rounded-lg border border-dashed border-edge-strong bg-surface-2 px-3 py-3">
        <ImagePlus className="h-5 w-5 shrink-0 text-fg-muted" />
        <span className="min-w-0 flex-1 truncate text-sm text-fg-muted">
          {file ? file.name : "PNG, JPEG, or WebP image"}
        </span>
        <span className="rounded-md border border-edge bg-surface px-3 py-1.5 text-xs font-semibold text-fg">
          Choose
        </span>
      </div>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
    </label>
  );
}

export default function DriverFuelEntryPage() {
  const [vehicles, setVehicles] = useState<PublicVehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [form, setForm] = useState(initialForm);
  const [billFile, setBillFile] = useState<File | null>(null);
  const [meterFile, setMeterFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const selectedVehicle = useMemo(
    () => vehicles.find((vehicle) => vehicle.id === form.vehicleId) ?? null,
    [form.vehicleId, vehicles]
  );

  const fieldErrors = useMemo(() => {
    const fuelAmount = Number(form.fuelAmount);
    const fuelLiters = Number(form.fuelLiters);
    const odometerReading = Number(form.odometerReading);
    const driverMobile = form.driverMobile.trim();

    return {
      vehicleId: form.vehicleId ? "" : "Vehicle is required.",
      driverName: "",
      driverMobile: !driverMobile || /^\d{10,}$/.test(driverMobile)
        ? ""
        : "Enter at least 10 digits, or leave blank.",
      fuelDate: form.fuelDate ? "" : "Fuel date is required.",
      fuelAmount:
        Number.isFinite(fuelAmount) && fuelAmount > 0
          ? ""
          : "Fuel amount must be greater than zero.",
      fuelLiters:
        Number.isFinite(fuelLiters) && fuelLiters > 0
          ? ""
          : "Fuel liters must be greater than zero.",
      odometerReading:
        Number.isFinite(odometerReading) && odometerReading > 0
          ? ""
          : "Odometer reading must be greater than zero.",
    };
  }, [form]);

  const formIsValid = Object.values(fieldErrors).every((message) => !message);

  useEffect(() => {
    let cancelled = false;

    async function loadVehicles() {
      setVehiclesLoading(true);
      setError(null);

      try {
        const data = await fetchPublicVehicles();
        if (cancelled) return;

        setVehicles(data);
        setForm((prev) => ({
          ...prev,
          vehicleId: prev.vehicleId || data[0]?.id || "",
        }));
      } catch (loadError) {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load vehicles."
        );
      } finally {
        if (!cancelled) setVehiclesLoading(false);
      }
    }

    void loadVehicles();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    if (!formIsValid) {
      setError("Please complete all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      const [billImagePath, meterImagePath] = await Promise.all([
        billFile ? uploadFuelImage(billFile, "bills", { public: true }) : null,
        meterFile ? uploadFuelImage(meterFile, "meters", { public: true }) : null,
      ]);

      await submitPublicFuelEntry({
        vehicleId: form.vehicleId,
        fuelDate: form.fuelDate,
        fuelAmount: Number(form.fuelAmount),
        fuelLiters: Number(form.fuelLiters),
        odometerReading: Number(form.odometerReading),
        billImagePath,
        meterImagePath,
        driverName: form.driverName.trim() || null,
        driverMobile: form.driverMobile.trim() || null,
        remarks: form.remarks.trim() || null,
      });

      setSuccess(true);
      setForm({
        ...initialForm,
        vehicleId: vehicles[0]?.id ?? "",
        fuelDate: new Date().toISOString().slice(0, 10),
      });
      setBillFile(null);
      setMeterFile(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit fuel entry."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-canvas px-4 py-6 text-fg">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-edge bg-surface text-accent shadow-card">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fuel Entry Submission
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            Submit fuel details and upload bill or meter photos if available.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-edge bg-surface p-5 shadow-card"
        >
          {success ? (
            <div className="flex gap-3 rounded-lg border border-success/25 bg-success-soft p-3 text-sm text-success-soft-fg">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Fuel entry submitted successfully</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-danger/25 bg-danger-soft p-3 text-sm text-danger-soft-fg">
              {error}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-fg">
              Vehicle
            </span>
            <select
              value={form.vehicleId}
              disabled={vehiclesLoading || submitting}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, vehicleId: event.target.value }))
              }
              className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
            >
              <option value="">
                {vehiclesLoading ? "Loading vehicles..." : "Select vehicle"}
              </option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.vehicleNo} - {vehicle.vehicleType}
                </option>
              ))}
            </select>
            {selectedVehicle ? (
              <span className="text-xs text-fg-muted">
                Selected: {selectedVehicle.vehicleNo}
              </span>
            ) : null}
            {fieldErrors.vehicleId ? (
              <span className="text-xs text-danger">
                {fieldErrors.vehicleId}
              </span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Fuel Date
              </span>
              <input
                type="date"
                value={form.fuelDate}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fuelDate: event.target.value }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
              />
              {fieldErrors.fuelDate ? (
                <span className="text-xs text-danger">
                  {fieldErrors.fuelDate}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Fuel Amount
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.fuelAmount}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fuelAmount: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
                placeholder="4500"
              />
              {fieldErrors.fuelAmount ? (
                <span className="text-xs text-danger">
                  {fieldErrors.fuelAmount}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Fuel Liters
              </span>
              <input
                type="number"
                min="0"
                step="0.001"
                inputMode="decimal"
                value={form.fuelLiters}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    fuelLiters: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
                placeholder="50"
              />
              {fieldErrors.fuelLiters ? (
                <span className="text-xs text-danger">
                  {fieldErrors.fuelLiters}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Odometer Reading
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={form.odometerReading}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    odometerReading: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
                placeholder="100200"
              />
              {fieldErrors.odometerReading ? (
                <span className="text-xs text-danger">
                  {fieldErrors.odometerReading}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FilePicker
              id="driver-bill-image"
              label="Bill Image"
              file={billFile}
              onChange={setBillFile}
            />
            <FilePicker
              id="driver-meter-image"
              label="Meter Image"
              file={meterFile}
              onChange={setMeterFile}
            />
          </div>
          <p className="text-xs text-fg-muted">
            Upload bill and meter photos if available.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Driver Name
              </span>
              <input
                value={form.driverName}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driverName: event.target.value,
                  }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
                placeholder="Driver name"
              />
              {fieldErrors.driverName ? (
                <span className="text-xs text-danger">
                  {fieldErrors.driverName}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-fg">
                Driver Mobile Number
              </span>
              <input
                type="tel"
                inputMode="tel"
                value={form.driverMobile}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    driverMobile: event.target.value.replace(/\D/g, ""),
                  }))
                }
                className="min-h-12 w-full rounded-lg border border-edge bg-surface px-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
                placeholder="9876543210"
              />
              {fieldErrors.driverMobile ? (
                <span className="text-xs text-danger">
                  {fieldErrors.driverMobile}
                </span>
              ) : null}
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-fg">
              Remarks
            </span>
            <textarea
              value={form.remarks}
              disabled={submitting}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, remarks: event.target.value }))
              }
              className="min-h-24 w-full rounded-lg border border-edge bg-surface px-3 py-3 text-base text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25 disabled:opacity-60"
              placeholder="Optional"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || vehiclesLoading}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 text-base font-semibold text-accent-fg shadow-card hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Submitting...
              </>
            ) : (
              "Submit Fuel Entry"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
