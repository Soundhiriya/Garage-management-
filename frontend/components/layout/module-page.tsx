"use client";

import Link from "next/link";
import { ArrowRight, Construction } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";

type ModulePageProps = {
  title: string;
  eyebrow: string;
  description: string;
  primaryAction?: {
    label: string;
    href: string;
  };
  items: string[];
};

export function ModulePage({ title, eyebrow, description, primaryAction, items }: ModulePageProps) {
  return (
    <ProtectedShell title={title}>
      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-[var(--primary)]">{eyebrow}</p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">{title}</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--muted)]">{description}</p>
            </div>
            {primaryAction ? (
              <Link className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 sm:w-fit" href={primaryAction.href}>
                {primaryAction.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <article key={item} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-teal-50 text-[var(--primary)]">
                <Construction className="h-5 w-5" />
              </div>
              <h2 className="text-base font-bold tracking-normal text-slate-950">{item}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">This workflow area is reserved for the next implementation phase.</p>
            </article>
          ))}
        </div>
      </section>
    </ProtectedShell>
  );
}

