import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/casa/chrome";
import { BuyDialog, PurchaseDialog } from "@/components/casa/dialogs";
import { ReceiptDialog } from "@/components/casa/receipt-dialog";
import { Button, EmptyState, PageSkeleton } from "@/components/ui/controls";
import { formatMoney, formatQty, monthTitle } from "@/lib/casa/format";
import { lineEstimate, summarizeMonth } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";
import type { ShopLine } from "@/lib/casa/types";

export const Route = createFileRoute("/comprando")({
  head: () => ({ meta: [{ title: "Comprando agora · CasaFlow" }] }),
  component: ShopPage,
});

function ShopPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Shop />;
}

function Shop() {
  const lines = useCasa((state) => state.lines);
  const categories = useCasa((state) => state.categories);
  const viewMonth = useCasa((state) => state.viewMonth);
  const budget = useCasa((state) => state.settings.monthlyBudget);
  const setStatus = useCasa((state) => state.setStatus);
  const [buying, setBuying] = useState<ShopLine | null>(null);
  const [spent, setSpent] = useState(false);
  const [spentName, setSpentName] = useState("");
  const [scan, setScan] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const totals = summarizeMonth(lines, viewMonth, budget);
  const mine = useMemo(
    () => lines.filter((line) => line.monthKey === viewMonth).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [lines, viewMonth],
  );
  const pending = mine.filter((line) => line.status === "pending");
  const bought = mine.filter((line) => line.status === "bought");
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  return (
    <Reveal>
      <p className="text-sm text-muted">{monthTitle(viewMonth)}</p>
      <h1 className="font-display text-4xl tracking-tight text-ink">Comprando agora</h1>
      <p className="mt-2 text-pretty text-muted">
        {pending.length === 0 ? "Nada pendente neste mês." : `${pending.length} ${pending.length === 1 ? "item falta" : "itens faltam"}.`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={() => { setSpentName(""); setSpent(true); }}>Comprei agora</Button>
        <Button variant="secondary" onClick={() => setScan(true)}>
          Escanear nota
        </Button>
      </div>
      {pending.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="Lista em dia" detail="Quando faltar algum item, ele aparece aqui." />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5">
          {ordered.map((category) => {
            const rows = pending.filter((line) => line.categoryId === category.id);
            if (rows.length === 0) return null;
            return (
              <section key={category.id}>
                <h2 className="text-sm font-medium text-muted">{category.name}</h2>
                <div className="mt-2 flex flex-col gap-3">
                  {rows.map((line) => (
                    <article key={line.id} className="rounded-3xl border border-line bg-surface p-4 shadow-card">
                      <h3 className="font-display text-2xl text-ink">{line.name}</h3>
                      <p className="mt-1 text-muted">
                        {formatQty(line.qtyPlanned)} {line.unit} · cerca de {formatMoney(lineEstimate(line))}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <Button size="lg" onClick={() => setBuying(line)}>
                          Comprei
                        </Button>
                        <Button size="lg" variant="secondary" onClick={() => setStatus(line.id, "skipped")}>
                          Pular
                        </Button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-3 mt-6 rounded-3xl border border-line bg-hero px-4 py-4 text-on-hero shadow-card">
        <p className="text-sm text-on-hero-muted">Já gastei neste mês</p>
        <p className="font-display text-3xl tabular-nums">{formatMoney(totals.actual)}</p>
        {bought.length > 0 ? (
          <button type="button" className="mt-2 text-sm text-gold" onClick={() => setShowDone((value) => !value)}>
            {showDone ? "Esconder comprados" : `Ver ${bought.length} comprados`}
          </button>
        ) : null}
        {showDone ? (
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {bought.map((line) => (
              <li key={line.id} className="flex justify-between gap-3">
                <span>{line.name}</span>
                <span className="tabular-nums">{formatMoney(line.actualTotal ?? 0)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <BuyDialog line={buying} onOpenChange={(open) => !open && setBuying(null)} />
      <PurchaseDialog open={spent} initialName={spentName} onOpenChange={setSpent} />
      <ReceiptDialog
        open={scan}
        onOpenChange={setScan}
        onProduct={(name) => {
          setSpentName(name);
          setSpent(true);
        }}
      />
    </Reveal>
  );
}
