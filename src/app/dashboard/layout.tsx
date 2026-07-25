import type { ReactNode } from "react";
import { DashboardAuthProvider } from "@/components/Dashboard/DashboardAuthProvider";
import DashboardShell from "@/components/Dashboard/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <DashboardAuthProvider>
      <div className="min-h-screen bg-canvas text-fg">
        <DashboardShell>{children}</DashboardShell>
      </div>
    </DashboardAuthProvider>
  );
}
