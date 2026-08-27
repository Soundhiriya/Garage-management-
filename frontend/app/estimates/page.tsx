"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { getJobCard, type JobCardDetails } from "@/services/register";
import { getWorkflowJobCard, updateWorkflowJobCard, type LabourItem, type PartItem, type WorkflowJobCard } from "@/services/workflow";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { ItemTable, NumberInput, PlainInput, Row, TableCell, computeTotals, emptyLabour, emptyPart, rupees } from "@/components/workflow/shared";

export default function EstimatesPage() {
  return (
    <Suspense fallback={null}>
      <EstimatesPageInner />
    </Suspense>
  );
}

function EstimatesPageInner() {
  const searchParams = useSearchParams();
  const open = searchParams.get("open");

  if (open) {
    return <EstimateEditor jobCardId={open} />;
  }

  return <WorkflowBoard title="Estimates / Customer Approval" stage="estimate" />;
}

function EstimateEditor({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [estimateNotes, setEstimateNotes] = useState("");
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [message, setMessage] = useState("");

  const { data: jobCard, isLoading: jobCardLoading, isError: jobCardError } = useQuery({
    queryKey: ["job-card", jobCardId],
    queryFn: () => getJobCard(jobCardId),
    enabled: Boolean(jobCardId),
    retry: false
  });
  const { data: workflow, isLoading: workflowLoading, isError: workflowError } = useQuery({
    queryKey: ["workflow-job-card", jobCardId],
    queryFn: () => getWorkflowJobCard(Number(jobCardId)),
    enabled: Boolean(jobCardId),
    retry: false
  });

  useEffect(() => {
    if (!workflow) return;
    setPartsItems(workflow.partsItems.length ? workflow.partsItems : []);
    setLabourItems(workflow.labourItems.length ? workflow.labourItems : []);
    setDiscountAmount(String(workflow.discountAmount ?? 0));
    setEstimateNotes(workflow.estimateNotes ?? "");
    setApprovalStatus(workflow.approvalStatus ?? "PENDING");
    setApprovalNotes(workflow.approvalNotes ?? "");
  }, [workflow]);

  const mutation = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) =>
      updateWorkflowJobCard(Number(jobCardId), {
        partsItems,
        labourItems,
        discountAmount: Number(discountAmount || 0),
        estimateNotes,
        approvalStatus,
        approvalNotes,
        ...extra
      }),
    onSuccess: async () => {
      setMessage("Saved");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", jobCardId] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
    }
  });

  const totals = computeTotals(partsItems, labourItems, Number(discountAmount) || 0);
  const isLoading = jobCardLoading || workflowLoading;
  const isError = jobCardError || workflowError;

  return (
    <ProtectedShell title="Estimate">
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/estimates" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Estimates
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's estimate. It may not exist, or you may need to sign in again.</p> : null}

        {jobCard && workflow ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-[var(--primary)]">Estimate</p>
                <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{jobCard.jobCardNumber}</h1>
              </div>
              <div className="inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{workflow.status.replace(/_/g, " ")}</div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Customer</h2>
                <p className="font-semibold text-slate-900">{jobCard.customer.name}</p>
                <p className="text-sm text-slate-700">{jobCard.customer.phone}</p>
              </article>
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Vehicle</h2>
                <p className="font-semibold text-slate-900">{jobCard.vehicle.registrationNumber ?? jobCard.vehicle.chassisNumber}</p>
                <p className="text-sm text-slate-700">{jobCard.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"} km</p>
              </article>
            </div>

            {jobCard.complaint ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Complaint</h2>
                <p className="text-sm text-slate-700">{jobCard.complaint}</p>
              </article>
            ) : null}

            {workflow.workItems.length > 0 ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold tracking-normal">Work</h2>
                <ItemTable
                  columns={["Description", "Technician", "Status", "Notes"]}
                  rows={workflow.workItems}
                  onChange={() => {}}
                  empty={workflow.workItems[0]}
                  addLabel=""
                  readOnly
                  renderRow={(row) => (
                    <>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.technician ?? "-"}</TableCell>
                      <TableCell>{row.status}</TableCell>
                      <TableCell>{row.notes ?? "-"}</TableCell>
                    </>
                  )}
                />
              </article>
            ) : null}

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Parts</h2>
              <ItemTable
                columns={["Part Name", "Part Number", "Qty", "Selling Price", "GST %", "Notes"]}
                rows={partsItems}
                onChange={setPartsItems}
                empty={emptyPart}
                addLabel="ADD PART"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.name} onChange={(v) => update({ ...row, name: v })} /></TableCell>
                    <TableCell><PlainInput value={row.partNumber ?? ""} onChange={(v) => update({ ...row, partNumber: v })} /></TableCell>
                    <TableCell><NumberInput value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                    <TableCell><NumberInput value={row.price} onChange={(v) => update({ ...row, price: v })} /></TableCell>
                    <TableCell><NumberInput value={row.gstPercent} onChange={(v) => update({ ...row, gstPercent: v })} /></TableCell>
                    <TableCell><PlainInput value={row.notes ?? ""} onChange={(v) => update({ ...row, notes: v })} /></TableCell>
                  </>
                )}
              />
            </article>

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Labour</h2>
              <ItemTable
                columns={["Description", "Qty", "Rate", "GST %", "Amount", "Notes"]}
                rows={labourItems}
                onChange={setLabourItems}
                empty={emptyLabour}
                addLabel="ADD LABOUR"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.description} onChange={(v) => update({ ...row, description: v })} /></TableCell>
                    <TableCell><NumberInput value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                    <TableCell><NumberInput value={row.rate} onChange={(v) => update({ ...row, rate: v })} /></TableCell>
                    <TableCell><NumberInput value={row.gstPercent} onChange={(v) => update({ ...row, gstPercent: v })} /></TableCell>
                    <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format((Number(row.qty) || 0) * (Number(row.rate) || 0))}</span></TableCell>
                    <TableCell><PlainInput value={row.notes ?? ""} onChange={(v) => update({ ...row, notes: v })} /></TableCell>
                  </>
                )}
              />
            </article>

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Estimate Total</h2>
              <div className="grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
                <Row label="Parts + Labour" value={rupees.format(totals.subtotal)} />
                <Row label="GST" value={rupees.format(totals.gstTotal)} />
                <Row
                  label="Discount"
                  value={
                    <input
                      className="focus-ring w-28 rounded-md border border-[var(--line)] bg-white px-2 py-1 text-right text-sm"
                      inputMode="decimal"
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(e.target.value)}
                    />
                  }
                />
                <Row label="Grand Total" value={<strong className="text-base text-[var(--primary-dark)]">{rupees.format(totals.grandTotal)}</strong>} />
              </div>
              <label className="mt-4 grid gap-2 text-sm font-medium text-slate-800">
                Estimate Notes
                <textarea className="focus-ring min-h-24 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base text-slate-950" value={estimateNotes} onChange={(e) => setEstimateNotes(e.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate({ status: "ESTIMATE" })}>SAVE ESTIMATE</Button>
              </div>
            </article>

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Customer Approval</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Row label="Estimate Amount" value={rupees.format(totals.grandTotal)} />
                <Row
                  label="Approval Status"
                  value={
                    approvalStatus === "APPROVED" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        Approved
                      </span>
                    ) : approvalStatus === "REJECTED" ? (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase text-red-800">Rejected</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">Pending</span>
                    )
                  }
                />
              </div>
              <label className="mt-4 grid gap-2 text-sm font-medium text-slate-800">
                Approval Notes
                <textarea className="focus-ring min-h-20 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base text-slate-950" value={approvalNotes} onChange={(e) => setApprovalNotes(e.target.value)} />
              </label>
              <div className="mt-4 flex flex-wrap gap-2">
                {approvalStatus === "APPROVED" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={mutation.isPending}
                    onClick={() => mutation.mutate({ status: "WORK_IN_PROGRESS" }, { onSuccess: () => router.push(`/job-cards/${jobCardId}`) })}
                  >
                    START WORK
                  </Button>
                ) : (
                  <Button
                    type="button"
                    loading={mutation.isPending}
                    onClick={() => {
                      setApprovalStatus("APPROVED");
                      mutation.mutate({ approvalStatus: "APPROVED", approvalNotes, status: "APPROVED" });
                    }}
                  >
                    <Check className="h-4 w-4" />
                    CUSTOMER APPROVE
                  </Button>
                )}
              </div>
            </article>

            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
