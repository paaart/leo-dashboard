import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { inputField } from "@/components/shared/ui";

type Employee = {
  id: string;
  name: string;
  employee_code: string;
};

type EmployeeSearchSelectProps = {
  employees: Employee[];
  value: string; // selected employee id
  onChange: (id: string) => void;
  label?: string;
  placeholder?: string;
  clearSelectionLabel?: string;
};

export function EmployeeSearchSelect({
  employees,
  value,
  onChange,
  label = "Employee",
  placeholder = "Type to search employee...",
  clearSelectionLabel,
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
      <label className="block text-sm font-medium text-fg">
        {label}
      </label>

      <div className="relative mt-1.5">
        <input
          type="text"
          className={`${inputField} h-10 pr-8`}
          placeholder={placeholder}
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
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted">
          <ChevronDown className="h-4 w-4" />
        </span>
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-edge bg-surface text-sm shadow-overlay">
          {clearSelectionLabel && value && !query.trim() ? (
            <button
              type="button"
              className="w-full border-b border-edge px-3 py-2 text-left font-medium text-accent transition-colors hover:bg-surface-2"
              onClick={() => {
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            >
              {clearSelectionLabel}
            </button>
          ) : null}

          {filteredEmployees.length === 0 ? (
            <div className="px-3 py-2 text-fg-muted">
              No employees found
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <button
                type="button"
                key={emp.id}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-fg-muted transition-colors hover:bg-surface-2"
                onClick={() => {
                  onChange(emp.id);
                  setOpen(false);
                  setQuery("");
                }}
              >
                <span>{emp.name}</span>
                <span className="text-xs text-fg-muted">
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
