import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-gray-950 dark:text-gray-50">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
          {subtitle}
        </p>
      </div>
      {action}
    </div>
  );
}

export function SectionCard({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950 sm:p-5 ${className}`}
    >
      {title || description || action ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold text-gray-950 dark:text-gray-50">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-gray-950 dark:text-gray-50">
            {value}
          </p>
        </div>
        {icon ? (
          <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
            {icon}
          </div>
        ) : null}
      </div>
      {hint ? (
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-lg border border-gray-200 bg-white p-6 text-gray-500 shadow-sm dark:border-gray-800 dark:bg-gray-950 dark:text-gray-400">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
        {label}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-sm font-semibold text-gray-950 dark:text-gray-50">
        {title}
      </h3>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
