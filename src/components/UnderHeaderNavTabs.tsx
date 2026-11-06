import * as React from "react";
import { cn } from "@/lib/utils";

export interface NavTabItem<T extends string = string> {
  id: T;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number | string | null;
  badge?: React.ReactNode;
  disabled?: boolean;
}

export interface UnderHeaderNavTabsProps<T extends string = string> {
  tabs: NavTabItem<T>[];
  activeTab: T;
  onChange: (id: T) => void;
  className?: string;
  ariaLabel?: string;
  /** Larger labels and icons. */
  size?: "sm" | "lg";
}

/**
 * Reusable under-header navigation tab strip matching the NHIA design system
 * (Staff Management, Office Profile, SERVICOM Dashboard).
 */
export function UnderHeaderNavTabs<T extends string = string>({
  tabs,
  activeTab,
  onChange,
  className,
  ariaLabel = "Navigation Tabs",
  size = "lg",
}: UnderHeaderNavTabsProps<T>) {
  const large = size === "lg";
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        "flex items-center gap-1 overflow-x-auto lg:overflow-x-visible -mb-px w-full",
        className
      )}
    >
      {tabs.map((tab) => {
        const active = activeTab === tab.id;
        const Icon = tab.icon;
        const hasCount = tab.count !== undefined && tab.count !== null;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={tab.disabled}
            onClick={() => !tab.disabled && onChange(tab.id)}
            className={cn(
              "group relative shrink-0 inline-flex items-center font-semibold whitespace-nowrap border-b-2 transition-all outline-none cursor-pointer",
              large ? "gap-2 px-4 py-3.5 text-sm" : "gap-1.5 px-3 py-2.5 text-xs",
              active
                ? "border-[#145c3f] text-[#145c3f]"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300",
              tab.disabled && "opacity-50 cursor-not-allowed pointer-events-none"
            )}
          >
            {Icon && (
              <Icon
                className={cn(
                  "shrink-0 transition-colors",
                  large ? "size-5" : "size-3.5",
                  active
                    ? "text-[#145c3f]"
                    : "text-slate-400 group-hover:text-slate-600"
                )}
              />
            )}
            <span>{tab.label}</span>
            {hasCount && (
              <span
                className={cn(
                  "inline-flex min-w-[1.15rem] h-4 items-center justify-center rounded-full px-1 text-[10px] font-bold tabular-nums leading-none transition-colors",
                  active
                    ? "bg-[#e8f5ee] text-[#145c3f]"
                    : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                )}
              >
                {tab.count}
              </span>
            )}
            {tab.badge}
          </button>
        );
      })}
    </div>
  );
}

export default UnderHeaderNavTabs;

