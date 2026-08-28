"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileText } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJobCard } from "@/services/register";
import { getWorkflowJobCard, updateWorkflowJobCard } from "@/services/workflow";
import { getGarageSettings } from "@/services/settings";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { Row, SelectBox } from "@/components/workflow/shared";
import { BillModal } from "@/components/workflow/bill-modal";

export default function FollowupsPage() {
  return (
    <Suspense fallback={null}>
      <FollowupsPageInner />
    </Suspense>
  );
}

function FollowupsPageInner() {
  const searchParams = useSearchParams();
  const open = searchParams.get("open");

  if (open) {
    return <FollowUpEditor jobCardId={open} />;
  }

  return <WorkflowBoard title="Follow-up Dates / WhatsApp Reminder / Returns" stage="followup" />;
}

function followUpStatus(nextServiceAt: string | null) {
  if (!nextServiceAt) return "UPCOMING";
  const days = (new Date(nextServiceAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
  if (days < 0) return "OVERDUE";
  if (days <= 7) return "DUE SOON";
  return "UPCOMING";
}

function FollowUpEditor({ jobCardId }: { jobCardId: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [nextServiceAt, setNextServiceAt] = useState("");
  const [nextServiceKm, setNextServiceKm] = useState("");
  const [followUpType, setFollowUpType] = useState("");
  const [whatsappReminderAt, setWhatsappReminderAt] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [message, setMessage] = useState("");
  const [showBill, setShowBill] = useState(false);

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
    setNextServiceAt(workflow.nextServiceAt ? workflow.nextServiceAt.slice(0, 16) : "");
    setNextServiceKm(workflow.nextServiceKm ? String(workflow.nextServiceKm) : "");
    setFollowUpType(workflow.followUpType ?? "");
    setWhatsappReminderAt(workflow.whatsappReminderAt ? workflow.whatsappReminderAt.slice(0, 16) : "");
    setFollowUpNotes(workflow.followUpNotes ?? "");
  }, [workflow]);

  const mutation = useMutation({
    mutationFn: () =>
      updateWorkflowJobCard(Number(jobCardId), {
        nextServiceAt: nextServiceAt ? new Date(nextServiceAt).toISOString() : undefined,
        nextServiceKm: nextServiceKm ? Number(nextServiceKm) : undefined,
        followUpType,
        whatsappReminderAt: whatsappReminderAt ? new Date(whatsappReminderAt).toISOString() : undefined,
        followUpNotes,
        returnNotes: followUpNotes
      }),
    onSuccess: async () => {
      setMessage("Follow-up saved");
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-card", jobCardId] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
      router.push("/followups");
    }
  });

  const isLoading = jobCardLoading || workflowLoading;
  const isError = jobCardError || workflowError;
  const status = workflow?.status === "DELIVERED" ? followUpStatus(workflow.nextServiceAt) : "-";

  return (
    <ProtectedShell title="Follow-up" hidePageHeader>
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/followups" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Follow-ups
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's follow-up. It may not exist, or you may need to sign in again.</p> : null}

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
              <div className="mt-1 inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{status}</div>
            </section>

            <Button type="button" variant="secondary" className="w-fit" onClick={() => setShowBill(true)}>
              <FileText className="h-4 w-4" />
              GENERATE BILL
            </Button>

            {showBill ? (
              <BillModal
                jobCard={jobCard}
                workflow={workflow}
                shop={shopSettings}
                onClose={() => setShowBill(false)}
              />
            ) : null}

            <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
              <Row label="Last Service" value={new Date(workflow.updatedAt).toLocaleDateString()} />
            </article>

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-lg font-bold tracking-normal">Next Follow-up</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Next Service Date" type="datetime-local" value={nextServiceAt} onChange={(e) => setNextServiceAt(e.target.value)} />
                <Input label="Next Service KM" inputMode="numeric" value={nextServiceKm} onChange={(e) => setNextServiceKm(e.target.value)} />
                <SelectBox label="Follow-up Type" value={followUpType} onChange={setFollowUpType} options={["", "Service Reminder", "Feedback Call", "Warranty Check", "Other"]} />
                <Input label="WhatsApp Reminder Date" type="datetime-local" value={whatsappReminderAt} onChange={(e) => setWhatsappReminderAt(e.target.value)} />
              </div>
              <label className="mt-4 grid gap-2 text-sm font-medium text-slate-800">
                Notes
                <textarea className="focus-ring min-h-24 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base text-slate-950" value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} />
              </label>
              <Button type="button" className="mt-4" loading={mutation.isPending} onClick={() => mutation.mutate()}>SAVE FOLLOW-UP</Button>
            </article>

            {message ?<p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
