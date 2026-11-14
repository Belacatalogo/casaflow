import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MonthSwitcher, PageIntro, Reveal } from "@/components/casa/chrome";
import { CategoryGlyph } from "@/components/casa/icons";
import { AddDialog, BuyDialog, PlanDialog } from "@/components/casa/dialogs";
import { Button, Card, EmptyState, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatMoney, formatQty, monthTitle } from "@/lib/casa/format";
import { lineActual, lineEstimate, summarizeMonth } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";
import type { ShopLine } from "@/lib/casa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/lista")({
  head: () => ({ meta: [{ title: "Lista · CasaFlow" }] }),
  component: ListaPage,
});

function ListaPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Lista />;
}

function Lista() {
  const categories = useCasa((state) => state.categories);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const settings = useCasa((state) => state.settings);
  const setStatus = useCasa((state) => state.setStatus);
  const generateMonth = useCasa((state) => state.generateMonth);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState<ShopLine | null>(null);
  const [editing, setEditing] = useState<ShopLine | null>(null);
  const totals = summarizeMonth(lines, viewMonth, settings.monthlyBudget);
  const mine = useMemo(
    () =>
      lines
        .filter((line) => line.monthKey === viewMonth)
        .filter((line) => line.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [lines, viewMonth, query],
  );
  const ordered = [...categories].sort((a, b) => a.order - b.order);
  const skipped = mine.filter((line) => line.status === "skipped");

  return (
    <Reveal>
      <PageIntro
        eyebrow="Lista"
        title={monthTitle(viewMonth)}
        lede={`${totals.boughtCount} de ${totals.count} já comprados. Previsto: ${formatMoney(totals.estimatedAll)}.`}
        extra={<MonthSwitcher />}
      />
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted" />
          <input className={cn(fieldClass, "pl-10")} placeholder="Buscar na lista" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Adicionar
        </Button>
        <Button asChild variant="secondary">
          <Link to="/comprando">Modo compra</Link>
        </Button>
      </div>

      {mine.filter((line) => line.status !== "skipped").length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={query ? "Nada com esse nome" : "Lista vazia"}
            detail={query ? "Tente outro nome ou cadastre o produto." : "Toque em montar a lista para trazer o que a casa compra todo mês."}
            action={
              query ? null : (
                <Button onClick={() => generateMonth(viewMonth)}>Montar lista</Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {ordered.map((category) => {
            const rows = mine.filter((line) => line.categoryId === category.id && line.status !== "skipped");
            if (rows.length === 0) return null;
            return (
              <Card key={category.id} className="py-2">
                <div className="flex items-center gap-2 px-1 py-2">
                  <span className="grid size-9 place-items-center rounded-2xl bg-sunken text-ink">
                    <CategoryGlyph name={category.icon} className="size-4" />
                  </span>
                  <h2 className="font-medium text-ink">{category.name}</h2>
                </div>
                <ul>
                  {rows.map((line) => {
                    const bought = line.status === "bought";
                    const value = bought ? lineActual(line) : lineEstimate(line);
                    return (
                      <li key={line.id} className="flex items-center gap-2 border-t border-line py-2">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={bought}
                          aria-label={bought ? `Desfazer ${line.name}` : `Registrar ${line.name}`}
                          className={cn(
                            "grid size-11 shrink-0 place-items-center rounded-full border",
                            bought ? "border-terra-fill bg-terra-fill text-on-terra" : "border-line text-transparent",
                          )}
                          onClick={() => (bought ? setStatus(line.id, "pending") : setBuying(line))}
                        >
                          <Check className="size-4" />
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className={cn("truncate font-medium", bought ? "text-muted" : "text-ink")}>{line.name}</p>
                          <p className="text-sm text-muted">
                            {formatQty(bought ? line.qtyBought : line.qtyPlanned)} {line.unit}
                            {line.store ? ` · ${line.store}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="tabular-nums font-medium text-ink">{formatMoney(value)}</p>
                          <p className="text-xs text-muted">{bought ? "pago" : "estimado"}</p>
                        </div>
                        <button type="button" className="grid size-11 place-items-center rounded-full text-muted hover:bg-sunken" aria-label={`Editar ${line.name}`} onClick={() => (bought ? setBuying(line) : setEditing(line))}>
                          <Pencil className="size-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      {skipped.length > 0 ? (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-muted">Não vou comprar ({skipped.length})</summary>
          <ul className="mt-2">
            {skipped.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 py-2">
                <span className="text-muted">{line.name}</span>
                <Button variant="ghost" onClick={() => setStatus(line.id, "pending")}>
                  Trazer de volta
                </Button>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <AddDialog open={adding} onOpenChange={setAdding} />
      <BuyDialog line={buying} onOpenChange={(open) => !open && setBuying(null)} />
      <PlanDialog line={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </Reveal>
  );
}
