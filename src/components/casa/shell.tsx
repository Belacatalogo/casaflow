import { Link, useRouterState } from "@tanstack/react-router";
import {
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  History,
  LayoutDashboard,
  Moon,
  Package,
  Search,
  Settings,
  ShoppingBasket,
  Store,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { applyTheme } from "@/lib/casa/storage";
import { useCasa } from "@/lib/casa/store";
import { Button } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Início", icon: LayoutDashboard, group: "Casa" },
  { to: "/lista", label: "Lista", icon: ShoppingBasket, group: "Casa" },
  { to: "/comprando", label: "Comprar", icon: Store, group: "Casa" },
  { to: "/catalogo", label: "Catálogo", icon: Package, group: "Casa" },
  { to: "/analises", label: "Análises", icon: ChartColumn, group: "Registros" },
  { to: "/historico", label: "Histórico", icon: History, group: "Registros" },
  { to: "/ajustes", label: "Ajustes", icon: Settings, group: "Registros" },
] as const;

function active(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to;
}

function isDesktop() {
  return window.matchMedia("(min-width: 1024px)").matches;
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const hydrate = useCasa((state) => state.hydrate);
  const error = useCasa((state) => state.error);
  const settings = useCasa((state) => state.settings);
  const ready = useCasa((state) => state.ready);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const updateSettings = useCasa((state) => state.updateSettings);
  const [override, setOverride] = useState<"open" | "closed" | null>(null);
  const [query, setQuery] = useState("");
  const pending = lines.filter((line) => line.monthKey === viewMonth && line.status === "pending").length;
  const house = ready ? settings.householdName : "CasaFlow";
  const initial = house.trim().charAt(0).toUpperCase() || "C";
  const dark = settings.theme === "dark";
  const visible = NAV.filter((item) => item.label.toLowerCase().includes(query.trim().toLowerCase()));

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

  useEffect(() => {
    if (override !== "open") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOverride(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [override]);

  function expand() {
    setOverride(isDesktop() ? null : "open");
  }

  function collapse() {
    setQuery("");
    setOverride(isDesktop() ? "closed" : null);
  }

  function follow() {
    if (!isDesktop()) {
      setQuery("");
      setOverride(null);
    }
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6">
        <h1 className="font-display text-3xl text-ink">CasaFlow</h1>
        <p className="text-pretty text-muted">{error}</p>
        <Button onClick={() => window.location.reload()}>Tentar de novo</Button>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-ink" data-menu={override ?? undefined}>
      <button type="button" className="menu-backdrop fixed inset-0 z-40 bg-hero/45" aria-label="Fechar menu" onClick={collapse} />

      <aside className="rail-mini glass-dock items-center px-2 py-3" aria-label="Principal">
        <Link to="/" aria-label="Início" className="grid size-11 place-items-center rounded-full bg-terra-fill font-display text-lg text-on-terra">
          C
        </Link>
        <button
          type="button"
          aria-label="Abrir menu"
          onClick={expand}
          className="mt-2 grid size-8 place-items-center rounded-full bg-white/15 text-white"
        >
          <ChevronRight className="size-4" />
        </button>
        <nav className="mt-3 flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-label={item.label}
                title={item.label}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "group relative grid size-11 place-items-center rounded-full",
                  on ? "bg-black/25 text-white" : "text-white/80 hover:bg-white/10",
                )}
              >
                <Icon className="size-5" />
                {item.to === "/comprando" && pending > 0 ? (
                  <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-gold" />
                ) : null}
                <span className="pointer-events-none absolute left-full ml-3 hidden rounded-full bg-hero px-3 py-1 text-xs text-on-hero opacity-0 group-hover:opacity-100 lg:block">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>
        <span className="mt-2 grid size-11 place-items-center rounded-full bg-white/15 font-display text-lg" aria-hidden>
          {initial}
        </span>
      </aside>

      <aside className="rail-full glass-dock" aria-label="Principal">
        <div className="flex items-center gap-3 px-4 pb-2 pt-4">
          <Link to="/" onClick={follow} className="grid size-11 shrink-0 place-items-center rounded-full bg-terra-fill font-display text-lg text-on-terra">
            C
          </Link>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-xl leading-none">CasaFlow</span>
            <span className="mt-1 block truncate text-xs text-white/70">Compras da casa</span>
          </span>
          <button type="button" aria-label="Fechar menu" onClick={collapse} className="grid size-9 place-items-center rounded-full bg-white text-hero">
            <ChevronLeft className="size-4" />
          </button>
        </div>
        <label className="relative mx-4 mt-3 block">
          <Search className="pointer-events-none absolute left-3 top-3 size-4 text-white/60" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar"
            className="h-11 w-full rounded-full border border-white/15 bg-white/10 pr-3 pl-10 text-sm text-white outline-none placeholder:text-white/50"
          />
        </label>
        <nav className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 pb-3">
          {visible.length === 0 ? <p className="px-3 text-sm text-white/70">Nada com esse nome.</p> : null}
          {(["Casa", "Registros"] as const).map((group) => {
            const items = visible.filter((item) => item.group === group);
            if (items.length === 0) return null;
            return (
              <div key={group}>
                <p className="px-3 pb-1 text-[11px] font-medium tracking-[0.16em] text-white/50 uppercase">{group}</p>
                <div className="flex flex-col gap-1">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const on = active(pathname, item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={follow}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "flex h-11 items-center gap-3 rounded-full px-3 text-sm font-medium",
                          on ? "bg-black/25 text-white" : "text-white/85 hover:bg-white/10",
                        )}
                      >
                        <Icon className="size-5 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.to === "/comprando" && pending > 0 ? (
                          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs tabular-nums text-gold">{pending}</span>
                        ) : null}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className="border-t border-white/15 px-3 py-3">
          <button
            type="button"
            role="switch"
            aria-checked={dark}
            onClick={() => updateSettings({ theme: dark ? "light" : "dark" })}
            className="flex h-11 w-full items-center gap-3 rounded-full px-3 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            <Moon className="size-5" />
            <span className="flex-1 text-left">Modo escuro</span>
            <span className={cn("relative h-6 w-11 rounded-full p-0.5", dark ? "bg-gold" : "bg-white/20")}>
              <span className={cn("block size-5 rounded-full bg-white transition-transform", dark && "translate-x-5")} />
            </span>
          </button>
          <div className="mt-1 flex items-center gap-3 px-3 py-2">
            <span className="grid size-10 place-items-center rounded-full bg-white/15 font-display text-lg">{initial}</span>
            <span className="min-w-0 truncate text-sm">{house}</span>
          </div>
        </div>
      </aside>

      <div className="shell-pad min-h-screen">
        <main className="mx-auto w-full max-w-5xl px-4 py-5 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
