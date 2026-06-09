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
    <div className="flex min-h-52 flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/70 px-6 py-10 text-center dark:border-gray-700 dark:bg-gray-900/40">
      <div className="mb-3 rounded-full border border-gray-200 bg-white p-3 text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
        <FileText className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
