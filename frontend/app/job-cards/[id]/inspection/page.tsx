"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, CheckCircle2, CircleAlert, RefreshCw } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { getInspection, saveInspection, type InspectionCondition, type InspectionRow } from "@/services/inspection";

const conditions: { value: InspectionCondition; label: string; className: string }[] = [
  { value: "GOOD", label: "GOOD", className: "has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 has-[:checked]:text-emerald-800" },
  { value: "ATTENTION", label: "ATTENTION", className: "has-[:checked]:border-amber-600 has-[:checked]:bg-amber-50 has-[:checked]:text-amber-800" },
  { value: "REPLACE", label: "REPLACE", className: "has-[:checked]:border-red-600 has-[:checked]:bg-red-50 has-[:checked]:text-red-800" }
];

export default function InspectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [rows, setRows] = useState<InspectionRow[]>([]);
  const [message, setMessage] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["inspection", params.id],
    queryFn: () => getInspection(params.id),
    enabled: Boolean(params.id)
  });
  const mutation = useMutation({
    mutationFn: () => saveInspection(params.id, rows),
    onSuccess: (saved) => {
      setRows(saved);
      setMessage("Inspection saved");
      router.push(`/job-cards/${params.id}#photos`);
    }
  });

  useEffect(() => {
    if (data) setRows(data);
  }, [data]);

  function updateRow(itemId: number, patch: Partial<InspectionRow>) {
    setRows((current) => current.map((row) => row.itemId === itemId ? { ...row, ...patch } : row));
  }

  const completed = rows.filter((row) => row.condition).length;

  return (
    <ProtectedShell title="Inspection">
      <section className="grid gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline" href={`/job-cards/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Job Card
            </Link>
            <p className="text-sm font-semibold uppercase text-[var(--primary)]">Job Card Inspection</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal text-slate-950">Vehicle Condition Check</h1>
          </div>
          <div className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-[var(--muted)]">Completed</p>
            <p className="text-2xl font-bold tracking-normal">{completed}/{rows.length}</p>
          </div>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">Loading inspection...</div>
        ) : (
          <form
            className="grid gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setMessage("");
              mutation.mutate();
            }}
          >
            {rows.map((row) => (
              <article key={row.itemId} className="rounded-lg border border-[var(--line)] bg-white p-4 shadow-sm">
                <div className="grid gap-4 xl:grid-cols-[220px_1fr_280px] xl:items-start">
                  <div className="flex items-center gap-3">
                    {row.condition === "GOOD" ? <CheckCircle2 className="h-5 w-5 text-emerald-700" /> : <CircleAlert className="h-5 w-5 text-slate-400" />}
                    <h2 className="text-base font-bold tracking-normal text-slate-950">{row.itemName}</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {conditions.map((condition) => (
                      <label key={condition.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 ${condition.className}`}>
                        <input className="sr-only" type="radio" name={`condition-${row.itemId}`} checked={row.condition === condition.value} onChange={() => updateRow(row.itemId, { condition: condition.value })} />
                        {condition.label}
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <label className="focus-ring flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      <Camera className="h-4 w-4" />
                      Photo
                      <input className="sr-only" type="file" accept="image/*" capture="environment" />
                    </label>
                    <button type="button" className="focus-ring rounded-md border border-[var(--line)] p-3 text-slate-600 hover:bg-slate-50" aria-label={`Reset ${row.itemName}`} onClick={() => updateRow(row.itemId, { condition: null, notes: "" })}>
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <label className="mt-4 grid gap-2 text-sm font-medium text-slate-800">
                  Notes
                  <input className="focus-ring min-h-11 rounded-md border border-[var(--line)] px-3 text-base" value={row.notes ?? ""} onChange={(event) => updateRow(row.itemId, { notes: event.target.value })} placeholder="Optional notes" />
                </label>
              </article>
            ))}
            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
            <div className="sticky bottom-0 border-t border-[var(--line)] bg-[#f7f8fa] py-4">
              <Button type="submit" loading={mutation.isPending} className="w-full sm:w-fit">
                SAVE INSPECTION
              </Button>
            </div>
          </form>
        )}
      </section>
    </ProtectedShell>
  );
}
