import { currentMonthKey, formatQty, roundQty, shiftMonth } from "@/lib/casa/format";
import { daysOfStock } from "@/lib/casa/logic";
import type { ListMode, Product, ShopLine } from "@/lib/casa/types";

const MODES = new Set<ListMode>(["completa", "economia", "acabando"]);

export type Advice = {
  show: boolean;
  qty: number;
  reason: string;
};

export function listModeOf(value: unknown): ListMode {
  return typeof value === "string" && MODES.has(value as ListMode) ? (value as ListMode) : "completa";
}

function pastUse(productId: string, lines: ShopLine[], now: Date) {
  const current = currentMonthKey(now);
  const keys = new Set(Array.from({ length: 6 }, (_, index) => shiftMonth(current, -(index + 1))));
  const byMonth = new Map<string, number>();
  for (const line of lines) {
    if (line.productId !== productId || line.status !== "bought" || line.qtyBought <= 0 || !keys.has(line.monthKey)) continue;
    byMonth.set(line.monthKey, (byMonth.get(line.monthKey) ?? 0) + line.qtyBought);
  }
  const quantities = [...byMonth.values()];
  const avgQty = quantities.length ? quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length : 0;
  return { monthsUsed: quantities.length, avgQty: quantities.length ? roundQty(avgQty) : 0 };
}

export function adviseLine(line: ShopLine, product: Product | undefined, lines: ShopLine[], mode: ListMode, now = new Date()): Advice {
  if (mode === "completa" || line.hold) return { show: true, qty: line.qtyPlanned, reason: line.hold ? "Você pediu para manter." : "" };
  const stock = product ? daysOfStock(product, lines, 1, now) : null;
  const usage = pastUse(line.productId, lines, now);
  const staple = Boolean(product?.recurring) || usage.monthsUsed >= 2;
  if (stock != null && stock > 10) {
    return { show: false, qty: line.qtyPlanned, reason: "Ainda tem em casa." };
  }
  if (mode === "acabando") {
    if (stock != null && stock <= 10) {
      return {
        show: true,
        qty: line.qtyPlanned,
        reason: stock <= 0 ? "Acabou em casa." : `Acaba em cerca de ${stock} dias.`,
      };
    }
    if (staple) return { show: true, qty: line.qtyPlanned, reason: "Sem compra recente. Mantive na lista." };
    return { show: false, qty: line.qtyPlanned, reason: "Não é item de todo mês." };
  }
  if (!staple) return { show: false, qty: line.qtyPlanned, reason: "Não entra todo mês." };
  const qty = usage.monthsUsed >= 2 ? usage.avgQty : line.qtyPlanned;
  return {
    show: true,
    qty,
    reason: usage.monthsUsed >= 2 ? `Nos últimos meses, cerca de ${formatQty(qty)} ${line.unit}.` : "Mantive porque se repete.",
  };
}

export function linesForMode(lines: ShopLine[], products: Product[], mode: ListMode, now = new Date()): ShopLine[] {
  if (mode === "completa") return lines;
  const byId = new Map(products.map((product) => [product.id, product]));
  const next: ShopLine[] = [];
  for (const line of lines) {
    if (line.status !== "pending") {
      next.push(line);
      continue;
    }
    const advice = adviseLine(line, byId.get(line.productId), lines, mode, now);
    if (!advice.show) continue;
    next.push({ ...line, qtyPlanned: advice.qty });
  }
  return next;
}

export function pendingSummary(lines: ShopLine[], products: Product[], month: string, mode: ListMode, now = new Date()) {
  const pending = lines.filter((line) => line.monthKey === month && line.status === "pending");
  const byId = new Map(products.map((product) => [product.id, product]));
  const open = pending.filter((line) => adviseLine(line, byId.get(line.productId), lines, mode, now).show).length;
  return { open, hidden: pending.length - open, total: pending.length };
}

export function missingLabel(summary: { open: number; hidden: number }): string {
  if (summary.open === 0 && summary.hidden === 0) return "Nada faltando";
  const base = summary.open === 1 ? "Falta 1" : `Faltam ${summary.open}`;
  if (summary.hidden > 0) return `${base} · ${summary.hidden} ${summary.hidden === 1 ? "pode esperar" : "podem esperar"}`;
  return base;
}
