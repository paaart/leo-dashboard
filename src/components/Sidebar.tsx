"use client";

import { useEffect, useState } from "react";

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" }
  | { main: "warehouse"; sub: "add" | "active" | "renewals" };

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
};

type AuthMeResponse =
  | { ok: true; user: { id: string; email?: string | null } }
  | { ok: false; error?: string };

export default function Sidebar({ section, setSection }: SidebarProps) {
  const [open, setOpen] = useState<
    "international" | "loans" | "warehouse" | null
  >(
    section.main === "international"
      ? "international"
      : section.main === "loans"
      ? "loans"
      : section.main === "warehouse"
      ? "warehouse"
      : null
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Optional: keep open state synced when section changes
  useEffect(() => {
    setOpen(
      section.main === "international"
        ? "international"
        : section.main === "loans"
        ? "loans"
        : section.main === "warehouse"
        ? "warehouse"
        : null
    );
  }, [section.main]);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      setAuthLoading(true);
      try {
        const res = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        const json: AuthMeResponse = await res.json();

        if (cancelled) return;

        setIsLoggedIn(res.ok && json.ok);
      } catch {
        if (cancelled) return;
        setIsLoggedIn(false);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    };

    void init();

    return () => {
      cancelled = true;
    };
  }, []);

  const isActive = (main: Section["main"]) => section.main === main;

  return (
    <aside className="w-64 hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6 sticky top-20 h-[calc(100vh-5rem)]">
      <nav className="space-y-2">
        {/* Domestic */}
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

        {/* International */}
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

        {/* Tiny status text (optional, remove if you hate it) */}
        {authLoading && (
          <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">
            Checking login…
          </div>
        )}

        {/* Warehouse – only when logged in */}
        {!authLoading && isLoggedIn && (
          <div>
            <button
              onClick={() => {
                setSection({ main: "warehouse", sub: "active" });
                setOpen((prev) => (prev === "warehouse" ? null : "warehouse"));
              }}
              className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-md transition-colors ${
                isActive("warehouse")
                  ? "bg-gray-300 dark:bg-gray-700 font-semibold"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span>Warehouse</span>
              <span>{open === "warehouse" ? "▾" : "▸"}</span>
            </button>

            {open === "warehouse" && section.main === "warehouse" && (
              <div className="ml-4 mt-1 space-y-1">
                <button
                  onClick={() => setSection({ main: "warehouse", sub: "add" })}
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "add"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Add Client
                </button>
                <button
                  onClick={() =>
                    setSection({ main: "warehouse", sub: "active" })
                  }
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "active"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Active Pods
                </button>
                <button
                  onClick={() =>
                    setSection({ main: "warehouse", sub: "renewals" })
                  }
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "renewals"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Renewals
                </button>
              </div>
            )}
          </div>
        )}

        {/* Loans / Advances – only when logged in (same as warehouse for now) */}
        {!authLoading && isLoggedIn && (
          <div>
            <button
              onClick={() => {
                setSection({ main: "loans", sub: "create" });
                setOpen((prev) => (prev === "loans" ? null : "loans"));
              }}
              className={`w-full flex justify-between items-center text-left px-3 py-2 rounded-md transition-colors ${
                isActive("loans")
                  ? "bg-gray-300 dark:bg-gray-700 font-semibold"
                  : "hover:bg-gray-200 dark:hover:bg-gray-700"
              }`}
            >
              <span>Loans / Advances</span>
              <span>{open === "loans" ? "▾" : "▸"}</span>
            </button>

            {open === "loans" && section.main === "loans" && (
              <div className="ml-4 mt-1 space-y-1">
                <button
                  onClick={() => setSection({ main: "loans", sub: "create" })}
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "create"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Create Loan / Payback
                </button>
                <button
                  onClick={() => setSection({ main: "loans", sub: "view" })}
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "view"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  View Outstanding
                </button>
                <button
                  onClick={() =>
                    setSection({ main: "loans", sub: "employees" })
                  }
                  className={`block w-full text-left px-3 py-1 rounded ${
                    section.sub === "employees"
                      ? "bg-gray-200 dark:bg-gray-600"
                      : "hover:bg-gray-100 dark:hover:bg-gray-700"
                  }`}
                >
                  Manage Employees
                </button>
              </div>
            )}
          </div>
        )}
      </nav>
    </aside>
  );
}
