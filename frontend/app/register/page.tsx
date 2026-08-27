"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Car, Search } from "lucide-react";
import { ProtectedShell } from "@/components/layout/protected-shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { registerSchema, type RegisterInput } from "@/schemas/register";
import { registerVehicle, searchVehicleEntry, type VehicleSearchResult } from "@/services/register";

function toUpper(event: { target: HTMLInputElement }) {
  const cursor = event.target.selectionStart;
  event.target.value = event.target.value.toUpperCase();
  if (cursor !== null) event.target.setSelectionRange(cursor, cursor);
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<VehicleSearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<any>({ resolver: zodResolver(registerSchema) });

  async function handleSearch() {
    setServerError("");
    setSearched(true);
    const result = await searchVehicleEntry(searchQuery.toUpperCase());
    setSearchResult(result);
    if (result) {
      setValue("chassisNumber", result.chassisNumber);
      setValue("registrationNumber", result.registrationNumber ?? "");
      setValue("customerName", result.customerName);
      setValue("phoneNumber", result.customerPhone);
      setValue("address", result.customerAddress);
    }
  }

  async function onSubmit(input: RegisterInput) {
    setServerError("");
    try {
      const result = await registerVehicle(input);
      router.push(`/job-cards/${result.jobCardId}`);
    } catch (error: any) {
      setServerError(error.response?.data?.message ?? "Could not create job card. Please try again.");
    }
  }

  function errorMessage(field: string) {
    const message = errors[field]?.message;
    return typeof message === "string" ? message : undefined;
  }

  return (
    <ProtectedShell title="Vehicle Entry">
      <section className="grid gap-5">
        <div className="app-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-[var(--primary)]" />
            <h2 className="text-lg font-bold tracking-normal text-slate-950">Search Existing Vehicle</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <Input label="Vehicle Number" className="uppercase" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value.toUpperCase())} placeholder="TN72BS1166" />
            <Button type="button" className="self-end" onClick={handleSearch}>SEARCH</Button>
          </div>
          {searchResult ? (
            <div className="mt-4 grid gap-3 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm md:grid-cols-3">
              <Info label="Customer" value={searchResult.customerName} />
              <Info label="Phone" value={searchResult.customerPhone} />
              <Info label="Vehicle Number" value={searchResult.registrationNumber || searchResult.chassisNumber} />
              <Info label="Chassis Number" value={searchResult.chassisNumber} />
              <Info label="Last Service Date" value={searchResult.lastServiceDate ? new Date(searchResult.lastServiceDate).toLocaleDateString() : "No previous service"} />
              <Info label="Last KM" value={searchResult.lastKm != null ? `${searchResult.lastKm.toLocaleString("en-IN")} KM` : "-"} />
              <Info label="Last Job Card" value={searchResult.lastJobCardNumber ?? "-"} />
            </div>
          ) : searched ? <p className="mt-3 text-sm text-[var(--muted)]">Vehicle not found. Create a new vehicle entry below.</p> : null}
        </div>

        <form className="app-card grid gap-5 p-5 sm:p-6" autoComplete="off" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <p className="text-sm font-bold uppercase text-[var(--primary-dark)]">Register</p>
            <h2 className="mt-1 text-xl font-bold tracking-normal text-slate-950">Customer and Vehicle</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Input
              label="Vehicle Number"
              className="uppercase"
              error={errorMessage("registrationNumber")}
              {...register("registrationNumber", {
                setValueAs: (value) => String(value).toUpperCase(),
                onChange: toUpper
              })}
            />
            <Input
              label="Chassis Number"
              className="uppercase"
              error={errorMessage("chassisNumber")}
              {...register("chassisNumber", {
                setValueAs: (value) => String(value).toUpperCase(),
                onChange: toUpper
              })}
            />
            <Input label="Customer Name" error={errorMessage("customerName")} {...register("customerName")} />
            <Input label="Phone Number" inputMode="tel" error={errorMessage("phoneNumber")} {...register("phoneNumber")} />
            <div className="md:col-span-2">
              <Input label="Address" error={errorMessage("address")} {...register("address")} />
            </div>
          </div>

          {serverError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-[var(--danger)]">{serverError}</p> : null}
          <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end border-t border-[var(--line)] bg-white p-5 sm:static sm:m-0 sm:border-0 sm:p-0">
            <Button type="submit" loading={isSubmitting} className="w-full sm:w-auto">
              <Car className="h-4 w-4" />
              REGISTER / CONTINUE
            </Button>
          </div>
        </form>
      </section>
    </ProtectedShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase text-teal-800">{label}</p>
      <p className="mt-1 font-bold text-slate-950">{value}</p>
    </div>
  );
}
