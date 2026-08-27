"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getCustomers } from "@/services/records";

export default function CustomersPage() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["customers"], queryFn: getCustomers });

  return (
    <ProtectedShell title="Customers">
      <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--primary)]">Customer Records</p>
            <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Saved Customers</h2>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" href="/register">
            Register Vehicle
          </Link>
        </div>
        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading customers...</p> : null}
        {isError ? <p className="text-sm text-[var(--danger)]">Could not load customers.</p> : null}
        {!isLoading && !isError && data.length === 0 ? <p className="text-sm text-[var(--muted)]">No customers registered yet.</p> : null}

        {data.length > 0 ? (
          <>
            {/* Mobile: stacked cards */}
            <div className="grid gap-3 md:hidden">
              {data.map((customer) => (
                <div key={customer.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-950">{customer.name}</span>
                    <span className="text-xs text-[var(--muted)]">{new Date(customer.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">{customer.phone}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">{customer.address}</p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Name</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-4 font-semibold">Address</th>
                    <th className="py-3 pr-4 font-semibold">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {data.map((customer) => (
                    <tr key={customer.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-950">{customer.name}</td>
                      <td className="py-3 pr-4 text-slate-700">{customer.phone}</td>
                      <td className="py-3 pr-4 text-slate-700">{customer.address}</td>
                      <td className="py-3 pr-4 text-slate-700">{new Date(customer.createdAt).toLocaleString()}</td>
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
