import { notFound, redirect } from "next/navigation";
import type { DashboardModule } from "@/components/Dashboard/DashboardShell";
import HomeContent from "@/components/Dashboard/HomeContent";
import { getServerComponentAppUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const modules: DashboardModule[] = [
  "home",
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

  // Home is server-rendered: data is fetched during the request and arrives
  // in the HTML. The other modules are client components rendered by
  // DashboardShell, so their pages stay empty.
  if (module === "home") {
    const user = await getServerComponentAppUser();
    if (!user) redirect("/login");

    return <HomeContent user={user} />;
  }

  return null;
}
