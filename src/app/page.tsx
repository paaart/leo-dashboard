"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";

export default function Dashboard() {
  const [section, setSection] = useState<"home" | "tasks" | "loans">("home");

  const renderContent = () => {
    switch (section) {
      case "home":
        return <div className="p-6">Welcome to the Leo ERP dashboard 🚛</div>;
      case "tasks":
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
