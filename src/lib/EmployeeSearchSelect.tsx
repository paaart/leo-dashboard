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
      <label className="block mb-1 font-medium">Employee</label>

      <div className="relative">
        <input
          type="text"
          className="w-full p-2 border rounded bg-white dark:bg-gray-800 pr-8"
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
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded border bg-white dark:bg-gray-900 shadow-lg text-sm">
          {filteredEmployees.length === 0 ? (
            <div className="px-3 py-2 text-gray-500">No employees found</div>
          ) : (
            filteredEmployees.map((emp) => (
              <button
                type="button"
                key={emp.id}
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => {
                  onChange(emp.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{emp.name}</span>
                <span className="text-xs text-gray-500">
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
