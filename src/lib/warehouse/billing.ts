export function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
}

export function severity(daysOverdue: number, totalDue: number) {
  if (totalDue <= 0)
    return { label: "Paid", cls: "bg-emerald-100 text-emerald-800" };
  if (daysOverdue <= 0)
    return { label: "Due", cls: "bg-blue-100 text-blue-800" };
  if (daysOverdue <= 7)
    return {
      label: `Overdue ${daysOverdue}d`,
      cls: "bg-yellow-100 text-yellow-800",
    };
  if (daysOverdue <= 30)
    return {
      label: `Late ${daysOverdue}d`,
      cls: "bg-orange-100 text-orange-800",
    };
  return { label: `Critical ${daysOverdue}d`, cls: "bg-red-100 text-red-800" };
}

export function endDateFromStart(
  startISO: string,
  durationMonths: number
): string {
  const start = new Date(startISO + "T00:00:00");
  // add duration months, same day, then subtract 1 day => inclusive end date
  const end = new Date(
    start.getFullYear(),
    start.getMonth() + durationMonths,
    start.getDate()
  );
  end.setDate(end.getDate() - 1);
  return end.toISOString().split("T")[0];
}

export function getClientIdFallback(pod: {
  name: string;
  start_date: string;
  location: string | null;
}): string {
  const loc = (pod.location || "LOC").slice(0, 3).toUpperCase();
  const [y, m, d] = pod.start_date.split("-");
  const yymmdd = `${y.slice(2)}${m}${d}`;
  const nm = (pod.name || "CLT").replace(/\s+/g, "").slice(0, 3).toUpperCase();
  return `${loc}-${yymmdd}-${nm}`;
}
