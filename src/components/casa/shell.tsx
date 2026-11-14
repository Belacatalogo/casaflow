import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChartColumn,
  ChevronLeft,
  History,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { applyTheme } from "@/lib/casa/storage";
import { useCasa } from "@/lib/casa/store";
import { Button, Modal } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Início", icon: LayoutDashboard },
  { to: "/lista", label: "Lista", icon: ShoppingBasket },
  { to: "/comprando", label: "Comprar", icon: Store },
  { to: "/catalogo", label: "Catálogo", icon: Package },
  { to: "/analises", label: "Análises", icon: ChartColumn },
  { to: "/historico", label: "Histórico", icon: History },
  { to: "/ajustes", label: "Ajustes", icon: Settings },
] as const;

type NavTo = (typeof NAV)[number]["to"];

const MOBILE: NavTo[] = ["/", "/lista", "/comprando", "/analises"];
const MORE: NavTo[] = ["/catalogo", "/historico", "/ajustes"];

function active(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hydrate = useCasa((state) => state.hydrate);
  const error = useCasa((state) => state.error);
  const settings = useCasa((state) => state.settings);
  const ready = useCasa((state) => state.ready);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const [more, setMore] = useState(false);
  const focus = pathname === "/comprando";
  const pending = lines.filter((line) => line.monthKey === viewMonth && line.status === "pending").length;

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!ready || settings.theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [ready, settings.theme]);

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="font-display text-3xl text-ink">CasaFlow</h1>
        <p className="text-pretty text-muted">{error}</p>
        <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
      </main>
    );
  }

  if (focus) {
    return (
      <div className="min-h-screen bg-bg text-ink">
        <header className="sticky top-0 z-30 border-b border-line bg-bg px-4 py-3">
          <Link to="/lista" className="inline-flex h-11 items-center gap-1 text-sm font-medium text-ink">
            <ChevronLeft className="size-5" />
            Voltar à lista
          </Link>
        </header>
        <main className="mx-auto w-full max-w-lg px-4 py-5">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface lg:flex">
        <Link to="/" className="flex items-center gap-3 px-5 pb-2 pt-6">
          <span className="grid size-11 place-items-center rounded-2xl bg-hero font-display text-xl text-gold">C</span>
          <span>
            <span className="block font-display text-xl leading-none text-ink">CasaFlow</span>
            <span className="mt-1 block text-xs text-muted">Compras da casa</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Principal">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium",
                  on ? "bg-terra-soft text-terra-deep" : "text-muted hover:bg-sunken hover:text-ink",
                )}
              >
                <Icon className="size-5" />
                <span className="flex-1">{item.label}</span>
                {item.to === "/comprando" && pending > 0 ? (
                  <span className="rounded-full bg-gold-soft px-2 py-0.5 text-xs tabular-nums text-gold-deep">{pending}</span>
                ) : null}
              </Link>
            );
          })}
        </nav>
        <p className="px-5 pb-6 text-sm text-muted">{ready ? settings.householdName : "CasaFlow"}</p>
      </aside>

      <div className="lg:pl-60">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-bg px-4 py-3 lg:hidden">
          <Link to="/" className="font-display text-xl text-ink">
            CasaFlow
          </Link>
          <span className="text-sm text-muted">{ready ? settings.householdName : ""}</span>
        </header>
        <main className="mx-auto w-full max-w-5xl px-4 py-5 pb-nav lg:px-8 lg:py-8 lg:pb-10">{children}</main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden" aria-label="Principal">
        <ul className="grid grid-cols-5">
          {MOBILE.map((to) => {
            const item = NAV.find((entry) => entry.to === to)!;
            const Icon = item.icon;
            const on = active(pathname, to);
            return (
              <li key={to}>
                <Link to={to} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-xs", on ? "text-terra-deep" : "text-muted")}>
                  <Icon className="size-5" />
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              className={cn(
                "flex h-16 w-full flex-col items-center justify-center gap-1 text-xs",
                MORE.some((to) => active(pathname, to)) ? "text-terra-deep" : "text-muted",
              )}
              onClick={() => setMore(true)}
            >
              <Settings className="size-5" />
              Mais
            </button>
          </li>
        </ul>
      </nav>

      <Modal open={more} onOpenChange={setMore} title="Mais" description="Catálogo, histórico e ajustes da casa.">
        <div className="flex flex-col gap-2">
          {MORE.map((to) => {
            const item = NAV.find((entry) => entry.to === to)!;
            const Icon = item.icon;
            return (
              <Link
                key={to}
                to={to}
                onClick={() => setMore(false)}
                className="flex h-12 items-center gap-3 rounded-2xl px-3 text-ink hover:bg-sunken"
              >
                <Icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
