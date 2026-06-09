"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
import FuelTrackerPage from "@/features/fuel-tracker/FuelTrackerPage";
import UserManagement from "@/components/UserManagement/UserManagement";

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

type AppUser = {
  id: string;
  email: string;
  username: string;
  fullName: string | null;
  role: "user" | "admin";
  status: "active";
};

type AuthMeResponse =
  | { ok: true; user: AppUser }
  | { ok: false; error?: string };

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

function isAdminSection(section: Section) {
  return (
    section.main === "warehouse" ||
    section.main === "loans" ||
    section.main === "users"
  );
}

export default function DashboardShell({ module }: { module: DashboardModule }) {
  const router = useRouter();
  const [section, setSection] = useState<Section>(() =>
    sectionFromModule(module)
  );
  const [user, setUser] = useState<AppUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    setSection(sectionFromModule(module));
  }, [module]);

  useEffect(() => {
    let cancelled = false;

    const loadUser = async () => {
      setAuthLoading(true);

      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });
        const json = (await res.json()) as AuthMeResponse;

        if (cancelled) return;

        if (!res.ok || !json.ok) {
          router.replace("/login");
          return;
        }

        setUser(json.user);
      } catch {
        if (!cancelled) router.replace("/login");
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    void loadUser();

    return () => {
      cancelled = true;
    };
  }, [router]);

  const setAllowedSection = (nextSection: Section) => {
    if (user?.role !== "admin" && isAdminSection(nextSection)) {
      setSection(sectionFromModule(module));
      return;
    }

    setSection(nextSection);
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

  if (authLoading || !user) {
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

        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
