"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Vehicle } from "@/lib/fuel-tracker/types";

function vehicleLabel(vehicle: Vehicle) {
  return [vehicle.vehicle_no, vehicle.vehicle_type, vehicle.company]
    .filter(Boolean)
    .join(" - ");
}

export function VehicleSearchSelect({
  vehicles,
  value,
  onChange,
  placeholder = "Search vehicle",
  emptyLabel = "All vehicles",
}: {
  vehicles: Vehicle[];
  value: string;
  onChange: (vehicleId: string) => void;
  placeholder?: string;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const selectedVehicle =
    vehicles.find((vehicle) => vehicle.id === value) ?? null;

  const filteredVehicles = vehicles.filter((vehicle) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return vehicleLabel(vehicle).toLowerCase().includes(term);
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const displayValue = open
    ? query
    : selectedVehicle
    ? vehicleLabel(selectedVehicle)
    : "";

  return (
    <div ref={containerRef} className="relative min-w-52">
      <input
        value={displayValue}
        onClick={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          if (!open) setOpen(true);
        }}
        className="h-9 w-full rounded-lg border border-edge bg-surface px-3 pr-8 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
        placeholder={placeholder}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted">
        <ChevronDown className="h-3.5 w-3.5" />
      </span>

      {open ? (
        <div className="absolute left-0 top-full z-[70] mt-1 max-h-72 w-full overflow-auto rounded-lg border border-edge bg-surface p-1 text-sm shadow-overlay">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-surface-2 ${
              !value ? "font-medium text-fg" : "text-fg-muted"
            }`}
          >
            <span>{emptyLabel}</span>
            {value ? (
              <X className="h-3.5 w-3.5 shrink-0 opacity-70" />
            ) : (
              <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
            )}
          </button>

          <div className="mx-1 my-1 border-t border-edge" />

          {filteredVehicles.length === 0 ? (
            <div className="px-2.5 py-2 text-fg-muted">
              {vehicles.length === 0 ? "No vehicles loaded" : "No vehicles found"}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => {
              const selected = vehicle.id === value;
              const detail = [vehicle.vehicle_type, vehicle.company]
                .filter(Boolean)
                .join(" · ");

              return (
                <button
                  type="button"
                  key={vehicle.id}
                  onClick={() => {
                    onChange(vehicle.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                    selected ? "bg-accent-soft" : "hover:bg-surface-2"
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-medium ${
                        selected ? "text-accent-soft-fg" : "text-fg"
                      }`}
                    >
                      {vehicle.vehicle_no}
                    </span>
                    {detail ? (
                      <span className="block truncate text-xs text-fg-muted">
                        {detail}
                      </span>
                    ) : null}
                  </span>
                  {selected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
