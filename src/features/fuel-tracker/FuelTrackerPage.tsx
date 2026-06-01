"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { FuelAnalyticsDashboard } from "./components/FuelAnalyticsDashboard";
import { FuelEntryFormModal } from "./components/FuelEntryFormModal";
import { FuelEntryTable } from "./components/FuelEntryTable";
import { FuelTrackerTabs } from "./components/FuelTrackerTabs";
import { VehicleFormModal } from "./components/VehicleFormModal";
import { VehicleTable } from "./components/VehicleTable";
import {
  createFuelEntry,
  createVehicle,
  fetchFuelDashboardAnalytics,
  fetchFuelEntries,
  fetchVehicles,
} from "./services/fuelTracker.api";
import {
  createFuelImageSignedUrl,
  uploadFuelImage,
} from "./services/fuelUpload.api";
import type {
  CreateFuelEntryPayload,
  CreateVehiclePayload,
  FuelDashboardAnalytics,
  FuelEntry,
  FuelTab,
  Vehicle,
} from "./types/fuelTracker.types";

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
          {title}
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function AddButton({
  children,
  onClick,
  disabled,
}: {
  children: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Plus className="h-4 w-4" />
      {children}
    </button>
  );
}

export default function FuelTrackerPage() {
  const [activeTab, setActiveTab] = useState<FuelTab>("dashboard");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [analytics, setAnalytics] = useState<FuelDashboardAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [fuelEntryModalOpen, setFuelEntryModalOpen] = useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingFuelEntry, setSavingFuelEntry] = useState(false);
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [analyticsFilters, setAnalyticsFilters] = useState({
    vehicleId: "all",
    dateFrom: "",
    dateTo: "",
  });

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const filteredFuelEntries = useMemo(() => {
    return fuelEntries.filter((entry) => {
      const matchesVehicle =
        vehicleFilter === "all" || entry.vehicle_id === vehicleFilter;
      const matchesFrom = !dateFrom || entry.fuel_date >= dateFrom;
      const matchesTo = !dateTo || entry.fuel_date <= dateTo;

      return matchesVehicle && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, fuelEntries, vehicleFilter]);

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    setAnalyticsError(null);

    try {
      const data = await fetchFuelDashboardAnalytics(analyticsFilters);
      setAnalytics(data);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load fuel analytics.";
      setAnalyticsError(message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFilters]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [vehiclesData, entriesData] = await Promise.all([
        fetchVehicles(),
        fetchFuelEntries(),
      ]);

      setVehicles(vehiclesData);
      setFuelEntries(entriesData);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load fuel tracker data.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const handleCreateVehicle = async (payload: CreateVehiclePayload) => {
    setSavingVehicle(true);

    try {
      await createVehicle(payload);
      toast.success("Vehicle added");
      setVehicleModalOpen(false);
      await loadData();
      await loadAnalytics();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to add vehicle.";
      toast.error(message);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleCreateFuelEntry = async (
    payload: Omit<CreateFuelEntryPayload, "billImagePath" | "meterImagePath">,
    files: { bill: File | null; meter: File | null }
  ) => {
    setSavingFuelEntry(true);

    try {
      const [billImagePath, meterImagePath] = await Promise.all([
        files.bill ? uploadFuelImage(files.bill, "bills") : null,
        files.meter ? uploadFuelImage(files.meter, "meters") : null,
      ]);

      await createFuelEntry({
        ...payload,
        billImagePath,
        meterImagePath,
      });

      toast.success("Fuel entry added");
      setFuelEntryModalOpen(false);
      await loadData();
      await loadAnalytics();
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Failed to add fuel entry.";
      toast.error(message);
    } finally {
      setSavingFuelEntry(false);
    }
  };

  const handleViewProof = async (path: string) => {
    try {
      const signedUrl = await createFuelImageSignedUrl(path);
      window.open(signedUrl, "_blank", "noopener,noreferrer");
    } catch (viewError) {
      const message =
        viewError instanceof Error
          ? viewError.message
          : "Failed to open proof image.";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-full bg-gray-50 px-4 py-6 text-gray-950 dark:bg-gray-950 dark:text-gray-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              Operations
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
              Fuel Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Monitor fuel entries, mileage approximations, and vehicle-wise
              fuel history.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              void loadData();
              void loadAnalytics();
            }}
            disabled={loading || analyticsLoading}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || analyticsLoading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        <FuelTrackerTabs activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "dashboard" ? (
          <div className="space-y-4">
            <SectionHeader
              title="Analytics Dashboard"
              description="Fleet-level fuel spend, mileage, cost, warnings, and operational deviation."
            />
            <FuelAnalyticsDashboard
              analytics={analytics}
              vehicles={vehicles}
              loading={analyticsLoading}
              error={analyticsError}
              filters={analyticsFilters}
              onFiltersChange={setAnalyticsFilters}
            />
          </div>
        ) : null}

        {activeTab === "vehicles" ? (
          <div className="space-y-4">
            <SectionHeader
              title="Vehicles"
              description="Create and review fleet vehicles used for fuel tracking."
              action={
                <AddButton onClick={() => setVehicleModalOpen(true)}>
                  Add Vehicle
                </AddButton>
              }
            />
            <VehicleTable
              vehicles={vehicles}
              loading={loading}
              error={error}
              onAdd={() => setVehicleModalOpen(true)}
            />
          </div>
        ) : null}

        {activeTab === "fuel-entries" ? (
          <div className="space-y-4">
            <SectionHeader
              title="Fuel Entries"
              description="Create fuel records, upload proof images, and review mileage warnings."
              action={
                <AddButton
                  onClick={() => setFuelEntryModalOpen(true)}
                  disabled={vehicles.length === 0}
                >
                  Add Fuel Entry
                </AddButton>
              }
            />

            <div className="grid gap-3 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:grid-cols-3">
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  Vehicle Filter
                </span>
                <select
                  value={vehicleFilter}
                  onChange={(event) => setVehicleFilter(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                >
                  <option value="all">All vehicles</option>
                  {vehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.vehicle_no}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  From
                </span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(event) => setDateFrom(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                  To
                </span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(event) => setDateTo(event.target.value)}
                  className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-950 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50"
                />
              </label>
            </div>

            <FuelEntryTable
              entries={filteredFuelEntries}
              vehiclesById={vehiclesById}
              loading={loading}
              error={error}
              onAdd={() => setFuelEntryModalOpen(true)}
              onViewProof={handleViewProof}
            />
          </div>
        ) : null}
      </div>

      <VehicleFormModal
        open={vehicleModalOpen}
        loading={savingVehicle}
        onClose={() => setVehicleModalOpen(false)}
        onSubmit={handleCreateVehicle}
      />

      <FuelEntryFormModal
        open={fuelEntryModalOpen}
        vehicles={vehicles}
        loading={savingFuelEntry}
        onClose={() => setFuelEntryModalOpen(false)}
        onSubmit={handleCreateFuelEntry}
      />
    </div>
  );
}
