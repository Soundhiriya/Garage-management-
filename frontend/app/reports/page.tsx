"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, UserRound } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getCustomers, getVehicles, type CustomerListItem, type VehicleListItem } from "@/services/records";
import { getVehicleHistory } from "@/services/workflow";

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function ReportsPage() {
  const [query, setQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerListItem | null>(null);

  const { data: customers = [], isLoading: customersLoading, isError: customersError } = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers
  });
  const { data: vehicles = [] } = useQuery({ queryKey: ["vehicles"], queryFn: getVehicles });

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return customers.filter((c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)).slice(0, 20);
  }, [customers, query]);

  const customerVehicles = useMemo(() => {
    if (!selectedCustomer) return [];
    return vehicles.filter((v) => v.customerPhone === selectedCustomer.phone);
  }, [vehicles, selectedCustomer]);

  return (
    <ProtectedShell title="Reports">
      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-[var(--primary)]">Reports</p>
          <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Customer History</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Search a customer by name or phone number to see their complete vehicle and service history.</p>

          <div className="relative mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              className="focus-ring min-h-12 w-full rounded-md border border-[var(--line)] bg-white pl-9 pr-3 text-base text-slate-950"
              placeholder="Search by customer name or phone"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelectedCustomer(null);
              }}
            />
          </div>

          {customersLoading ? <p className="mt-3 text-sm text-[var(--muted)]">Loading customers...</p> : null}
          {customersError ? <p className="mt-3 text-sm text-[var(--danger)]">Could not load customers.</p> : null}

          {query && !selectedCustomer ? (
            <div className="mt-4 grid gap-2">
              {matches.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => setSelectedCustomer(customer)}
                  className="focus-ring flex min-h-14 items-center gap-3 rounded-md border border-[var(--line)] px-4 text-left hover:bg-slate-50"
                >
                  <UserRound className="h-5 w-5 text-[var(--primary)]" />
                  <div>
                    <p className="font-semibold text-slate-900">{customer.name}</p>
                    <p className="text-sm text-[var(--muted)]">{customer.phone}</p>
                  </div>
                </button>
              ))}
              {matches.length === 0 ? <p className="text-sm text-[var(--muted)]">No customers match &ldquo;{query}&rdquo;.</p> : null}
            </div>
          ) : null}
        </div>

        {selectedCustomer ? (
          <CustomerReport customer={selectedCustomer} vehicles={customerVehicles} />
        ) : null}
      </section>
    </ProtectedShell>
  );
}

function CustomerReport({ customer, vehicles }: { customer: CustomerListItem; vehicles: VehicleListItem[] }) {
  return (
    <>
      <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Customer</h2>
        <p className="text-lg font-bold text-slate-950">{customer.name}</p>
        <p className="text-sm text-slate-700">{customer.phone}</p>
        <p className="text-sm text-[var(--muted)]">{customer.address}</p>
        <p className="mt-2 text-xs text-[var(--muted)]">Customer since {new Date(customer.createdAt).toLocaleDateString()}</p>
      </div>

      {vehicles.length === 0 ? (
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm text-[var(--muted)]">No vehicles registered for this customer yet.</p>
        </div>
      ) : (
        vehicles.map((vehicle) => <VehicleReport key={vehicle.id} vehicle={vehicle} />)
      )}
    </>
  );
}

function VehicleReport({ vehicle }: { vehicle: VehicleListItem }) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["vehicle-history", vehicle.id],
    queryFn: () => getVehicleHistory(vehicle.id)
  });

  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold tracking-normal text-slate-950">{vehicle.registrationNumber ?? vehicle.chassisNumber}</h2>
          <p className="text-xs text-[var(--muted)]">Chassis: {vehicle.chassisNumber} &middot; Current KM: {vehicle.currentKm?.toLocaleString("en-IN") ?? "-"}</p>
        </div>
        <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold uppercase text-[var(--primary-dark)]">{history.length} Job Card{history.length === 1 ? "" : "s"}</span>
      </div>

      {isLoading ? <p className="text-sm text-[var(--muted)]">Loading service history...</p> : null}

      <div className="grid gap-3">
        {history.map((jobCard) => (
          <Link
            key={jobCard.id}
            href={`/job-cards/${jobCard.id}`}
            className="focus-ring block rounded-md border border-[var(--line)] p-4 hover:bg-slate-50"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-[var(--primary)]">{jobCard.jobCardNumber}</span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-bold uppercase text-slate-700">{jobCard.status.replace(/_/g, " ")}</span>
            </div>
            <p className="mt-1 text-xs text-[var(--muted)]">{new Date(jobCard.createdAt).toLocaleString()}</p>
            {jobCard.complaint ? <p className="mt-2 text-sm text-slate-700">{jobCard.complaint}</p> : null}
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <ReportMetric label="Estimate" value={rupees.format(jobCard.estimateAmount || 0)} />
              <ReportMetric label="Invoice" value={jobCard.invoiceNumber ?? "Not created"} />
              <ReportMetric label="Payment" value={`${jobCard.paymentStatus} - ${rupees.format(jobCard.paidAmount || 0)}`} />
              <ReportMetric label="Follow-up" value={jobCard.followUpAt ? new Date(jobCard.followUpAt).toLocaleDateString() : "Not set"} />
            </div>
          </Link>
        ))}
        {!isLoading && history.length === 0 ? <p className="text-sm text-[var(--muted)]">No job cards for this vehicle yet.</p> : null}
      </div>
    </div>
  );
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-2.5 py-2">
      <p className="text-[10px] font-semibold uppercase text-[var(--muted)]">{label}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{value}</p>
    </div>
  );
}
