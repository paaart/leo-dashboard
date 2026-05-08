"use client";

import { useState } from "react";
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

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" }
  | {
      main: "warehouse";
      sub: "add" | "active" | "renewals" | "payments" | "closed";
    };

export default function Dashboard() {
  const [section, setSection] = useState<Section>({
    main: "domestic",
    sub: null,
  });

  // ✅ NEW: controls mobile sidebar
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const renderContent = () => {
    const { main, sub } = section;

    switch (main) {
      case "domestic":
        return <DomesticCalculator />;

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

  return (
    <div className="min-h-screen flex flex-col">
      {/* ✅ Pass toggle handler to Header */}
      <Header onMenuClick={() => setMobileSidebarOpen((prev) => !prev)} />

      <div className="flex flex-1">
        {/* ✅ Pass mobile props to Sidebar */}
        <Sidebar
          section={section}
          setSection={setSection}
          mobileOpen={mobileSidebarOpen}
          onMobileClose={() => setMobileSidebarOpen(false)}
        />

        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
