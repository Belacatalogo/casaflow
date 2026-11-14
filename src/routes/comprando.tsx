import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/casa/chrome";
import { BuyDialog, PurchaseDialog } from "@/components/casa/dialogs";
import { ReceiptDialog } from "@/components/casa/receipt-dialog";
import { Button, EmptyState, PageSkeleton } from "@/components/ui/controls";
import { formatMoney, formatQty } from "@/lib/casa/format";
import { lineEstimate } from "@/lib/casa/logic";
import { adviseLine } from "@/lib/casa/modes";
import { useCasa } from "@/lib/casa/store";
import type { ShopLine } from "@/lib/casa/types";

export const Route = createFileRoute("/comprando")({
  head: () => ({ meta: [{ title: "Comprar · CasaFlow" }] }),
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
  const products = useCasa((state) => state.products);
  const mode = useCasa((state) => state.settings.listMode) ?? "completa";
  const setStatus = useCasa((state) => state.setStatus);
  const markBought = useCasa((state) => state.markBought);
  const [buying, setBuying] = useState<ShopLine | null>(null);
  const [spent, setSpent] = useState(false);
  const [spentName, setSpentName] = useState("");
  const [scan, setScan] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const mine = useMemo(
    () => lines.filter((line) => line.monthKey === viewMonth).sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [lines, viewMonth],
  );
  const now = useMemo(() => new Date(), []);
  const pending = mine.filter((line) => {
    if (line.status !== "pending") return false;
    return adviseLine(line, products.find((product) => product.id === line.productId), lines, mode, now).show;
  });
  const bought = mine.filter((line) => line.status === "bought");
  const ordered = [...categories].sort((a, b) => a.order - b.order);
  const pendingTotal = pending.reduce((sum, line) => {
    const advice = adviseLine(line, products.find((product) => product.id === line.productId), lines, mode, now);
    return sum + advice.qty * line.estimatedUnitPrice;
  }, 0);

  function take(line: ShopLine) {
    const advice = adviseLine(line, products.find((product) => product.id === line.productId), lines, mode, now);
    const qty = advice.qty || line.qtyPlanned || 1;
    const total = line.estimatedUnitPrice > 0 ? qty * line.estimatedUnitPrice : lineEstimate({ ...line, qtyPlanned: qty });
    if (total <= 0) {
      setBuying(line);
      return;
    }
    markBought(line.id, { qtyBought: qty, actualTotal: total, store: line.store });
  }

  return (
    <Reveal>
      <p className="text-xs tracking-[0.16em] text-muted uppercase">No mercado</p>
      <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">Falta pegar</h1>
      <p className="mt-2 text-pretty text-muted">
        {pending.length === 0
          ? "Nada pendente neste mês."
          : `${pending.length} ${pending.length === 1 ? "item" : "itens"} · falta cerca de ${formatMoney(pendingTotal)}`}
      </p>
        {mode === "economia" ? <p className="mt-2 text-sm text-muted">Modo economia: só o essencial.</p> : null}
        {mode === "acabando" ? <p className="mt-2 text-sm text-muted">Modo acabando: só o que está no fim.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            setSpentName("");
            setSpent(true);
          }}
        >
          Comprei agora
        </Button>
        <Button variant="secondary" onClick={() => setScan(true)}>
          Escanear nota
        </Button>
      </div>
      {pending.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title="Nada para pegar"
            detail={mode === "completa" ? "Quando a lista tiver itens, eles aparecem aqui para você ir riscando." : "Neste modo não há nada urgente. O resto continua na lista completa."}
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-4">
          {ordered.map((category) => {
            const rows = pending.filter((line) => line.categoryId === category.id);
            if (rows.length === 0) return null;
            return (
              <section key={category.id}>
                <h2 className="text-sm font-medium text-muted">{category.name}</h2>
                <div className="mt-2 flex flex-col gap-3">
                  {rows.map((line) => {
                    const advice = adviseLine(line, products.find((product) => product.id === line.productId), lines, mode, now);
                    return (
                    <article key={line.id} className="rounded-[2rem] border border-line bg-surface p-4 shadow-card">
                      <h3 className="font-display text-2xl text-ink">{line.name}</h3>
                      <p className="mt-1 text-muted">
                        {formatQty(advice.qty)} {line.unit} · cerca de {formatMoney(advice.qty * line.estimatedUnitPrice)}
                      </p>
                      <Button size="lg" className="mt-4 w-full" onClick={() => take(line)}>
                        Comprei
                      </Button>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button variant="ghost" onClick={() => setBuying(line)}>
                          Outro valor
                        </Button>
                        <Button variant="ghost" onClick={() => setStatus(line.id, "skipped")}>
                          Pular
                        </Button>
                      </div>
                    </article>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {bought.length > 0 ? (
        <div className="mt-6">
          <button type="button" className="text-sm font-medium text-terra-deep" onClick={() => setShowDone((value) => !value)}>
            {showDone ? "Esconder o que já peguei" : `Ver o que já peguei · ${bought.length}`}
          </button>
          {showDone ? (
            <ul className="mt-3 flex flex-col gap-2 text-sm">
              {bought.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="text-ink">{line.name}</span>
                  <span className="tabular-nums text-muted">{formatMoney(line.actualTotal ?? 0)}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

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
