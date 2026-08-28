"use client";

import { useParams, useRouter } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { getJobCard, updateJobCard, type JobCardDetails } from "@/services/register";
import { getVehicleHistory, updateWorkflowJobCard, type LabourItem, type PartItem, type WorkflowJobCard, type WorkItem } from "@/services/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Clock, FileText, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { ItemTable, NumberInput, PlainInput, Row, TableCell, emptyLabour, emptyPart, emptyWork, rupees } from "@/components/workflow/shared";
import { downloadJobCardPdf } from "@/lib/pdf";
import { getGarageSettings } from "@/services/settings";

const issueOptions = {
  "Running Repair": [
    "Brake Issue",
    "Engine Noise",
    "Engine Misfire",
    "Oil Leakage",
    "Clutch Issue",
    "Gear Shifting Issue",
    "Suspension Noise",
    "Steering Issue",
    "Overheating",
    "Starting Issue",
    "Battery Issue",
    "Electrical Issue",
    "Warning Light",
    "Tyre / Wheel Issue",
    "Other"
  ],
  PMS: [
    "Oil Change",
    "Oil Filter Change",
    "Air Filter Change",
    "Fuel Filter Change",
    "Cabin Filter Change",
    "Brake Cleaning",
    "Coolant Top-up",
    "Battery Check",
    "Wheel Alignment",
    "Wheel Balancing",
    "General Service",
    "Full Inspection",
    "Other"
  ],
  "AC Service": [
    "AC Not Cooling",
    "Low Cooling",
    "AC Noise",
    "Gas Check",
    "Gas Refill",
    "AC Leakage",
    "Compressor Issue",
    "Blower Issue",
    "Cooling Coil Cleaning",
    "Condenser Cleaning",
    "AC Filter Change",
    "Bad Smell",
    "Other"
  ],
  Breakdown: [
    "Vehicle Not Starting",
    "Battery Issue",
    "Engine Breakdown",
    "Tyre Issue",
    "Flat Tyre",
    "Towing Required",
    "Overheating",
    "Fuel Issue",
    "Clutch Failure",
    "Brake Failure",
    "Electrical Failure",
    "Warning Light",
    "Accident Damage",
    "Other"
  ]
} as const;

const serviceOptions = [...Object.keys(issueOptions), "Other"];
type ServiceWithIssues = keyof typeof issueOptions;
type SelectedIssues = Record<ServiceWithIssues, string[]>;
type IssueTextMap = Record<string, string>;

const accessoryOptions = [
  "Charger",
  "Stepney",
  "Jack",
  "Jack Rod",
  "Wheel Spanner",
  "Spare Tyre",
  "Floor Mats",
  "Parcel Tray",
  "Tool Kit",
  "First Aid Kit",
  "Other"
];

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
  { key: "service", label: "Service Visit" },
  { key: "inspection", label: "Inspection" },
  { key: "photos", label: "Accessories" },
  { key: "work", label: "Work" },
  { key: "parts", label: "Parts + Labour" }
] as const;

const HASH_TO_STEP: Record<string, number> = {
  "service-visit": 0,
  inspection: 1,
  photos: 2,
  work: 3,
  parts: 4
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
// a read-only record - the rest of the workflow lives on the Estimates/Invoices/Payments/Follow-ups pages.
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
  const [issueDescriptions, setIssueDescriptions] = useState<IssueTextMap>({});
  const [manualIssues, setManualIssues] = useState<IssueTextMap>({});
  const [openService, setOpenService] = useState<ServiceWithIssues | null>(null);
  const [openIssue, setOpenIssue] = useState<string | null>(null);
  const [otherServiceType, setOtherServiceType] = useState("");
  const [otherServiceDescription, setOtherServiceDescription] = useState("");
  const [commonDescription, setCommonDescription] = useState("");
  const serviceSelectorRef = useRef<HTMLFieldSetElement | null>(null);

  // Accessories
  const [accessories, setAccessories] = useState<string[]>([]);
  const [otherAccessory, setOtherAccessory] = useState("");

  // Work / Parts / Labour
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [partsItems, setPartsItems] = useState<PartItem[]>([]);
  const [labourItems, setLabourItems] = useState<LabourItem[]>([]);

  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);

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
    if (i <= maxReached) {
      setStepIndex(i);
    }
  }
  function forwardStatus(target: string) {
    return statusRank(data?.status) < statusRank(target) ? target : undefined;
  }

  const mutation = useMutation({
    mutationFn: () =>
      updateJobCard(params.id, {
        odometerKm: odometerKm ? Number(odometerKm) : null,
        expectedDeliveryAt: expectedDeliveryAt ? new Date(expectedDeliveryAt).toISOString() : null,
        complaint: buildComplaintDetails(),
        serviceTypes: buildServiceTypes(),
        accessories: buildAccessories()
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
        labourItems: buildLabourItemsForSave(),
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
    function closeDropdown(event: MouseEvent | TouchEvent) {
      if (!serviceSelectorRef.current?.contains(event.target as Node)) {
        setOpenService(null);
      }
    }

    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("touchstart", closeDropdown);
    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("touchstart", closeDropdown);
    };
  }, []);

  useEffect(() => {
    if (!data) return;
    setOdometerKm(data.odometerKm?.toString() ?? "");
    setExpectedDeliveryAt(data.expectedDeliveryAt ? data.expectedDeliveryAt.slice(0, 16) : "");
    setComplaint(data.complaint ?? "");
    const savedServiceTypes = data.serviceTypes ? data.serviceTypes.split(",").map((item) => item.trim()).filter(Boolean) : [];
    setServiceTypes(savedServiceTypes
      .map((item) => item.startsWith("Other:") ? "Other" : item)
      .filter((item) => serviceOptions.includes(item)));
    setSelectedIssues(parseSelectedIssues(savedServiceTypes));
    const savedOther = savedServiceTypes.find((item) => item.startsWith("Other:"));
    setOtherServiceType(savedOther ? savedOther.replace("Other:", "").trim() : "");
    setOtherServiceDescription(parseOtherDescription(data.complaint ?? ""));
    setCommonDescription(parseCommonDescription(data.complaint ?? ""));
    const savedAccessories = parseAccessories(data.accessories ?? "");
    setAccessories(savedAccessories.selected);
    setOtherAccessory(savedAccessories.other);
  }, [data]);

  useEffect(() => {
    if (!current) return;
    setWorkItems(current.workItems.length ? current.workItems : []);
    setPartsItems(current.partsItems.length ? current.partsItems : []);
    setLabourItems(current.labourItems.length ? current.labourItems : []);
  }, [current]);

  function toggleServiceType(option: string) {
    setServiceTypes((prev) => {
      const selected = prev.includes(option);
      if (selected && option in issueOptions) {
        const service = option as ServiceWithIssues;
        setSelectedIssues((issues) => ({ ...issues, [service]: [] }));
        setOpenService((open) => open === service ? null : open);
      }
      return selected ? prev.filter((item) => item !== option) : [...prev, option];
    });
  }

  function toggleIssue(service: ServiceWithIssues, issue: string) {
    setSelectedIssues((prev) => {
      const selected = prev[service].includes(issue);
      return { ...prev, [service]: selected ? prev[service].filter((item) => item !== issue) : [...prev[service], issue] };
    });
    setServiceTypes((prev) => prev.includes(service) ? prev : [...prev, service]);
  }

  function issueKey(service: ServiceWithIssues, issue: string) {
    return `${service}:${issue}`;
  }

  function updateIssueDescription(service: ServiceWithIssues, issue: string, value: string) {
    setIssueDescriptions((prev) => ({ ...prev, [issueKey(service, issue)]: value }));
  }

  function updateManualIssue(service: ServiceWithIssues, value: string) {
    setManualIssues((prev) => ({ ...prev, [service]: value }));
  }

  function selectOtherFromText(value: string, setter: (next: string) => void) {
    setter(value);
    if (value.trim()) {
      setServiceTypes((prev) => prev.includes("Other") ? prev : [...prev, "Other"]);
    }
  }

  function toggleAccessory(option: string) {
    setAccessories((prev) => prev.includes(option) ? prev.filter((item) => item !== option) : [...prev, option]);
    if (option === "Other" && accessories.includes("Other")) {
      setOtherAccessory("");
    }
  }

  function toggleServiceDropdown(service: ServiceWithIssues) {
    setServiceTypes((prev) => prev.includes(service) ? prev : [...prev, service]);
    setOpenService((open) => open === service ? null : service);
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

  function parseCommonDescription(value: string) {
    const marker = "Common Description:\n";
    const index = value.indexOf(marker);
    return index === -1 ? "" : value.slice(index + marker.length).trim();
  }

  function parseOtherDescription(value: string) {
    const match = value.match(/(?:^|\n\n)Other:.*?\nDescribe: ([\s\S]*?)(?:\n\n[A-Z][\w /]+:|$)/);
    return match?.[1]?.trim() ?? "";
  }

  function buildServiceTypes() {
    const detailedTypes = Object.entries(selectedIssues).flatMap(([service, issues]) => issues.map((issue) => `${service}: ${issue}`));
    const plainTypes = serviceTypes.filter((service) => selectedIssues[service as ServiceWithIssues]?.length === 0);
    const otherType = otherServiceType.trim() ? [`Other: ${otherServiceType.trim()}`] : [];
    return [...plainTypes, ...detailedTypes, ...otherType];
  }

  function buildComplaintDetails() {
    const details = (Object.keys(issueOptions) as ServiceWithIssues[]).flatMap((service) =>
      selectedIssues[service].map((issue) => {
        const manual = issue === "Other" ? manualIssues[service]?.trim() : "";
        const description = issueDescriptions[issueKey(service, issue)]?.trim();
        const label = manual ? `${issue} - ${manual}` : issue;
        return description ? `${service}: ${label}\nDescribe: ${description}` : `${service}: ${label}`;
      })
    );
    if (serviceTypes.includes("Other")) {
      const otherType = otherServiceType.trim();
      const otherDescription = otherServiceDescription.trim();
      details.push(otherDescription ? `Other: ${otherType || "-"}\nDescribe: ${otherDescription}` : `Other: ${otherType || "-"}`);
    }
    if (commonDescription.trim()) {
      details.push(`Common Description:\n${commonDescription.trim()}`);
    }

    return details.length ? details.join("\n\n") : complaint;
  }

  function parseAccessories(value: string) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .reduce<{ selected: string[]; other: string }>((result, item) => {
        if (item.startsWith("Other:")) {
          result.selected.push("Other");
          result.other = item.replace("Other:", "").trim();
          return result;
        }
        if (accessoryOptions.includes(item)) {
          result.selected.push(item);
        }
        return result;
      }, { selected: [], other: "" });
  }

  function buildAccessories() {
    return accessories
      .map((item) => item === "Other" && otherAccessory.trim() ? `Other: ${otherAccessory.trim()}` : item)
      .join(", ");
  }

  function buildLabourItemsForSave() {
    return labourItems.map((item) => ({ ...item, qty: 1 }));
  }

  const partsSubtotal = partsItems.reduce((sum, part) => sum + partBaseAmount(part), 0);
  const labourSubtotal = labourItems.reduce((sum, labour) => sum + labourBaseAmount(labour), 0);
  const partsGstTotal = partsItems.reduce((sum, part) => sum + partGstAmount(part), 0);
  const gstAmount = partsGstTotal;
  const grandTotal = partsSubtotal + labourSubtotal + gstAmount;

  function partBaseAmount(part: PartItem) {
    return (Number(part.qty) || 0) * (Number(part.price) || 0);
  }

  function partGstAmount(part: PartItem) {
    return partBaseAmount(part) * ((Number(part.gstPercent) || 0) / 100);
  }

  function partCgstAmount(part: PartItem) {
    return partGstAmount(part) / 2;
  }

  function partSgstAmount(part: PartItem) {
    return partGstAmount(part) / 2;
  }

  function partTotalAmount(part: PartItem) {
    return partBaseAmount(part) + partGstAmount(part);
  }

  function amountInputValue(value: number) {
    return value.toFixed(2);
  }

  function labourBaseAmount(labour: LabourItem) {
    return Number(labour.rate) || 0;
  }

  function labourTotalAmount(labour: LabourItem) {
    return labourBaseAmount(labour);
  }

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
        mutation.mutate(undefined, { onSuccess: goNext });
        return;
      case "work":
        workflowMutation.mutate({}, { onSuccess: goNext });
        return;
      case "parts":
        handleFinish();
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
      <ProtectedShell title="Job Card" hidePageHeader>
        <JobCardOverview
          jobCardId={params.id}
          data={data}
          current={current}
          history={historyQuery.data ?? []}
          historyOpen={historyOpen}
          onHistoryOpenChange={setHistoryOpen}
        />
      </ProtectedShell>
    );
  }

  return (
    <ProtectedShell title="Job Card" hidePageHeader>
      <section className="mx-auto grid max-w-5xl gap-3 pb-6">
        <JobCardTopDetails
          data={data}
          isLoading={isLoading}
          history={historyQuery.data ?? []}
          historyOpen={historyOpen}
          onHistoryOpenChange={setHistoryOpen}
        />

        <WizardStepIndicator stepIndex={stepIndex} maxReached={maxReached} onSelect={goToStep} />

        <article className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          {stepKey === "service" ? (
            <StepBlock title="STEP 1 - Service Visit">
              <div className="grid gap-4">
                <Input label="Odometer / KM" inputMode="numeric" value={odometerKm} onChange={(event) => setOdometerKm(event.target.value)} />
              </div>
              <fieldset className="grid gap-3" ref={serviceSelectorRef}>
                <legend className="mb-1 text-sm font-semibold text-slate-900">Service / Complaint Type</legend>
                {(Object.keys(issueOptions) as ServiceWithIssues[]).map((service) => {
                  const checkedCount = selectedIssues[service].length;
                  const isActive = serviceTypes.includes(service) || checkedCount > 0;
                  return (
                    <section
                      key={service}
                      className={`grid gap-3 rounded-lg border p-3 transition-colors duration-200 ${
                        isActive ? "border-teal-200 bg-teal-50/50" : "border-[var(--line)] bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        className={`focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm font-semibold shadow-sm transition duration-200 ${
                          isActive ? "border-teal-200 bg-white text-[var(--primary-dark)]" : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                        }`}
                        onClick={() => toggleServiceDropdown(service)}
                      >
                        <span>{service}{checkedCount ? ` (${checkedCount})` : ""}</span>
                        <ChevronDown className={`h-4 w-4 transition ${openService === service ? "rotate-180" : ""}`} />
                      </button>

                      {openService === service ? (
                        <div className="grid max-h-64 touch-pan-y gap-1 overflow-y-auto overscroll-contain rounded-md border border-slate-200 bg-white p-2 shadow-lg transition-all duration-200">
                          {issueOptions[service].map((issue) => {
                            const selected = selectedIssues[service].includes(issue);
                            return (
                              <button
                                key={issue}
                                type="button"
                                className={`focus-ring min-h-11 rounded-md border px-3 text-left text-sm font-medium transition duration-150 ${
                                  selected ? "border-teal-200 bg-teal-50 text-[var(--primary-dark)]" : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white"
                                }`}
                                onClick={() => toggleIssue(service, issue)}
                              >
                                {issue}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}

                      {selectedIssues[service].length ? (
                        <div className="grid gap-2">
                          {selectedIssues[service].map((issue) => {
                            const key = issueKey(service, issue);
                            const isOpen = openIssue === key;
                            return (
                              <div key={issue} className="grid gap-2 rounded-md border border-teal-100 bg-white p-2 shadow-sm transition-all duration-200">
                                <button
                                  type="button"
                                  className="focus-ring flex min-h-10 w-full items-center justify-between gap-3 rounded-md bg-teal-50 px-3 text-left text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-teal-100"
                                  onClick={() => setOpenIssue((open) => open === key ? null : key)}
                                >
                                  <span>{issue}</span>
                                  <ChevronDown className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isOpen ? (
                                  <div className="grid gap-2 rounded-md bg-slate-50 p-3 transition-all duration-200">
                                    {issue === "Other" ? (
                                      <input
                                        className="focus-ring min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-base text-slate-950"
                                        value={manualIssues[service] ?? ""}
                                        onChange={(event) => updateManualIssue(service, event.target.value)}
                                        placeholder="Enter Service Type"
                                      />
                                    ) : null}
                                    <textarea
                                      className="focus-ring min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base text-slate-950"
                                      value={issueDescriptions[key] ?? ""}
                                      onChange={(event) => updateIssueDescription(service, issue, event.target.value)}
                                      placeholder={`Describe the ${issue.toLowerCase()}...`}
                                    />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
                <section className={`grid gap-3 rounded-lg border p-3 transition-colors duration-200 ${serviceTypes.includes("Other") ? "border-teal-200 bg-teal-50/50" : "border-[var(--line)] bg-white"}`}>
                  <button
                    type="button"
                    className={`focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-md border px-3 text-left text-sm font-semibold shadow-sm transition duration-200 ${
                      serviceTypes.includes("Other") ? "border-teal-200 bg-white text-[var(--primary-dark)]" : "border-slate-200 bg-slate-50 text-slate-800 hover:bg-white"
                    }`}
                    onClick={() => toggleServiceType("Other")}
                  >
                    Other
                    <ChevronDown className={`h-4 w-4 transition ${serviceTypes.includes("Other") ? "rotate-180" : ""}`} />
                  </button>
                  {serviceTypes.includes("Other") ? (
                    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 shadow-sm transition-all duration-200">
                      <input
                        className="focus-ring min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-base text-slate-950"
                        value={otherServiceType}
                        onChange={(event) => selectOtherFromText(event.target.value, setOtherServiceType)}
                        placeholder="Enter Service Type"
                      />
                    </div>
                  ) : null}
                  {otherServiceType.trim() ? (
                    <div className="grid gap-2">
                      <div className="grid gap-2 rounded-md border border-teal-100 bg-white p-2 shadow-sm transition-all duration-200">
                        <button
                          type="button"
                          className="focus-ring flex min-h-10 w-full items-center justify-between gap-3 rounded-md bg-teal-50 px-3 text-left text-sm font-semibold text-[var(--primary-dark)] transition hover:bg-teal-100"
                          onClick={() => setOpenIssue((open) => open === "main-other" ? null : "main-other")}
                        >
                          <span>{otherServiceType.trim()}</span>
                          <ChevronDown className={`h-4 w-4 transition ${openIssue === "main-other" ? "rotate-180" : ""}`} />
                        </button>
                        {openIssue === "main-other" ? (
                          <div className="grid gap-2 rounded-md bg-slate-50 p-3 transition-all duration-200">
                            <textarea
                              className="focus-ring min-h-24 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base text-slate-950"
                              value={otherServiceDescription}
                              onChange={(event) => selectOtherFromText(event.target.value, setOtherServiceDescription)}
                              placeholder="Describe Issue"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
                <label className="grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 text-sm font-semibold text-slate-900">
                  Common Description
                  <textarea
                    className="focus-ring min-h-28 w-full resize-y rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base font-normal text-slate-950"
                    value={commonDescription}
                    onChange={(event) => setCommonDescription(event.target.value)}
                    placeholder="Describe anything else about this service visit"
                  />
                </label>
              </fieldset>
            </StepBlock>
          ) : null}

          {stepKey === "inspection" ? (
            <StepBlock title="STEP 2 - Inspection">
              <p className="text-sm text-[var(--muted)]">Record engine, brakes, tyres, and other inspection checks (Good / Attention / Replace) with notes and photos.</p>
              <Link className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-md bg-[var(--primary)] px-4 py-2 text-base font-semibold text-white transition hover:bg-teal-800 sm:w-fit" href={`/job-cards/${params.id}/inspection`}>
                OPEN INSPECTION
              </Link>
            </StepBlock>
          ) : null}

          {stepKey === "photos" ? (
            <StepBlock title="STEP 3 - Accessories">
              <fieldset className="grid gap-3">
                <legend className="sr-only">Accessories checklist</legend>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {accessoryOptions.map((option) => {
                    const selected = accessories.includes(option);
                    return (
                      <label
                        key={option}
                        className={`focus-within:ring-2 focus-within:ring-[var(--primary)]/25 flex min-h-11 cursor-pointer items-center gap-3 rounded-md border px-3 text-sm font-semibold transition ${
                          selected ? "border-teal-200 bg-teal-50 text-[var(--primary-dark)]" : "border-[var(--line)] bg-white text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 text-[var(--primary)] accent-[var(--primary)]"
                          checked={selected}
                          onChange={() => toggleAccessory(option)}
                        />
                        <span>{option}</span>
                      </label>
                    );
                  })}
                </div>
                {accessories.includes("Other") ? (
                  <label className="grid max-w-md gap-2 text-sm font-semibold text-slate-900">
                    Other Accessory
                    <input
                      className="focus-ring min-h-11 w-full rounded-md border border-[var(--line)] bg-white px-3 text-base font-normal text-slate-950"
                      value={otherAccessory}
                      onChange={(event) => setOtherAccessory(event.target.value)}
                      placeholder="Enter accessory name"
                    />
                  </label>
                ) : null}
              </fieldset>
            </StepBlock>
          ) : null}

          {stepKey === "work" ? (
            <StepBlock title="STEP 4 - Work">
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
            <StepBlock title="STEP 5 - Parts + Labour">
              <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Parts</h3>
              <ItemTable
                columns={["Part Name", "Part Number", "Quantity", "Price", "CGST 9%", "SGST 9%", "Amount"]}
                rows={partsItems}
                onChange={setPartsItems}
                empty={emptyPart}
                addLabel="ADD PART"
                addPosition="top"
                renderRow={(row, update) => (
                  <>
                    <TableCell className="min-w-[220px]"><PlainInput className="w-full min-w-[200px]" value={row.name} onChange={(v) => update({ ...row, name: v })} placeholder="e.g. Brake Pad Set" /></TableCell>
                    <TableCell className="min-w-[160px]"><PlainInput className="w-full min-w-[140px]" value={row.partNumber ?? ""} onChange={(v) => update({ ...row, partNumber: v })} placeholder="e.g. BP-1234" /></TableCell>
                    <TableCell><NumberInput className="w-14" value={row.qty} onChange={(v) => update({ ...row, qty: v })} /></TableCell>
                    <TableCell><NumberInput value={row.price} onChange={(v) => update({ ...row, price: v })} /></TableCell>
                    <TableCell>
                      <input
                        className="focus-ring w-24 rounded-md border border-[var(--line)] bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-900"
                        value={amountInputValue(partCgstAmount(row))}
                        readOnly
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        className="focus-ring w-24 rounded-md border border-[var(--line)] bg-slate-50 px-2 py-2 text-sm font-semibold text-slate-900"
                        value={amountInputValue(partSgstAmount(row))}
                        readOnly
                      />
                    </TableCell>
                    <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(partTotalAmount(row))}</span></TableCell>
                  </>
                )}
              />
              <p className="mt-3 text-right text-sm font-semibold text-slate-800">Parts Total: {rupees.format(partsSubtotal + partsGstTotal)}</p>

              <section className="grid gap-3 border-t border-[var(--line)] pt-5">
                <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900">Labour</h3>
                <ItemTable
                  columns={["Labour Description", "Rate", "Total Amount"]}
                  rows={labourItems}
                  onChange={setLabourItems}
                  empty={emptyLabour}
                  addLabel="ADD LABOUR"
                  addPosition="top"
                  renderRow={(row, update) => (
                    <>
                      <TableCell><PlainInput value={row.description} onChange={(v) => update({ ...row, description: v })} placeholder="e.g. Brake labour" /></TableCell>
                      <TableCell><NumberInput value={row.rate} onChange={(v) => update({ ...row, rate: v })} /></TableCell>
                      <TableCell><span className="text-sm font-semibold text-slate-800">{rupees.format(labourTotalAmount(row))}</span></TableCell>
                    </>
                  )}
                />
                <p className="text-right text-sm font-semibold text-slate-800">Labour Total: {rupees.format(labourSubtotal)}</p>
              </section>

              <div className="mt-4 grid gap-3 rounded-md border border-[var(--line)] bg-slate-50 p-4 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">Total Summary</p>
                <Row label="Parts Subtotal" value={rupees.format(partsSubtotal)} />
                <Row label="Labour Subtotal" value={rupees.format(labourSubtotal)} />
                <Row label="GST Amount" value={rupees.format(gstAmount)} />
                <div className="border-t border-slate-200 pt-3">
                  <Row label="Grand Total" value={<strong className="text-base text-[var(--primary-dark)]">{rupees.format(grandTotal)}</strong>} />
                </div>
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
              </div>
            </StepBlock>
          ) : null}

          {message ? <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
          <div className="mt-5 flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:justify-between">
          {stepIndex > 0 ? (
            <Button type="button" variant="secondary" className="min-h-12 w-full sm:w-auto" onClick={goBack}>
              BACK
            </Button>
          ) : <span className="hidden sm:block" />}
          {stepKey !== "parts" ? (
            <Button type="button" className="min-h-12 w-full sm:w-auto" loading={isSaving} onClick={handleNext}>
              SAVE &amp; CONTINUE
            </Button>
          ) : (
            <Button type="button" className="min-h-12 w-full sm:w-auto" loading={isSaving} onClick={handleFinish}>
              SAVE JOB CARD &amp; GO TO ESTIMATE
            </Button>
          )}
          </div>
        </article>
      </section>
    </ProtectedShell>
  );
}

function JobCardOverview({
  jobCardId,
  data,
  current,
  history,
  historyOpen,
  onHistoryOpenChange
}: {
  jobCardId: string;
  data: JobCardDetails;
  current: WorkflowJobCard | undefined;
  history: WorkflowJobCard[];
  historyOpen: boolean;
  onHistoryOpenChange: (open: boolean) => void;
}) {
  const links = [
    { label: "Open Estimate", href: `/estimates?open=${jobCardId}`, icon: FileText },
    { label: "Open Invoice", href: `/invoices?open=${jobCardId}`, icon: FileText },
    { label: "Open Payment", href: `/payments?open=${jobCardId}`, icon: FileText },
    { label: "Open Follow-up", href: `/followups?open=${jobCardId}`, icon: FileText }
  ];

  return (
    <section className="mx-auto grid max-w-4xl gap-5">
      <JobCardTopDetails
        data={data}
        history={history}
        historyOpen={historyOpen}
        onHistoryOpenChange={onHistoryOpenChange}
      />

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
          <Row label="Work Items" value={String(current?.workItems?.length ?? 0)} />
          <Row label="Parts" value={String(current?.partsItems?.length ?? 0)} />
          <Row label="Labour" value={String(current?.labourItems?.length ?? 0)} />
        </div>
      </article>

    </section>
  );
}

function JobCardTopDetails({
  data,
  isLoading = false,
  history = [],
  historyOpen = false,
  onHistoryOpenChange
}: {
  data: JobCardDetails | undefined;
  isLoading?: boolean;
  history?: WorkflowJobCard[];
  historyOpen?: boolean;
  onHistoryOpenChange?: (open: boolean) => void;
}) {
  return (
    <section className="sticky top-0 z-20 grid gap-2 border-b border-[var(--line)] bg-[var(--background)] pb-3 pt-1">
      <div className="flex items-start justify-between gap-x-4 gap-y-1 text-xs leading-5 text-slate-800">
        <p className="min-w-0"><span className="font-semibold text-slate-950">Customer:</span> {data?.customer.name ?? "-"}</p>
        <p className="shrink-0 whitespace-nowrap text-right text-[10px] font-semibold uppercase text-[var(--muted)]">
          Job Card: <span className="text-xs normal-case text-slate-950">{isLoading ? "Loading..." : data?.jobCardNumber ?? "-"}</span>
        </p>
      </div>

      <div className="flex items-start justify-between gap-x-4 gap-y-1 text-xs leading-5 text-slate-800">
        <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
          <p><span className="font-semibold text-slate-950">Phone:</span> {data?.customer.phone ?? "-"}</p>
          <p><span className="font-semibold text-slate-950">Vehicle:</span> {data?.vehicle.registrationNumber ?? "Not added yet"}</p>
          <p><span className="font-semibold text-slate-950">Chassis:</span> {data?.vehicle.chassisNumber ?? "-"}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="min-h-7 shrink-0 px-2 py-0.5 text-[10px]"
          disabled={!data?.vehicle.id}
          aria-pressed={historyOpen}
          onClick={() => onHistoryOpenChange?.(true)}
        >
          <Clock className="h-3 w-3" />
          HISTORY
        </Button>
      </div>
      {data ? <VehicleHistoryPanel data={data} history={history} open={historyOpen} onClose={() => onHistoryOpenChange?.(false)} /> : null}
    </section>
  );
}

function VehicleHistoryPanel({ data, history, open, onClose }: { data: JobCardDetails; history: WorkflowJobCard[]; open: boolean; onClose: () => void }) {
  if (!open) return null;

  const chronological = [...history]
    .filter((item) => item.vehicleId === data.vehicle.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/35" role="dialog" aria-modal="true" aria-label="Vehicle history">
      <aside className="ml-auto flex h-full w-full max-w-4xl flex-col bg-white shadow-2xl">
        <header className="sticky top-0 z-10 border-b border-[var(--line)] bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold tracking-normal text-slate-950">Vehicle History</h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data.vehicle.registrationNumber ?? "No registration"} / {data.vehicle.chassisNumber}
              </p>
            </div>
            <Button type="button" variant="ghost" className="min-h-9 px-2" onClick={onClose} aria-label="Close history">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="grid gap-4 overflow-y-auto p-4">
          <section className="grid gap-3 rounded-lg border border-[var(--line)] bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <Detail label="Customer" value={data.customer.name} />
            <Detail label="Phone" value={data.customer.phone} />
            <Detail label="Address" value={data.customer.address} />
            <Detail label="Vehicle" value={data.vehicle.registrationNumber ?? "Not added"} />
            <Detail label="Chassis" value={data.vehicle.chassisNumber} />
          </section>

          {chronological.length ? chronological.map((item, index) => (
            <article key={item.id} className="grid gap-4 rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] pb-3">
                <div>
                  <p className="text-xs font-bold uppercase text-[var(--muted)]">Service Visit {index + 1}</p>
                  <Link href={`/job-cards/${item.id}`} className="text-base font-bold text-[var(--primary)] hover:underline">
                    {item.jobCardNumber}
                  </Link>
                </div>
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{item.status}</span>
              </div>

              <section className="grid gap-2 text-sm sm:grid-cols-3">
                <Detail label="Date" value={formatDate(item.createdAt)} />
                <Detail label="Updated" value={formatDate(item.updatedAt)} />
                <Detail label="KM Reading" value={formatKm(item.odometerKm)} />
                <Detail label="Delivered" value={isDelivered(item) ? "Yes" : "No"} />
                <Detail label="Next Service" value={[formatDate(item.nextServiceAt), formatKm(item.nextServiceKm)].filter(Boolean).join(" / ") || "-"} />
              </section>

              <HistoryTextBlock title="Service / Complaints" rows={[
                ["Service Types", renderLines(formatGroupedServiceTypes(item.serviceTypes))],
                ["Fuel Level", item.fuelLevel],
                ["Vehicle Condition", item.vehicleCondition],
                ["Accessories", item.accessories],
                ["Photo URLs", item.photoUrls]
              ]} />

              <HistoryList title="Inspection Results" empty="No inspection results recorded." items={item.inspectionResults} render={(row) => (
                <p><strong>{row.itemName}</strong>: {row.condition ?? "-"}{row.notes ? ` - ${row.notes}` : ""}{row.photoUrl ? ` (${row.photoUrl})` : ""}</p>
              )} />
              <HistoryList title="Work Performed" empty="No work recorded." items={item.workItems} render={(row) => (
                <p><strong>{row.description || "Work"}</strong>{row.technician ? ` - ${row.technician}` : ""} / {row.status}{row.notes ? ` - ${row.notes}` : ""}</p>
              )} />
              <HistoryList title="Parts Used" empty="No parts recorded." items={item.partsItems} render={(row) => (
                <p><strong>{row.name || "Part"}</strong>{row.partNumber ? ` (${row.partNumber})` : ""} - Qty {row.qty} - {rupees.format(Number(row.price) || 0)}{row.notes ? ` - ${row.notes}` : ""}</p>
              )} />
              <HistoryList title="Labour" empty="No labour recorded." items={item.labourItems} render={(row) => (
                <p><strong>{row.description || "Labour"}</strong> - {rupees.format(Number(row.rate) || 0)}{row.notes ? ` - ${row.notes}` : ""}</p>
              )} />

              <HistoryTextBlock title="Estimate / Approval / Invoice / Payment" rows={[
                ["Estimate", `${rupees.format(Number(item.estimateAmount) || 0)}${item.estimateNotes ? ` - ${item.estimateNotes}` : ""}`],
                ["Approval", `${item.approvalStatus}${item.approvalNotes ? ` - ${item.approvalNotes}` : ""}`],
                ["Invoice", item.invoiceNumber ? `${item.invoiceNumber} / ${rupees.format(Number(item.invoiceAmount) || 0)}` : null],
                ["Payment", `${item.paymentStatus} / Paid ${rupees.format(Number(item.paidAmount) || 0)} / Balance ${rupees.format(Number(item.balanceAmount) || 0)}${item.paymentMode ? ` / ${item.paymentMode}` : ""}`],
                ["Delivery", item.deliveryNotes],
                ["Follow-up", [item.followUpType, formatDate(item.followUpAt), item.followUpNotes].filter(Boolean).join(" / ")],
                ["WhatsApp Reminder", formatDate(item.whatsappReminderAt)],
                ["Return Notes", item.returnNotes],
                ["Final Review", item.finalReviewNotes]
              ]} />
            </article>
          )) : (
            <p className="rounded-lg border border-[var(--line)] bg-white p-4 text-sm text-[var(--muted)]">No job card history found for this vehicle.</p>
          )}
        </div>
      </aside>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <p className="grid gap-1">
      <span className="text-xs font-bold uppercase text-[var(--muted)]">{label}</span>
      <span className="whitespace-pre-wrap text-sm font-semibold text-slate-900">{value || "-"}</span>
    </p>
  );
}

function HistoryTextBlock({ title, rows }: { title: string; rows: Array<[string, ReactNode]> }) {
  const visibleRows = rows.filter(([, value]) => value !== null && value !== undefined && value !== "");
  if (!visibleRows.length) return null;
  return (
    <section className="grid gap-2 text-sm">
      <h3 className="text-xs font-bold uppercase text-slate-500">{title}</h3>
      <div className="grid gap-2 rounded-md bg-slate-50 p-3">
        {visibleRows.map(([label, value]) => <Detail key={label} label={label} value={value} />)}
      </div>
    </section>
  );
}

function renderLines(lines: string[]) {
  return lines.length ? (
    <span className="grid gap-1">
      {lines.map((line) => <span key={line}>{line}</span>)}
    </span>
  ) : null;
}

function formatGroupedServiceTypes(value: string | null | undefined) {
  if (!value) return [];

  const groups: Array<{ service: string; issues: string[] }> = [];
  const plain: string[] = [];

  value.split(",").map((item) => item.trim()).filter(Boolean).forEach((item) => {
    const match = item.match(/^([^:]+):\s*(.+)$/);
    if (!match) {
      plain.push(item);
      return;
    }

    const service = match[1].trim();
    const issue = match[2].trim();
    const existing = groups.find((group) => group.service === service);
    if (existing) {
      existing.issues.push(issue);
    } else {
      groups.push({ service, issues: [issue] });
    }
  });

  return [
    ...plain,
    ...groups.map((group) => `${group.service}: ${group.issues.join(", ")}`)
  ];
}

function HistoryList<T>({ title, empty, items = [], render }: { title: string; empty: string; items?: T[]; render: (item: T) => ReactNode }) {
  return (
    <section className="grid gap-2 text-sm">
      <h3 className="text-xs font-bold uppercase text-slate-500">{title}</h3>
      <div className="grid gap-2 rounded-md bg-slate-50 p-3 text-slate-800">
        {items.length ? items.map((item, index) => <div key={index}>{render(item)}</div>) : <p className="text-[var(--muted)]">{empty}</p>}
      </div>
    </section>
  );
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : "";
}

function formatKm(value?: number | null) {
  return value === null || value === undefined ? "" : `${value} KM`;
}

function isDelivered(item: WorkflowJobCard) {
  return item.status === "DELIVERED" || Boolean(item.deliveredAt);
}

function WizardStepIndicator({ stepIndex, maxReached, onSelect }: { stepIndex: number; maxReached: number; onSelect: (i: number) => void }) {
  return (
    <nav aria-label="Job Card steps" className="w-full pb-1">
      <div className="grid grid-cols-[auto_1fr_auto_1fr_auto_1fr_auto_1fr_auto] items-center gap-x-1 sm:gap-x-2">
        {STEP_DEFS.map((step, index) => {
          const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "todo";
          const reachable = index <= maxReached;
          return (
            <Fragment key={step.key}>
              {index > 0 ? <span className="h-px min-w-6 bg-slate-300 sm:min-w-16" /> : null}
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(index)}
                aria-label={`Step ${index + 1}: ${step.label}`}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                  state === "current"
                    ? "bg-[var(--primary)] text-white"
                    : state === "done"
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-200 text-slate-500"
                } ${reachable ? "cursor-pointer hover:ring-2 hover:ring-teal-100 active:bg-slate-100" : "cursor-not-allowed"}`}
              >
                {state === "done" ? <Check className="h-3 w-3" /> : index + 1}
              </button>
            </Fragment>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-5 gap-2 text-center text-[11px] font-semibold leading-tight text-slate-600 sm:text-xs">
        {STEP_DEFS.map((step, index) => (
          <span key={step.key} className={index === stepIndex ? "text-[var(--primary)]" : ""}>{step.label}</span>
        ))}
      </div>
    </nav>
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
