import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  steps: { id: string; label: string }[];
  activeIndex: number;
  onStepChange: (index: number) => void;
  maximumIndex?: number;
  /** When true, show only step labels (no 1/2/3 circles). */
  hideNumbers?: boolean;
}

export default function StateOfficeFormSteps({ steps, activeIndex, onStepChange, maximumIndex = activeIndex, hideNumbers = false }: Props) {
  return (
    <ol className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
      {steps.map((step, index) => {
        const done = index < activeIndex;
        const active = index === activeIndex;
        return (
          <React.Fragment key={step.id}>
            {index > 0 && <div className={cn("h-px w-4 sm:w-8 shrink-0", done ? "bg-[#1a7a52]" : "bg-[#d4e8dc]")} />}
            <li className="flex items-center gap-1.5 shrink-0">
              {hideNumbers ? (
                <button
                  type="button"
                  onClick={() => { if (index <= maximumIndex) onStepChange(index); }}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold whitespace-nowrap border transition-colors",
                    active ? "bg-[#145c3f] text-white border-[#145c3f]"
                      : done ? "bg-[#e8f6ee] text-[#145c3f] border-[#c5ddd0]"
                      : "bg-white text-slate-400 border-[#d4e8dc]",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {done && !active ? <span className="inline-flex items-center gap-1"><Check className="w-3 h-3" />{step.label}</span> : step.label}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => { if (index <= maximumIndex) onStepChange(index); }}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border transition-colors",
                      (done || active) ? "bg-[#145c3f] text-white border-[#145c3f]" : "bg-white text-slate-400 border-[#d4e8dc]",
                    )}
                    aria-current={active ? "step" : undefined}
                    aria-label={step.label}
                  >
                    {done ? <Check className="w-3.5 h-3.5" /> : index + 1}
                  </button>
                  <span className={cn("text-xs font-semibold whitespace-nowrap", active ? "text-[#0f3d2e]" : "text-slate-400")}>
                    {step.label}
                  </span>
                </>
              )}
            </li>
          </React.Fragment>
        );
      })}
    </ol>
  );
}
