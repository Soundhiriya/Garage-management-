"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getVehicles } from "@/services/records";

export default function VehiclesPage() {
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["vehicles"], queryFn: getVehicles });

  return (
    <ProtectedShell title="Vehicles">
      <section className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--primary)]">Vehicle Records</p>
            <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Saved Vehicles</h2>
          </div>
          <Link className="focus-ring inline-flex min-h-12 items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800" href="/register">
            Register Vehicle
          </Link>
        </div>
        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading vehicles...</p> : null}
        {isError ? <p className="text-sm text-[var(--danger)]">Could not load vehicles.</p> : null}
        {!isLoading && !isError && data.length === 0 ? <p className="text-sm text-[var(--muted)]">No vehicles registered yet.</p> : null}

        {data.length > 0 ? (
          <>
            {/* Mobile: stacked cards */}
            <div className="grid gap-3 md:hidden">
              {data.map((vehicle) => (
                <div key={vehicle.id} className="rounded-lg border border-[var(--line)] bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-950">{vehicle.registrationNumber ?? vehicle.chassisNumber}</span>
                    <span className="text-xs text-[var(--muted)]">{vehicle.currentKm != null ? `${vehicle.currentKm.toLocaleString("en-IN")} km` : "-"}</span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">Chassis: {vehicle.chassisNumber}</p>
                  <p className="mt-2 text-sm text-slate-700">{vehicle.customerName} - {vehicle.customerPhone}</p>
                </div>
              ))}
            </div>

            {/* Desktop: table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-[var(--line)] text-xs uppercase text-[var(--muted)]">
                  <tr>
                    <th className="py-3 pr-4 font-semibold">Chassis</th>
                    <th className="py-3 pr-4 font-semibold">Registration</th>
                    <th className="py-3 pr-4 font-semibold">Customer</th>
                    <th className="py-3 pr-4 font-semibold">Phone</th>
                    <th className="py-3 pr-4 font-semibold">Current KM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {data.map((vehicle) => (
                    <tr key={vehicle.id}>
                      <td className="py-3 pr-4 font-semibold text-slate-950">{vehicle.chassisNumber}</td>
                      <td className="py-3 pr-4 text-slate-700">{vehicle.registrationNumber ?? "-"}</td>
                      <td className="py-3 pr-4 text-slate-700">{vehicle.customerName}</td>
                      <td className="py-3 pr-4 text-slate-700">{vehicle.customerPhone}</td>
                      <td className="py-3 pr-4 text-slate-700">{vehicle.currentKm ?? "-"}</td>
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
