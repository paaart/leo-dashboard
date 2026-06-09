import { notFound } from "next/navigation";
import type { DashboardModule } from "@/components/Dashboard/DashboardShell";

const modules: DashboardModule[] = [
  "domestic",
  "international",
  "fuel-tracker",
  "warehouse",
  "loans",
  "users",
];

export default async function DashboardModulePage({
  params,
}: {
  params: Promise<{ module: string }>;
}) {
  const { module } = await params;

  if (!modules.includes(module as DashboardModule)) {
    notFound();
  }

  return null;
}
