"use client";

import { Plus, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import toast from "react-hot-toast";
import { FuelTrackerDashboard } from "./FuelTrackerDashboard";
import { FuelEntryFormModal } from "./FuelEntryFormModal";
import { FuelEntryTable } from "./FuelEntryTable";
import { FuelTrackerTabs } from "./FuelTrackerTabs";
import { VehicleFormModal } from "./VehicleFormModal";
import { VehicleTable } from "./VehicleTable";
import {
  TablePagination,
  VEHICLE_TRACKER_PAGE_SIZE,
  paginateItems,
} from "./TablePagination";
import { VendorInvoiceFormModal } from "./VendorInvoiceFormModal";
import { VendorInvoiceTable } from "./VendorInvoiceTable";
import { VendorInvoiceViewModal } from "./VendorInvoiceViewModal";
import { VendorPaymentBatchFormModal } from "./VendorPaymentBatchFormModal";
import { VendorPaymentBatchTable } from "./VendorPaymentBatchTable";
import { VendorPaymentBatchViewModal } from "./VendorPaymentBatchViewModal";
import {
  createVehicleExpenseInvoice,
  createVehicleExpenseInvoicePayment,
  createVehicleExpensePaymentBatch,
  createFuelEntry,
  deleteFuelEntry,
  deleteVehicleExpenseInvoice,
  deleteVehicleExpenseInvoicePayment,
  deleteVehicleExpensePaymentBatch,
  updateFuelEntry,
  createVehicle,
  updateVehicle,
  fetchFuelDashboardAnalytics,
  fetchFuelEntries,
  fetchVehicleExpenseInvoiceAnalytics,
  fetchVehicleExpenseInvoices,
  fetchVehicleExpensePaymentBatches,
  fetchVehicles,
  updateVehicleExpenseInvoice,
} from "@/lib/fuel-tracker/api";
import {
  createFuelImageSignedUrl,
  uploadFuelImage,
} from "@/lib/fuel-tracker/uploads";
import type {
  CreateFuelEntryPayload,
  CreateVehicleExpenseInvoicePaymentPayload,
  CreateVehicleExpenseInvoicePayload,
  CreateVehicleExpensePaymentBatchPayload,
  CreateVehiclePayload,
  FuelDashboardAnalytics,
  FuelEntry,
  FuelTab,
  Vehicle,
  VehicleExpenseInvoiceAnalytics,
  VehicleExpenseInvoice,
  VehicleExpensePaymentBatch,
} from "@/lib/fuel-tracker/types";

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(value);
}

function SummaryCards({
  cards,
}: {
  cards: { label: string; value: string }[];
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
        >
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {card.label}
          </p>
          <p className="mt-2 text-xl font-semibold text-gray-950 dark:text-gray-50">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function FuelTrackerPage() {
  const [activeTab, setActiveTab] = useState<FuelTab>("dashboard");
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [fuelEntries, setFuelEntries] = useState<FuelEntry[]>([]);
  const [vendorInvoices, setVendorInvoices] = useState<
    VehicleExpenseInvoice[]
  >([]);
  const [vendorPaymentBatches, setVendorPaymentBatches] = useState<
    VehicleExpensePaymentBatch[]
  >([]);
  const [vendorAnalytics, setVendorAnalytics] =
    useState<VehicleExpenseInvoiceAnalytics | null>(null);
  const [analytics, setAnalytics] = useState<FuelDashboardAnalytics | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [editingFuelEntry, setEditingFuelEntry] = useState<FuelEntry | null>(
    null
  );
  const [viewingVendorInvoice, setViewingVendorInvoice] =
    useState<VehicleExpenseInvoice | null>(null);
  const [editingVendorInvoice, setEditingVendorInvoice] =
    useState<VehicleExpenseInvoice | null>(null);
  const [viewingVendorPaymentBatch, setViewingVendorPaymentBatch] =
    useState<VehicleExpensePaymentBatch | null>(null);
  const [fuelEntryModalOpen, setFuelEntryModalOpen] = useState(false);
  const [vendorInvoiceModalOpen, setVendorInvoiceModalOpen] = useState(false);
  const [vendorPaymentBatchModalOpen, setVendorPaymentBatchModalOpen] =
    useState(false);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [savingFuelEntry, setSavingFuelEntry] = useState(false);
  const [savingVendorInvoice, setSavingVendorInvoice] = useState(false);
  const [savingVendorInvoicePayment, setSavingVendorInvoicePayment] =
    useState(false);
  const [savingVendorPaymentBatch, setSavingVendorPaymentBatch] =
    useState(false);
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<
    "all" | VehicleExpenseInvoice["status"]
  >("all");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [vehiclesPage, setVehiclesPage] = useState(1);
  const [fuelEntriesPage, setFuelEntriesPage] = useState(1);
  const [vendorInvoicesPage, setVendorInvoicesPage] = useState(1);
  const [vendorPaymentBatchesPage, setVendorPaymentBatchesPage] = useState(1);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    vehicleId: "all",
    dateFrom: "",
    dateTo: "",
  });

  const vehiclesById = useMemo(
    () => new Map(vehicles.map((vehicle) => [vehicle.id, vehicle])),
    [vehicles]
  );

  const editingVehicleHasFuelEntries = useMemo(() => {
    if (!editingVehicle) return false;
    return fuelEntries.some((entry) => entry.vehicle_id === editingVehicle.id);
  }, [editingVehicle, fuelEntries]);

  const filteredFuelEntries = useMemo(() => {
    return fuelEntries.filter((entry) => {
      const matchesVehicle =
        vehicleFilter === "all" || entry.vehicle_id === vehicleFilter;
      const matchesFrom = !dateFrom || entry.fuel_date >= dateFrom;
      const matchesTo = !dateTo || entry.fuel_date <= dateTo;

      return matchesVehicle && matchesFrom && matchesTo;
    });
  }, [dateFrom, dateTo, fuelEntries, vehicleFilter]);

  const filteredVendorInvoices = useMemo(() => {
    if (invoiceStatusFilter === "all") return vendorInvoices;
    return vendorInvoices.filter(
      (invoice) => invoice.status === invoiceStatusFilter
    );
  }, [invoiceStatusFilter, vendorInvoices]);

  const paginatedVehicles = useMemo(
    () => paginateItems(vehicles, vehiclesPage),
    [vehicles, vehiclesPage]
  );

  const paginatedFuelEntries = useMemo(
    () => paginateItems(filteredFuelEntries, fuelEntriesPage),
    [filteredFuelEntries, fuelEntriesPage]
  );

  const paginatedVendorInvoices = useMemo(
    () => paginateItems(filteredVendorInvoices, vendorInvoicesPage),
    [filteredVendorInvoices, vendorInvoicesPage]
  );

  const paginatedVendorPaymentBatches = useMemo(
    () => paginateItems(vendorPaymentBatches, vendorPaymentBatchesPage),
    [vendorPaymentBatches, vendorPaymentBatchesPage]
  );

  const vendorInvoiceSummaryCards = useMemo(() => {
    if (!vendorAnalytics) return [];

    return [
      {
        label: "Total Vendor Invoices",
        value: String(vendorAnalytics.invoiceCount),
      },
      {
        label: "Total Invoice Amount",
        value: formatCurrency(vendorAnalytics.invoiceTotal),
      },
      {
        label: "Paid Invoice Count",
        value: String(vendorAnalytics.paidInvoiceCount),
      },
      {
        label: "Paid Amount",
        value: formatCurrency(vendorAnalytics.paidAmount),
      },
      {
        label: "Unpaid Invoice Count",
        value: String(vendorAnalytics.unpaidInvoiceCount),
      },
      {
        label: "Unpaid Amount",
        value: formatCurrency(vendorAnalytics.unpaidAmount),
      },
      {
        label: "Partially Paid Count",
        value: String(vendorAnalytics.partiallyPaidInvoiceCount),
      },
      {
        label: "Partially Paid Outstanding",
        value: formatCurrency(vendorAnalytics.partiallyPaidOutstanding),
      },
      {
        label: "Total Outstanding",
        value: formatCurrency(vendorAnalytics.outstandingAmount),
      },
      {
        label: "Total Vendor Payments",
        value: String(vendorAnalytics.paymentBatchCount),
      },
      {
        label: "Total Payments Made",
        value: formatCurrency(vendorAnalytics.paymentTotal),
      },
    ];
  }, [vendorAnalytics]);

  const vendorPaymentSummaryCards = useMemo(() => {
    if (!vendorAnalytics) return [];

    return [
      {
        label: "Total Payment Batches",
        value: String(vendorAnalytics.paymentBatchCount),
      },
      {
        label: "Total Paid",
        value: formatCurrency(vendorAnalytics.paymentTotal),
      },
      {
        label: "Latest Payment Date",
        value: vendorAnalytics.latestPaymentDate ?? "-",
      },
      {
        label: "Average Payment Amount",
        value: formatCurrency(vendorAnalytics.averagePaymentAmount),
      },
      {
        label: "This Month Paid",
        value: formatCurrency(vendorAnalytics.thisMonthPaid),
      },
      {
        label: "Payments This Month",
        value: String(vendorAnalytics.paymentsThisMonth),
      },
    ];
  }, [vendorAnalytics]);

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
          : "Failed to load vehicle analytics.";
      setAnalyticsError(message);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsFilters]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [
        vehiclesData,
        entriesData,
        vendorInvoicesData,
        vendorPaymentBatchesData,
        vendorAnalyticsData,
      ] =
        await Promise.all([
          fetchVehicles(),
          fetchFuelEntries(),
          fetchVehicleExpenseInvoices(),
          fetchVehicleExpensePaymentBatches(),
          fetchVehicleExpenseInvoiceAnalytics(),
        ]);

      setVehicles(vehiclesData);
      setFuelEntries(entriesData);
      setVendorInvoices(vendorInvoicesData);
      setVendorPaymentBatches(vendorPaymentBatchesData);
      setVendorAnalytics(vendorAnalyticsData);
    } catch (loadError) {
      const message =
        loadError instanceof Error
          ? loadError.message
          : "Failed to load vehicle tracker data.";
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

  useEffect(() => {
    setVehiclesPage(1);
  }, [vehicles.length]);

  useEffect(() => {
    setFuelEntriesPage(1);
  }, [dateFrom, dateTo, vehicleFilter]);

  useEffect(() => {
    setVendorInvoicesPage(1);
  }, [invoiceStatusFilter]);

  useEffect(() => {
    setVendorPaymentBatchesPage(1);
  }, [vendorPaymentBatches.length]);

  const handleCreateVehicle = async (payload: CreateVehiclePayload) => {
    setSavingVehicle(true);

    try {
      if (editingVehicle) {
        await updateVehicle(editingVehicle.id, payload);
        toast.success("Vehicle updated");
      } else {
        await createVehicle(payload);
        toast.success("Vehicle added");
      }
      setVehicleModalOpen(false);
      setEditingVehicle(null);
      await loadData();
      await loadAnalytics();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : editingVehicle
          ? "Failed to update vehicle."
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
      if (editingFuelEntry) {
        const shouldConfirm =
          payload.vehicleId !== editingFuelEntry.vehicle_id ||
          payload.fuelDate !== editingFuelEntry.fuel_date ||
          payload.odometerReading !== editingFuelEntry.odometer_reading ||
          payload.fuelAmount !== editingFuelEntry.fuel_amount ||
          payload.fuelLiters !== editingFuelEntry.fuel_liters;

        if (
          shouldConfirm &&
          !window.confirm(
            "Editing this fuel entry may recalculate mileage for later entries of this vehicle."
          )
        ) {
          return;
        }
      }

      const [billImagePath, meterImagePath] = await Promise.all([
        files.bill ? uploadFuelImage(files.bill, "bills") : null,
        files.meter ? uploadFuelImage(files.meter, "meters") : null,
      ]);

      if (editingFuelEntry) {
        await updateFuelEntry(editingFuelEntry.id, {
          ...payload,
          billImagePath: billImagePath ?? editingFuelEntry.bill_image_path,
          meterImagePath: meterImagePath ?? editingFuelEntry.meter_image_path,
        });
        toast.success("Fuel entry updated");
      } else {
        await createFuelEntry({
          ...payload,
          billImagePath,
          meterImagePath,
        });
        toast.success("Fuel entry added");
      }

      setFuelEntryModalOpen(false);
      setEditingFuelEntry(null);
      await loadData();
      await loadAnalytics();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : editingFuelEntry
          ? "Failed to update fuel entry."
          : "Failed to add fuel entry.";
      toast.error(message);
    } finally {
      setSavingFuelEntry(false);
    }
  };

  const handleDeleteFuelEntry = async (entry: FuelEntry) => {
    const confirmed = window.confirm(
      "Delete this fuel entry? This may recalculate later mileage for this vehicle."
    );
    if (!confirmed) return;

    try {
      await deleteFuelEntry(entry.id);
      toast.success("Fuel entry deleted");
      await loadData();
      await loadAnalytics();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete fuel entry.";
      toast.error(message);
    }
  };

  const handleSaveVendorInvoice = async (
    payload: CreateVehicleExpenseInvoicePayload
  ) => {
    setSavingVendorInvoice(true);

    try {
      if (editingVendorInvoice) {
        await updateVehicleExpenseInvoice(editingVendorInvoice.id, payload);
        toast.success("Vendor invoice updated");
      } else {
        await createVehicleExpenseInvoice(payload);
        toast.success("Vendor invoice created");
      }
      setVendorInvoiceModalOpen(false);
      setEditingVendorInvoice(null);
      await loadData();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : editingVendorInvoice
          ? "Failed to update vendor invoice."
          : "Failed to create vendor invoice.";
      toast.error(message);
    } finally {
      setSavingVendorInvoice(false);
    }
  };

  const handleDeleteVendorInvoice = async (
    invoice: VehicleExpenseInvoice
  ) => {
    if (invoice.payments.length > 0) {
      toast.error("Invoices with payments cannot be deleted.");
      return;
    }

    const confirmed = window.confirm("Delete this invoice? This cannot be undone.");
    if (!confirmed) return;

    try {
      await deleteVehicleExpenseInvoice(invoice.id);
      toast.success("Vendor invoice deleted");
      await loadData();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete vendor invoice.";
      toast.error(message);
    }
  };

  const updateVendorInvoiceState = (updatedInvoice: VehicleExpenseInvoice) => {
    setVendorInvoices((prev) =>
      prev.map((invoice) =>
        invoice.id === updatedInvoice.id ? updatedInvoice : invoice
      )
    );
    setViewingVendorInvoice(updatedInvoice);
  };

  const handleRecordVendorInvoicePayment = async (
    invoice: VehicleExpenseInvoice,
    payload: CreateVehicleExpenseInvoicePaymentPayload
  ) => {
    setSavingVendorInvoicePayment(true);

    try {
      const updatedInvoice = await createVehicleExpenseInvoicePayment(
        invoice.id,
        payload
      );
      updateVendorInvoiceState(updatedInvoice);
      await loadData();
      toast.success("Payment recorded");
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to record payment.";
      toast.error(message);
      throw saveError;
    } finally {
      setSavingVendorInvoicePayment(false);
    }
  };

  const handleDeleteVendorInvoicePayment = async (
    invoice: VehicleExpenseInvoice,
    payment: VehicleExpenseInvoice["payments"][number]
  ) => {
    const confirmed = window.confirm("Delete this payment? This cannot be undone.");
    if (!confirmed) return;

    setSavingVendorInvoicePayment(true);

    try {
      const updatedInvoice = await deleteVehicleExpenseInvoicePayment(
        invoice.id,
        payment.id
      );
      updateVendorInvoiceState(updatedInvoice);
      await loadData();
      toast.success("Payment deleted");
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete payment.";
      toast.error(message);
    } finally {
      setSavingVendorInvoicePayment(false);
    }
  };

  const handleCreateVendorPaymentBatch = async (
    payload: CreateVehicleExpensePaymentBatchPayload
  ) => {
    setSavingVendorPaymentBatch(true);

    try {
      await createVehicleExpensePaymentBatch(payload);
      toast.success("Payment batch created");
      setVendorPaymentBatchModalOpen(false);
      await loadData();
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : "Failed to create payment batch.";
      toast.error(message);
    } finally {
      setSavingVendorPaymentBatch(false);
    }
  };

  const handleDeleteVendorPaymentBatch = async (
    batch: VehicleExpensePaymentBatch
  ) => {
    const confirmed = window.confirm(
      "Delete this payment batch? All invoice allocations will be removed."
    );
    if (!confirmed) return;

    try {
      await deleteVehicleExpensePaymentBatch(batch.id);
      toast.success("Payment batch deleted");
      if (viewingVendorPaymentBatch?.id === batch.id) {
        setViewingVendorPaymentBatch(null);
      }
      await loadData();
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete payment batch.";
      toast.error(message);
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
              Vehicle Tracker
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Monitor vehicle fuel usage, expenses, mileage, and operational
              costs.
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
              description="Fleet-level fuel spend, other expenses, mileage, costs, warnings, and operational deviation."
            />
            <FuelTrackerDashboard
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
              description="Create and review fleet vehicles used for vehicle tracking."
              action={
                <AddButton
                  onClick={() => {
                    setEditingVehicle(null);
                    setVehicleModalOpen(true);
                  }}
                >
                  Add Vehicle
                </AddButton>
              }
            />
            <VehicleTable
              vehicles={paginatedVehicles.items}
              loading={loading}
              error={error}
              currentPage={paginatedVehicles.page}
              pageSize={VEHICLE_TRACKER_PAGE_SIZE}
              onAdd={() => {
                setEditingVehicle(null);
                setVehicleModalOpen(true);
              }}
              onEdit={(vehicle) => {
                setEditingVehicle(vehicle);
                setVehicleModalOpen(true);
              }}
            />
            <TablePagination
              page={paginatedVehicles.page}
              totalItems={vehicles.length}
              onPageChange={setVehiclesPage}
              label="vehicles"
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
                  onClick={() => {
                    setEditingFuelEntry(null);
                    setFuelEntryModalOpen(true);
                  }}
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
              entries={paginatedFuelEntries.items}
              vehiclesById={vehiclesById}
              loading={loading}
              error={error}
              currentPage={paginatedFuelEntries.page}
              pageSize={VEHICLE_TRACKER_PAGE_SIZE}
              onAdd={() => {
                setEditingFuelEntry(null);
                setFuelEntryModalOpen(true);
              }}
              onEdit={(entry) => {
                setEditingFuelEntry(entry);
                setFuelEntryModalOpen(true);
              }}
              onDelete={handleDeleteFuelEntry}
              onViewProof={handleViewProof}
            />
            <TablePagination
              page={paginatedFuelEntries.page}
              totalItems={filteredFuelEntries.length}
              onPageChange={setFuelEntriesPage}
              label="fuel entries"
            />
          </div>
        ) : null}

        {activeTab === "vendor-invoices" ? (
          <div className="space-y-4">
            <SectionHeader
              title="Vendor Invoices"
              description="Create and review vendor invoices for non-fuel vehicle and general expenses."
              action={
                <AddButton
                  onClick={() => {
                    setEditingVendorInvoice(null);
                    setVendorInvoiceModalOpen(true);
                  }}
                >
                  Add Invoice
                </AddButton>
              }
            />

            {vendorInvoiceSummaryCards.length > 0 ? (
              <SummaryCards cards={vendorInvoiceSummaryCards} />
            ) : null}

            <div className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
              {[
                { id: "all", label: "All" },
                { id: "unpaid", label: "Unpaid" },
                { id: "partially_paid", label: "Partially Paid" },
                { id: "paid", label: "Paid" },
              ].map((filter) => {
                const active = invoiceStatusFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() =>
                      setInvoiceStatusFilter(
                        filter.id as typeof invoiceStatusFilter
                      )
                    }
                    className={`min-h-9 rounded-md px-3 text-sm font-medium transition-colors ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    }`}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>

            <VendorInvoiceTable
              invoices={paginatedVendorInvoices.items}
              loading={loading}
              error={error}
              currentPage={paginatedVendorInvoices.page}
              pageSize={VEHICLE_TRACKER_PAGE_SIZE}
              onAdd={() => {
                setEditingVendorInvoice(null);
                setVendorInvoiceModalOpen(true);
              }}
              onView={setViewingVendorInvoice}
              onEdit={(invoice) => {
                if (invoice.payments.length > 0) {
                  toast.error("Invoices with payments cannot be edited.");
                  return;
                }
                setEditingVendorInvoice(invoice);
                setVendorInvoiceModalOpen(true);
              }}
              onDelete={handleDeleteVendorInvoice}
            />
            <TablePagination
              page={paginatedVendorInvoices.page}
              totalItems={filteredVendorInvoices.length}
              onPageChange={setVendorInvoicesPage}
              label="vendor invoices"
            />
          </div>
        ) : null}

        {activeTab === "vendor-payments" ? (
          <div className="space-y-4">
            <SectionHeader
              title="Vendor Payments"
              description="Create and review vendor payment batches allocated across invoices."
              action={
                <AddButton
                  onClick={() => setVendorPaymentBatchModalOpen(true)}
                  disabled={
                    vendorInvoices.filter(
                      (invoice) => invoice.balance_amount > 0
                    ).length === 0
                  }
                >
                  Create Payment Batch
                </AddButton>
              }
            />

            {vendorPaymentSummaryCards.length > 0 ? (
              <SummaryCards cards={vendorPaymentSummaryCards} />
            ) : null}

            <VendorPaymentBatchTable
              batches={paginatedVendorPaymentBatches.items}
              loading={loading}
              error={error}
              currentPage={paginatedVendorPaymentBatches.page}
              pageSize={VEHICLE_TRACKER_PAGE_SIZE}
              onAdd={() => setVendorPaymentBatchModalOpen(true)}
              onView={setViewingVendorPaymentBatch}
              onDelete={handleDeleteVendorPaymentBatch}
            />
            <TablePagination
              page={paginatedVendorPaymentBatches.page}
              totalItems={vendorPaymentBatches.length}
              onPageChange={setVendorPaymentBatchesPage}
              label="vendor payments"
            />
          </div>
        ) : null}
      </div>

      <VehicleFormModal
        open={vehicleModalOpen}
        loading={savingVehicle}
        vehicle={editingVehicle}
        hasFuelEntries={editingVehicleHasFuelEntries}
        onClose={() => {
          setVehicleModalOpen(false);
          setEditingVehicle(null);
        }}
        onSubmit={handleCreateVehicle}
      />

      <FuelEntryFormModal
        open={fuelEntryModalOpen}
        vehicles={vehicles}
        loading={savingFuelEntry}
        entry={editingFuelEntry}
        onClose={() => {
          setFuelEntryModalOpen(false);
          setEditingFuelEntry(null);
        }}
        onSubmit={handleCreateFuelEntry}
      />

      <VendorInvoiceFormModal
        open={vendorInvoiceModalOpen}
        vehicles={vehicles}
        loading={savingVendorInvoice}
        invoice={editingVendorInvoice}
        onClose={() => {
          setVendorInvoiceModalOpen(false);
          setEditingVendorInvoice(null);
        }}
        onSubmit={handleSaveVendorInvoice}
      />

      <VendorInvoiceViewModal
        invoice={viewingVendorInvoice}
        loading={savingVendorInvoicePayment}
        onClose={() => setViewingVendorInvoice(null)}
        onRecordPayment={handleRecordVendorInvoicePayment}
        onDeletePayment={handleDeleteVendorInvoicePayment}
      />

      <VendorPaymentBatchFormModal
        open={vendorPaymentBatchModalOpen}
        invoices={vendorInvoices}
        loading={savingVendorPaymentBatch}
        onClose={() => setVendorPaymentBatchModalOpen(false)}
        onSubmit={handleCreateVendorPaymentBatch}
      />

      <VendorPaymentBatchViewModal
        batch={viewingVendorPaymentBatch}
        onClose={() => setViewingVendorPaymentBatch(null)}
      />

    </div>
  );
}
