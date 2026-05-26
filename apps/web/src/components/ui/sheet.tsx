"use client";

import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface SheetProps extends HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const Sheet = forwardRef<HTMLDivElement, SheetProps>(
  ({ className, open, onOpenChange, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "fixed inset-0 z-50 bg-black/50 transition-opacity",
          open ? "opacity-100" : "opacity-0 pointer-events-none",
          className
        )}
        onClick={() => onOpenChange?.(false)}
        {...props}
      >
        <div
          className={cn(
            "absolute right-0 top-0 h-full w-3/4 max-w-sm bg-[var(--panel)] shadow-xl transition-transform",
            open ? "translate-x-0" : "translate-x-full"
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    );
  }
);

Sheet.displayName = "Sheet";

export { Sheet };
