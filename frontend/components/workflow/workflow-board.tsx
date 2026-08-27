"use client";

import type React from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { getWorkflowJobCards, updateWorkflowJobCard, type WorkflowJobCard, type WorkflowUpdate } from "@/services/workflow";

type WorkflowBoardProps = {
  title: string;
  stage: "estimate" | "invoice" | "payment" | "followup" | "reports" | "work";
};

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

// Estimate/Invoice/Payment/Follow-up are now dedicated single-record editor pages
// (opened via ?open=<id>), not sections inside the Job Card wizard.
function stageHref(stage: WorkflowBoardProps["stage"], jobCardId: number) {
  if (stage === "estimate") return `/estimates?open=${jobCardId}`;
  if (stage === "invoice") return `/invoices?open=${jobCardId}`;
  if (stage === "payment") return `/payments?open=${jobCardId}`;
  if (stage === "followup") return `/followups?open=${jobCardId}`;
  return `/job-cards/${jobCardId}`;
}

const BADGE_COLOR: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800",
  amber: "bg-amber-100 text-amber-800",
  red: "bg-red-100 text-red-800",
  slate: "bg-slate-100 text-slate-600"
};

// Each page cares about a different "status": the estimate's approval, the invoice's
// generation state, the payment's collection state — not just the raw job card status.
function stageStatus(stage: WorkflowBoardProps["stage"], jobCard: WorkflowJobCard) {
  if (stage === "estimate") {
    if (jobCard.approvalStatus === "APPROVED") return { label: "Approved", color: "green" };
    if (jobCard.approvalStatus === "REJECTED") return { label: "Rejected", color: "red" };
    return { label: "Pending Approval", color: "slate" };
  }
  if (stage === "invoice") {
    return jobCard.invoiceNumber ? { label: "Generated", color: "green" } : { label: "Not Generated", color: "slate" };
  }
  if (stage === "payment") {
    if (jobCard.paymentStatus === "PAID") return { label: "Paid", color: "green" };
    if (jobCard.paymentStatus === "PARTIALLY PAID") return { label: "Partially Paid", color: "amber" };
    return { label: "Pending", color: "slate" };
  }
  return { label: jobCard.status.replace(/_/g, " "), color: "slate" };
}

export function WorkflowBoard({ title, stage }: WorkflowBoardProps) {
  const queryClient = useQueryClient();
  const { data = [], isLoading, isError } = useQuery({ queryKey: ["workflow-job-cards"], queryFn: getWorkflowJobCards, retry: false });
  const mutation = useMutation({
    mutationFn: ({ id, input }: { id: number; input: WorkflowUpdate }) => updateWorkflowJobCard(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] })
  });

  const rows = filterRows(data, stage);

  function save(id: number, input: WorkflowUpdate) {
    mutation.mutate({ id, input });
  }

  return (
    <ProtectedShell title={title}>
      <section className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <div className="mb-5">
          <p className="text-sm font-semibold uppercase text-[var(--primary)]">Garage Workflow</p>
          <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">{title}</h2>
        </div>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading workflow...</p> : null}
        {isError ? <p className="text-sm text-[var(--danger)]">Could not load backend workflow details.</p> : null}
        {!isLoading && !isError && rows.length === 0 ? <p className="text-sm text-[var(--muted)]">No job cards in this stage.</p> : null}

        <div className="grid gap-3">
          {rows.map((jobCard) => {
            const badge = stageStatus(stage, jobCard);
            return (
            <article key={jobCard.id} className="rounded-md border border-[var(--line)] p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <Link href={stageHref(stage, jobCard.id)} className="min-w-0 hover:opacity-90">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[var(--primary)] hover:underline">{jobCard.jobCardNumber}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${BADGE_COLOR[badge.color]}`}>{badge.label}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-800">{jobCard.customerName} - {jobCard.customerPhone}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{jobCard.registrationNumber || jobCard.chassisNumber} - {jobCard.status.replace(/_/g, " ")}</p>
                </Link>
                <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[480px]">
                  <Metric label="Estimate" value={rupees.format(jobCard.estimateAmount || 0)} />
                  <Metric label="Invoice" value={jobCard.invoiceNumber || rupees.format(jobCard.invoiceAmount || 0)} />
                  <Metric label="Payment" value={`${jobCard.paymentStatus} - ${rupees.format(jobCard.paidAmount || 0)}`} />
                  <Metric label="Follow-up" value={jobCard.followUpAt ? new Date(jobCard.followUpAt).toLocaleDateString() : "Not set"} />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {stage === "work" ? <Action icon={<Wrench className="h-4 w-4" />} label="Work Completed" onClick={() => save(jobCard.id, { status: "WORK_COMPLETED" })} /> : null}
              </div>
            </article>
            );
          })}
        </div>
      </section>
    </ProtectedShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-slate-50 px-3 py-2">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Action({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Button type="button" variant="secondary" onClick={onClick}>
      {icon}
      {label}
    </Button>
  );
}

function filterRows(rows: WorkflowJobCard[], stage: WorkflowBoardProps["stage"]) {
  if (stage === "estimate") return rows.filter((row) => !["DELIVERED"].includes(row.status));
  if (stage === "invoice") return rows.filter((row) => ["APPROVED", "WORK_IN_PROGRESS", "WORK_COMPLETED", "QUALITY_CHECK", "READY_FOR_DELIVERY", "DELIVERED"].includes(row.status));
  if (stage === "payment") return rows.filter((row) => row.invoiceNumber || row.invoiceAmount > 0 || ["READY_FOR_DELIVERY", "DELIVERED"].includes(row.status));
  if (stage === "followup") return rows.filter((row) => row.status === "DELIVERED" || row.followUpAt || row.whatsappReminderAt);
  if (stage === "work") return rows.filter((row) => ["APPROVED", "WORK_IN_PROGRESS", "WORK_COMPLETED"].includes(row.status));
  return rows;
}
