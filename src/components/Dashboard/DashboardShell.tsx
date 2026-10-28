"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { useSelectedLayoutSegment } from "next/navigation";
import { Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import {
  canOpenInventorySub,
  defaultInventorySub,
  type InventorySub,
} from "@/components/Inventory/sections";
import type { AppRole } from "@/lib/roles";
import { useDashboardAuth } from "./DashboardAuthProvider";

/*
  Modules are lazy-loaded so each page only downloads the code it renders —
  the shell used to import every module statically, which shipped the whole
  app's JS on every page.
*/
const moduleLoading = () => <ContentLoadingState />;

const DomesticCalculator = dynamic(
  () => import("@/components/DomesticCalculator"),
  { loading: moduleLoading },
);
const InternationalShipping = dynamic(
  () => import("@/components/InternationalCalculator/InternationalShipping"),
  { loading: moduleLoading },
);
const HistoryView = dynamic(
  () => import("@/components/InternationalCalculator/History/HistoryList"),
  { loading: moduleLoading },
);
const LoanEntryForm = dynamic(
  () => import("@/components/LoansAndAdvances/LoanEntryForm"),
  { loading: moduleLoading },
);
const OutstandingLoansList = dynamic(
  () => import("@/components/LoansAndAdvances/OutstandingLoansList"),
  { loading: moduleLoading },
);
const ManageEmployees = dynamic(
  () => import("@/components/LoansAndAdvances/ManageEmployees"),
  { loading: moduleLoading },
);
const WarehouseAddClient = dynamic(
  () => import("@/components/Warehouse/WarehouseAddClient"),
  { loading: moduleLoading },
);
const WarehouseActivePods = dynamic(
  () => import("@/components/Warehouse/WarehouseActivePods"),
  { loading: moduleLoading },
);
const WarehouseRenewals = dynamic(
  () => import("@/components/Warehouse/Ledger/WarehouseRenewals"),
  { loading: moduleLoading },
);
const WarehousePayments = dynamic(
  () => import("@/components/Warehouse/WarehousePayments"),
  { loading: moduleLoading },
);
const WarehouseClosedPods = dynamic(
  () => import("@/components/Warehouse/WarehouseClosedPods"),
  { loading: moduleLoading },
);
const WarehousePaymentAlerts = dynamic(
  () => import("@/components/Warehouse/WarehousePaymentAlerts"),
  { loading: moduleLoading },
);
const FuelTrackerPage = dynamic(
  () => import("@/components/FuelTracker/FuelTrackerPage"),
  { loading: moduleLoading },
);
const UserManagement = dynamic(
  () => import("@/components/UserManagement/UserManagement"),
  { loading: moduleLoading },
);
const InventoryCounts = dynamic(
  () => import("@/components/Inventory/InventoryCounts"),
  { ssr: false },
);

const InventorySetup = dynamic(
  () => import("@/components/Inventory/InventorySetup"),
  { loading: moduleLoading },
);
const InventoryPurchases = dynamic(
  () => import("@/components/Inventory/InventoryPurchases"),
  { loading: moduleLoading },
);
const InventoryMovement = dynamic(
  () => import("@/components/Inventory/InventoryMovement"),
  { loading: moduleLoading },
);
const VendorsPage = dynamic(() => import("@/components/Vendors/VendorsPage"), {
  loading: moduleLoading,
});

export type DashboardModule =
  | "home"
  | "domestic"
  | "international"
  | "fuel-tracker"
  | "warehouse"
  | "loans"
  | "users"
  | "inventory"
  | "vendors";

export type Section =
  | { main: "home"; sub?: null }
  | { main: "domestic"; sub?: null }
  | { main: "fuel"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" }
  | { main: "users"; sub?: null }
  | {
      main: "warehouse";
      sub:
        | "add"
        | "active"
        | "renewals"
        | "payments"
        | "closed"
        | "payment-alerts";
    }
  | { main: "inventory"; sub: InventorySub }
  | { main: "vendors"; sub?: null };

function sectionFromModule(module: DashboardModule, role: AppRole): Section {
  switch (module) {
    case "home":
      return { main: "home", sub: null };
    case "international":
      return { main: "international", sub: "calculator" };
    case "fuel-tracker":
      return { main: "fuel", sub: null };
    case "warehouse":
      return { main: "warehouse", sub: "active" };
    case "loans":
      return { main: "loans", sub: "create" };
    case "users":
      return { main: "users", sub: null };
    case "inventory":
      // Branch staff and admins land on different first screens.
      return { main: "inventory", sub: defaultInventorySub(role) ?? "setup" };
    case "vendors":
      return { main: "vendors", sub: null };
    case "domestic":
    default:
      return { main: "domestic", sub: null };
  }
}

function moduleFromSegment(segment: string | null): DashboardModule {
  const modules: DashboardModule[] = [
    "home",
    "domestic",
    "international",
    "fuel-tracker",
    "warehouse",
    "loans",
    "users",
    "inventory",
    "vendors",
  ];

  return modules.includes(segment as DashboardModule)
    ? (segment as DashboardModule)
    : "home";
}

function isAdminSection(section: Section) {
  return (
    section.main === "warehouse" ||
    section.main === "loans" ||
    section.main === "users" ||
    section.main === "inventory" ||
    section.main === "vendors"
  );
}

/*
  Admins see everything. Branch staff see only their Inventory Management
  screens. Regular users see everything that isn't admin-only.
*/
function canAccessSection(role: AppRole, section: Section) {
  if (role === "admin") return true;
  if (section.main === "inventory") {
    return canOpenInventorySub(role, section.sub);
  }
  if (role === "branch") return false;
  return !isAdminSection(section);
}

function ContentLoadingState() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-card">
          <div className="h-3 w-24 animate-pulse rounded bg-accent-soft" />
          <div className="mt-3 h-7 w-64 max-w-full animate-pulse rounded bg-surface-2" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-surface-2" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-xl border border-edge bg-surface p-4 shadow-card"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-surface-2" />
              <div className="mt-3 h-7 w-32 animate-pulse rounded bg-surface-2" />
              <div className="mt-4 h-3 w-36 animate-pulse rounded bg-surface-2" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-edge bg-surface p-5 shadow-card">
          <div className="h-5 w-40 animate-pulse rounded bg-surface-2" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded bg-surface-2"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell({ children }: { children?: ReactNode }) {
  const { user, loading: authLoading, ready } = useDashboardAuth();
  const activeModule = moduleFromSegment(useSelectedLayoutSegment());
  const [isPending, startTransition] = useTransition();
  // Role only matters for the inventory default sub; "user" is a safe
  // placeholder until the auth provider has resolved the real user.
  const role: AppRole = user?.role ?? "user";
  const [section, setSection] = useState<Section>(() =>
    sectionFromModule(activeModule, role),
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setSection(sectionFromModule(activeModule, role));
    });
  }, [activeModule, role]);

  const setAllowedSection = (nextSection: Section) => {
    if (!canAccessSection(role, nextSection)) {
      startTransition(() => {
        setSection(sectionFromModule(activeModule, role));
      });
      return;
    }

    startTransition(() => {
      setSection(nextSection);
    });
  };

  const renderContent = () => {
    if (!user) return null;

    const { main, sub } = section;

    if (!canAccessSection(user.role, section)) {
      return (
        <div className="p-6">
          <div className="rounded-xl border border-danger/25 bg-danger-soft p-6 text-danger-soft-fg">
            <h1 className="text-lg font-semibold">Access denied</h1>
            <p className="mt-1 text-sm">
              Your account does not have access to this section.
            </p>
          </div>
        </div>
      );
    }

    switch (main) {
      // Home is server-rendered by app/dashboard/[module]/page.tsx and
      // arrives as children with its data already in the HTML.
      case "home":
        return children;

      case "domestic":
        return <DomesticCalculator />;

      case "fuel":
        return <FuelTrackerPage />;

      case "international":
        if (sub === "history") return <HistoryView />;
        return <InternationalShipping />;

      case "loans":
        switch (sub) {
          case "create":
            return <LoanEntryForm />;
          case "view":
            return <OutstandingLoansList />;
          case "employees":
            return <ManageEmployees />;
          default:
            return <LoanEntryForm />;
        }

      case "users":
        return <UserManagement />;

      case "warehouse":
        switch (sub) {
          case "add":
            return <WarehouseAddClient />;
          case "active":
            return <WarehouseActivePods />;
          case "renewals":
            return <WarehouseRenewals />;
          case "payments":
            return <WarehousePayments />;
          case "payment-alerts":
            return <WarehousePaymentAlerts />;
          default:
            return <WarehouseClosedPods />;
        }

      case "inventory":
        switch (sub) {
          case "setup":
            return <InventorySetup />;
          case "overview":
            return <InventoryCounts key="overview" mode="overview" />;
          case "update":
            return <InventoryCounts key="update" mode="update" />;
          case "purchases":
            return <InventoryPurchases />;
          case "dispatches":
            return <InventoryMovement mode="dispatches" />;
          case "count-requests":
            return <InventoryMovement mode="count-requests" />;
          case "reconciliation":
            return <InventoryMovement mode="reconciliation" />;
          default:
            return <InventorySetup />;
        }

      case "vendors":
        return <VendorsPage />;

      default:
        return null;
    }
  };

  if (!ready || !user || (authLoading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="flex items-center gap-3 rounded-xl border border-edge bg-surface px-5 py-3.5 text-sm font-medium text-fg-muted shadow-card">
          <Loader2 className="h-4 w-4 animate-spin text-accent" />
          Checking access…
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header
        onMenuClick={() => setMobileSidebarOpen((prev) => !prev)}
        user={user}
      />

      <div className="flex flex-1">
        <Sidebar
          section={section}
          setSection={setAllowedSection}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
          role={user.role}
        />

        <main className="flex-1 overflow-y-auto">
          {isPending ? <ContentLoadingState /> : renderContent()}
        </main>
      </div>
    </div>
  );
}
