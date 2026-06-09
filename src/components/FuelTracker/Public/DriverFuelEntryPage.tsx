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
  billImagePath: string;
  meterImagePath: string;
  driverName: string;
  driverMobile: string;
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
      <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
        {label}
      </span>
      <div className="flex min-h-12 items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
        <ImagePlus className="h-5 w-5 shrink-0 text-gray-500 dark:text-gray-400" />
        <span className="min-w-0 flex-1 truncate text-sm text-gray-600 dark:text-gray-300">
          {file ? file.name : "PNG, JPEG, or WebP image"}
        </span>
        <span className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-200">
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
    const driverName = form.driverName.trim();
    const driverMobile = form.driverMobile.trim();

    return {
      vehicleId: form.vehicleId ? "" : "Vehicle is required.",
      driverName:
        driverName.length >= 2
          ? ""
          : "Driver name must be at least 2 characters.",
      driverMobile: /^\d{10,}$/.test(driverMobile)
        ? ""
        : "Enter at least 10 digits.",
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
      billFile: billFile ? "" : "Bill image is required.",
      meterFile: meterFile ? "" : "Meter image is required.",
    };
  }, [billFile, form, meterFile]);

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

    if (!billFile || !meterFile) return;

    setSubmitting(true);

    try {
      const [billImagePath, meterImagePath] = await Promise.all([
        uploadFuelImage(billFile, "bills"),
        uploadFuelImage(meterFile, "meters"),
      ]);

      await submitPublicFuelEntry({
        vehicleId: form.vehicleId,
        fuelDate: form.fuelDate,
        fuelAmount: Number(form.fuelAmount),
        fuelLiters: Number(form.fuelLiters),
        odometerReading: Number(form.odometerReading),
        billImagePath,
        meterImagePath,
        driverName: form.driverName.trim(),
        driverMobile: form.driverMobile.trim(),
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
    <main className="min-h-screen bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-white text-blue-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-blue-400">
            <Truck className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Fuel Entry Submission
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Submit fuel details and upload proof images.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900"
        >
          {success ? (
            <div className="flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Fuel entry submitted successfully</span>
            </div>
          ) : null}

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Vehicle
            </span>
            <select
              value={form.vehicleId}
              disabled={vehiclesLoading || submitting}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, vehicleId: event.target.value }))
              }
              className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
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
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Selected: {selectedVehicle.vehicleNo}
              </span>
            ) : null}
            {fieldErrors.vehicleId ? (
              <span className="text-xs text-red-600 dark:text-red-400">
                {fieldErrors.vehicleId}
              </span>
            ) : null}
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                Fuel Date
              </span>
              <input
                type="date"
                value={form.fuelDate}
                disabled={submitting}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, fuelDate: event.target.value }))
                }
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
              />
              {fieldErrors.fuelDate ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.fuelDate}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                placeholder="4500"
              />
              {fieldErrors.fuelAmount ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.fuelAmount}
                </span>
              ) : null}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                placeholder="50"
              />
              {fieldErrors.fuelLiters ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.fuelLiters}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                placeholder="100200"
              />
              {fieldErrors.odometerReading ? (
                <span className="text-xs text-red-600 dark:text-red-400">
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
            {fieldErrors.billFile ? (
              <span className="text-xs text-red-600 dark:text-red-400 sm:hidden">
                {fieldErrors.billFile}
              </span>
            ) : null}
            <FilePicker
              id="driver-meter-image"
              label="Meter/Odometer Image"
              file={meterFile}
              onChange={setMeterFile}
            />
            {fieldErrors.meterFile ? (
              <span className="text-xs text-red-600 dark:text-red-400 sm:hidden">
                {fieldErrors.meterFile}
              </span>
            ) : null}
          </div>
          <div className="hidden grid-cols-2 gap-4 sm:grid">
            <div>
              {fieldErrors.billFile ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.billFile}
                </span>
              ) : null}
            </div>
            <div>
              {fieldErrors.meterFile ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.meterFile}
                </span>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                placeholder="Driver name"
              />
              {fieldErrors.driverName ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.driverName}
                </span>
              ) : null}
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
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
                className="min-h-12 w-full rounded-lg border border-gray-300 bg-white px-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
                placeholder="9876543210"
              />
              {fieldErrors.driverMobile ? (
                <span className="text-xs text-red-600 dark:text-red-400">
                  {fieldErrors.driverMobile}
                </span>
              ) : null}
            </label>
          </div>

          <label className="block space-y-2">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              Remarks
            </span>
            <textarea
              value={form.remarks}
              disabled={submitting}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, remarks: event.target.value }))
              }
              className="min-h-24 w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-base text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-50"
              placeholder="Optional"
            />
          </label>

          <button
            type="submit"
            disabled={submitting || vehiclesLoading || !formIsValid}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-base font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
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
