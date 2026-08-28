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
import { getWorkflowJobCard, updateWorkflowJobCard } from "@/services/workflow";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { Row, SelectBox, rupees } from "@/components/workflow/shared";

export default function PaymentsPage() {
  return (
    <Suspense fallback={null}>
      <PaymentsPageInner />
    </Suspense>
  );
}

function PaymentsPageInner() {
  const searchParams = useSearchParams();
  const open = searchParams.get("open");

  if (open) {
    return <PaymentEditor jobCardId={open} />;
  }

  return <WorkflowBoard title="Payment / Vehicle Delivered" stage="payment" />;
}

function PaymentEditor({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("");
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
    setPaidAmount(String(workflow.paidAmount || workflow.invoiceAmount || 0));
    setPaymentMode(workflow.paymentMode ?? "");
  }, [workflow]);

  const mutation = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) => updateWorkflowJobCard(Number(jobCardId), { ...extra }),
    onSuccess: async () => {
      setMessage("Saved");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", jobCardId] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
    }
  });

  const isLoading = jobCardLoading || workflowLoading;
  const isError = jobCardError || workflowError;
  const invoiceAmount = workflow?.invoiceAmount ?? 0;
  const paidAmountNumber = Number(paidAmount) || 0;
  const balance = Math.max(0, invoiceAmount - paidAmountNumber);
  const paymentStatus = invoiceAmount <= 0 ? "PENDING" : paidAmountNumber <= 0 ? "PENDING" : paidAmountNumber >= invoiceAmount ? "PAID" : "PARTIALLY PAID";
  const status = workflow?.status ?? "RECEIVED";

  return (
    <ProtectedShell title="Payment" hidePageHeader>
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/payments" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Payments
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's payment details. It may not exist, or you may need to sign in again.</p> : null}

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

            {!workflow.invoiceNumber ? (
              <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                <p className="text-sm text-[var(--muted)]">No invoice has been generated for this Job Card yet.</p>
                <Link href={`/invoices?open=${jobCardId}`} className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] hover:underline">Go to Invoice</Link>
              </article>
            ) : (
              <>
                <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-normal">Payment</h2>
                    {paymentStatus === "PAID" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        Paid
                      </span>
                    ) : paymentStatus === "PARTIALLY PAID" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase text-amber-800">Partially Paid</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">Pending</span>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Row label="Invoice Number" value={workflow.invoiceNumber} />
                    <Row label="Invoice Total" value={rupees.format(invoiceAmount)} />
                    <Input label="Amount Paid" inputMode="decimal" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} />
                    <SelectBox label="Payment Mode" value={paymentMode} onChange={setPaymentMode} options={["", "Cash", "UPI", "Card", "Bank Transfer"]} />
                    <Row label="Balance" value={rupees.format(balance)} />
                  </div>
                  {paymentStatus !== "PAID" ? (
                    <Button type="button" className="mt-4" loading={mutation.isPending} onClick={() => mutation.mutate({ paidAmount: paidAmountNumber, paymentMode })}>
                      SAVE PAYMENT
                    </Button>
                  ) : null}
                </article>

                <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-lg font-bold tracking-normal">Vehicle Delivery</h2>
                    {status === "DELIVERED" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase text-emerald-800">
                        <Check className="h-3.5 w-3.5" />
                        Delivered
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">Not Delivered</span>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Row label="Vehicle Number" value={jobCard.vehicle.registrationNumber ?? jobCard.vehicle.chassisNumber} />
                    <Row label="Customer" value={jobCard.customer.name} />
                    <Row label="Final KM" value={jobCard.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"} />
                    <Row label="Invoice Amount" value={rupees.format(invoiceAmount)} />
                    <Row label="Amount Paid" value={rupees.format(paidAmountNumber)} />
                    <Row label="Balance" value={rupees.format(balance)} />
                    <Row label="Delivery Date" value={workflow.deliveredAt ? new Date(workflow.deliveredAt).toLocaleString() : "Not delivered"} />
                  </div>
                  {status !== "DELIVERED" ? (
                    <Button
                      type="button"
                      className="mt-4"
                      loading={mutation.isPending}
                      onClick={() =>
                        mutation.mutate(
                          { status: "DELIVERED", deliveredAt: new Date().toISOString() },
                          { onSuccess: () => router.push(`/followups?open=${jobCardId}`) }
                        )
                      }
                    >
                      MARK VEHICLE DELIVERED
                    </Button>
                  ) : (
                    <Link href={`/followups?open=${jobCardId}`} className="mt-3 inline-block text-sm font-semibold text-[var(--primary)] hover:underline">Go to Follow-up</Link>
                  )}
                </article>
              </>
            )}

            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
