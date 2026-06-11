"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Section } from "@/components/Dashboard/DashboardShell";

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  role: "user" | "admin";
};

function SidebarNav({
  section,
  setSection,
  open,
  setOpen,
  role,
  onAnyNavigate,
}: {
  section: Section;
  setSection: (section: Section) => void;
  open: "international" | "loans" | "warehouse" | null;
  setOpen: React.Dispatch<
    React.SetStateAction<"international" | "loans" | "warehouse" | null>
  >;
  role: "user" | "admin";
  onAnyNavigate?: () => void;
}) {
  const isActive = (main: Section["main"]) => section.main === main;
  const isAdmin = role === "admin";

  const mainLinkClass = (active: boolean) =>
    `block w-full rounded-md px-3 py-2 text-left transition-colors ${
      active
        ? "bg-gray-300 font-semibold dark:bg-gray-700"
        : "hover:bg-gray-200 dark:hover:bg-gray-700"
    }`;

  return (
    <nav className="space-y-2">
      <Link
        href="/dashboard/domestic"
        onClick={() => {
          setSection({ main: "domestic" });
          setOpen(null);
          onAnyNavigate?.();
        }}
        className={mainLinkClass(isActive("domestic"))}
      >
        Domestic Calculator
      </Link>

      <div>
        <Link
          href="/dashboard/international"
          onClick={() => {
            setSection({ main: "international", sub: "calculator" });
            setOpen((prev) =>
              prev === "international" ? null : "international"
            );
          }}
          className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
            isActive("international")
              ? "bg-gray-300 font-semibold dark:bg-gray-700"
              : "hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <span>International Calculator</span>
          <span>{open === "international" ? "▾" : "▸"}</span>
        </Link>

        {open === "international" && section.main === "international" && (
          <div className="ml-4 mt-1 space-y-1">
            <button
              onClick={() => {
                setSection({ main: "international", sub: "calculator" });
                onAnyNavigate?.();
              }}
              className={`block w-full rounded px-3 py-1 text-left ${
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
              className={`block w-full rounded px-3 py-1 text-left ${
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

      <Link
        href="/dashboard/fuel-tracker"
        onClick={() => {
          setSection({ main: "fuel" });
          setOpen(null);
          onAnyNavigate?.();
        }}
        className={mainLinkClass(isActive("fuel"))}
      >
        Vehicle Tracker
      </Link>

      {isAdmin && (
        <Link
          href="/dashboard/users"
          onClick={() => {
            setSection({ main: "users" });
            setOpen(null);
            onAnyNavigate?.();
          }}
          className={mainLinkClass(isActive("users"))}
        >
          User Management
        </Link>
      )}

      {isAdmin && (
        <div>
          <Link
            href="/dashboard/warehouse"
            onClick={() => {
              setSection({ main: "warehouse", sub: "active" });
              setOpen((prev) => (prev === "warehouse" ? null : "warehouse"));
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
              isActive("warehouse")
                ? "bg-gray-300 font-semibold dark:bg-gray-700"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <span>Warehouse</span>
            <span>{open === "warehouse" ? "▾" : "▸"}</span>
          </Link>

          {open === "warehouse" && section.main === "warehouse" && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "add" });
                  onAnyNavigate?.();
                }}
                className={`block w-full rounded px-3 py-1 text-left ${
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
                className={`block w-full rounded px-3 py-1 text-left ${
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
                className={`block w-full rounded px-3 py-1 text-left ${
                  section.sub === "renewals"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Renewals
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "payments" });
                  onAnyNavigate?.();
                }}
                className={`block w-full rounded px-3 py-1 text-left ${
                  section.sub === "payments"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Payments
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "closed" });
                  onAnyNavigate?.();
                }}
                className={`block w-full rounded px-3 py-1 text-left ${
                  section.sub === "closed"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Closed Pods
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "payment-alerts" });
                  onAnyNavigate?.();
                }}
                className={`block w-full rounded px-3 py-1 text-left ${
                  section.sub === "payment-alerts"
                    ? "bg-gray-200 dark:bg-gray-600"
                    : "hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                Payment Alerts
              </button>
            </div>
          )}
        </div>
      )}

      {isAdmin && (
        <div>
          <Link
            href="/dashboard/loans"
            onClick={() => {
              setSection({ main: "loans", sub: "create" });
              setOpen((prev) => (prev === "loans" ? null : "loans"));
            }}
            className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors ${
              isActive("loans")
                ? "bg-gray-300 font-semibold dark:bg-gray-700"
                : "hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            <span>Loans / Advances</span>
            <span>{open === "loans" ? "▾" : "▸"}</span>
          </Link>

          {open === "loans" && section.main === "loans" && (
            <div className="ml-4 mt-1 space-y-1">
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "create" });
                  onAnyNavigate?.();
                }}
                className={`block w-full rounded px-3 py-1 text-left ${
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
                className={`block w-full rounded px-3 py-1 text-left ${
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
                className={`block w-full rounded px-3 py-1 text-left ${
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
  role,
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

  return (
    <>
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={onMobileClose}
          />

          <aside className="fixed left-0 top-0 z-50 h-full w-64 bg-gray-100 p-6 text-gray-900 dark:bg-gray-800 dark:text-white md:hidden">
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
              role={role}
              onAnyNavigate={onMobileClose}
            />
          </aside>
        </>
      )}

      <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-64 bg-gray-100 p-6 text-gray-900 dark:bg-gray-800 dark:text-white md:block">
        <SidebarNav
          section={section}
          setSection={setSection}
          open={open}
          setOpen={setOpen}
          role={role}
        />
      </aside>
    </>
  );
}
