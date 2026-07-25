"use client";

import { ChevronDown, X } from "lucide-react";
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
        <div className="absolute left-0 top-full z-[70] mt-1 w-full max-h-56 overflow-auto rounded-lg border border-edge bg-surface text-sm shadow-overlay">
          <button
            type="button"
            onClick={() => {
              onChange("");
              setOpen(false);
              setQuery("");
            }}
            className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-fg-muted hover:bg-surface-2"
          >
            <span>{emptyLabel}</span>
            <X className="h-4 w-4" />
          </button>
          {filteredVehicles.length === 0 ? (
            <div className="px-3 py-2 text-fg-muted">
              {vehicles.length === 0 ? "No vehicles loaded" : "No vehicles found"}
            </div>
          ) : (
            filteredVehicles.map((vehicle) => (
              <button
                type="button"
                key={vehicle.id}
                onClick={() => {
                  onChange(vehicle.id);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-fg hover:bg-surface-2"
              >
                <span>{vehicle.vehicle_no}</span>
                <span className="text-xs text-fg-muted">
                  {[vehicle.vehicle_type, vehicle.company]
                    .filter(Boolean)
                    .join(" - ")}
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
