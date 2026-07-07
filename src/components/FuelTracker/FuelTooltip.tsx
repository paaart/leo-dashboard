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

  useEffect(() => {
    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, []);

  const showTooltip = (target: EventTarget & HTMLElement) => {
    if (!content) return;

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const tooltipHalfWidth = 160;
      const viewportPadding = 12;
      const left = Math.min(
        Math.max(rect.left + rect.width / 2, tooltipHalfWidth + viewportPadding),
        window.innerWidth - tooltipHalfWidth - viewportPadding
      );
      const hasRoomAbove = rect.top > 140;

      setPosition({
        left,
        top: hasRoomAbove ? rect.top : rect.bottom,
        placement: hasRoomAbove ? "top" : "bottom",
      });
    }, delayMs);
  };

  const hideTooltip = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setPosition(null);
  };

  return (
    <>
      <span
        tabIndex={0}
        onMouseEnter={(event) => showTooltip(event.currentTarget)}
        onMouseLeave={hideTooltip}
        onFocus={(event) => showTooltip(event.currentTarget)}
        onBlur={hideTooltip}
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
              className="pointer-events-none fixed z-50 max-w-80 whitespace-normal break-words rounded-md border border-gray-700 bg-gray-950 px-3 py-2 text-left text-xs font-medium leading-5 text-white shadow-lg dark:border-gray-600"
            >
              {content}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
