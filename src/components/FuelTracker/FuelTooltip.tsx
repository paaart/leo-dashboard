"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipPosition = {
  left: number;
  top: number;
  placement: "top" | "bottom";
};

export function FuelTooltip({
  content,
  children,
  className = "",
  delayMs = 200,
}: {
  content: ReactNode | null | undefined;
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const [position, setPosition] = useState<TooltipPosition | null>(null);
  const timeoutRef = useRef<number | null>(null);
  const triggerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const computePosition = (target: HTMLElement): TooltipPosition => {
    const rect = target.getBoundingClientRect();
    const tooltipHalfWidth = 160;
    const viewportPadding = 12;
    const left = Math.min(
      Math.max(rect.left + rect.width / 2, tooltipHalfWidth + viewportPadding),
      window.innerWidth - tooltipHalfWidth - viewportPadding
    );
    const hasRoomAbove = rect.top > 140;

    return {
      left,
      top: hasRoomAbove ? rect.top : rect.bottom,
      placement: hasRoomAbove ? "top" : "bottom",
    };
  };

  const showTooltip = (target: EventTarget & HTMLElement) => {
    if (!content) return;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setPosition(computePosition(target));
    }, delayMs);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setPosition(null);
  };

  // Tap/click toggles so tooltip content stays reachable on touch devices,
  // where hover never fires.
  const toggleTooltip = (target: EventTarget & HTMLElement) => {
    if (!content) return;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setPosition((previous) => (previous ? null : computePosition(target)));
  };

  useEffect(() => {
    if (!position) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (triggerRef.current?.contains(event.target as Node)) return;
      hideTooltip();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") hideTooltip();
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [position]);

  return (
    <>
      <span
        ref={triggerRef}
        tabIndex={0}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
        onClick={(event) => toggleTooltip(event.currentTarget)}
        className={`inline-block max-w-full cursor-help ${className}`}
      >
        {children}
      </span>
      {content && position && typeof document !== "undefined"
        ? createPortal(
            <div
              role="tooltip"
              style={{
                left: position.left,
                top: position.top,
                transform:
                  position.placement === "top"
                    ? "translate(-50%, calc(-100% - 8px))"
                    : "translate(-50%, 8px)",
              }}
              className="pointer-events-none fixed z-50 max-w-80 whitespace-normal break-words rounded-lg border border-edge-inverse bg-surface-inverse px-3 py-2 text-left text-xs font-medium leading-5 text-fg-inverse shadow-overlay"
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
