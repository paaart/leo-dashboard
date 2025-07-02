// src/components/Sidebar.tsx
import { useState } from "react";

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub?: null };

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
};

export default function Sidebar({ section, setSection }: SidebarProps) {
  const [open, setOpen] = useState<"international" | null>(
    section.main === "international" ? "international" : null
  );

  const isActive = (main: string) => section.main === main;

  return (
    <aside className="w-64 hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6 sticky top-20 h-[calc(100vh-5rem)]">
      <nav className="space-y-2">
        {/* Domestic Calculator */}
        <button
          onClick={() => setSection({ main: "domestic" })}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            isActive("domestic")
              ? "bg-gray-300 dark:bg-gray-700 font-semibold"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Domestic Calculator
        </button>

        {/* International Calculator with sub-tabs */}
        <div>
          <button
            onClick={() => {
              setSection({ main: "international", sub: "calculator" });
              setOpen((prev) =>
                prev === "international" ? null : "international"
              );
            }}
            className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-md transition-colors ${
              isActive("international")
                ? "bg-gray-300 dark:bg-gray-700 font-semibold"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <span>International Calculator</span>
            <span>{open === "international" ? "▾" : "▸"}</span>
          </button>

          {open === "international" && section.main === "international" && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() =>
                  setSection({ main: "international", sub: "calculator" })
                }
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "calculator"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Calculator
              </button>
              <button
                onClick={() =>
                  setSection({ main: "international", sub: "history" })
                }
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "history"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                History
              </button>
            </div>
          )}
        </div>

        {/* Loans */}
        <button
          onClick={() => setSection({ main: "loans" })}
          className={`w-full text-left px-3 py-2 rounded-md transition-colors ${
            isActive("loans")
              ? "bg-gray-300 dark:bg-gray-700 font-semibold"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          Loans / Advances
        </button>
      </nav>
    </aside>
  );
}
