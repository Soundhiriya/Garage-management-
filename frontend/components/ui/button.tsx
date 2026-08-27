import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, loading, variant = "primary", children, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] active:bg-teal-900",
        variant === "secondary" && "border border-[var(--line)] bg-white text-slate-900 hover:border-slate-400 hover:bg-slate-50",
        variant === "ghost" && "shadow-none text-slate-700 hover:bg-slate-100",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {children}
    </button>
  );
}
