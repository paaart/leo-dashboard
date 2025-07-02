"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Section =
  | { main: "domestic"; sub?: null }
  | { main: "international"; sub: "calculator" | "history" }
  | { main: "loans"; sub: "create" | "view" | "employees" };

type SidebarProps = {
  section: Section;
  setSection: (section: Section) => void;
};

export default function Sidebar({ section, setSection }: SidebarProps) {
  const [open, setOpen] = useState<"international" | "loans" | null>(
    section.main === "international"
      ? "international"
      : section.main === "loans"
      ? "loans"
      : null
  );

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchAdminStatus = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        const { data, error } = await supabase
          .from("employees")
          .select("is_admin")
          .eq("email", user.email)
          .single();

        if (!error && data?.is_admin) {
          setIsAdmin(true);
        }
      }
    };

    fetchAdminStatus();
  }, []);

  const isActive = (main: string) => section.main === main;

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

        {/* Loans / Advances – only for admins */}
        {isAdmin && (
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
