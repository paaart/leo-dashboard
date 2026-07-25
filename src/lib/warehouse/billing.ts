export function money(n: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);
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
