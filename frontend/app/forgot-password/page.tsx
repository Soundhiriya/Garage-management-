"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPassword } from "@/services/auth";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/schemas/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [message, setMessage] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(input: ForgotPasswordInput) {
    setMessage(await forgotPassword(input));
  }

  return (
    <main className="grid min-h-screen place-items-center bg-[#eef3f1] p-4">
      <section className="w-full max-w-md rounded-lg border border-[var(--line)] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-semibold uppercase text-[var(--primary)]">Forgot Password</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">Reset Staff Access</h1>
        <form className="mt-6 grid gap-5" onSubmit={handleSubmit(onSubmit)}>
          <Input label="Mobile Number / Email" error={errors.identifier?.message} {...register("identifier")} />
          {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          <Button type="submit" loading={isSubmitting}>SEND RESET LINK</Button>
          <Link className="text-sm font-semibold text-[var(--primary)] hover:underline" href="/login">
            Back to Login
          </Link>
        </form>
      </section>
    </main>
  );
}

