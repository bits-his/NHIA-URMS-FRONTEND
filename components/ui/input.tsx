import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"
import {
  allowsDecimal,
  formatNumericDisplay,
  parseNumericInput,
  shouldFormatThousands,
} from "@/lib/formatNumberInput"

const inputClassName = cn(
  "h-11 w-full min-w-0 rounded-xl px-3.5 py-2 text-sm",
  "bg-[#f4f7f5]",
  "border-2 border-[#1a7a52]",
  "text-slate-800 placeholder:text-slate-400",
  "transition-all duration-200 outline-none",
  "hover:border-[#0f3d2e] hover:bg-white",
  "focus-visible:border-[#0f3d2e] focus-visible:bg-white",
  "focus-visible:ring-3 focus-visible:ring-[#1a7a52]/25",
  "shadow-[0_1px_3px_rgba(20,92,63,0.06)]",
  "focus-visible:shadow-[0_2px_8px_rgba(20,92,63,0.12)]",
  "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-slate-700",
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-100",
  "aria-invalid:border-rose-500 aria-invalid:ring-3 aria-invalid:ring-rose-400/20",
)

type InputProps = React.ComponentProps<"input"> & {
  /** Force thousand-separator formatting even when type is not number */
  thousands?: boolean
}

function Input({
  className,
  type,
  value,
  defaultValue,
  onChange,
  onFocus,
  onBlur,
  min,
  max,
  step,
  inputMode,
  thousands,
  ...props
}: InputProps) {
  const mode = inputMode as string | undefined
  const looksNumeric =
    type === "number" ||
    mode === "numeric" ||
    mode === "decimal" ||
    thousands === true

  const useFormatted =
    looksNumeric &&
    thousands !== false &&
    shouldFormatThousands(max as string | number | undefined, min as string | number | undefined)

  const allowDecimal = allowsDecimal(mode, step as string | number | undefined)

  const isControlled = value !== undefined
  const [internal, setInternal] = React.useState(() =>
    defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : "",
  )
  const [focused, setFocused] = React.useState(false)
  const [draft, setDraft] = React.useState("")

  if (!useFormatted) {
    return (
      <InputPrimitive
        type={type}
        data-slot="input"
        className={cn(inputClassName, className)}
        value={value}
        defaultValue={defaultValue}
        onChange={onChange}
        onFocus={onFocus}
        onBlur={onBlur}
        min={min}
        max={max}
        step={step}
        inputMode={inputMode}
        {...props}
      />
    )
  }

  const rawValue = isControlled ? String(value ?? "") : internal
  const displayValue = focused
    ? draft
    : formatNumericDisplay(rawValue, allowDecimal)

  const emitChange = (nextRaw: string) => {
    if (!isControlled) setInternal(nextRaw)
    if (!onChange) return
    onChange({
      target: { value: nextRaw },
      currentTarget: { value: nextRaw },
    } as React.ChangeEvent<HTMLInputElement>)
  }

  // Native input — reliable controlled formatting (Base UI can fight text mode)
  return (
    <input
      type="text"
      inputMode={allowDecimal ? "decimal" : "numeric"}
      autoComplete="off"
      data-slot="input"
      data-formatted-number=""
      className={cn(inputClassName, "font-mono tabular-nums", className)}
      value={displayValue}
      min={min as string | number | undefined}
      max={max as string | number | undefined}
      step={step as string | number | undefined}
      {...(props as React.InputHTMLAttributes<HTMLInputElement>)}
      onFocus={(e) => {
        setFocused(true)
        setDraft(formatNumericDisplay(rawValue, allowDecimal))
        onFocus?.(e)
      }}
      onBlur={(e) => {
        setFocused(false)
        let raw = parseNumericInput(e.currentTarget.value, allowDecimal)
        if (raw !== "" && min !== undefined && Number(raw) < Number(min)) raw = String(min)
        if (raw !== "" && max !== undefined && Number(raw) > Number(max)) raw = String(max)
        emitChange(raw)
        onBlur?.(e)
      }}
      onChange={(e) => {
        const typed = e.currentTarget.value
        const stripped = typed.replace(/,/g, "")
        const raw = parseNumericInput(typed, allowDecimal)
        let nextDraft = formatNumericDisplay(raw, allowDecimal)
        if (allowDecimal && stripped.endsWith(".") && !String(raw).includes(".")) {
          nextDraft = `${formatNumericDisplay(raw, true)}.`
        }
        setDraft(nextDraft)
        emitChange(raw)
      }}
    />
  )
}

export { Input }
