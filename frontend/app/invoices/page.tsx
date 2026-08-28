"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJobCard } from "@/services/register";
import { getWorkflowJobCard, updateWorkflowJobCard, type LabourItem, type PartItem } from "@/services/workflow";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { Row, computeTotals, rupees } from "@/components/workflow/shared";

export default function InvoicesPage() {
  return (
    <Suspense fallback={null}>
      <InvoicesPageInner />
    </Suspense>
  );
}

function InvoicesPageInner() {
  const searchParams = useSearchParams();
  const open = searchParams.get("open");

  if (open) {
    return <InvoiceEditor jobCardId={open} />;
  }

  return <WorkflowBoard title="Invoices" stage="invoice" />;
}

function InvoiceEditor({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState("0");
  const [invoiceNumber, setInvoiceNumber] = useState("");
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
    setPartsItems(workflow.partsItems);
    setLabourItems(workflow.labourItems);
    setDiscountAmount(String(workflow.discountAmount ?? 0));
    setInvoiceNumber(workflow.invoiceNumber ?? "");
  }, [workflow]);

  const mutation = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) => updateWorkflowJobCard(Number(jobCardId), { ...extra }),
    onSuccess: async () => {
      setMessage("Saved");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", jobCardId] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
    }
  });

  const totals = computeTotals(partsItems, labourItems, Number(discountAmount) || 0);
  const isLoading = jobCardLoading || workflowLoading;
  const isError = jobCardError || workflowError;
  const status = workflow?.status ?? "RECEIVED";

  return (
    <ProtectedShell title="Invoice" hidePageHeader>
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/invoices" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Invoices
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's invoice. It may not exist, or you may need to sign in again.</p> : null}

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
                <p><span className="font-semibold text-slate-950">KM:</span> {jobCard.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"}</p>
              </div>
              <div className="mt-1 inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{status.replace(/_/g, " ")}</div>
            </section>

            {status === "APPROVED" || status === "WORK_IN_PROGRESS" ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold tracking-normal">Work / Service Process</h2>
                <p className="mb-4 text-sm text-[var(--muted)]">Approved work is in progress. Mark it complete once the garage has finished all work, parts, and labour recorded on the Job Card.</p>
                <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate({ status: "WORK_COMPLETED" })}>
                  MARK WORK COMPLETED
                </Button>
              </article>
            ) : null}

            {status === "WORK_COMPLETED" ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-lg font-bold tracking-normal">Quality Check</h2>
                <p className="mb-4 text-sm text-[var(--muted)]">Verify the completed work before creating the invoice.</p>
                <Button type="button" loading={mutation.isPending} onClick={() => mutation.mutate({ status: "QUALITY_CHECK" })}>
                  MARK QUALITY CHECKED
                </Button>
              </article>
            ) : null}

            {["QUALITY_CHECK", "READY_FOR_DELIVERY", "DELIVERED"].includes(status) ? (
              <>
                <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-normal">Invoice Details</h2>
                    {workflow.invoiceNumber ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        Generated
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">Not Generated</span>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {workflow.invoiceNumber ? (
                      <Row label="Invoice Number" value={workflow.invoiceNumber} />
                    ) : (
                      <Input label="Invoice Number" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value.toUpperCase())} placeholder={`INV-${jobCardId}`} />
                    )}
                    <Row label="Invoice Date" value={workflow.invoiceNumber ? new Date(workflow.updatedAt).toLocaleDateString() : "Not generated"} />
                  </div>
                  <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 text-sm sm:grid-cols-2">
                    <Row label="Subtotal" value={rupees.format(totals.subtotal)} />
                    <Row label="Discount" value={rupees.format(Number(discountAmount) || 0)} />
                    <Row label="GST" value={rupees.format(totals.gstTotal)} />
                    <Row label="Grand Total" value={<strong>{rupees.format(totals.grandTotal)}</strong>} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {!workflow.invoiceNumber ? (
                      <Button
                        type="button"
                        loading={mutation.isPending}
                        onClick={() => mutation.mutate({ invoiceNumber: invoiceNumber || `INV-${jobCardId}`, status: "READY_FOR_DELIVERY" })}
                      >
                        GENERATE INVOICE
                      </Button>
                    ) : (
                      <Button type="button" variant="secondary" onClick={() => router.push(`/payments?open=${jobCardId}`)}>OPEN PAYMENT</Button>
                    )}
                  </div>
                </article>
              </>
            ) : null}

            {!["APPROVED", "WORK_IN_PROGRESS", "WORK_COMPLETED", "QUALITY_CHECK", "READY_FOR_DELIVERY", "DELIVERED"].includes(status) ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <p className="text-sm text-[var(--muted)]">This Job Card has not been approved yet. Complete the Estimate and Customer Approval first.</p>
                <Link href={`/estimates?open=${jobCardId}`} className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] hover:underline">Go to Estimate</Link>
              </article>
            ) : null}

            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
