"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Printer } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { getJobCard, type JobCardDetails } from "@/services/register";
import { getWorkflowJobCard, updateWorkflowJobCard, type LabourItem, type PartItem, type WorkflowJobCard } from "@/services/workflow";
import { getGarageSettings } from "@/services/settings";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { ItemTable, Row, TableCell, computeTotals, emptyLabour, emptyPart, rupees } from "@/components/workflow/shared";
import { groupComplaintByService } from "@/lib/complaint";
import { downloadJobCardPdf } from "@/lib/pdf";

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
  const [approvalStatus, setApprovalStatus] = useState("PENDING");
  const [message, setMessage] = useState("");
  const autoSavedJobCardRef = useRef<string | null>(null);

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

  const { data: shopSettings } = useQuery({ queryKey: ["garage-settings"], queryFn: getGarageSettings });

  useEffect(() => {
    if (!workflow) return;
    setPartsItems(workflow.partsItems.length ? workflow.partsItems : []);
    setLabourItems(workflow.labourItems.length ? workflow.labourItems : []);
    setDiscountAmount(String(workflow.discountAmount ?? 0));
    setApprovalStatus(workflow.approvalStatus ?? "PENDING");
  }, [workflow]);

  const mutation = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) =>
      updateWorkflowJobCard(Number(jobCardId), {
        discountAmount: Number(discountAmount || 0),
        approvalStatus,
        ...extra
      }),
    onSuccess: async () => {
      setMessage("Saved");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", jobCardId] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
    }
  });

  useEffect(() => {
    if (!workflow || autoSavedJobCardRef.current === jobCardId) return;
    autoSavedJobCardRef.current = jobCardId;
    mutation.mutate({
      status: "ESTIMATE",
      discountAmount: Number(workflow.discountAmount ?? 0),
      approvalStatus: workflow.approvalStatus ?? "PENDING"
    });
  }, [jobCardId, mutation, workflow]);

  const totals = computeTotals(partsItems, labourItems, Number(discountAmount) || 0);
  const isLoading = jobCardLoading || workflowLoading;
  const isError = jobCardError || workflowError;
  const groupedComplaint = groupComplaintByService(jobCard?.complaint);

  function handlePrint() {
    if (!jobCard || !workflow) return;
    const serviceTypes = workflow.serviceTypes
      ? workflow.serviceTypes.split(",").map((item) => item.trim()).filter(Boolean)
      : [];
    downloadJobCardPdf({
      data: jobCard,
      shop: shopSettings,
      serviceTypes,
      complaint: jobCard.complaint ?? "",
      odometerKm: jobCard.odometerKm != null ? String(jobCard.odometerKm) : "",
      expectedDeliveryAt: workflow.expectedDeliveryAt ?? "",
      workItems: workflow.workItems,
      partsItems,
      labourItems
    });
  }

  return (
    <ProtectedShell title="Estimate" hidePageHeader>
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/estimates" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Estimates
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's estimate. It may not exist, or you may need to sign in again.</p> : null}

        {jobCard && workflow ? (
          <>
            <section className="grid gap-2 border-b border-[var(--line)] pb-3">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 text-sm leading-5 text-slate-800">
                <p><span className="font-semibold text-slate-950">Customer:</span> {jobCard.customer.name}</p>
                <p className="text-right text-xs font-semibold uppercase text-[var(--muted)]">
                  Job Card: <span className="text-sm normal-case text-slate-950">{jobCard.jobCardNumber}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm leading-5 text-slate-800">
                <p><span className="font-semibold text-slate-950">Phone:</span> {jobCard.customer.phone}</p>
                <p><span className="font-semibold text-slate-950">Vehicle:</span> {jobCard.vehicle.registrationNumber ?? jobCard.vehicle.chassisNumber ?? "-"}</p>
              </div>
              <div className="mt-1 inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{workflow.status.replace(/_/g, " ")}</div>
            </section>

            <Button type="button" variant="secondary" className="w-fit" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              PRINT PDF
            </Button>

            {groupedComplaint.length ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <h2 className="mb-1 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Complaint</h2>
                <div className="grid gap-1">
                  {groupedComplaint.map((group) => (
                    <p key={group.service} className="text-sm text-slate-700">
                      <span className="font-semibold text-slate-900">{group.service}:</span> {group.issues.join(", ")}
                    </p>
                  ))}
                </div>
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
              <p className="mb-3 text-xs text-[var(--muted)]">From Job Card Step 5 - Parts + Labour. Not editable here.</p>
              <ItemTable
                columns={["Part Name", "Part Number", "Qty", "Selling Price", "GST %", "Amount", "Notes"]}
                rows={partsItems}
                onChange={() => {}}
                empty={emptyPart}
                addLabel=""
                readOnly
                renderRow={(row) => {
                  const base = (Number(row.qty) || 0) * (Number(row.price) || 0);
                  const amount = base + base * ((Number(row.gstPercent) || 0) / 100);
                  return (
                    <>
                      <TableCell>{row.name}</TableCell>
                      <TableCell>{row.partNumber || "-"}</TableCell>
                      <TableCell>{row.qty}</TableCell>
                      <TableCell>{rupees.format(row.price)}</TableCell>
                      <TableCell>{row.gstPercent}%</TableCell>
                      <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(amount)}</span></TableCell>
                      <TableCell>{row.notes || "-"}</TableCell>
                    </>
                  );
                }}
              />
            </article>

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Labour</h2>
              <p className="mb-3 text-xs text-[var(--muted)]">From Job Card Step 5 - Parts + Labour. Not editable here.</p>
              <ItemTable
                columns={["Description", "Qty", "Rate", "GST %", "Amount", "Notes"]}
                rows={labourItems}
                onChange={() => {}}
                empty={emptyLabour}
                addLabel=""
                readOnly
                renderRow={(row) => {
                  const base = (Number(row.qty) || 0) * (Number(row.rate) || 0);
                  const amount = base + base * ((Number(row.gstPercent) || 0) / 100);
                  return (
                    <>
                      <TableCell>{row.description}</TableCell>
                      <TableCell>{row.qty}</TableCell>
                      <TableCell>{rupees.format(row.rate)}</TableCell>
                      <TableCell>{row.gstPercent}%</TableCell>
                      <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(amount)}</span></TableCell>
                      <TableCell>{row.notes || "-"}</TableCell>
                    </>
                  );
                }}
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
                      mutation.mutate({ approvalStatus: "APPROVED", status: "APPROVED" });
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