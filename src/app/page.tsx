"use client";

import { useState } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import DomesticCalculator from "@/components/DomesticCalculator";
import InternationalShipping from "@/components/InternationalCalculator/InternationalShipping";
// import InternationalHistory from "@/components/InternationalHistory";
import HistoryView from "@/components/InternationalCalculator/History/HistoryList";

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub?: null };

export default function Dashboard() {
  const [section, setSection] = useState<Section>({
    main: "domestic",
    sub: null,
  });

  const renderContent = () => {
    const { main, sub } = section;
    console.log(sub);

    switch (main) {
      case "domestic":
        return <DomesticCalculator />;
      case "loans":
        return <InternationalShipping />;
      case "international":
        if (sub === "history") return <HistoryView />;
        return <InternationalShipping />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar section={section} setSection={setSection} />
        <main className="flex-1 overflow-y-auto">{renderContent()}</main>
      </div>
    </div>
  );
}
