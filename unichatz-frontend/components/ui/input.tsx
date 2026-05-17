import { cn } from "@/lib/utils"
import * as React from "react"

const Input = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, type, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none transition-all",
        "focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20",
        "shadow-inner shadow-black/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})

Input.displayName = "Input"

export { Input }
export default Input