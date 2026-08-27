"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, CheckCircle2, ClipboardCheck, ClipboardList, Timer, Wrench } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { api } from "@/services/api";
import type { ApiResponse } from "@/types/auth";

type TechnicianSummary = {
  assignedJobs: number;
  pendingInspections: number;
  activeWork: number;
  completedJobs: number;
};

const cards = [
  ["Assigned Jobs", "assignedJobs", ClipboardList, "Job Cards assigned to you"],
  ["Pending Inspections", "pendingInspections", Timer, "Vehicles waiting for inspection"],
  ["Active Work", "activeWork", Wrench, "Work currently in progress"],
  ["Completed Jobs", "completedJobs", CheckCircle2, "Jobs completed by you"]
] as const;

async function getTechnicianDashboard() {
  const response = await api.get<ApiResponse<TechnicianSummary>>("/dashboard/technician");
  return response.data.data;
}

export default function TechnicianDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["technician-dashboard"], queryFn: getTechnicianDashboard });

  return (
    <ProtectedShell title="Technician Dashboard">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(([label, key, Icon, helper]) => (
          <article key={key} className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-slate-700">{label}</h2>
              <Icon className="h-5 w-5 text-[var(--primary)]" />
            </div>
            <p className="text-3xl font-bold tracking-normal text-slate-950">{isLoading ? "-" : data?.[key] ?? 0}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">{helper}</p>
          </article>
        ))}
      </div>

      <section className="mt-6 rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold tracking-normal">Technician Actions</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Start Inspection", ClipboardCheck, "Open assigned vehicle checks and notes"],
            ["Add Photos", Camera, "Capture inspection or work completion photos"],
            ["Update Work", Wrench, "Record completed work and notes"]
          ].map(([label, Icon, helper]) => (
            <button key={label as string} className="focus-ring grid min-h-24 gap-2 rounded-md border border-[var(--line)] bg-white p-4 text-left hover:bg-slate-50">
              <span className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Icon className="h-4 w-4 text-[var(--primary)]" />
                {label as string}
              </span>
              <span className="text-xs leading-5 text-[var(--muted)]">{helper as string}</span>
            </button>
          ))}
        </div>
      </section>
    </ProtectedShell>
  );
}

