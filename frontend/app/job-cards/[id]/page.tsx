"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getJobCard, updateJobCard, type JobCardDetails } from "@/services/register";
import { getVehicleHistory, updateWorkflowJobCard, type LabourItem, type PartItem, type WorkflowJobCard, type WorkItem } from "@/services/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, FileText, MessageCircle, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { ItemTable, NumberInput, PlainInput, Row, TableCell, emptyLabour, emptyPart, emptyWork, rupees } from "@/components/workflow/shared";
import { downloadJobCardPdf, shareJobCardPdfOnWhatsApp } from "@/lib/pdf";
import { getGarageSettings } from "@/services/settings";

const issueOptions = {
  "Running Repair": ["Engine Noise", "Brake Issue", "Clutch Issue", "Gear Shifting Issue", "Suspension Noise", "Steering Issue", "Overheating", "Starting Problem", "Electrical Issue", "Battery Issue"],
  PMS: ["Engine Oil", "Oil Filter", "Air Filter", "Fuel Filter", "Cabin Filter", "Brake Cleaning", "Wheel Alignment", "Wheel Balancing", "General Checkup"],
  "AC Service": ["Low Cooling", "Gas Refill", "AC Filter", "Compressor Issue", "Blower Issue", "Cooling Coil Cleaning", "Condenser Cleaning", "AC Leakage"],
  Breakdown: ["Vehicle Not Starting", "Towing Required", "Flat Tyre", "Battery Dead", "Engine Stopped", "Accident Damage", "Fuel Issue", "Warning Light"]
} as const;

const serviceOptions = [...Object.keys(issueOptions), "Other"];
type ServiceWithIssues = keyof typeof issueOptions;
type SelectedIssues = Record<ServiceWithIssues, string[]>;

const emptyIssues: SelectedIssues = {
  "Running Repair": [],
  PMS: [],
  "AC Service": [],
  Breakdown: []
};

const STATUS_FLOW = [
  "RECEIVED",
  "INSPECTION",
  "ESTIMATE",
  "WAITING_APPROVAL",
  "APPROVED",
  "WORK_IN_PROGRESS",
  "WORK_COMPLETED",
  "QUALITY_CHECK",
  "READY_FOR_DELIVERY",
  "DELIVERED"
];

const STEP_DEFS = [
  { key: "service", label: "Service" },
  { key: "inspection", label: "Inspection" },
  { key: "photos", label: "Photos" },
  { key: "work", label: "Work" },
  { key: "parts", label: "Parts" },
  { key: "labour", label: "Labour" }
] as const;

const HASH_TO_STEP: Record<string, number> = {
  "service-visit": 0,
  inspection: 1,
  photos: 2,
  work: 3,
  parts: 4,
  labour: 5
};

function statusRank(status?: string) {
  const idx = STATUS_FLOW.indexOf(status ?? "RECEIVED");
  return idx === -1 ? 0 : idx;
}

function guessStepFromStatus(status: string) {
  switch (status) {
    case "RECEIVED": return 0;
    case "INSPECTION": return 2;
    default: return 0;
  }
}

// Once the Job Card has moved past data collection (Estimate stage or later), it becomes
// a read-only record — the rest of the workflow lives on the Estimates/Invoices/Payments/Follow-ups pages.
const DATA_COLLECTION_STATUSES = new Set(["RECEIVED", "INSPECTION"]);

export default function JobCardPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Wizard navigation
  const [stepIndex, setStepIndex] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Service Visit
  const [odometerKm, setOdometerKm] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");
  const [complaint, setComplaint] = useState("");
  const [serviceTypes, setServiceTypes] = useState<string[]>([]);
  const [selectedIssues, setSelectedIssues] = useState<SelectedIssues>(emptyIssues);

  // Work / Parts / Labour
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);

  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["job-card", params.id],
    queryFn: () => getJobCard(params.id),
    enabled: Boolean(params.id)
  });
  const historyQuery = useQuery({
    queryKey: ["vehicle-history", data?.vehicle.id],
    queryFn: () => getVehicleHistory(data!.vehicle.id),
    enabled: Boolean(data?.vehicle.id)
  });
  const { data: shopSettings } = useQuery({ queryKey: ["garage-settings"], queryFn: getGarageSettings });

  const current = historyQuery.data?.find((item) => item.id === Number(params.id));
  const isDataCollectionPhase = data ? DATA_COLLECTION_STATUSES.has(data.status) : true;

  function goNext() {
    setStepIndex((i) => {
      const next = Math.min(i + 1, STEP_DEFS.length - 1);
      setMaxReached((m) => Math.max(m, next));
      return next;
    });
  }
  function goBack() {
    setStepIndex((i) => Math.max(i - 1, 0));
  }
  function goToStep(i: number) {
    if (i <= maxReached) setStepIndex(i);
  }
  function forwardStatus(target: string) {
    return statusRank(data?.status) < statusRank(target) ? target : undefined;
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateJobCard(params.id, {
        odometerKm: odometerKm ? Number(odometerKm) : null,
        expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
        complaint,
        serviceTypes: buildServiceTypes()
      }),
    onSuccess: async () => {
      setMessage("Service Visit saved");
      await queryClient.invalidateQueries({ queryKey: ["job-card", params.id] });
    }
  });

  const workflowMutation = useMutation({
    mutationFn: (extra: Record<string, unknown> = {}) =>
      updateWorkflowJobCard(Number(params.id), {
        workItems,
        partsItems,
        labourItems,
        ...extra
      }),
    onSuccess: async (result) => {
      setMessage("Job Card updated");
      await queryClient.invalidateQueries({ queryKey: ["vehicle-history", data?.vehicle.id] });
      await queryClient.invalidateQueries({ queryKey: ["workflow-job-cards"] });
      return result;
    }
  });

  // Restore wizard progress from localStorage, or a #anchor deep-link, or guess from status.
  useEffect(() => {
    if (!params.id) return;
    const hash = typeof window !== "undefined" ? window.location.hash.replace("#", "") : "";
    const raw = window.localStorage.getItem(`jobcard-wizard-${params.id}`);
    let storedMaxReached = 0;
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        storedMaxReached = parsed.maxReached ?? 0;
        if (!hash || HASH_TO_STEP[hash] === undefined) {
          setStepIndex(parsed.stepIndex ?? 0);
        }
        setMaxReached(storedMaxReached);
      } catch {
        // ignore corrupt local state
      }
    }
    if (hash && HASH_TO_STEP[hash] !== undefined) {
      setStepIndex(HASH_TO_STEP[hash]);
      setMaxReached(Math.max(storedMaxReached, HASH_TO_STEP[hash]));
    }
    setHydrated(true);
  }, [params.id]);

  useEffect(() => {
    if (!data || !hydrated) return;
    const raw = window.localStorage.getItem(`jobcard-wizard-${params.id}`);
    const hash = window.location.hash.replace("#", "");
    if (raw || (hash && HASH_TO_STEP[hash] !== undefined)) return;
    const guess = guessStepFromStatus(data.status);
    setStepIndex(guess);
    setMaxReached(guess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, hydrated]);

  useEffect(() => {
    if (!hydrated || !params.id) return;
    window.localStorage.setItem(`jobcard-wizard-${params.id}`, JSON.stringify({ stepIndex, maxReached }));
  }, [stepIndex, maxReached, hydrated, params.id]);

  useEffect(() => {
    if (!data) return;
    setOdometerKm(data.odometerKm?.toString() ?? "");
    setExpectedDeliveryAt(data.expectedDeliveryAt ? data.expectedDeliveryAt.slice(0, 16) : "");
    setComplaint(data.complaint ?? "");
    const savedServiceTypes = data.serviceTypes ? data.serviceTypes.split(",").map((item) => item.trim()).filter(Boolean) : [];
    setServiceTypes(savedServiceTypes.filter((item) => serviceOptions.includes(item)));
    setSelectedIssues(parseSelectedIssues(savedServiceTypes));
  }, [data]);

  useEffect(() => {
    if (!current) return;
    setWorkItems(current.workItems.length ? current.workItems : []);
    setPartsItems(current.partsItems.length ? current.partsItems : []);
    setLabourItems(current.labourItems.length ? current.labourItems : []);
  }, [current]);

  function toggleServiceType(option: string) {
    setServiceTypes((prev) => prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]);
  }

  function toggleIssue(service: ServiceWithIssues, issue: string) {
    setSelectedIssues((prev) => {
      const selected = prev[service].includes(issue);
      return { ...prev, [service]: selected ? prev[service].filter((item) => item !== issue) : [...prev[service], issue] };
    });
    setServiceTypes((prev) => prev.includes(service) ? prev : [...prev, service]);
  }

  function parseSelectedIssues(items: string[]) {
    return items.reduce<SelectedIssues>((result, item) => {
      const [service, issue] = item.split(":").map((part) => part.trim());
      if (service in issueOptions && issue) {
        result[service as ServiceWithIssues] = [...result[service as ServiceWithIssues], issue];
      }
      return result;
    }, { ...emptyIssues });
  }

  function buildServiceTypes() {
    const detailedTypes = Object.entries(selectedIssues).flatMap(([service, issues]) => issues.map((issue) => `${service}: ${issue}`));
    const plainTypes = serviceTypes.filter((service) => service === "Other" || selectedIssues[service as ServiceWithIssues]?.length === 0);
    return [...plainTypes, ...detailedTypes];
  }

  const partsSubtotal = partsItems.reduce((sum, p) => sum + (Number(p.qty) || 0) * (Number(p.price) || 0), 0);
  const labourSubtotal = labourItems.reduce((sum, l) => sum + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0);

  function handleNext() {
    setMessage("");
    switch (STEP_DEFS[stepIndex].key) {
      case "service":
        mutation.mutate(undefined, { onSuccess: goNext });
        return;
      case "inspection":
        workflowMutation.mutate({ status: forwardStatus("INSPECTION") }, { onSuccess: goNext });
        return;
      case "photos":
        goNext();
        return;
      case "work":
      case "parts":
        workflowMutation.mutate({}, { onSuccess: goNext });
        return;
      default:
        return;
    }
  }

  function handleFinish() {
    setMessage("");
    workflowMutation.mutate(
      { status: forwardStatus("ESTIMATE") },
      { onSuccess: () => router.push(`/estimates?open=${params.id}`) }
    );
  }

  const isSaving = mutation.isPending || workflowMutation.isPending;
  const stepKey = STEP_DEFS[stepIndex].key;

  if (!isLoading && data && !isDataCollectionPhase) {
    return (
      <ProtectedShell title="Job Card">
        <JobCardOverview
          jobCardId={params.id}
          data={data}
          current={current}
          history={historyQuery.data ?? []}
        />
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell title="Job Card">
      <section className="mx-auto grid max-w-4xl gap-5 pb-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-[var(--primary)]">Job Card</p>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{isLoading ? "Loading..." : data?.jobCardNumber}</h1>
          </div>
          <div className="inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{data?.status ?? "RECEIVED"}</div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Customer</h2>
            <p className="font-semibold text-slate-900">{data?.customer.name ?? "-"}</p>
            <p className="text-sm text-slate-700">{data?.customer.phone ?? "-"}</p>
            <p className="text-xs text-[var(--muted)]">{data?.customer.address ?? "-"}</p>
          </article>
          <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Vehicle</h2>
            <p className="font-semibold text-slate-900">{data?.vehicle.registrationNumber ?? "Not added yet"}</p>
            <p className="text-sm text-slate-700">Chassis: {data?.vehicle.chassisNumber ?? "-"}</p>
            <p className="text-xs text-[var(--muted)]">{data?.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"} km</p>
          </article>
        </div>

        <WizardStepIndicator stepIndex={stepIndex} maxReached={maxReached} onSelect={goToStep} />

        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          {stepKey === "service" ? (
            <StepBlock title="1. Service Visit">
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Odometer / KM" inputMode="numeric" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} />
                <Input label="Expected Delivery Date" type="datetime-local" value={expectedDeliveryAt} onChange={(event) => setExpectedDeliveryAt(event.target.value)} />
              </div>
              <fieldset className="grid gap-2">
                <legend className="text-sm font-medium text-slate-800">Service / Complaint Type</legend>
                <div className="grid gap-2 md:grid-cols-2">
                  {(Object.keys(issueOptions) as ServiceWithIssues[]).map((service) => {
                    const checkedCount = selectedIssues[service].length;
                    const isActive = serviceTypes.includes(service) || checkedCount > 0;
                    return (
                      <details key={service} className="group relative">
                        <summary className={`focus-ring flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 rounded-md border px-3 text-sm font-semibold ${isActive ? "border-[var(--primary)] bg-teal-50 text-[var(--primary)]" : "border-[var(--line)] bg-white text-slate-700 hover:bg-slate-50"}`}>
                          <span>{service}{checkedCount ? ` (${checkedCount})` : ""}</span>
                          <ChevronDown className="h-4 w-4 transition group-open:rotate-180" />
                        </summary>
                        <div className="absolute z-20 mt-2 grid max-h-72 w-full min-w-64 gap-1 overflow-auto rounded-md border border-[var(--line)] bg-white p-2 shadow-lg">
                          {issueOptions[service].map((issue) => (
                            <label key={issue} className="flex min-h-10 cursor-pointer items-center gap-2 rounded px-2 text-sm text-slate-700 hover:bg-slate-50">
                              <input className="h-5 w-5" type="checkbox" checked={selectedIssues[service].includes(issue)} onChange={() => toggleIssue(service, issue)} />
                              {issue}
                            </label>
                          ))}
                        </div>
                      </details>
                    );
                  })}
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 has-[:checked]:border-[var(--primary)] has-[:checked]:bg-teal-50 has-[:checked]:text-[var(--primary)]">
                    <input className="h-5 w-5" type="checkbox" checked={serviceTypes.includes("Other")} onChange={() => toggleServiceType("Other")} />
                    Other
                  </label>
                </div>
              </fieldset>
              <label className="grid gap-2 text-sm font-medium text-slate-800">
                Comments / Complaint
                <textarea
                  className="focus-ring min-h-32 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base text-slate-950"
                  value={complaint}
                  onChange={(event) => setComplaint(event.target.value)}
                  placeholder="Running Repair - Brake Issue"
                />
              </label>
            </StepBlock>
          ) : null}

          {stepKey === "inspection" ? (
            <StepBlock title="2. Inspection">
              <p className="text-sm text-[var(--muted)]">Record engine, brakes, tyres, and other inspection checks (Good / Attention / Replace) with notes and photos.</p>
              <Link className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-base font-semibold text-white transition hover:bg-teal-800 sm:w-fit" href={`/job-cards/${params.id}/inspection`}>
                OPEN INSPECTION
              </Link>
            </StepBlock>
          ) : null}

          {stepKey === "photos" ? (
            <StepBlock title="3. Accessories + Photos">
              <p className="text-sm text-[var(--muted)]">Accessories (Charger, Stepney, Other) and vehicle photos (Front, Rear, Left, Right, Bonnet, Dashboard, Existing Damage, Other — up to 20) are managed from the Inspection page for now. Dedicated capture/upload here is planned next.</p>
            </StepBlock>
          ) : null}

          {stepKey === "work" ? (
            <StepBlock title="4. Work">
              <ItemTable
                columns={["Description", "Technician", "Status", "Notes"]}
                rows={workItems}
                onChange={setWorkItems}
                empty={emptyWork}
                addLabel="ADD WORK"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.description} onChange={(v) => update({ ...row, description: v })} placeholder="e.g. Brake overhaul" /></TableCell>
                    <TableCell><PlainInput value={row.technician ?? ""} onChange={(v) => update({ ...row, technician: v })} /></TableCell>
                    <TableCell>
                      <select className="focus-ring min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-2 text-sm" value={row.status} onChange={(e) => update({ ...row, status: e.target.value })}>
                        <option>Pending</option>
                        <option>In Progress</option>
                        <option>Completed</option>
                      </select>
                    </TableCell>
                    <TableCell><PlainInput value={row.notes ?? ""} onChange={(v) => update({ ...row, notes: v })} /></TableCell>
                  </>
                )}
              />
            </StepBlock>
          ) : null}

          {stepKey === "parts" ? (
            <StepBlock title="5. Parts">
              <ItemTable
                columns={["Part Name", "Part Number", "Qty", "Selling Price", "GST %", "Notes"]}
                rows={partsItems}
                onChange={setPartsItems}
                empty={emptyPart}
                addLabel="ADD PART"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.name} onChange={(v) => update({ ...row, name: v })} placeholder="e.g. Brake Pad Set" /></TableCell>
                    <TableCell><PlainInput value={row.partNumber ?? ""} onChange={(v) => update({ ...row, partNumber: v })} /></TableCell>
                    <TableCell><NumberInput value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                    <TableCell><NumberInput value={row.price} onChange={(v) => update({ ...row, price: v })} /></TableCell>
                    <TableCell><NumberInput value={row.gstPercent} onChange={(v) => update({ ...row, gstPercent: v })} /></TableCell>
                    <TableCell><PlainInput value={row.notes ?? ""} onChange={(v) => update({ ...row, notes: v })} /></TableCell>
                  </>
                )}
              />
              <p className="mt-3 text-right text-sm font-semibold text-slate-800">Parts Total: {rupees.format(partsSubtotal)}</p>
            </StepBlock>
          ) : null}

          {stepKey === "labour" ? (
            <StepBlock title="6. Labour">
              <ItemTable
                columns={["Description", "Qty", "Rate", "GST %", "Amount", "Notes"]}
                rows={labourItems}
                onChange={setLabourItems}
                empty={emptyLabour}
                addLabel="ADD LABOUR"
                renderRow={(row, update) => (
                  <>
                    <TableCell><PlainInput value={row.description} onChange={(v) => update({ ...row, description: v })} placeholder="e.g. Brake labour" /></TableCell>
                    <TableCell><NumberInput value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                    <TableCell><NumberInput value={row.rate} onChange={(v) => update({ ...row, rate: v })} /></TableCell>
                    <TableCell><NumberInput value={row.gstPercent} onChange={(v) => update({ ...row, gstPercent: v })} /></TableCell>
                    <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format((Number(row.qty) || 0) * (Number(row.rate) || 0))}</span></TableCell>
                    <TableCell><PlainInput value={row.notes ?? ""} onChange={(v) => update({ ...row, notes: v })} /></TableCell>
                  </>
                )}
              />
              <p className="mt-3 text-right text-sm font-semibold text-slate-800">Labour Total: {rupees.format(labourSubtotal)}</p>

              <div className="mt-4 grid gap-3 rounded-md bg-slate-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Summary</p>
                <Row label="Work Items" value={String(workItems.length)} />
                <Row label="Parts" value={String(partsItems.length)} />
                <Row label="Labour" value={String(labourItems.length)} />
                <Row label="Vehicle" value={data?.vehicle.registrationNumber ?? data?.vehicle.chassisNumber ?? "-"} />
                <Row label="Customer" value={data?.customer.name ?? "-"} />
                <Row label="KM" value={odometerKm || "-"} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    downloadJobCardPdf({
                      data,
                      shop: shopSettings,
                      serviceTypes: buildServiceTypes(),
                      complaint,
                      odometerKm,
                      expectedDeliveryAt,
                      workItems,
                      partsItems,
                      labourItems
                    })
                  }
                >
                  <FileText className="h-4 w-4" />
                  PRINT PDF
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    shareJobCardPdfOnWhatsApp({
                      data,
                      shop: shopSettings,
                      serviceTypes: buildServiceTypes(),
                      complaint,
                      odometerKm,
                      expectedDeliveryAt,
                      workItems,
                      partsItems,
                      labourItems
                    })
                  }
                >
                  <MessageCircle className="h-4 w-4" />
                  SHARE ON WHATSAPP
                </Button>
              </div>
            </StepBlock>
          ) : null}

          {message ? <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
        </article>
      </section>

      {/* Sticky bottom wizard navigation */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          {stepIndex > 0 ? (
            <Button type="button" variant="secondary" className="min-h-12 flex-1 sm:flex-none" onClick={goBack}>
              BACK
            </Button>
          ) : <span className="flex-1 sm:flex-none" />}
          {stepKey !== "labour" ? (
            <Button type="button" className="min-h-12 flex-1 sm:flex-none" loading={isSaving} onClick={handleNext}>
              SAVE &amp; CONTINUE
            </Button>
          ) : (
            <Button type="button" className="min-h-12 flex-1 sm:flex-none" loading={isSaving} onClick={handleFinish}>
              SAVE JOB CARD &amp; GO TO ESTIMATE
            </Button>
          )}
        </div>
      </div>
    </ProtectedShell>
  );
}

function JobCardOverview({
  jobCardId,
  data,
  current,
  history
}: {
  jobCardId: string;
  data: JobCardDetails;
  current: WorkflowJobCard | undefined;
  history: WorkflowJobCard[];
}) {
  const links = [
    { label: "Open Estimate", href: `/estimates?open=${jobCardId}`, icon: FileText },
    { label: "Open Invoice", href: `/invoices?open=${jobCardId}`, icon: FileText },
    { label: "Open Payment", href: `/payments?open=${jobCardId}`, icon: FileText },
    { label: "Open Follow-up", href: `/followups?open=${jobCardId}`, icon: FileText }
  ];

  return (
    <section className="mx-auto grid max-w-4xl gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--primary)]">Job Card</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{data.jobCardNumber}</h1>
        </div>
        <div className="inline-flex w-fit rounded-md bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800">{data.status.replace(/_/g, " ")}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Customer</h2>
          <p className="font-semibold text-slate-900">{data.customer.name}</p>
          <p className="text-sm text-slate-700">{data.customer.phone}</p>
          <p className="text-xs text-[var(--muted)]">{data.customer.address}</p>
        </article>
        <article className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--muted)]">Vehicle</h2>
          <p className="font-semibold text-slate-900">{data.vehicle.registrationNumber ?? "Not added yet"}</p>
          <p className="text-sm text-slate-700">Chassis: {data.vehicle.chassisNumber}</p>
          <p className="text-xs text-[var(--muted)]">{data.vehicle.currentKm?.toLocaleString("en-IN") ?? "-"} km</p>
        </article>
      </div>

      <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <p className="mb-3 text-sm text-[var(--muted)]">
          This Job Card's data collection is complete. The rest of the workflow (Estimate, Approval, Invoice, Payment, Delivery, Follow-up) now
          happens on their own pages using this same Job Card record.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {links.map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href} className="focus-ring flex min-h-12 items-center gap-2 rounded-md border border-[var(--line)] bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Icon className="h-4 w-4 text-[var(--primary)]" />
              {label}
            </Link>
          ))}
        </div>
      </article>

      <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-base font-bold tracking-normal">Work / Parts / Labour</h2>
        <div className="grid gap-3 text-sm sm:grid-cols-3">
          <Row label="Work Items" value={String(current?.workItems.length ?? 0)} />
          <Row label="Parts" value={String(current?.partsItems.length ?? 0)} />
          <Row label="Labour" value={String(current?.labourItems.length ?? 0)} />
        </div>
      </article>

      <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold tracking-normal">Complete Vehicle History</h2>
        <div className="mt-4 grid gap-3">
          {history.map((item) => (
            <Link key={item.id} href={`/job-cards/${item.id}`} className="rounded-md bg-slate-50 px-3 py-3 text-sm hover:bg-slate-100">
              <strong className="text-[var(--primary)]">{item.jobCardNumber}</strong>
              <span className="ml-3 text-slate-700">{item.status}</span>
              <p className="mt-1 text-xs text-[var(--muted)]">{new Date(item.createdAt).toLocaleString()} - Invoice {item.invoiceNumber ?? "Not created"} - Payment: {item.paymentStatus}</p>
            </Link>
          ))}
          {history.length === 0 ? <p className="text-sm text-[var(--muted)]">No previous job cards for this vehicle.</p> : null}
        </div>
      </article>
    </section>
  );
}

function WizardStepIndicator({ stepIndex, maxReached, onSelect }: { stepIndex: number; maxReached: number; onSelect: (i: number) => void }) {
  const total = STEP_DEFS.length;
  const percent = Math.round(((stepIndex + 1) / total) * 100);
  return (
    <div className="rounded-lg border border-[var(--line)] bg-white p-3">
      {/* Desktop: horizontal step row */}
      <div className="hidden gap-1 overflow-x-auto md:flex">
        {STEP_DEFS.map((step, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
          const reachable = index <= maxReached;
          return (
            <button
              key={step.key}
              type="button"
              disabled={!reachable}
              onClick={() => onSelect(index)}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md px-1 py-2 text-[11px] font-semibold ${
                state === "current" ? "text-[var(--primary)]" : state === "done" ? "text-emerald-700" : "text-slate-400"
              } ${reachable ? "cursor-pointer hover:bg-slate-50" : "cursor-not-allowed"}`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  state === "current"
                    ? "bg-[var(--primary)] text-white"
                    : state === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                }`}
              >
                {state === "done" ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <span className="max-w-[64px] truncate">{step.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mobile: compact progress */}
      <div className="md:hidden">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          STEP {stepIndex + 1} OF {total}
        </p>
        <p className="mt-1 text-base font-bold text-slate-950">{STEP_DEFS[stepIndex].label}</p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-[var(--primary)] transition-all" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  );
}

function StepBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="grid gap-5">
      <h2 className="text-lg font-bold tracking-normal">{title}</h2>
      {children}
    </div>
  );
}
