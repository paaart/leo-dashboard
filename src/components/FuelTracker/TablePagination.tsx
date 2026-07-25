import { buttonSecondary } from "@/components/shared/ui";

export const VEHICLE_TRACKER_PAGE_SIZE = 50;

export function paginateItems<T>(
  items: T[],
  page: number,
  pageSize = VEHICLE_TRACKER_PAGE_SIZE
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    items: items.slice(start, start + pageSize),
    page: safePage,
    totalPages,
  };
}

export function TablePagination({
  page,
  totalItems,
  onPageChange,
  label = "rows",
  pageSize = VEHICLE_TRACKER_PAGE_SIZE,
}: {
  page: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  label?: string;
  pageSize?: number;
}) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * pageSize + 1;
  const end = Math.min(safePage * pageSize, totalItems);

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-edge bg-surface px-4 py-3 text-sm text-fg-muted sm:flex-row sm:items-center sm:justify-between">
      <span>
        Showing {start}-{end} of {totalItems} {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`${buttonSecondary} min-h-9`}
        >
          Previous
        </button>
        <span className="min-w-24 text-center font-medium text-fg">
          Page {safePage} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className={`${buttonSecondary} min-h-9`}
        >
          Next
        </button>
      </div>
    </div>
  );
}
