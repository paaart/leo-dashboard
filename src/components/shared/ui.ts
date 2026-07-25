/*
  Canonical class strings for the design system. Use these (or compose from
  the semantic tokens in globals.css) instead of hardcoding raw gray/blue
  palettes. All tokens flip automatically with the OS theme — no dark:
  variants needed for surfaces, text, or borders.
*/

/* ---------- Buttons ---------- */

const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50";

export const buttonPrimary = `${buttonBase} bg-accent px-3.5 py-2 text-accent-fg hover:bg-accent-hover`;

export const buttonSecondary = `${buttonBase} border border-edge bg-surface px-3.5 py-2 text-fg shadow-card hover:bg-surface-2`;

export const buttonGhost = `${buttonBase} px-3 py-2 text-fg-muted hover:bg-surface-2 hover:text-fg`;

export const buttonDanger = `${buttonBase} bg-danger px-3.5 py-2 text-white hover:opacity-90`;

export const buttonDangerSoft = `${buttonBase} border border-danger/30 bg-danger-soft px-3.5 py-2 text-danger-soft-fg hover:border-danger/50`;

/* Small icon-only button (close buttons, row actions) */
export const iconButton =
  "inline-flex items-center justify-center rounded-md p-2 text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent";

/* ---------- Form fields ---------- */

export const inputField =
  "w-full rounded-lg border border-edge bg-surface px-3 py-2 text-sm text-fg placeholder:text-fg-subtle transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/25 disabled:cursor-not-allowed disabled:opacity-60";

export const selectField = inputField;

export const fieldLabel = "mb-1.5 block text-sm font-medium text-fg";

export const fieldHint = "mt-1 text-xs text-fg-subtle";

export const fieldError = "mt-1 text-xs text-danger";

/* ---------- Cards & surfaces ---------- */

export const card = "rounded-xl border border-edge bg-surface shadow-card";

export const cardPadded = `${card} p-4 sm:p-5`;

/* ---------- Modals ---------- */

export const modalOverlay =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm";

/* Scrollable variant used by tall forms */
export const modalOverlayScroll =
  "fixed inset-0 z-50 overflow-y-auto bg-black/60 p-4 backdrop-blur-sm";

export const modalPanel =
  "w-full rounded-xl border border-edge bg-surface shadow-overlay";

export const modalHeader =
  "flex items-start justify-between gap-4 border-b border-edge px-5 py-4";

export const modalTitle = "text-lg font-semibold tracking-tight text-fg";

export const modalBody = "px-5 py-4";

export const modalFooter =
  "flex items-center justify-end gap-2 border-t border-edge px-5 py-4";

/* ---------- Tables ---------- */

export const tableWrapper =
  "overflow-x-auto rounded-xl border border-edge bg-surface shadow-card";

export const tableBase = "w-full min-w-max text-left text-sm";

export const tableHead =
  "border-b border-edge bg-surface-2 text-xs font-medium uppercase tracking-wide text-fg-muted";

export const tableHeadCell = "px-4 py-3 font-medium";

export const tableRow =
  "border-b border-edge transition-colors last:border-b-0 hover:bg-surface-2/60";

export const tableCell = "px-4 py-3 text-fg";

export const tableCellMuted = "px-4 py-3 text-fg-muted";

/* ---------- Badges ---------- */

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger";

const badgeBase =
  "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-edge bg-surface-2 text-fg-muted",
  accent: "border-accent/25 bg-accent-soft text-accent-soft-fg",
  success: "border-success/25 bg-success-soft text-success-soft-fg",
  warning: "border-warning/25 bg-warning-soft text-warning-soft-fg",
  danger: "border-danger/25 bg-danger-soft text-danger-soft-fg",
};

export function badgeClass(tone: BadgeTone) {
  return `${badgeBase} ${badgeTones[tone]}`;
}

/* ---------- Alerts / inline banners ---------- */

export const alertDanger =
  "rounded-lg border border-danger/25 bg-danger-soft px-4 py-3 text-sm text-danger-soft-fg";

export const alertWarning =
  "rounded-lg border border-warning/25 bg-warning-soft px-4 py-3 text-sm text-warning-soft-fg";

export const alertSuccess =
  "rounded-lg border border-success/25 bg-success-soft px-4 py-3 text-sm text-success-soft-fg";

export const alertInfo =
  "rounded-lg border border-accent/25 bg-accent-soft px-4 py-3 text-sm text-accent-soft-fg";
