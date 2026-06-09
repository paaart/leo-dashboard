import { useEffect, useRef, useState } from "react";

type Employee = {
  id: string;
  name: string;
  employee_code: string;
};

type EmployeeSearchSelectProps = {
  employees: Employee[];
  value: string; // selected employee id
  onChange: (id: string) => void;
};

export function EmployeeSearchSelect({
  employees,
  value,
  onChange,
}: EmployeeSearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedEmployee = employees.find((emp) => emp.id === value) || null;

  const filteredEmployees = employees.filter((emp) => {
    if (!query.trim()) return true;
    const term = query.toLowerCase();
    return (
      emp.name.toLowerCase().includes(term) ||
      emp.employee_code.toLowerCase().includes(term)
    );
  });

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = open
    ? query
    : selectedEmployee
    ? `${selectedEmployee.employee_code} - ${selectedEmployee.name}`
    : "";

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        Employee
      </label>

      <div className="relative mt-1.5">
        <input
          type="text"
          className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 pr-8 text-sm text-gray-950 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-50 dark:placeholder:text-gray-500"
          placeholder="Type to search employee..."
          value={displayValue}
          onClick={() => {
            setOpen(true);
            // when user clicks, start typing fresh
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!open) setOpen(true);
          }}
        />
        {/* dropdown arrow */}
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500">
          ▼
        </span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-md border border-gray-200 bg-white text-sm shadow-lg dark:border-gray-800 dark:bg-gray-950">
          {filteredEmployees.length === 0 ? (
            <div className="px-3 py-2 text-gray-500 dark:text-gray-400">
              No employees found
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <button
                type="button"
                key={emp.id}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-900"
                onClick={() => {
                  onChange(emp.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{emp.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {emp.employee_code}
                </span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
