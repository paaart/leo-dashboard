import { Check, ChevronDown, Plus } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

export function VendorSearchSelect({
  vendors,
  value,
  onChange,
  placeholder = "Search or enter vendor",
}: {
  vendors: string[];
  value: string;
  onChange: (vendorName: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
    placement: "top" | "bottom";
  } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const filteredVendors = vendors.filter((vendor) =>
    vendor.toLowerCase().includes(query.trim().toLowerCase())
  );
  const exactMatch = vendors.some(
    (vendor) => vendor.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !containerRef.current?.contains(target) &&
        !dropdownRef.current?.contains(target)
      ) {
        setOpen(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updatePosition = () => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const viewportPadding = 12;
    const dropdownHeight = 288;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const placement =
      spaceBelow < dropdownHeight && spaceAbove > spaceBelow ? "top" : "bottom";

    setPosition({
      left: rect.left,
      top: placement === "top" ? rect.top : rect.bottom,
      width: rect.width,
      placement,
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const reposition = () => updatePosition();
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, query]);

  const chooseVendor = (vendorName: string) => {
    onChange(vendorName);
    setOpen(false);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          value={open ? query : value}
          onClick={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            onChange(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setQuery("");
            }
            if (event.key === "Enter" && query.trim()) {
              event.preventDefault();
              chooseVendor(query.trim());
            }
          }}
          className="h-9 w-full rounded-lg border border-edge bg-surface px-3 pr-8 text-sm text-fg placeholder:text-fg-subtle outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
          placeholder={placeholder}
          role="combobox"
          aria-controls="vendor-search-options"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-muted" />
      </div>

      {open && position && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={dropdownRef}
              id="vendor-search-options"
              role="listbox"
              className="fixed z-[70] max-h-72 overflow-auto rounded-lg border border-edge bg-surface p-1 text-sm shadow-overlay"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                transform:
                  position.placement === "top"
                    ? "translateY(calc(-100% - 4px))"
                    : "translateY(4px)",
              }}
            >
              {query.trim() && !exactMatch ? (
                <button
                  type="button"
                  onClick={() => chooseVendor(query.trim())}
                  className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-fg hover:bg-surface-2"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-accent" />
                  <span>
                    Use <span className="font-medium">“{query.trim()}”</span> as
                    new vendor
                  </span>
                </button>
              ) : null}

              {filteredVendors.length === 0 ? (
                <div className="px-2.5 py-2 text-fg-muted">
                  {query.trim() ? "No existing vendor found" : "No vendors loaded"}
                </div>
              ) : (
                filteredVendors.map((vendor) => (
                  <button
                    type="button"
                    role="option"
                    aria-selected={vendor === value}
                    key={vendor}
                    onClick={() => chooseVendor(vendor)}
                    className={`flex w-full items-center justify-between gap-3 rounded-md px-2.5 py-2 text-left transition-colors ${
                      vendor === value
                        ? "bg-accent-soft text-accent-soft-fg"
                        : "text-fg hover:bg-surface-2"
                    }`}
                  >
                    <span className="truncate">{vendor}</span>
                    {vendor === value ? <Check className="h-3.5 w-3.5 shrink-0" /> : null}
                  </button>
                ))
              )}
            </div>,
            document.body
          )
        : null}
    </div>
  );
}
