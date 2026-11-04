import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BackButtonProps {
  text?: string;
  to?: string | number;
  onClick?: () => void;
  variant?: "button" | "icon";
  className?: string;
  "aria-label"?: string;
}

export function BackButton({
  text,
  to,
  onClick,
  variant,
  className,
  "aria-label": ariaLabel,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onClick) {
      onClick();
    } else if (to && typeof to === "string") {
      navigate(to);
    } else if (typeof to === "number") {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  // Determine effective variant: if explicitly "icon", or if text was not provided
  const isIcon = variant === "icon" || (!text && variant !== "button");
  const label = ariaLabel || text || "Go back";

  if (isIcon) {
    return (
      <button
        onClick={handleClick}
        type="button"
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 cursor-pointer",
          className
        )}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs transition-colors hover:bg-slate-50 hover:text-slate-900 cursor-pointer",
        className
      )}
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      <span>{text || "Back"}</span>
    </button>
  );
}

export default BackButton;
