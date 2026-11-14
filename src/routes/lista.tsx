import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { MonthSwitcher, ModeSwitch, Reveal } from "@/components/casa/chrome";
import { CategoryGlyph } from "@/components/casa/icons";
import { AddDialog, BuyDialog, PlanDialog, PurchaseDialog } from "@/components/casa/dialogs";
import { ReceiptDialog } from "@/components/casa/receipt-dialog";
import { Button, Card, EmptyState, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatMoney, formatQty } from "@/lib/casa/format";
import { lineActual, summarizeMonth } from "@/lib/casa/logic";
import { adviseLine, linesForMode } from "@/lib/casa/modes";
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
  const products = useCasa((state) => state.products);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const settings = useCasa((state) => state.settings);
  const updateLine = useCasa((state) => state.updateLine);
  const setStatus = useCasa((state) => state.setStatus);
  const generateMonth = useCasa((state) => state.generateMonth);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [spent, setSpent] = useState(false);
  const [spentName, setSpentName] = useState("");
  const [scan, setScan] = useState(false);
  const [buying, setBuying] = useState<ShopLine | null>(null);
  const [editing, setEditing] = useState<ShopLine | null>(null);
  const now = useMemo(() => new Date(), []);
  const mode = settings.listMode ?? "completa";
  const scoped = useMemo(() => linesForMode(lines, products, mode, now), [lines, products, mode, now]);
  const totals = summarizeMonth(scoped, viewMonth, settings.monthlyBudget);
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
  const active = mine.filter((line) => line.status !== "skipped");
  const adviceFor = (line: ShopLine) => adviseLine(line, products.find((product) => product.id === line.productId), lines, mode, now);
  const shown = active.filter((line) => line.status !== "pending" || adviceFor(line).show);
  const waiting = active.filter((line) => line.status === "pending" && !adviceFor(line).show);
  const hasRecurring = products.some((product) => product.recurring);
  const done = totals.count > 0 ? Math.round((totals.boughtCount / totals.count) * 100) : 0;

  return (
    <Reveal>
      <header>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Lista</p>
        {totals.count > 0 ? (
          <>
            <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">
              {totals.boughtCount} de {totals.count}
            </h1>
            <p className="mt-2 text-sm text-muted">Previsto {formatMoney(totals.estimatedAll)}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sunken">
              <div className="h-full rounded-full bg-terra" style={{ width: `${done}%` }} />
            </div>
          </>
        ) : (
          <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">Nada neste mês</h1>
        )}
        <div className="mt-4 rounded-full bg-sunken">
          <MonthSwitcher className="w-full" titleClassName="min-w-0 flex-1 truncate px-1 text-base sm:text-lg" />
        </div>
        <div className="mt-3">
          <ModeSwitch />
        </div>
      </header>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-3 size-5 text-muted" />
        <input className={cn(fieldClass, "rounded-full pl-10")} placeholder="Buscar na lista" value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Button onClick={() => { setSpentName(""); setSpent(true); }}>Comprei agora</Button>
        <Button variant="secondary" onClick={() => setScan(true)}>
          Escanear nota
        </Button>
        <Button variant="secondary" onClick={() => setAdding(true)}>
          <Plus className="size-4" />
          Adicionar
        </Button>
        <Button asChild variant="secondary">
          <Link to="/comprando">Modo compra</Link>
        </Button>
      </div>

      {shown.length === 0 && waiting.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={query ? "Nada com esse nome" : "Lista vazia"}
            detail={
              query
                ? "Tente outro nome ou cadastre o produto."
                : hasRecurring
                  ? "Monte a lista com o que se repete todo mês, ou adicione um item."
                  : "Cadastre o primeiro produto. Depois a lista do mês se monta sozinha."
            }
            action={
              query ? null : hasRecurring ? (
                <Button onClick={() => generateMonth(viewMonth)}>Montar lista</Button>
              ) : (
                <Button asChild>
                  <Link to="/catalogo">Cadastrar produto</Link>
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {ordered.map((category) => {
            const rows = shown.filter((line) => line.categoryId === category.id);
            if (rows.length === 0) return null;
            const categoryTotal = rows.reduce((sum, line) => {
              const advice = line.status === "pending" ? adviceFor(line) : null;
              const qty = line.status === "bought" ? line.qtyBought : (advice?.qty ?? line.qtyPlanned);
              return sum + (line.status === "bought" ? lineActual(line) : qty * line.estimatedUnitPrice);
            }, 0);
            return (
              <Card key={category.id} className="overflow-hidden rounded-[2rem] p-0 sm:p-0">
                <div className="flex items-center gap-2 px-4 py-3">
                  <span className="grid size-9 place-items-center rounded-full bg-sunken text-ink">
                    <CategoryGlyph name={category.icon} className="size-4" />
                  </span>
                  <h2 className="min-w-0 flex-1 truncate font-medium text-ink">{category.name}</h2>
                  <span className="shrink-0 text-sm tabular-nums text-muted">{formatMoney(categoryTotal)}</span>
                </div>
                <ul>
                  {rows.map((line) => {
                    const bought = line.status === "bought";
                    const advice = bought ? null : adviceFor(line);
                    const qty = bought ? line.qtyBought : (advice?.qty ?? line.qtyPlanned);
                    const value = bought ? lineActual(line) : qty * line.estimatedUnitPrice;
                    return (
                      <li key={line.id} className="flex items-center gap-1 border-t border-line px-2 py-1.5">
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
                          <div className="flex items-baseline justify-between gap-2">
                            <p className={cn("truncate font-medium", bought ? "text-muted line-through decoration-line" : "text-ink")}>{line.name}</p>
                            <p className={cn("shrink-0 tabular-nums", bought ? "text-muted" : "font-medium text-ink")}>{formatMoney(value)}</p>
                          </div>
                          <p className="truncate text-sm text-muted">
                            {formatQty(qty)} {line.unit}
                            {line.store ? ` · ${line.store}` : ""}
                            {bought ? " · pago" : ""}
                          </p>
                          {advice && advice.qty !== line.qtyPlanned ? <p className="text-sm text-gold-deep">{advice.reason}</p> : null}
                        </div>
                        <button
                          type="button"
                          className="grid size-11 shrink-0 place-items-center rounded-full text-muted hover:bg-sunken"
                          aria-label={`Editar ${line.name}`}
                          onClick={() => (bought ? setBuying(line) : setEditing(line))}
                        >
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

      {waiting.length > 0 ? (
        <Card className="mt-3 rounded-[2rem]">
          <h2 className="font-medium text-ink">Pode esperar</h2>
          <ul className="mt-2">
            {waiting.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
                <span className="min-w-0">
                  <span className="block truncate text-ink">{line.name}</span>
                  <span className="block text-sm text-muted">{adviceFor(line).reason}</span>
                </span>
                <Button variant="ghost" onClick={() => updateLine(line.id, { hold: true })}>
                  Manter
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {skipped.length > 0 ? (
        <Card className="mt-3 rounded-[2rem]">
          <h2 className="font-medium text-ink">Não vou comprar</h2>
          <ul className="mt-2">
            {skipped.map((line) => (
              <li key={line.id} className="flex items-center justify-between gap-3 border-t border-line py-2 first:border-t-0">
                <span className="min-w-0 truncate text-muted">{line.name}</span>
                <Button variant="ghost" onClick={() => setStatus(line.id, "pending")}>
                  Voltar
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <AddDialog open={adding} onOpenChange={setAdding} />
      <PurchaseDialog open={spent} initialName={spentName} onOpenChange={setSpent} />
      <ReceiptDialog
        open={scan}
        onOpenChange={setScan}
        onProduct={(name) => {
          setSpentName(name);
          setSpent(true);
        }}
      />
      <BuyDialog line={buying} onOpenChange={(open) => !open && setBuying(null)} />
      <PlanDialog line={editing} onOpenChange={(open) => !open && setEditing(null)} />
    </Reveal>
  );
}
