import { notFound } from "next/navigation";
import DashboardShell, {
  type DashboardModule,
} from "@/components/Dashboard/DashboardShell";

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

  return <DashboardShell module={module as DashboardModule} />;
}
