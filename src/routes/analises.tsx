import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MonthChart } from "@/components/casa/charts";
import { MonthSwitcher, Reveal } from "@/components/casa/chrome";
import { Button, Card, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { decimalToInput, formatMoney, formatQty, monthTitle, parseDecimal, shiftMonth } from "@/lib/casa/format";
import { consumptionRows, monthBars, summarizeMonth } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";

export const Route = createFileRoute("/analises")({
  head: () => ({ meta: [{ title: "Análises · CasaFlow" }] }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Analytics />;
}

type Draft = { productId: string; qty: string; price: string; on: boolean };

function Analytics() {
  const products = useCasa((state) => state.products);
  const lines = useCasa((state) => state.lines);
  const categories = useCasa((state) => state.categories);
  const settings = useCasa((state) => state.settings);
  const viewMonth = useCasa((state) => state.viewMonth);
  const createPlanned = useCasa((state) => state.createPlanned);
  const navigate = useNavigate();
  const next = shiftMonth(viewMonth, 1);
  const rows = consumptionRows(products, lines, settings.people);
  const bars = monthBars(lines, viewMonth, 4);
  const totals = summarizeMonth(lines, viewMonth, settings.monthlyBudget);
  const previous = summarizeMonth(lines, shiftMonth(viewMonth, -1), settings.monthlyBudget);
  const avg = bars.length ? bars.reduce((sum, bar) => sum + bar.realizado, 0) / bars.length : 0;
  const delta = previous.actual > 0 ? (totals.actual - previous.actual) / previous.actual : 0;
  const [draftKey, setDraftKey] = useState(next);
  const [drafts, setDrafts] = useState<Draft[]>(() => initialDrafts(products, rows));
  const [showAll, setShowAll] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  if (draftKey !== next) {
    setDraftKey(next);
    setDrafts(initialDrafts(products, rows));
  }
  const existing = lines.filter((line) => line.monthKey === next).length;
  const plannedTotal = drafts.reduce((sum, draft) => {
    if (!draft.on) return sum;
    const qty = parseDecimal(draft.qty) ?? 0;
    const price = parseDecimal(draft.price) ?? 0;
    return sum + qty * price;
  }, 0);
  const hasSpend = lines.some((line) => line.status === "bought" && (line.actualTotal ?? 0) > 0);
  const heavy = rows.filter((row) => row.avgSpend > 0);
  const visibleRows = showAll ? heavy : heavy.slice(0, 8);
  const rankedDrafts = [...drafts].sort((a, b) => {
    const spend = (draft: Draft) => (parseDecimal(draft.qty) ?? 0) * (parseDecimal(draft.price) ?? 0);
    return spend(b) - spend(a);
  });
  const planRows = showPlan ? rankedDrafts : rankedDrafts.slice(0, 8);

  return (
    <Reveal>
      <header>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Análises</p>
        <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">Resumo</h1>
        <div className="mt-4 rounded-full bg-sunken">
          <MonthSwitcher className="w-full" titleClassName="min-w-0 flex-1 truncate px-1 text-base sm:text-lg" />
        </div>
      </header>

      {hasSpend ? (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3">
        <Card>
          <p className="text-sm text-muted">Média dos meses</p>
          <p className="mt-2 font-display text-2xl tabular-nums">{formatMoney(avg)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Já gastei</p>
          <p className="mt-2 font-display text-2xl tabular-nums">{formatMoney(totals.actual)}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Contra o mês passado</p>
          <p className="mt-2 font-display text-2xl tabular-nums">{previous.actual > 0 ? `${delta > 0 ? "+" : ""}${Math.round(delta * 100)}%` : "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Previsão</p>
          <p className="mt-2 font-display text-2xl tabular-nums">{formatMoney(totals.projected)}</p>
        </Card>
      </div>

      <Card className="mt-3">
        <h2 className="font-display text-2xl text-ink">Mês a mês</h2>
        <p className="mt-1 text-sm text-muted">Laranja é o que já pagou. Dourado soma o que ainda falta.</p>
        <div className="mt-4">
          <MonthChart rows={bars} />
        </div>
      </Card>

      <Card className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">O que mais pesa</h2>
          {heavy.length > 8 ? (
            <button type="button" className="text-sm text-terra-deep" onClick={() => setShowAll((value) => !value)}>
              {showAll ? "Mostrar menos" : "Ver todos"}
            </button>
          ) : null}
        </div>
        <ul className="mt-4 divide-y divide-line">
          {visibleRows.map((row) => {
            const category = categories.find((item) => item.id === row.categoryId);
            return (
              <li key={row.productId} className="grid gap-1 py-3 sm:grid-cols-[1.4fr_0.8fr_0.8fr] sm:items-center">
                <div>
                  <p className="font-medium text-ink">{row.name}</p>
                  <p className="text-sm text-muted">{category?.name}</p>
                </div>
                <p className="text-sm text-muted">
                  média {formatQty(row.avgQty)} {row.unit}
                  {row.months > 0 ? ` · ${row.months} meses` : ""}
                </p>
                <p className="tabular-nums text-ink sm:text-right">{row.avgSpend > 0 ? formatMoney(row.avgSpend) : "ainda sem compra"}</p>
              </li>
            );
          })}
        </ul>
      </Card>
        </>
      ) : (
        <Card className="mt-5">
          <h2 className="font-display text-2xl text-ink">Ainda sem compras</h2>
          <p className="mt-2 text-pretty text-muted">O gráfico entra depois que você registrar o que pagou.</p>
        </Card>
      )}

      <Card className="mt-3">
        <h2 className="font-display text-2xl text-ink">Próximo mês</h2>
        {products.every((product) => !product.recurring) ? (
          <div className="mt-3">
            <p className="text-pretty text-muted">Cadastre produtos que se repetem para montar o mês que vem.</p>
            <Button asChild className="mt-4">
              <Link to="/catalogo">Cadastrar produto</Link>
            </Button>
          </div>
        ) : (
          <>
        <p className="mt-1 text-pretty text-muted">
          Sugestão para {monthTitle(next)}. Mude a quantidade se quiser.
          {existing > 0 ? ` O que já está na lista não entra de novo.` : ""}
        </p>
        <ul className="mt-4 flex flex-col gap-3">
          {planRows.map((draft) => {
            const product = products.find((item) => item.id === draft.productId);
            if (!product) return null;
            return (
              <li key={draft.productId} className="grid items-center gap-2 sm:grid-cols-[auto_1fr_5rem_6rem]">
                <input
                  type="checkbox"
                  className="size-5 accent-terra"
                  checked={draft.on}
                  onChange={(event) =>
                    setDrafts((current) => current.map((item) => (item.productId === draft.productId ? { ...item, on: event.target.checked } : item)))
                  }
                  aria-label={`Incluir ${product.name}`}
                />
                <span className="text-ink">{product.name}</span>
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  aria-label={`Quantidade de ${product.name}`}
                  placeholder="Qtd"
                  value={draft.qty}
                  onChange={(event) =>
                    setDrafts((current) => current.map((item) => (item.productId === draft.productId ? { ...item, qty: event.target.value } : item)))
                  }
                />
                <input
                  className={fieldClass}
                  inputMode="decimal"
                  aria-label={`Preço de ${product.name}`}
                  placeholder="Preço"
                  value={draft.price}
                  onChange={(event) =>
                    setDrafts((current) => current.map((item) => (item.productId === draft.productId ? { ...item, price: event.target.value } : item)))
                  }
                />
              </li>
            );
          })}
        </ul>
        {rankedDrafts.length > 8 ? (
          <button type="button" className="mt-3 text-sm font-medium text-terra-deep" onClick={() => setShowPlan((value) => !value)}>
            {showPlan ? "Mostrar só os principais" : `Ver os ${rankedDrafts.length} produtos`}
          </button>
        ) : null}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="font-display text-2xl tabular-nums text-ink">{formatMoney(plannedTotal)}</p>
          <Button
            disabled={!drafts.some((draft) => draft.on && (parseDecimal(draft.qty) ?? 0) > 0 && (parseDecimal(draft.price) ?? 0) > 0)}
            onClick={() => {
              const payload = drafts
                .filter((draft) => draft.on)
                .map((draft) => ({
                  productId: draft.productId,
                  qty: parseDecimal(draft.qty) ?? 0,
                  unitPrice: parseDecimal(draft.price) ?? 0,
                }))
                .filter((draft) => draft.qty > 0);
              const count = createPlanned(next, payload);
              if (count > 0) void navigate({ to: "/lista" });
            }}
          >
            Criar lista de {monthTitle(next).split(" de ")[0]}
          </Button>
        </div>
          </>
        )}
      </Card>
    </Reveal>
  );
}

function initialDrafts(products: { id: string; recurring: boolean; name: string }[], rows: { productId: string; suggestedQty: number; suggestedPrice: number }[]): Draft[] {
  const byId = new Map(rows.map((row) => [row.productId, row]));
  return products
    .filter((product) => product.recurring)
    .map((product) => {
      const row = byId.get(product.id);
      return {
        productId: product.id,
        qty: decimalToInput(row?.suggestedQty ?? 1),
        price: decimalToInput(row?.suggestedPrice ?? 0),
        on: true,
      };
    })
    .sort((a, b) => a.productId.localeCompare(b.productId));
}
