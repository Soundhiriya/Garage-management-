"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BarChart3, Car, ClipboardCheck, CreditCard, FileText, LayoutDashboard, LogOut, Menu, Settings, UserRound, Wrench, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { logout, me } from "@/services/auth";

type NavItem = [string, string, typeof LayoutDashboard];

const adminManagerNav: NavItem[] = [
  ["Dashboard", "/dashboard", LayoutDashboard],
  ["Vehicle Entry", "/register", ClipboardCheck],
  ["Customers", "/customers", UserRound],
  ["Vehicles", "/vehicles", Car],
  ["Job Cards", "/job-cards", Wrench],
  ["Estimates", "/estimates", FileText],
  ["Invoices", "/invoices", FileText],
  ["Payments", "/payments", CreditCard],
  ["Follow-ups", "/followups", ClipboardCheck],
  ["Reports", "/reports", BarChart3]
];

const technicianNav: NavItem[] = [
  ["Dashboard", "/technician/dashboard", LayoutDashboard],
  ["Assigned Jobs", "#", Wrench],
  ["Inspections", "#", ClipboardCheck],
  ["Work Updates", "#", FileText],
  ["Photos", "#", FileText]
];

export function ProtectedShell({ children, title = "Dashboard", hidePageHeader = false }: { children: React.ReactNode; title?: string; hidePageHeader?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [drawerMounted, setDrawerMounted] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { data: user, isLoading, isError } = useQuery({ queryKey: ["me"], queryFn: me, retry: false });

  useEffect(() => {
    if (isError) {
      router.replace("/login");
    }
  }, [isError, router]);

  useEffect(() => {
    if (!drawerMounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [drawerMounted]);

  function openDrawer() {
    setDrawerMounted(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setDrawerOpen(true)));
  }

  function closeDrawer() {
    setDrawerOpen(false);
    window.setTimeout(() => setDrawerMounted(false), 220);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  const navItems = user?.role === "TECHNICIAN" ? technicianNav : adminManagerNav;

  function isActive(href: string) {
    return href !== "#" && (pathname === href || pathname?.startsWith(`${href}/`));
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header
        className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-[var(--line)] bg-white/95 px-4 shadow-sm backdrop-blur md:hidden print:hidden"
        style={{ paddingTop: "env(safe-area-inset-top)", height: "calc(3.5rem + env(safe-area-inset-top))" }}
      >
        <div className="flex items-center gap-2 font-bold text-slate-900">
          <Wrench className="h-5 w-5 text-[var(--primary)]" />
          GARAGE
        </div>
        <button
          type="button"
          className="focus-ring -mr-2 flex h-11 w-11 items-center justify-center rounded-md active:bg-slate-100"
          aria-label="Open navigation"
          aria-expanded={drawerOpen}
          onClick={openDrawer}
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {drawerMounted ? (
        <div className="fixed inset-0 z-40 md:hidden print:hidden">
          <div
            className={`absolute inset-0 bg-slate-950/50 transition-opacity duration-200 ${drawerOpen ? "opacity-100" : "opacity-0"}`}
            onClick={closeDrawer}
          />
          <aside
            className={`absolute inset-y-0 left-0 flex w-[82vw] max-w-80 flex-col bg-white shadow-2xl transition-transform duration-[220ms] ease-out ${drawerOpen ? "translate-x-0" : "-translate-x-full"}`}
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--brand-ink)]">
                  <Wrench className="h-5 w-5 text-teal-200" />
                </div>
                <div>
                  <p className="text-sm font-bold leading-tight text-slate-950">GARAGE</p>
                  <p className="text-[11px] font-medium leading-tight text-[var(--muted)]">Service operations console</p>
                </div>
              </div>
              <button type="button" className="focus-ring flex h-10 w-10 items-center justify-center rounded-md text-slate-500 active:bg-slate-100" aria-label="Close navigation" onClick={closeDrawer}>
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="grid flex-1 auto-rows-min gap-1 overflow-y-auto p-3">
              {navItems.map(([item, href, Icon]) => {
                const active = isActive(href);
                return (
                  <Link
                    key={item}
                    href={href}
                    onClick={closeDrawer}
                    className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold transition ${
                      active ? "bg-teal-50 text-[var(--primary-dark)]" : "text-slate-700 active:bg-slate-100"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${active ? "text-[var(--primary)]" : "text-slate-400"}`} />
                    {item}
                  </Link>
                );
              })}
            </nav>

            <div className="grid gap-1 border-t border-[var(--line)] p-3">
              <Link
                href="/settings"
                onClick={closeDrawer}
                className={`flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-base font-semibold transition ${
                  isActive("/settings") ? "bg-teal-50 text-[var(--primary-dark)]" : "text-slate-700 active:bg-slate-100"
                }`}
              >
                <Settings className={`h-5 w-5 ${isActive("/settings") ? "text-[var(--primary)]" : "text-slate-400"}`} />
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  closeDrawer();
                  handleLogout();
                }}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 text-left text-base font-semibold text-slate-700 transition active:bg-red-50 active:text-[var(--danger)]"
              >
                <LogOut className="h-5 w-5 text-slate-400" />
                Logout
              </button>
            </div>
          </aside>
        </div>
      ) : null}

      <div className="mx-auto grid max-w-[1600px] md:grid-cols-[260px_1fr]">
        <aside className="hidden min-h-screen border-r border-[var(--line)] bg-white p-5 md:block print:hidden">
          <div className="mb-8 rounded-lg bg-[var(--brand-ink)] px-4 py-4 text-white shadow-sm">
            <div className="flex items-center gap-2 text-lg font-bold">
              <Wrench className="h-6 w-6 text-teal-200" />
              GARAGE
            </div>
            <p className="mt-2 text-xs font-medium text-slate-300">Service operations console</p>
          </div>
          <nav className="grid gap-1">
            {navItems.map(([item, href, Icon]) => {
              const active = isActive(href);
              return (
                <Link
                  key={item}
                  href={href}
                  className={`group flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                    active ? "bg-teal-50 text-[var(--primary-dark)]" : "text-slate-700 hover:bg-teal-50 hover:text-[var(--primary-dark)]"
                  }`}
                >
                  <Icon className={`h-4 w-4 transition ${active ? "text-[var(--primary)]" : "text-slate-400 group-hover:text-[var(--primary)]"}`} />
                  {item}
                </Link>
              );
            })}
          </nav>
          <div className="mt-8 grid gap-1 border-t border-[var(--line)] pt-4">
            <Link
              href="/settings"
              className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition ${
                isActive("/settings") ? "bg-teal-50 text-[var(--primary-dark)]" : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              <Settings className={`h-4 w-4 ${isActive("/settings") ? "text-[var(--primary)]" : "text-slate-400"}`} />
              Settings
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-red-50 hover:text-[var(--danger)]"
            >
              <LogOut className="h-4 w-4 text-slate-400" />
              Logout
            </button>
          </div>
        </aside>
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          {!hidePageHeader ? (
            <div className="mb-6 border-b border-[var(--line)] pb-5 print:hidden">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--primary-dark)]">{isLoading ? "Loading account" : user?.role}</p>
              <h1 className="mt-1 text-2xl font-bold tracking-normal text-slate-950 sm:text-3xl">{title}</h1>
            </div>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
