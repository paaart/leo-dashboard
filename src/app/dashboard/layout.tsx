import type { ReactNode } from "react";
import { DashboardAuthProvider } from "@/components/Dashboard/DashboardAuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardAuthProvider>
      <div className="min-h-screen bg-gray-50 text-gray-950 dark:bg-gray-950 dark:text-gray-50">
        {children}
      </div>
    </DashboardAuthProvider>
  );
}
