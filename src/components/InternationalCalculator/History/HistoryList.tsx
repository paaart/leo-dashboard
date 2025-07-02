"use client";

import React, { useState, useEffect } from "react";
import { BasicDetails } from "../types";
import HistoryItem from "./HistoryItem";
import PdfPreviewModal from "./PdfPreviewModal";
import { fetchInternationalQuote } from "@/lib/api";

export default function HistoryView() {
  const [entries, setEntries] = useState<BasicDetails[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<BasicDetails | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const quotes = await fetchInternationalQuote();
        setEntries(quotes);
      } catch (err) {
        console.error(err);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="p-8 space-y-4 overflow-auto h-full bg-white dark:bg-[#23272f] min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-8">
        History
      </h1>
      {entries.map((entry, idx) => (
        <HistoryItem
          key={idx}
          entry={entry}
          onClick={() => setSelectedEntry(entry)}
        />
      ))}

      {selectedEntry && (
        <PdfPreviewModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
        />
      )}
    </div>
  );
}
