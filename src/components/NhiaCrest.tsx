import { cn } from "@/lib/utils";

const SIZE = {
  lg: "h-[5.25rem] w-[5.25rem] rounded-2xl",
  sm: "h-16 w-16 rounded-2xl",
  sidebar: "h-9 w-9 rounded-full",
  brand: "h-12 w-12 rounded-full",
} as const;

export function NhiaCrest({
  size = "sm",
  className,
}: {
  size?: keyof typeof SIZE;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden bg-white ring-1 ring-white/35 shadow-[0_4px_14px_rgba(0,0,0,0.22)]",
        SIZE[size],
        className,
      )}
    >
      <img
        src="/nhia-crest.png"
        alt="National Health Insurance Authority"
        className="h-full w-full object-contain p-[3%]"
      />
    </div>
  );
}

/** Crest + wordmark designed for the dark green sidebar (not a white lockup PNG). */
export function NhiaSidebarBrand() {
  return (
    <>
      <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:hidden">
        <NhiaCrest size="brand" />
        <div className="min-w-0 pt-0.5">
          <p className="text-[11px] font-semibold uppercase leading-[1.25] tracking-[0.04em] text-white">
            National Health
            <br />
            Insurance Authority
          </p>
          <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.28em] text-[#8fe8bc]">
            URMS
          </p>
        </div>
      </div>
      <NhiaCrest size="sidebar" className="hidden group-data-[collapsible=icon]:block" />
    </>
  );
}
