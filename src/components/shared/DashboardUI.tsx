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
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-accent">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-fg">
          {title}
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-fg-muted">{subtitle}</p>
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
      className={`rounded-xl border border-edge bg-surface p-4 shadow-card sm:p-5 ${className}`}
    >
      {title || description || action ? (
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-fg">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-1 text-sm text-fg-muted">{description}</p>
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
    <div className="rounded-xl border border-edge bg-surface p-4 shadow-card">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-fg-muted">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-fg">
            {value}
          </p>
        </div>
        {icon ? (
          <div className="rounded-lg bg-accent-soft p-2 text-accent-soft-fg">
            {icon}
          </div>
        ) : null}
      </div>
      {hint ? <p className="mt-3 text-xs text-fg-subtle">{hint}</p> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-64 items-center justify-center rounded-xl border border-edge bg-surface p-6 text-fg-muted shadow-card">
      <div className="flex items-center gap-3 text-sm font-medium">
        <Loader2 className="h-5 w-5 animate-spin text-accent" />
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
    <div className="rounded-xl border border-dashed border-edge-strong bg-surface-2/60 p-8 text-center">
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 text-sm text-fg-muted">{description}</p>
    </div>
  );
}
