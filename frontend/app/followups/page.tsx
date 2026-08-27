"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getJobCard } from "@/services/register";
import { getWorkflowJobCard, updateWorkflowJobCard } from "@/services/workflow";
import { WorkflowBoard } from "@/components/workflow/workflow-board";
import { Row, SelectBox } from "@/components/workflow/shared";

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
    <ProtectedShell title="Follow-up">
      <section className="mx-auto grid max-w-4xl gap-5">
        <Link href="/followups" className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to Follow-ups
        </Link>

        {isLoading ? <p className="text-sm text-[var(--muted)]">Loading...</p> : null}
        {isError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">Could not load this Job Card's follow-up. It may not exist, or you may need to sign in again.</p> : null}

        {jobCard && workflow ? (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-[var(--primary)]">Follow-up</p>
                <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{jobCard.jobCardNumber}</h1>
              </div>
              <div className="inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{status}</div>
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
                <p className="text-sm text-slate-700">Last KM: {jobCard.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"}</p>
              </article>
            </div>

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

            <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
              <Link href={`/job-cards/${jobCardId}`} className="text-sm font-semibold text-[var(--primary)] hover:underline">View Complete Vehicle History</Link>
            </article>

            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          </>
        ) : null}
      </section>
    </ProtectedShell>
  );
}
