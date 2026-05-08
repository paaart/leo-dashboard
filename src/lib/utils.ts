export function displayTransactionTitle(title?: string | null) {
  if (title === "Auto charge") return "Monthly Storage Charge";

  return title ?? "Transaction";
}
