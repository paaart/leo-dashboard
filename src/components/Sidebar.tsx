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

  mobileOpen: boolean;
  onMobileClose: () => void;
};

function SidebarNav({
  section,
  setSection,
  open,
  setOpen,
  isLoggedIn,
  authLoading,
  onAnyNavigate,
}: {
  section: Section;
  setSection: (section: Section) => void;
  open: "international" | "loans" | "warehouse" | null;
  setOpen: React.Dispatch<
    React.SetStateAction<"international" | "loans" | "warehouse" | null>
  >;
  isLoggedIn: boolean;
  authLoading: boolean;
  onAnyNavigate?: () => void;
}) {
  const isActive = (main: Section["main"]) => section.main === main;

  return (
    <nav className="space-y-2">
      {/* Domestic */}
      <button
        onClick={() => {
          setSection({ main: "domestic" });
          onAnyNavigate?.();
        }}
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
              onClick={() => {
                setSection({ main: "international", sub: "calculator" });
                onAnyNavigate?.();
              }}
              className={`block w-full text-left px-3 py-1 rounded ${
                section.sub === "calculator"
                  ? "bg-gray-200 dark:bg-gray-600"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              Calculator
            </button>
            <button
              onClick={() => {
                setSection({ main: "international", sub: "history" });
                onAnyNavigate?.();
              }}
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
                onClick={() => {
                  setSection({ main: "warehouse", sub: "add" });
                  onAnyNavigate?.();
                }}
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "add"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Add Client
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "active" });
                  onAnyNavigate?.();
                }}
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "active"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Active Pods
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "renewals" });
                  onAnyNavigate?.();
                }}
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

      {/* Loans – only when logged in */}
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
                onClick={() => {
                  setSection({ main: "loans", sub: "create" });
                  onAnyNavigate?.();
                }}
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "create"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Create Loan / Payback
              </button>
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "view" });
                  onAnyNavigate?.();
                }}
                className={`block w-full text-left px-3 py-1 rounded ${
                  section.sub === "view"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                View Outstanding
              </button>
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "employees" });
                  onAnyNavigate?.();
                }}
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
  );
}

export default function Sidebar({
  section,
  setSection,
  mobileOpen,
  onMobileClose,
}: SidebarProps) {
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
    let mounted = true;

    const init = async () => {
      setAuthLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      setIsLoggedIn(!error && !!data.session);
      setAuthLoading(false);
    };

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setIsLoggedIn(!!session);
      setAuthLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 md:hidden transition-opacity ${
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onMobileClose}
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6 md:hidden transform transition-transform ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-semibold">Menu</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-700"
            aria-label="Close sidebar"
          >
            ✕
          </button>
        </div>

        <SidebarNav
          section={section}
          setSection={setSection}
          open={open}
          setOpen={setOpen}
          isLoggedIn={isLoggedIn}
          authLoading={authLoading}
          onAnyNavigate={onMobileClose}
        />
      </aside>

      {/* Desktop sidebar */}
      <aside className="w-64 hidden md:block bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white p-6 sticky top-20 h-[calc(100vh-5rem)]">
        <SidebarNav
          section={section}
          setSection={setSection}
          open={open}
          setOpen={setOpen}
          isLoggedIn={isLoggedIn}
          authLoading={authLoading}
        />
      </aside>
    </>
  );
}
