import React from "react";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import BackButton from "@/src/components/BackButton";
import { cn } from "@/lib/utils";

export type PageLayoutMaxWidth =
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "6xl"
  | "7xl"
  | "full";

export interface PageLayoutProps {
  /** Page title heading */
  title?: React.ReactNode;
  /** Subtitle or short page description */
  description?: React.ReactNode;
  /** Count pill, status badge, or chip displayed next to title */
  badge?: React.ReactNode;
  /** Header action buttons (e.g., Sync, Export, New Record) */
  actions?: React.ReactNode;
  /** Sub-header slot for filter row, search bar, or tabs inside the header */
  filters?: React.ReactNode;
  /** Navigation tab strip rendered directly under the header on a dedicated white bar */
  tabs?: React.ReactNode;

  /** Show back button */
  back?: boolean;
  /** Force show/hide back button even if onBack or backTo is provided */
  showBack?: boolean;
  /** Explicit callback for back button (e.g. from Dashboard tabs) */
  onBack?: () => void;
  /** Target route or delta (-1) for back button navigation */
  backTo?: string | number;
  /** Optional back button label (defaults to icon-only or "Back") */
  backLabel?: string;
  /** Back button appearance: "icon" (round) or "button" (pill) */
  backVariant?: "icon" | "button";

  /** Force show/hide header. Auto-detected from props if omitted. */
  showHeader?: boolean;
  /** Whether the header sticks to the top while scrolling */
  stickyHeader?: boolean;

  /** Layout container style:
   * - "plain": Clean canvas with NHIA background, perfect for dashboard cards & tables
   * - "card": Content wrapped inside an elevated shadcn Card
   * - "fluid": Zero padding edge-to-edge container (for maps or split screens)
   */
  variant?: "plain" | "card" | "fluid";
  /** Maximum width of the body container */
  maxWidth?: PageLayoutMaxWidth;

  /** Displays a clean centered loading spinner */
  loading?: boolean;
  /** Displays an error message banner in place of/above content */
  error?: React.ReactNode;

  /** Backward compatibility: when true, equates to variant="plain" */
  bare?: boolean;

  /** Body children */
  children?: React.ReactNode;

  /** Custom classes for the outermost shell */
  className?: string;
  /** Custom classes for the sticky header container */
  headerClassName?: string;
  /** Custom classes for the inner body content container */
  contentClassName?: string;
  /** Custom classes for the Card (when variant="card") */
  cardClassName?: string;
}

const MAX_WIDTH_MAP: Record<PageLayoutMaxWidth, string> = {
  sm: "max-w-sm mx-auto",
  md: "max-w-md mx-auto",
  lg: "max-w-lg mx-auto",
  xl: "max-w-xl mx-auto",
  "2xl": "max-w-2xl mx-auto",
  "3xl": "max-w-3xl mx-auto",
  "4xl": "max-w-4xl mx-auto",
  "5xl": "max-w-5xl mx-auto",
  "6xl": "max-w-6xl mx-auto",
  "7xl": "max-w-7xl mx-auto",
  full: "w-full",
};

/**
 * Consistent app page shell used across the entire NHIA application.
 *
 * Supports:
 * - Standard View/List pages: Title, count badge, description, and action buttons.
 * - Form/Detail pages: Back button on the left of title, title, and form actions.
 * - Headerless pages: Set `showHeader={false}` or omit header props.
 */
export function PageLayout({
  title,
  description,
  badge,
  actions,
  filters,
  tabs,
  back = false,
  showBack,
  onBack,
  backTo,
  backLabel,
  backVariant,
  showHeader,
  stickyHeader = true,
  variant,
  maxWidth = "full",
  loading = false,
  error,
  bare,
  children,
  className,
  headerClassName,
  contentClassName,
  cardClassName,
}: PageLayoutProps) {
  const hasBack = showBack !== false && Boolean(back || onBack || backTo);

  // If showHeader is not explicitly defined, automatically show if any header prop is present
  const shouldRenderHeader =
    showHeader !== undefined
      ? showHeader
      : Boolean(hasBack || title || actions || badge || filters);

  // Determine effective visual variant: bare=true maps to "plain", default is "plain" unless card is specified
  const effectiveVariant: "plain" | "card" | "fluid" =
    variant ?? (bare === true ? "plain" : bare === false ? "card" : "plain");

  const maxWidthClass = MAX_WIDTH_MAP[maxWidth] || "w-full";

  return (
    <div
      className={cn(
        "flex min-h-full flex-1 flex-col bg-[#f4f7f5] text-slate-900",
        className
      )}
    >
      {shouldRenderHeader && (
        <header
          className={cn(
            "bg-white border-b border-[#d4e8dc]/80 px-4 md:px-6 py-3 shrink-0",
            stickyHeader ? "sticky top-0 z-20" : "",
            headerClassName
          )}
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            {/* Left section: Back button + Title */}
            <div className="flex items-center gap-3 min-w-0">
              {hasBack && (
                <BackButton
                  onClick={onBack}
                  to={backTo}
                  text={backLabel}
                  variant={backVariant ?? (backLabel ? "button" : "icon")}
                  aria-label={backLabel || "Go back"}
                />
              )}
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                {title ? (
                  <h1 className="text-lg md:text-xl font-bold tracking-tight text-slate-900 truncate">
                    {title}
                  </h1>
                ) : null}
                {badge ? <div className="shrink-0">{badge}</div> : null}
              </div>
            </div>

            {/* Right section: Header Action Buttons */}
            {actions ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 self-end sm:self-center">
                {actions}
              </div>
            ) : null}
          </div>

          {/* Optional sub-header: Filters / Tabs row */}
          {filters ? (
            <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center gap-2">
              {filters}
            </div>
          ) : null}
        </header>
      )}

      {/* Under-Header Tab Bar (Dedicated white bar sitting directly below the header) */}
      {tabs ? (
        <div className="bg-white border-b border-[#d4e8dc]/80 px-4 md:px-2 md:pr-1 shrink-0 min-w-0 shadow-2xs">
          {tabs}
        </div>
      ) : null}

      {/* Main Content Body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#145c3f]" />
          <span className="text-sm font-medium text-slate-500">Loading...</span>
        </div>
      ) : (
        <>
          {error ? (
            <div className={cn("p-4 md:p-6 w-full", maxWidthClass)}>
              <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-rose-800 text-sm">
                {error}
              </div>
            </div>
          ) : null}

          {effectiveVariant === "card" ? (
            <div className={cn("w-full flex-1 p-2 md:p-4", maxWidthClass)}>
              <Card
                className={cn(
                  "m-0 flex flex-1 flex-col border-slate-200/80 bg-white shadow-2xs",
                  cardClassName
                )}
              >
                <CardContent
                  className={cn(
                    "flex flex-1 flex-col gap-3 p-2 md:p-3 min-h-0",
                    contentClassName
                  )}
                >
                  {children}
                </CardContent>
              </Card>
            </div>
          ) : effectiveVariant === "fluid" ? (
            <div
              className={cn(
                "w-full flex-1 flex flex-col min-h-0",
                maxWidthClass,
                contentClassName
              )}
            >
              {children}
            </div>
          ) : (
            <div
              className={cn(
                "w-full flex-1 p-3 md:p-3 flex flex-col gap-3 min-h-0",
                maxWidthClass,
                contentClassName
              )}
            >
              {children}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default PageLayout;
