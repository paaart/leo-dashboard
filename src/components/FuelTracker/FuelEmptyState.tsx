import { FileText } from "lucide-react";
import type { ReactNode } from "react";

export function FuelEmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-edge-strong bg-surface-2/60 px-6 py-10 text-center">
      <div className="mb-3 rounded-full border border-edge bg-surface p-3 text-fg-muted shadow-card">
        <FileText className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-fg">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
