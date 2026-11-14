import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Info, Sparkles, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { MonthSwitcher, Reveal } from "@/components/casa/chrome";
import { PaceChart } from "@/components/casa/charts";
import { Button, Card, PageSkeleton } from "@/components/ui/controls";
import { formatMoney, greeting, monthLabel, monthTitle, currentMonthKey, parseDecimal } from "@/lib/casa/format";
import { buildInsights, categorySlices, paceSeries, summarizeMonth } from "@/lib/casa/logic";
import { linesForMode, missingLabel, pendingSummary } from "@/lib/casa/modes";
import { cardPosition, monthVale } from "@/lib/casa/vale";
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
  const updateSettings = useCasa((state) => state.updateSettings);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const now = useMemo(() => new Date(), []);
  const [typed, setTyped] = useState("");
  const mode = settings.listMode ?? "completa";
  const vale = monthVale(settings.mealDaily ?? 30, viewMonth);
  const card = cardPosition({
    daily: settings.mealDaily ?? 30,
    anchor: settings.cardBalance,
    anchorAt: settings.cardSetAt,
    lines,
    now,
  });
  const usingCard = card.ready && viewMonth === currentMonthKey(now);
  const budget = usingCard ? card.balance : vale.total;
  const scoped = useMemo(() => linesForMode(lines, products, mode, now), [lines, products, mode, now]);
  const totals = summarizeMonth(scoped, viewMonth, budget);
  const live = summarizeMonth(lines, currentMonthKey(now), card.balance);
  const points = paceSeries(scoped, viewMonth, vale.total, now);
  const slices = categorySlices(scoped, categories, viewMonth);
  const maxSlice = Math.max(1, ...slices.map((slice) => slice.actual + slice.pending));
  const insights = buildInsights({
    lines: scoped,
    products,
    categories,
    month: viewMonth,
    budget,
    people: settings.people,
    now,
    limitName: usingCard ? "cartão" : "vale",
    pace: !usingCard,
  });
  const ticket = totals.boughtCount > 0 ? totals.actual / totals.boughtCount : 0;
  const hasMonth = totals.count > 0 || totals.actual > 0;
  const usefulInsights = insights.filter((insight) => insight.id !== "empty");
  const afterList = card.balance - live.pendingEst;
  const afterCredit = afterList + (card.next?.amount ?? 0);

  return (
    <Reveal>
      <header>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">{greeting(now)}</p>
        <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink sm:text-5xl">{settings.householdName}</h1>
        <p className="mt-2 text-sm text-muted">
          {settings.people} {settings.people === 1 ? "pessoa" : "pessoas"} · só neste celular
          {` · ${missingLabel(pendingSummary(lines, products, viewMonth, mode, now)).toLowerCase()}`}
        </p>
        {mode !== "completa" ? (
          <p className="mt-3 inline-flex rounded-full bg-gold-soft px-3 py-1 text-sm font-medium text-gold-deep">
            {mode === "economia" ? "Modo economia ligado" : "Modo acabando ligado"}
          </p>
        ) : null}
        <div className="mt-4 rounded-full bg-sunken">
          <MonthSwitcher className="w-full" titleClassName="min-w-0 flex-1 truncate px-1 text-base sm:text-lg" />
        </div>
      </header>

      <CardBalance />

      {hasMonth ? <FilledMonth /> : <EmptyMonth />}
    </Reveal>
  );

  function saveCard() {
    const value = parseDecimal(typed);
    if (value == null || value < 0) {
      toast("Informe o valor que está no cartão.");
      return;
    }
    updateSettings({ cardBalance: value, cardSetAt: new Date().toISOString() });
    toast.success("Saldo guardado. As próximas compras saem daqui.");
  }

  function CardBalance() {
    const next = card.next;
    const status =
      live.pendingEst > 0 && card.balance < live.pendingEst
        ? "Cartão baixo"
        : live.pendingEst > 0 && afterList < 40
          ? "Cobre a lista, sobra pouco"
          : live.pendingEst <= 0
            ? "Nada faltando na lista"
            : "Cartão folgado";
    if (!card.ready) {
      return (
        <section className="mt-5 rounded-[2rem] bg-hero px-5 py-5 text-on-hero">
          <h2 className="font-display text-2xl tracking-tight">Quanto tem no cartão?</h2>
          <p className="mt-1 text-sm text-on-hero-muted">As compras daqui pra frente saem desse valor.</p>
          <div className="mt-4 flex flex-col gap-2">
            <input
              className="h-12 rounded-full bg-white/10 px-4 text-lg text-on-hero outline-none placeholder:text-on-hero-muted"
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              name="saldo-cartao"
              placeholder="0,00"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
            />
            <Button className="bg-gold text-hero hover:bg-gold" onClick={saveCard}>
              Guardar saldo
            </Button>
          </div>
        </section>
      );
    }
    return (
      <section className="relative mt-5 overflow-hidden rounded-[2rem] bg-hero px-5 py-5 text-on-hero sm:px-6 sm:py-6">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-[linear-gradient(180deg,transparent,rgb(132_78_40/0.5))]" />
        <div className="relative">
          <p className="text-sm text-on-hero-muted">Saldo no cartão</p>
          <p className="mt-2 font-display text-4xl leading-none tabular-nums tracking-tight sm:text-6xl">{formatMoney(card.balance)}</p>
          <p className="mt-3 text-sm text-gold">{status}</p>
          <p className="mt-3 text-sm text-pretty text-on-hero-muted">
            Você informou {formatMoney(settings.cardBalance ?? 0)}
            {settings.cardSetAt ? ` em ${new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short" }).format(new Date(settings.cardSetAt))}` : ""}.
            {card.spent > 0 ? ` Desde então saiu ${formatMoney(card.spent)}.` : " Nenhuma compra saiu depois disso."}
            {card.credited > 0 ? ` Entrou ${formatMoney(card.credited)}.` : ""}
          </p>
          {next ? (
            <p className="mt-2 text-sm text-on-hero-muted">
              {dayLabel(next.on)} entra {formatMoney(next.amount)}, o vale de {monthLabel(next.forMonth)}.
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
            <div>
              <p className="text-[11px] tracking-[0.14em] text-on-hero-muted uppercase">
                {live.pendingEst > 0 ? "Depois da lista" : "Neste mês já saiu"}
              </p>
              <p className="mt-1 font-display text-2xl tabular-nums text-gold">
                {live.pendingEst > 0 ? formatMoney(afterList) : formatMoney(live.actual)}
              </p>
            </div>
            <div>
              <p className="text-[11px] tracking-[0.14em] text-on-hero-muted uppercase">Depois do crédito</p>
              <p className="mt-1 font-display text-2xl tabular-nums">{formatMoney(live.pendingEst > 0 ? afterCredit : card.balance + (next?.amount ?? 0))}</p>
            </div>
          </div>
          {live.pendingCount > 0 ? (
            <Button asChild className="mt-5 bg-gold text-hero hover:bg-gold">
              <Link to="/lista">Ver a lista · {live.pendingCount}</Link>
            </Button>
          ) : null}
        </div>
      </section>
    );
  }

  function EmptyMonth() {
    return (
      <section className="mt-5 overflow-hidden rounded-[2rem] bg-hero px-5 py-6 text-on-hero sm:px-7 sm:py-8">
        <div className="h-1 w-10 rounded-full bg-gold" />
        <h2 className="mt-5 font-display text-3xl tracking-tight">{monthTitle(viewMonth)} ainda está vazio</h2>
        <p className="mt-2 max-w-md text-pretty text-on-hero-muted">
          {products.length === 0
            ? "Cadastre o que a casa compra. A lista e o gráfico entram em seguida."
            : "Monte a lista com o que se repete, ou acrescente um item."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {products.length === 0 ? (
            <Button asChild className="bg-gold text-hero hover:bg-gold">
              <Link to="/catalogo">Cadastrar produto</Link>
            </Button>
          ) : (
            <Button asChild className="bg-gold text-hero hover:bg-gold">
              <Link to="/lista">Montar a lista</Link>
            </Button>
          )}
        </div>
      </section>
    );
  }

  function FilledMonth() {
    return (
      <>
        <div className="mt-3 divide-y divide-line overflow-hidden rounded-[2rem] border border-line bg-surface shadow-card sm:grid sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <Stat label="Comprados" value={`${totals.boughtCount}/${totals.count}`} />
          <Stat label="Média" value={totals.boughtCount > 0 ? formatMoney(ticket) : "—"} />
          <Stat label={totals.savedVsEstimate >= 0 ? "Economizei" : "A mais"} value={formatMoney(Math.abs(totals.savedVsEstimate))} />
        </div>

        <Card className="mt-3 rounded-[2rem]">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-2xl text-ink">Gasto do mês</h2>
            <p className="text-sm text-gold-deep">Linha dourada: vale deste mês</p>
          </div>
          <div className="mt-2">
            <PaceChart points={points} />
          </div>
        </Card>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="flex flex-col gap-3">
            {usefulInsights.length === 0 ? (
              <Card className="rounded-[2rem]">
                <p className="text-sm text-muted">Sem avisos neste mês.</p>
              </Card>
            ) : (
              usefulInsights.map((insight) => (
                <Card key={insight.id} className="rounded-[2rem]">
                  <div className="flex gap-3">
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full",
                        insight.tone === "warn" ? "bg-terra-soft text-terra-deep" : insight.tone === "good" ? "bg-gold-soft text-gold-deep" : "bg-sunken text-muted",
                      )}
                    >
                      {insight.tone === "good" ? <Sparkles className="size-4" /> : insight.tone === "warn" ? <TriangleAlert className="size-4" /> : <Info className="size-4" />}
                    </span>
                    <div className="min-w-0">
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
              ))
            )}
          </div>
          <Card className="rounded-[2rem]">
            <h2 className="font-display text-2xl text-ink">Por categoria</h2>
            <p className="mt-2 flex items-center gap-3 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-terra" />
                Pago
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-gold" />
                Na lista
              </span>
            </p>
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
          </Card>
        </div>
      </>
    );
  }
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-3.5 sm:block sm:px-5 sm:py-4">
      <p className="text-sm text-muted">{label}</p>
      <p className="font-display text-2xl tabular-nums text-ink">{value}</p>
    </div>
  );
}

function dayLabel(key: string): string {
  const [year, month, day] = key.split("-");
  const name = monthLabel(`${year}-${month}`).replace(/ de \d+$/, "");
  return `${Number(day)} de ${name}`;
}
