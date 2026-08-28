"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Car, ClipboardCheck, FileText, IndianRupee, Plus, Timer, UserRound, Wrench } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

type DashboardSummary = {
  todaysVehicles: number;
  activeJobs: number;
  waitingApproval: number;
  readyForDelivery: number;
  revenue: number;
  pendingPayments: number;
  followups: number;
  totalCustomers: number;
  totalVehicles: number;
  totalJobCards: number;
};

const cards = [
  ["Today's Vehicles", "todaysVehicles", Car, "Vehicles received today", "/job-cards"],
  ["Active Jobs", "activeJobs", Wrench, "Jobs currently in progress", "/job-cards"],
  ["Waiting Approval", "waitingApproval", Timer, "Estimates awaiting customer approval", "/estimates"],
  ["Ready for Delivery", "readyForDelivery", ClipboardCheck, "Vehicles cleared for delivery", "/invoices"],
  ["Revenue", "revenue", IndianRupee, "Total collected revenue", "/payments"],
  ["Pending Payments", "pendingPayments", FileText, "Outstanding payment value", "/payments"],
  ["Follow-ups", "followups", Timer, "Due and overdue reminders", "/followups"]
] as const;

const quickActions = [
  ["Vehicle Entry", "/register", Plus, "Register customer, vehicle, and open a Job Card"],
  ["Customer", "/customers", UserRound, "Find or update customer profiles"],
  ["Job Card", "/job-cards", ClipboardCheck, "Open service visit records"],
  ["Estimate", "/estimates", FileText, "Prepare approval estimates"],
  ["Invoice", "/invoices", IndianRupee, "Finalize bill and payment"]
] as const;

async function getDashboard() {
  const response = await api.get<ApiResponse<DashboardSummary>>("/dashboard");
  return response.data.data;
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({ queryKey: ["dashboard"], queryFn: getDashboard, retry: false });

  return (
    <ProtectedShell title="Dashboard">
      {isError ? (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Could not load dashboard details from backend.
        </div>
      ) : null}

      <section className="grid gap-2">
        <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-[var(--primary-dark)]">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {quickActions.map(([action, href, Icon]) => (
            <Link
              key={action}
              href={href}
              className="focus-ring flex min-h-14 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm font-bold text-slate-900 shadow-sm active:bg-slate-50 sm:min-h-16"
            >
              <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
              <span className="min-w-0 leading-tight">{action}</span>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {cards.map(([label, key, Icon, helper, href]) => (
          <Link
            key={key}
            href={href}
            className="focus-ring rounded-md border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-teal-200 active:bg-slate-50"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-semibold leading-tight text-slate-700">{label}</h2>
              <Icon className="h-4 w-4 shrink-0 text-[var(--primary)]" />
            </div>
            <p className="mt-2 text-xl font-bold tracking-normal text-slate-950 sm:text-2xl">
              {isLoading ? "-" : key === "revenue" || key === "pendingPayments" ? `Rs ${Number(data?.[key] ?? 0).toLocaleString("en-IN")}` : data?.[key] ?? 0}
            </p>
            <p className="mt-1 hidden text-xs text-[var(--muted)] sm:block">{helper}</p>
          </Link>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Link href="/customers" className="focus-ring rounded-md border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-teal-200 active:bg-slate-50">
          <p className="text-[11px] font-semibold leading-tight text-[var(--muted)]">Customers</p>
          <p className="mt-1 text-xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalCustomers ?? 0}</p>
        </Link>
        <Link href="/vehicles" className="focus-ring rounded-md border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-teal-200 active:bg-slate-50">
          <p className="text-[11px] font-semibold leading-tight text-[var(--muted)]">Vehicles</p>
          <p className="mt-1 text-xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalVehicles ?? 0}</p>
        </Link>
        <Link href="/job-cards" className="focus-ring rounded-md border border-[var(--line)] bg-white p-3 shadow-sm transition hover:border-teal-200 active:bg-slate-50">
          <p className="text-[11px] font-semibold leading-tight text-[var(--muted)]">Job Cards</p>
          <p className="mt-1 text-xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalJobCards ?? 0}</p>
        </Link>
      </div>
    </ProtectedShell>
  );
}
