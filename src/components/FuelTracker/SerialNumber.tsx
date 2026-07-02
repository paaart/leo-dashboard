export const SERIAL_COLUMN_CLASS =
  "w-16 px-3 py-3 text-center font-medium text-gray-500 dark:text-gray-400";

export function serialNumber(
  index: number,
  currentPage = 1,
  pageSize = 50
) {
  return (currentPage - 1) * pageSize + index + 1;
}
