"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getJobCards } from "@/services/records";

export default function JobCardsPage() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["job-cards"], queryFn: getJobCards });

  return (
    <ProtectedShell title="Job Cards">
      <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--primary)]">Service Visits</p>
            <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Saved Job Cards</h2>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" href="/register">
            New Job Card
          </Link>
        </div>
        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading job cards...</p> : null}
        {isError ? <p className="text-sm text-[var(--danger)]">Could not load job cards.</p> : null}
        {!isLoading && !isError && data.length === 0 ? <p className="text-sm text-[var(--muted)]">No job cards created yet.</p> : null}

        {data.length > 0 ? (
          <>
            {/* Mobile: stacked cards */}
            <div className="grid gap-3 md:hidden">
              {data.map((jobCard) => (
                <Link key={jobCard.id} href={`/job-cards/${jobCard.id}`} className="focus-ring block rounded-lg border border-[var(--line)] bg-white p-4 active:bg-slate-50">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[var(--primary)]">{jobCard.jobCardNumber}</span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold uppercase text-emerald-800">{jobCard.status.replace(/_/g, " ")}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{jobCard.customerName}</p>
                  <p className="text-sm text-slate-600">{jobCard.customerPhone}</p>
                  <div className="mt-2 flex items-center justify-between text-xs text-[var(--muted)]">
                    <span>{jobCard.chassisNumber}</span>
                    <span>{new Date(jobCard.createdAt).toLocaleDateString()}</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Job Card</th>
                    <th className="py-3 pr-4 font-semibold">Status</th>
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-4 font-semibold">Chassis</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {data.map((jobCard) => (
                    <tr key={jobCard.id}>
                      <td className="py-3 pr-4 font-semibold text-[var(--primary)]">
                        <Link href={`/job-cards/${jobCard.id}`} className="hover:underline">
                          {jobCard.jobCardNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-slate-700">{jobCard.status}</td>
                      <td className="py-3 pr-4 text-slate-700">{jobCard.customerName}</td>
                      <td className="py-3 pr-4 text-slate-700">{jobCard.customerPhone}</td>
                      <td className="py-3 pr-4 text-slate-700">{jobCard.chassisNumber}</td>
                      <td className="py-3 pr-4 text-slate-700">{new Date(jobCard.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
