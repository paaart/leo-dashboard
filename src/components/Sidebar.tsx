"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { Section } from "@/components/Dashboard/DashboardShell";

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  role: "user" | "admin";
};

const mainLinkClass = (active: boolean) =>
  `block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
    active
      ? "bg-accent-soft font-medium text-accent-soft-fg"
      : "text-fg-muted hover:bg-surface-2 hover:text-fg"
  }`;

const groupLinkClass = (active: boolean) =>
  `flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors ${
    active
      ? "bg-accent-soft font-medium text-accent-soft-fg"
      : "text-fg-muted hover:bg-surface-2 hover:text-fg"
  }`;

const subLinkClass = (active: boolean) =>
  `block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
    active
      ? "font-medium text-fg"
      : "text-fg-muted hover:bg-surface-2 hover:text-fg"
  }`;

function GroupChevron({ open }: { open: boolean }) {
  return open ? (
    <ChevronDown className="h-4 w-4 opacity-70" />
  ) : (
    <ChevronRight className="h-4 w-4 opacity-70" />
  );
}

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

  return (
    <nav className="space-y-1">
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
          className={groupLinkClass(isActive("international"))}
        >
          <span>International Calculator</span>
          <GroupChevron open={open === "international"} />
        </Link>

        {open === "international" && section.main === "international" && (
          <div className="ml-3 mt-1 space-y-0.5 border-l border-edge pl-3">
            <button
              onClick={() => {
                setSection({ main: "international", sub: "calculator" });
                onAnyNavigate?.();
              }}
              className={subLinkClass(section.sub === "calculator")}
            >
              Calculator
            </button>
            <button
              onClick={() => {
                setSection({ main: "international", sub: "history" });
                onAnyNavigate?.();
              }}
              className={subLinkClass(section.sub === "history")}
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
            className={groupLinkClass(isActive("warehouse"))}
          >
            <span>Warehouse</span>
            <GroupChevron open={open === "warehouse"} />
          </Link>

          {open === "warehouse" && section.main === "warehouse" && (
            <div className="ml-3 mt-1 space-y-0.5 border-l border-edge pl-3">
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "add" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "add")}
              >
                Add Client
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "active" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "active")}
              >
                Active Pods
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "renewals" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "renewals")}
              >
                Renewals
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "payments" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "payments")}
              >
                Payments
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "closed" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "closed")}
              >
                Closed Pods
              </button>
              <button
                onClick={() => {
                  setSection({ main: "warehouse", sub: "payment-alerts" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "payment-alerts")}
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
            className={groupLinkClass(isActive("loans"))}
          >
            <span>Loans / Advances</span>
            <GroupChevron open={open === "loans"} />
          </Link>

          {open === "loans" && section.main === "loans" && (
            <div className="ml-3 mt-1 space-y-0.5 border-l border-edge pl-3">
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "create" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "create")}
              >
                Create Loan / Payback
              </button>
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "view" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "view")}
              >
                View Outstanding
              </button>
              <button
                onClick={() => {
                  setSection({ main: "loans", sub: "employees" });
                  onAnyNavigate?.();
                }}
                className={subLinkClass(section.sub === "employees")}
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
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={onMobileClose}
          />

          <aside className="fixed left-0 top-0 z-50 h-full w-64 border-r border-edge bg-surface p-4 text-fg md:hidden">
            <div className="mb-4 flex items-center justify-between px-2">
              <span className="text-sm font-semibold">Menu</span>
              <button
                type="button"
                onClick={onMobileClose}
                className="rounded-md p-1.5 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg"
                aria-label="Close sidebar"
              >
                <X className="h-4 w-4" />
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

      <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-64 overflow-y-auto border-r border-edge bg-surface p-4 text-fg md:block">
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
