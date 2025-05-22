"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

import TransportationCalculator from "@/components/TransportationCalculator";

export default function Dashboard() {
  const [section, setSection] = useState<
    "domestic" | "international" | "loans"
  >("domestic");

  const renderContent = () => {
    switch (section) {
      case "domestic":
        return <TransportationCalculator />;
      case "international":
        return <div className="p-6">Here are your pending tasks ✅</div>;
      case "loans":
        return <div className="p-6">Manage Loans & Advances 💸</div>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar selected={section} onSelect={setSection} />
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
