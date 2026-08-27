"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getGarageSettings, updateGarageSettings } from "@/services/settings";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  const { data, isLoading } = useQuery({ queryKey: ["garage-settings"], queryFn: getGarageSettings });

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setAddress(data.address ?? "");
    setGstin(data.gstin ?? "");
    setPhone(data.phone ?? "");
    setEmail(data.email ?? "");
  }, [data]);

  const mutation = useMutation({
    mutationFn: () => updateGarageSettings({ name, address, gstin, phone, email }),
    onSuccess: async () => {
      setMessage("Shop details saved");
      await queryClient.invalidateQueries({ queryKey: ["garage-settings"] });
    }
  });

  return (
    <ProtectedShell title="Settings">
      <section className="grid gap-5">
        <div className="rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm">
          <p className="text-sm font-semibold uppercase text-[var(--primary)]">Garage Configuration</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-slate-950">Shop Details</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            These details appear on generated Job Card, Estimate, and Invoice PDFs.
          </p>

          {isLoading ? (
            <p className="mt-4 text-sm text-[var(--muted)]">Loading...</p>
          ) : (
            <form
              className="mt-5 grid gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                setMessage("");
                mutation.mutate();
              }}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Input label="Shop / Garage Name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input label="GSTIN" value={gstin} onChange={(e) => setGstin(e.target.value.toUpperCase())} />
                <Input label="Phone Number" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <label className="grid gap-2 text-sm font-medium text-slate-800">
                Address
                <textarea
                  className="focus-ring min-h-24 rounded-md border border-[var(--line)] bg-white px-3 py-3 text-base text-slate-950"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </label>
              {message ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
              <Button type="submit" loading={mutation.isPending} className="w-full sm:w-fit">SAVE</Button>
            </form>
          )}
        </div>
      </section>
    </ProtectedShell>
  );
}
