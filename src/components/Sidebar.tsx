"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import type { Section } from "@/components/Dashboard/DashboardShell";
import {
  defaultInventorySub,
  inventorySubsForRole,
} from "@/components/Inventory/sections";
import type { AppRole } from "@/lib/roles";

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  role: AppRole;
};

type OpenGroup = "international" | "loans" | "warehouse" | "inventory" | null;

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

/* Which accordion group a section belongs to (null for flat links). */
function groupForSection(main: Section["main"]): OpenGroup {
  switch (main) {
    case "international":
    case "loans":
    case "warehouse":
    case "inventory":
      return main;
    default:
      return null;
  }
}

function GroupChevron({ open }: { open: boolean }) {
  return open ? (
    <ChevronDown className="h-4 w-4 opacity-70" />
  ) : (
    <ChevronRight className="h-4 w-4 opacity-70" />
  );
}

/*
  Inventory Management is the one group whose sub-links depend on the role:
  admins get every screen, branch staff only the ones for reporting stock.
*/
function InventoryGroup({
  section,
  setSection,
  open,
  setOpen,
  role,
  onAnyNavigate,
}: {
  section: Section;
  setSection: (section: Section) => void;
  open: OpenGroup;
  setOpen: React.Dispatch<React.SetStateAction<OpenGroup>>;
  role: AppRole;
  onAnyNavigate?: () => void;
}) {
  const subs = inventorySubsForRole(role);
  const defaultSub = defaultInventorySub(role);
  if (!defaultSub) return null;

  return (
    <div>
      <Link
        href="/dashboard/inventory"
        onClick={() => {
          setSection({ main: "inventory", sub: defaultSub });
          setOpen((prev) => (prev === "inventory" ? null : "inventory"));
        }}
        className={groupLinkClass(section.main === "inventory")}
      >
        <span>Inventory Management</span>
        <GroupChevron open={open === "inventory"} />
      </Link>

      {open === "inventory" && section.main === "inventory" && (
        <div className="ml-3 mt-1 space-y-0.5 border-l border-edge pl-3">
          {subs.map((sub) => (
            <button
              key={sub.id}
              onClick={() => {
                setSection({ main: "inventory", sub: sub.id });
                onAnyNavigate?.();
              }}
              className={subLinkClass(section.sub === sub.id)}
            >
              {sub.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
  open: OpenGroup;
  setOpen: React.Dispatch<React.SetStateAction<OpenGroup>>;
  role: AppRole;
  onAnyNavigate?: () => void;
}) {
  const isActive = (main: Section["main"]) => section.main === main;
  const isAdmin = role === "admin";

  // Branch staff have exactly one module; nothing else applies to them.
  if (role === "branch") {
    return (
      <nav className="space-y-1">
        <InventoryGroup
          section={section}
          setSection={setSection}
          open={open}
          setOpen={setOpen}
          role={role}
          onAnyNavigate={onAnyNavigate}
        />
      </nav>
    );
  }

  return (
    <nav className="space-y-1">
      <Link
        href="/dashboard/home"
        onClick={() => {
          setSection({ main: "home" });
          setOpen(null);
          onAnyNavigate?.();
        }}
        className={mainLinkClass(isActive("home"))}
      >
        Home
      </Link>

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

      {isAdmin && (
        <InventoryGroup
          section={section}
          setSection={setSection}
          open={open}
          setOpen={setOpen}
          role={role}
          onAnyNavigate={onAnyNavigate}
        />
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
  const [open, setOpen] = useState<OpenGroup>(() =>
    groupForSection(section.main)
  );

  useEffect(() => {
    setOpen(groupForSection(section.main));
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
