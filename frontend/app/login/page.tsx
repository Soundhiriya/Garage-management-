"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Gauge, Lock, ShieldCheck, UserCog, Wrench } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { login } from "@/services/auth";
import { loginSchema, type LoginInput } from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const highlights = [
  { label: "Job Cards", helper: "Guided 14-step workflow" },
  { label: "Billing", helper: "GST-ready invoices" },
  { label: "History", helper: "Full vehicle timeline" }
];

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  });

  async function onSubmit(input: LoginInput) {
    setServerError("");
    try {
      const user = await login(input);
      router.replace(user.role === "TECHNICIAN" ? "/technician/dashboard" : "/dashboard");
    } catch (error: any) {
      setServerError(error.response?.data?.message ?? "Login failed. Please try again.");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <section className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
        <div className="brand-mesh relative hidden overflow-hidden p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15">
              <Wrench className="h-6 w-6 text-teal-200" />
            </div>
            <div>
              <p className="text-lg font-bold leading-tight tracking-tight">GARAGE</p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-200/80">Management Suite</p>
            </div>
          </div>

          <div className="py-16">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-200">
              <Gauge className="h-3.5 w-3.5" />
              Professional Service Desk
            </p>
            <h1 className="max-w-xl text-4xl font-bold leading-[1.15] tracking-tight xl:text-5xl">
              Run your service floor with one connected system.
            </h1>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-300">
              Vehicle entry, inspections, estimates, approvals, invoicing, payments, delivery, and follow-ups — all
              on a single Job Card record, from open to close.
            </p>
            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3">
              {highlights.map((item) => (
                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.06] px-4 py-3.5 backdrop-blur-sm">
                  <p className="text-sm font-bold">{item.label}</p>
                  <p className="mt-1 text-xs text-slate-300">{item.helper}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck className="h-4 w-4 text-teal-200" />
            Secure staff access with role-based permissions
          </div>
        </div>

        <div className="flex items-center justify-center bg-[var(--background)] p-6 sm:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--brand-ink)]">
                <Wrench className="h-5 w-5 text-teal-200" />
              </div>
              <div>
                <p className="text-base font-bold leading-tight">GARAGE</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Management Suite</p>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[var(--shadow-md)] sm:p-9">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary-dark)]">Sign In</p>
                  <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-slate-950">Welcome back</h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-teal-50">
                  <Lock className="h-5 w-5 text-[var(--primary)]" />
                </div>
              </div>

              <form className="grid gap-5" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
                <label className="grid gap-2 text-sm font-semibold text-slate-800">
                  Sign in as
                  <span className="grid grid-cols-3 gap-2">
                    {(["ADMIN", "MANAGER", "TECHNICIAN"] as const).map((role) => (
                      <label
                        key={role}
                        className="focus-within:ring-3 flex min-h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2 py-2 text-center text-[11px] font-bold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-teal-50 has-[:checked]:text-[var(--primary-dark)] has-[:checked]:shadow-sm"
                      >
                        <input className="sr-only" type="radio" value={role} autoComplete="off" {...register("role")} />
                        <UserCog className="h-4 w-4" />
                        {role}
                      </label>
                    ))}
                  </span>
                  {errors.role?.message ? <span className="text-sm font-normal text-[var(--danger)]">{errors.role.message}</span> : null}
                </label>

                <Input label="Mobile Number / Email" autoComplete="off" error={errors.identifier?.message} {...register("identifier")} />

                <label className="grid gap-2 text-sm font-medium text-slate-800" htmlFor="password">
                  Password
                  <span className="relative flex items-center">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      aria-invalid={Boolean(errors.password?.message)}
                      className={`focus-ring min-h-11 w-full rounded-md border bg-white px-3 pr-11 text-base text-slate-950 shadow-[inset_0_1px_0_rgb(255_255_255/0.7)] placeholder:text-slate-400 hover:border-slate-400 ${errors.password?.message ? "border-[var(--danger)]" : "border-[var(--line)]"}`}
                      {...register("password")}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="focus-ring absolute right-1 z-10 flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:text-slate-800"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </span>
                  {errors.password?.message ? <span className="text-sm font-normal text-[var(--danger)]">{errors.password.message}</span> : null}
                </label>

                {serverError ? <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-[var(--danger)]">{serverError}</p> : null}

                <div className="flex items-center justify-end">
                  <Link className="text-sm font-semibold text-[var(--primary)] hover:underline" href="/forgot-password">
                    Forgot password?
                  </Link>
                </div>

                <Button type="submit" loading={isSubmitting} className="w-full shadow-sm">
                  LOG IN
                </Button>
              </form>
            </div>

            <p className="mt-6 text-center text-xs text-[var(--muted)]">
              Protected staff access &middot; Garage Management Suite
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
