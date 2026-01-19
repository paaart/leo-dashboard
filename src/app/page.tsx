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
import WarehouseRenewals from "@/components/Warehouse/WarehouseRenewals";

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" }
  | { main: "warehouse"; sub: "add" | "active" | "renewals" };

export default function Dashboard() {
  const [section, setSection] = useState<Section>({
    main: "domestic",
    sub: null,
  });

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

      // ✅ NEW
      case "warehouse":
        switch (sub) {
          case "add":
            return <WarehouseAddClient />;
          case "active":
            return <WarehouseActivePods />;
          case "renewals":
            return <WarehouseRenewals />;
          default:
            return <WarehouseActivePods />;
        }

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar section={section} setSection={setSection} />
        <main className="flex-1 overflow-y-auto ">{renderContent()}</main>
      </div>
    </div>
  );
}
