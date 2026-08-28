"use client";

import { useRouter } from "next/navigation";
import type { ChangeEvent } from "react";
import { useRef, useState } from "react";
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

function limitPhoneNumber(event: { target: HTMLInputElement }) {
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10);
}

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState<VehicleSearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const latestSearchId = useRef(0);
  const {
    register,
    handleSubmit,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting }
  } = useForm<any>({ resolver: zodResolver(registerSchema) });

  function clearVehicleDetails(registrationNumber = "") {
    setSearchResult(null);
    setValue("registrationNumber", registrationNumber, { shouldValidate: false });
    setValue("chassisNumber", "", { shouldValidate: false });
    setValue("customerName", "", { shouldValidate: false });
    setValue("phoneNumber", "", { shouldValidate: false });
    setValue("address", "", { shouldValidate: false });
    clearErrors(["registrationNumber", "chassisNumber", "customerName", "phoneNumber", "address"]);
  }

  function handleSearchQueryChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = event.target.value.toUpperCase();
    setSearchQuery(nextValue);
    latestSearchId.current += 1;
    setSearched(false);
    setServerError("");
    clearVehicleDetails(nextValue.trim() ? nextValue : "");
  }

  async function handleSearch() {
    const normalizedQuery = searchQuery.trim().toUpperCase();
    const searchId = latestSearchId.current + 1;
    latestSearchId.current = searchId;
    setServerError("");
    clearVehicleDetails(normalizedQuery);
    if (!normalizedQuery) {
      setSearched(false);
      return;
    }
    setSearched(true);
    const result = await searchVehicleEntry(normalizedQuery);
    if (searchId !== latestSearchId.current) return;
    setSearchResult(result);
    if (result) {
      setValue("chassisNumber", result.chassisNumber);
      setValue("registrationNumber", result.registrationNumber ?? normalizedQuery);
      setValue("customerName", result.customerName);
      setValue("phoneNumber", result.customerPhone);
      setValue("address", result.customerAddress);
    } else {
      setValue("registrationNumber", normalizedQuery);
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
            <Input label="Vehicle Number" className="uppercase" value={searchQuery} onChange={handleSearchQueryChange} placeholder="TN72BS1166" />
            <Button type="button" className="self-end" onClick={handleSearch}>SEARCH</Button>
          </div>
          {searchResult ? (
            <div
              role={searchResult.lastJobCardId ? "button" : undefined}
              tabIndex={searchResult.lastJobCardId ? 0 : undefined}
              onClick={() => {
                if (searchResult.lastJobCardId) router.push(`/job-cards/${searchResult.lastJobCardId}`);
              }}
              onKeyDown={(event) => {
                if (searchResult.lastJobCardId && (event.key === "Enter" || event.key === " ")) {
                  event.preventDefault();
                  router.push(`/job-cards/${searchResult.lastJobCardId}`);
                }
              }}
              className={`mt-4 grid gap-3 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm md:grid-cols-3 ${searchResult.lastJobCardId ? "cursor-pointer transition hover:border-teal-400 hover:bg-teal-100 focus-ring" : ""}`}
            >
              <Info label="Customer" value={searchResult.customerName} />
              <Info label="Phone" value={searchResult.customerPhone} />
              <Info label="Vehicle Number" value={searchResult.registrationNumber || searchResult.chassisNumber} />
              <Info label="Chassis Number" value={searchResult.chassisNumber} />
              <Info label="Last Service Date" value={searchResult.lastServiceDate ? new Date(searchResult.lastServiceDate).toLocaleDateString() : "No previous service"} />
              <Info label="Last KM" value={searchResult.lastKm != null ? `${searchResult.lastKm.toLocaleString("en-IN")} KM` : "-"} />
              <Info label="Last Job Card" value={searchResult.lastJobCardNumber ?? "-"} />
              {searchResult.lastJobCardId ? (
                <p className="md:col-span-3 text-xs font-semibold uppercase text-teal-800">Click to view this vehicle's details</p>
              ) : null}
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
            <Input
              label="Phone Number"
              inputMode="numeric"
              maxLength={10}
              error={errorMessage("phoneNumber")}
              {...register("phoneNumber", {
                onChange: limitPhoneNumber
              })}
            />
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
