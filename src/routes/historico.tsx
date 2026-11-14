import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { normalizeName } from "@/lib/casa/classify";
import { PageIntro, Reveal } from "@/components/casa/chrome";
import { Button, Card, EmptyState, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatDay, formatMoney, formatQty, monthTitle } from "@/lib/casa/format";
import { lineActual } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";
import type { LineStatus, ShopLine } from "@/lib/casa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/historico")({
  head: () => ({ meta: [{ title: "Histórico · CasaFlow" }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <History />;
}

function History() {
  const lines = useCasa((state) => state.lines);
  const categories = useCasa((state) => state.categories);
  const [query, setQuery] = useState("");
  const [month, setMonth] = useState("all");
  const [categoryId, setCategoryId] = useState("all");
  const setStatus = useCasa((state) => state.setStatus);
  const [undo, setUndo] = useState<ShopLine | null>(null);
  const [status, setStatusFilter] = useState<"all" | LineStatus>("bought");
  const months = useMemo(() => [...new Set(lines.map((line) => line.monthKey))].sort().reverse(), [lines]);
  const filtered = useMemo(
    () =>
      lines
        .filter((line) => month === "all" || line.monthKey === month)
        .filter((line) => categoryId === "all" || line.categoryId === categoryId)
        .filter((line) => status === "all" || line.status === status)
        .filter((line) => {
          return normalizeName(`${line.name} ${line.store}`).includes(normalizeName(query));
        })
        .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || (b.boughtAt ?? "").localeCompare(a.boughtAt ?? "")),
    [lines, month, categoryId, status, query],
  );
  const total = filtered.reduce((sum, line) => sum + lineActual(line), 0);
  const groups = new Map<string, typeof filtered>();
  for (const line of filtered) {
    const list = groups.get(line.monthKey) ?? [];
    list.push(line);
    groups.set(line.monthKey, list);
  }

  return (
    <Reveal>
      <PageIntro eyebrow="Histórico" title="O que já paguei" lede="Dá para buscar por produto ou loja. Se lançou errado, desfaça." />
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <input className={fieldClass} placeholder="Produto ou loja" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select className={fieldClass} value={month} onChange={(event) => setMonth(event.target.value)}>
          <option value="all">Todos os meses</option>
          {months.map((key) => (
            <option key={key} value={key}>
              {monthTitle(key)}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
          <option value="all">Todas as categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <select className={fieldClass} value={status} onChange={(event) => setStatusFilter(event.target.value as "all" | LineStatus)}>
          <option value="all">Qualquer status</option>
          <option value="bought">Comprados</option>
          <option value="pending">Pendentes</option>
          <option value="skipped">Pulados</option>
        </select>
      </div>
      <p className="mt-4 text-sm text-muted">
        {filtered.length} registros · pago {formatMoney(total)}
      </p>
      {filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState title="Nenhum registro" detail="Mude os filtros ou registre uma compra na lista do mês." />
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          {[...groups.entries()].map(([key, rows]) => (
            <Card key={key}>
              <h2 className="font-display text-2xl text-ink">{monthTitle(key)}</h2>
              <ul className="mt-2 divide-y divide-line">
                {rows.map((line) => (
                  <li key={line.id} className="grid gap-1 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center">
                    <span className="text-sm text-muted">{line.boughtAt ? formatDay(line.boughtAt) : statusLabel(line.status)}</span>
                    <span>
                      <span className="block text-ink">{line.name}</span>
                      <span className="text-sm text-muted">
                        {formatQty(line.status === "bought" ? line.qtyBought : line.qtyPlanned)} {line.unit}
                        {line.store ? ` · ${line.store}` : ""}
                      </span>
                    </span>
                    <span className={cn("tabular-nums", line.status === "bought" ? "text-ink" : "text-muted")}>
                      {line.status === "bought" ? formatMoney(lineActual(line)) : formatMoney(line.qtyPlanned * line.estimatedUnitPrice)}
                    </span>
                    {line.status === "bought" ? (
                      <Button variant="ghost" aria-label={`Desfazer compra de ${line.name}`} onClick={() => setUndo(line)}>
                        Desfazer
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      )}
      <Modal
        open={Boolean(undo)}
        onOpenChange={(open) => !open && setUndo(null)}
        title={undo ? `Desfazer ${undo.name}?` : "Desfazer"}
        description="A compra sai do histórico e volta para a lista do mês."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              if (!undo) return;
              setStatus(undo.id, "pending");
              toast.success(`${undo.name} voltou para a lista.`);
              setUndo(null);
            }}
          >
            Desfazer
          </Button>
          <Button variant="secondary" onClick={() => setUndo(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </Reveal>
  );
}

function statusLabel(status: LineStatus) {
  if (status === "pending") return "Pendente";
  if (status === "skipped") return "Pulado";
  return "Comprado";
}
