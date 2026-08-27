"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Car, ClipboardCheck, FileText, IndianRupee, Plus, Search, Timer, UserRound, Wrench } from "lucide-react";
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
  ["Today's Vehicles", "todaysVehicles", Car, "Vehicles received today"],
  ["Active Jobs", "activeJobs", Wrench, "Jobs currently in progress"],
  ["Waiting Approval", "waitingApproval", Timer, "Estimates awaiting customer approval"],
  ["Ready for Delivery", "readyForDelivery", ClipboardCheck, "Vehicles cleared for delivery"],
  ["Revenue", "revenue", IndianRupee, "Total collected revenue"],
  ["Pending Payments", "pendingPayments", FileText, "Outstanding payment value"],
  ["Follow-ups", "followups", Timer, "Due and overdue reminders"]
] as const;

const quickActions = [
  ["Vehicle Entry", "/register", Plus, "Register customer, vehicle, and open a Job Card"],
  ["Customer", "#", UserRound, "Find or update customer profiles"],
  ["Job Card", "/job-cards", ClipboardCheck, "Open service visit records"],
  ["Estimate", "#", FileText, "Prepare approval estimates"],
  ["Invoice", "#", IndianRupee, "Finalize bill and payment"]
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, key, Icon, helper]) => (
          <article key={key} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
              <Icon className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="text-3xl font-bold tracking-normal text-slate-950">
              {isLoading ? "-" : key === "revenue" || key === "pendingPayments" ? `Rs ${Number(data?.[key] ?? 0).toLocaleString("en-IN")}` : data?.[key] ?? 0}
            </p>
            <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>
          </article>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--muted)]">Total Customers</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalCustomers ?? 0}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--muted)]">Total Vehicles</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalVehicles ?? 0}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold text-[var(--muted)]">Total Job Cards</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.totalJobCards ?? 0}</p>
        </article>
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold tracking-normal">Quick Actions</h2>
            <Search className="h-5 w-5 text-[var(--primary)]" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {quickActions.map(([action, href, Icon, helper]) => (
              <Link key={action} href={href} className="focus-ring grid min-h-24 gap-2 rounded-md border border-[var(--line)] bg-white p-4 text-left hover:bg-slate-50">
                <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Icon className="h-4 w-4 text-[var(--primary)]" />
                  {action}
                </span>
                <span className="text-xs leading-5 text-[var(--muted)]">{helper}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold tracking-normal">Work Queue</h2>
          <div className="mt-4 grid gap-3 text-sm">
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3"><span>Approval follow-up</span><strong>{data?.waitingApproval ?? 0}</strong></div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3"><span>Delivery handover</span><strong>{data?.readyForDelivery ?? 0}</strong></div>
            <div className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-3"><span>Payment collection</span><strong>Rs {Number(data?.pendingPayments ?? 0).toLocaleString("en-IN")}</strong></div>
          </div>
        </section>
      </div>
    </ProtectedShell>
  );
}
