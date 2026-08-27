import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ label, error, id, className, ...props }: InputProps) {
  const inputId = id ?? props.name;
  return (
    <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor={inputId}>
      {label}
      <input
        id={inputId}
        className={cn(
          "focus-ring min-h-11 rounded-md border bg-white px-3 text-base text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-slate-400 hover:border-slate-400 disabled:bg-slate-100",
          error ? "border-[var(--danger)]" : "border-[var(--line)]",
          className
        )}
        aria-invalid={Boolean(error)}
        {...props}
      />
      {error ? <span className="text-sm font-normal text-[var(--danger)]">{error}</span> : null}
    </label>
  );
}
