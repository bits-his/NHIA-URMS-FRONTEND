import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Premium enterprise button system
 * ─────────────────────────────────
 * default   → rich green gradient, white text, soft elevation
 * outline   → soft green border, transparent bg, gentle hover fill
 * secondary → light green tint bg, green text
 * ghost     → no border, subtle hover bg
 * destructive → soft rose tint
 * link      → underline style
 */
const buttonVariants = cva(
  // ── base ──
  [
    "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
    "font-semibold whitespace-nowrap select-none",
    "border border-transparent bg-clip-padding",
    "transition-all duration-200 ease-out",
    "outline-none",
    // focus ring
    "focus-visible:ring-3 focus-visible:ring-[#25a872]/40 focus-visible:ring-offset-1",
    // active press
    "active:not-aria-[haspopup]:scale-[0.97] active:not-aria-[haspopup]:brightness-95",
    // disabled
    "disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
    // aria-invalid
    "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
    // svg
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ],
  {
    variants: {
      variant: {
        // ── Primary: deep-to-soft green gradient ──
        default: [
          "bg-gradient-to-b from-[#1a7a52] to-[#145c3f]",
          "text-white",
          "border-[#0f3d2e]/30",
          "shadow-[0_1px_3px_rgba(20,92,63,0.35),0_1px_2px_rgba(20,92,63,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "hover:-translate-y-[1px]",
          "hover:shadow-[0_4px_12px_rgba(20,92,63,0.35),0_2px_4px_rgba(20,92,63,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]",
          "hover:from-[#1f9463] hover:to-[#1a7a52]",
        ],

        // ── Outline: soft green border ──
        outline: [
          "bg-transparent",
          "border-[#b8ddc8]",
          "text-[#145c3f]",
          "shadow-[0_1px_2px_rgba(20,92,63,0.06)]",
          "hover:bg-[#e8f5ee]",
          "hover:border-[#25a872]",
          "hover:-translate-y-[1px]",
          "hover:shadow-[0_3px_8px_rgba(20,92,63,0.12)]",
          "dark:border-[#1a7a52] dark:text-[#6ddba8] dark:hover:bg-[#1a5c40]/30",
        ],

        // ── Secondary: light green tint ──
        secondary: [
          "bg-[#e8f5ee]",
          "border-[#c8e6d8]",
          "text-[#145c3f]",
          "shadow-[0_1px_2px_rgba(20,92,63,0.06)]",
          "hover:bg-[#d1f5e4]",
          "hover:border-[#25a872]",
          "hover:-translate-y-[1px]",
          "hover:shadow-[0_3px_8px_rgba(20,92,63,0.1)]",
        ],

        // ── Ghost: minimal, soft hover ──
        ghost: [
          "bg-transparent border-transparent text-slate-600",
          "hover:bg-[#e8f5ee] hover:text-[#145c3f]",
          "hover:shadow-none",
          "dark:text-slate-300 dark:hover:bg-[#1a5c40]/30 dark:hover:text-white",
        ],

        // ── Destructive: soft rose ──
        destructive: [
          "bg-rose-50 border-rose-200 text-rose-700",
          "shadow-[0_1px_2px_rgba(220,38,38,0.08)]",
          "hover:bg-rose-100 hover:border-rose-300",
          "hover:-translate-y-[1px] hover:shadow-[0_3px_8px_rgba(220,38,38,0.15)]",
          "focus-visible:ring-rose-400/40",
          "dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-400",
        ],

        // ── Link ──
        link: [
          "bg-transparent border-transparent text-[#145c3f]",
          "underline-offset-4 hover:underline",
          "shadow-none hover:shadow-none",
        ],
      },

      size: {
        default: "h-9 px-4 py-2 text-sm rounded-md",
        xs:      "h-6 px-2.5 py-1 text-xs rounded-md gap-1 [&_svg:not([class*='size-'])]:size-3",
        sm:      "h-8 px-3 py-1.5 text-xs rounded-md gap-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg:      "h-11 px-6 py-2.5 text-sm rounded-md",
        xl:      "h-12 px-8 py-3 text-base rounded-md",

        // icon variants — circular feel
        icon:      "size-9 rounded-md p-0",
        "icon-xs": "size-6 rounded-md p-0 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-md p-0 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-lg": "size-10 rounded-md p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
