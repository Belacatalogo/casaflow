import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Info, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo } from "react";
import { MonthSwitcher, Reveal } from "@/components/casa/chrome";
import { PaceChart } from "@/components/casa/charts";
import { Button, Card, PageSkeleton } from "@/components/ui/controls";
import { formatMoney, greeting, monthTitle } from "@/lib/casa/format";
import { buildInsights, categorySlices, paceSeries, summarizeMonth } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Início · CasaFlow" }] }),
  component: Home,
});

function Home() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Dashboard />;
}

function Dashboard() {
  const settings = useCasa((state) => state.settings);
  const categories = useCasa((state) => state.categories);
  const products = useCasa((state) => state.products);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const now = useMemo(() => new Date(), []);
  const totals = summarizeMonth(lines, viewMonth, settings.monthlyBudget);
  const points = paceSeries(lines, viewMonth, settings.monthlyBudget, now);
  const slices = categorySlices(lines, categories, viewMonth);
  const insights = buildInsights({
    lines,
    products,
    categories,
    month: viewMonth,
    budget: settings.monthlyBudget,
    people: settings.people,
    now,
  });
  const maxSlice = Math.max(1, ...slices.map((slice) => slice.actual + slice.pending));
  const over = settings.monthlyBudget > 0 && totals.projected > settings.monthlyBudget;
  const progress = settings.monthlyBudget > 0 ? Math.min(100, (totals.projected / settings.monthlyBudget) * 100) : 0;
  const ticket = totals.boughtCount > 0 ? totals.actual / totals.boughtCount : 0;

  return (
    <Reveal>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">{greeting(now)}</p>
          <h1 className="font-display text-4xl tracking-tight text-ink">{settings.householdName}</h1>
        </div>
        <MonthSwitcher />
      </div>

      <Card className="mt-6 bg-hero text-on-hero sm:p-6">
        <div className="h-1 w-12 rounded-full bg-gold" />
        <p className="mt-4 text-sm text-on-hero-muted">Realizado em {monthTitle(viewMonth)}</p>
        <p className="mt-1 font-display text-4xl tabular-nums sm:text-5xl">{formatMoney(totals.actual)}</p>
        <p className="mt-2 text-sm text-on-hero-muted">
          {settings.monthlyBudget > 0 ? `de ${formatMoney(settings.monthlyBudget)} de orçamento` : "Sem teto definido"}
        </p>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-hero-track">
          <div className={cn("h-full rounded-full", over ? "bg-terra" : "bg-gold")} style={{ width: `${progress}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-on-hero-muted">Projeção</p>
            <p className="font-display text-2xl tabular-nums text-gold">{formatMoney(totals.projected)}</p>
          </div>
          <p className="max-w-xs text-sm text-pretty text-on-hero-muted">
            {settings.monthlyBudget <= 0
              ? "Defina um orçamento para ver a folga do mês."
              : over
                ? `${formatMoney(totals.projected - settings.monthlyBudget)} acima do teto se a lista fechar assim.`
                : `Folga de ${formatMoney(settings.monthlyBudget - totals.projected)} se nada mudar.`}
          </p>
        </div>
        {totals.pendingCount > 0 ? (
          <Button asChild variant="secondary" className="mt-5 bg-gold text-hero hover:bg-gold">
            <Link to="/comprando">Comprando agora · {totals.pendingCount} itens</Link>
          </Button>
        ) : null}
      </Card>

      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">Na lista</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-ink">
            {totals.boughtCount}
            <span className="text-lg text-muted">/{totals.count}</span>
          </p>
          <p className="mt-1 text-sm text-muted">já comprados</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">Ticket médio</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-ink">{formatMoney(ticket)}</p>
          <p className="mt-1 text-sm text-muted">por item pago</p>
        </Card>
        <Card className="col-span-2 lg:col-span-1">
          <p className="text-sm text-muted">Contra o estimado</p>
          <p className="mt-2 font-display text-3xl tabular-nums text-ink">{formatMoney(Math.abs(totals.savedVsEstimate))}</p>
          <p className="mt-1 text-sm text-muted">{totals.savedVsEstimate >= 0 ? "abaixo do previsto" : "acima do previsto"}</p>
        </Card>
      </div>

      <Card className="mt-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-2xl text-ink">Ritmo do mês</h2>
          <p className="text-sm text-muted">ouro é o orçamento linear</p>
        </div>
        {totals.actual === 0 && totals.pendingCount === 0 ? (
          <p className="mt-6 text-muted">As compras aparecem aqui quando você registra o valor pago.</p>
        ) : (
          <div className="mt-4">
            <PaceChart points={points} />
          </div>
        )}
      </Card>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {insights.map((insight) => (
            <Card key={insight.id}>
              <div className="flex gap-3">
                <span className={cn("mt-1", insight.tone === "warn" ? "text-terra" : insight.tone === "good" ? "text-gold-deep" : "text-muted")}>
                  {insight.tone === "good" ? <Sparkles className="size-5" /> : insight.tone === "warn" ? <TriangleAlert className="size-5" /> : <Info className="size-5" />}
                </span>
                <div>
                  <h3 className="font-medium text-ink">{insight.title}</h3>
                  <p className="mt-1 text-sm text-pretty text-muted">{insight.detail}</p>
                  {insight.productId ? (
                    <button
                      type="button"
                      className="mt-3 text-sm font-medium text-terra-deep"
                      onClick={() => {
                        const product = products.find((item) => item.id === insight.productId);
                        const added = addProductToMonth(insight.productId!);
                        if (added && product) toast.success(`${product.name} entrou na lista.`);
                      }}
                    >
                      Incluir na lista
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}
        </div>
        <Card>
          <h2 className="font-display text-2xl text-ink">Por categoria</h2>
          <p className="mt-1 text-sm text-muted">Terracota é o pago. Ouro é o que ainda está na lista.</p>
          {slices.length === 0 ? (
            <p className="mt-6 text-muted">Sem itens neste mês.</p>
          ) : (
            <ul className="mt-5 flex flex-col gap-4">
              {slices.map((slice) => (
                <li key={slice.categoryId}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-ink">{slice.name}</span>
                    <span className="tabular-nums text-muted">{formatMoney(slice.actual + slice.pending)}</span>
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-sunken">
                    <div className="h-full bg-terra" style={{ width: `${(slice.actual / maxSlice) * 100}%` }} />
                    <div className="h-full bg-gold" style={{ width: `${(slice.pending / maxSlice) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {totals.count === 0 ? (
            <Button asChild className="mt-5">
              <Link to="/lista">Montar a lista</Link>
            </Button>
          ) : null}
        </Card>
      </div>
      <p className="mt-6 text-sm text-muted">
        {settings.people} {settings.people === 1 ? "pessoa" : "pessoas"} na casa. Os dados ficam neste aparelho.
      </p>
    </Reveal>
  );
}
