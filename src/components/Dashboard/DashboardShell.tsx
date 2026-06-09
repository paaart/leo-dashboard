"use client";

import { useEffect, useState, useTransition } from "react";
import { useSelectedLayoutSegment } from "next/navigation";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

import DomesticCalculator from "@/components/DomesticCalculator";
import InternationalShipping from "@/components/InternationalCalculator/InternationalShipping";
import HistoryView from "@/components/InternationalCalculator/History/HistoryList";
import LoanEntryForm from "@/components/LoansAndAdvances/LoanEntryForm";
import OutstandingLoansList from "@/components/LoansAndAdvances/OutstandingLoansList";
import ManageEmployees from "@/components/LoansAndAdvances/ManageEmployees";

import WarehouseAddClient from "@/components/Warehouse/WarehouseAddClient";
import WarehouseActivePods from "@/components/Warehouse/WarehouseActivePods";
import WarehouseRenewals from "@/components/Warehouse/Ledger/WarehouseRenewals";
import WarehousePayments from "@/components/Warehouse/WarehousePayments";
import WarehouseClosedPods from "@/components/Warehouse/WarehouseClosedPods";
import FuelTrackerPage from "@/components/FuelTracker/FuelTrackerPage";
import UserManagement from "@/components/UserManagement/UserManagement";
import { useDashboardAuth } from "./DashboardAuthProvider";

export type DashboardModule =
  | "domestic"
  | "international"
  | "fuel-tracker"
  | "warehouse"
  | "loans"
  | "users";

export type Section =
  | { main: "domestic"; sub?: null }
  | { main: "fuel"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" }
  | { main: "users"; sub?: null }
  | {
      main: "warehouse";
      sub: "add" | "active" | "renewals" | "payments" | "closed";
    };

function sectionFromModule(module: DashboardModule): Section {
  switch (module) {
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
    case "domestic":
    default:
      return { main: "domestic", sub: null };
  }
}

function moduleFromSegment(segment: string | null): DashboardModule {
  const modules: DashboardModule[] = [
    "domestic",
    "international",
    "fuel-tracker",
    "warehouse",
    "loans",
    "users",
  ];

  return modules.includes(segment as DashboardModule)
    ? (segment as DashboardModule)
    : "domestic";
}

function isAdminSection(section: Section) {
  return (
    section.main === "warehouse" ||
    section.main === "loans" ||
    section.main === "users"
  );
}

function ContentLoadingState() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="h-3 w-24 animate-pulse rounded bg-blue-100 dark:bg-blue-950" />
          <div className="mt-3 h-7 w-64 max-w-full animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="h-4 w-24 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="mt-3 h-7 w-32 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
              <div className="mt-4 h-3 w-36 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
            </div>
          ))}
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-950">
          <div className="h-5 w-40 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="h-10 animate-pulse rounded bg-gray-100 dark:bg-gray-800"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardShell() {
  const { user, loading: authLoading, ready } = useDashboardAuth();
  const activeModule = moduleFromSegment(useSelectedLayoutSegment());
  const [isPending, startTransition] = useTransition();
  const [section, setSection] = useState<Section>(() =>
    sectionFromModule(activeModule)
  );
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setSection(sectionFromModule(activeModule));
    });
  }, [activeModule]);

  const setAllowedSection = (nextSection: Section) => {
    if (user?.role !== "admin" && isAdminSection(nextSection)) {
      startTransition(() => {
        setSection(sectionFromModule(activeModule));
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

    if (user.role !== "admin" && isAdminSection(section)) {
      return (
        <div className="p-6">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            <h1 className="text-lg font-semibold">Access denied</h1>
            <p className="mt-1 text-sm">
              Your account does not have access to this section.
            </p>
          </div>
        </div>
      );
    }

    switch (main) {
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
          default:
            return <WarehouseClosedPods />;
        }

      default:
        return null;
    }
  };

  if (!ready || !user || (authLoading && !user)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 text-sm text-gray-600 dark:bg-gray-950 dark:text-gray-300">
        Checking access...
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
