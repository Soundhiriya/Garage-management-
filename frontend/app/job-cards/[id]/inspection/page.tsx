"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, Camera, CheckCircle2, CircleAlert, RefreshCw, Search, X } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [openItemId, setOpenItemId] = useState<number | null>(null);
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);
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

  function handlePhoto(itemId: number, file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateRow(itemId, { photoUrl: typeof reader.result === "string" ? reader.result : null });
    reader.readAsDataURL(file);
  }

  const completed = rows.filter((row) => row.condition).length;
  const filteredRows = rows.filter((row) => row.itemName.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <ProtectedShell title="Inspection" hidePageHeader>
      <section className="grid gap-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[var(--primary)] hover:underline" href={`/job-cards/${params.id}`}>
              <ArrowLeft className="h-4 w-4" />
              Back to Job Card
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">Vehicle Condition Check</h1>
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
            <label className="grid gap-2 rounded-lg border border-[var(--line)] bg-white p-3 text-sm font-semibold text-slate-900 shadow-sm">
              Search inspection...
              <span className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  className="focus-ring min-h-11 w-full rounded-md border border-[var(--line)] bg-white py-2 pl-10 pr-3 text-base font-normal text-slate-950"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search inspection..."
                />
              </span>
            </label>

            {filteredRows.map((row) => {
              const isOpen = openItemId === row.itemId;
              return (
                <article key={row.itemId} className={`rounded-lg border bg-white p-3 shadow-sm transition ${isOpen ? "border-teal-200" : "border-[var(--line)]"}`}>
                  <button
                    type="button"
                    className="focus-ring flex min-h-12 w-full items-center justify-between gap-3 rounded-md px-2 text-left"
                    onClick={() => setOpenItemId((current) => current === row.itemId ? null : row.itemId)}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {row.condition === "GOOD" ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" /> : <CircleAlert className="h-5 w-5 shrink-0 text-slate-400" />}
                      <span className="truncate text-base font-bold tracking-normal text-slate-950">{row.itemName}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">{row.condition ?? (row.photoUrl ? "PHOTO" : "")}</span>
                  </button>

                  {isOpen ? (
                    <div className="mt-3 grid gap-3">
                      <div className="grid gap-2 sm:grid-cols-4">
                        {conditions.map((condition) => (
                          <label key={condition.value} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-[var(--line)] px-3 text-sm font-bold text-slate-700 hover:bg-slate-50 ${condition.className}`}>
                            <input className="sr-only" type="radio" name={`condition-${row.itemId}`} checked={row.condition === condition.value} onChange={() => updateRow(row.itemId, { condition: condition.value })} />
                            {condition.label}
                          </label>
                        ))}
                        <label className="focus-ring flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                          <Camera className="h-4 w-4" />
                          Photo
                          <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(event) => handlePhoto(row.itemId, event.target.files?.[0])} />
                        </label>
                      </div>

                      {row.photoUrl ? (
                        <button type="button" className="w-fit overflow-hidden rounded-md border border-[var(--line)] bg-white p-1 shadow-sm" onClick={() => setPreview({ src: row.photoUrl!, title: row.itemName })}>
                          <img src={row.photoUrl} alt={`${row.itemName} inspection`} className="h-24 w-32 object-cover" />
                        </button>
                      ) : null}

                      <label className="grid gap-2 text-sm font-medium text-slate-800">
                        Notes
                        <input className="focus-ring min-h-11 rounded-md border border-[var(--line)] px-3 text-base" value={row.notes ?? ""} onChange={(event) => updateRow(row.itemId, { notes: event.target.value })} placeholder="Optional notes" />
                      </label>

                      <button type="button" className="focus-ring flex min-h-10 w-fit items-center gap-2 rounded-md border border-[var(--line)] px-3 text-sm font-semibold text-slate-600 hover:bg-slate-50" aria-label={`Reset ${row.itemName}`} onClick={() => updateRow(row.itemId, { condition: null, notes: "", photoUrl: null })}>
                        <RefreshCw className="h-4 w-4" />
                        Reset
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
            {filteredRows.length === 0 ? (
              <p className="rounded-lg border border-[var(--line)] bg-white px-4 py-3 text-sm text-[var(--muted)] shadow-sm">No inspection items found.</p>
            ) : null}
            {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
            <div className="sticky bottom-0 border-t border-[var(--line)] bg-[#f7f8fa] py-4">
              <Button type="submit" loading={mutation.isPending} className="w-full sm:w-fit">
                SAVE INSPECTION
              </Button>
            </div>
          </form>
        )}
      </section>
      {preview ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/80 p-4" onClick={() => setPreview(null)}>
          <div className="max-h-[90dvh] w-full max-w-3xl overflow-hidden rounded-lg bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] px-4 py-3">
              <p className="text-sm font-bold text-slate-950">{preview.title}</p>
              <button type="button" className="focus-ring rounded-md p-2 text-slate-600 hover:bg-slate-100" onClick={() => setPreview(null)} aria-label="Close preview">
                <X className="h-5 w-5" />
              </button>
            </div>
            <img src={preview.src} alt={preview.title} className="max-h-[78dvh] w-full object-contain" />
          </div>
        </div>
      ) : null}
    </ProtectedShell>
  );
}
