import { currentMonthKey } from "./format.ts";
import type { Product, ShopLine, Snapshot, StockEvent } from "./types.ts";

function daysBetween(later: Date, earlier: Date): number {
  const utc = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(later) - utc(earlier)) / 86400000);
}

export function measureUse(
  product: Product,
  lines: ShopLine[],
  events: StockEvent[],
  at: Date,
  mark: { kind: StockEvent["kind"]; qty: number },
): { coverageDays: number; samples: number } | null {
  const previous = events
    .filter((event) => event.productId === product.id && new Date(event.at).getTime() < at.getTime())
    .sort((a, b) => a.at.localeCompare(b.at))
    .at(-1);
  const purchases = lines.filter((line) => line.productId === product.id && line.status === "bought" && line.boughtAt && line.qtyBought > 0);
  const start = previous
    ? new Date(previous.at)
    : purchases
        .map((line) => new Date(line.boughtAt ?? ""))
        .sort((a, b) => a.getTime() - b.getTime())[0];
  if (!start || Number.isNaN(start.getTime()) || start >= at) return null;
  const bought = purchases
    .filter((line) => {
      const when = new Date(line.boughtAt ?? "");
      return previous ? when > start && when <= at : when >= start && when <= at;
    })
    .reduce((sum, line) => sum + line.qtyBought, 0);
  const opening = previous?.kind === "remaining" ? previous.qty : 0;
  const closing = mark.kind === "remaining" ? mark.qty : 0;
  const consumed = opening + bought - closing;
  const days = daysBetween(at, start);
  if (consumed <= 0 || days <= 0) return null;
  const measured = Math.max(1, Math.round(days / consumed));
  const samples = product.coverageSamples ?? 0;
  const coverageDays = samples > 0 ? Math.max(1, Math.round((product.coverageDays * samples + measured) / (samples + 1))) : measured;
  return { coverageDays, samples: samples + 1 };
}

export function coverageText(product: Product): string {
  if ((product.coverageSamples ?? 0) < 1) return "";
  const days = product.coverageDays;
  return `Dura cerca de ${days} ${days === 1 ? "dia" : "dias"}`;
}

export function pantryStep(unit: string): number {
  const value = unit.toLowerCase();
  if (value === "kg" || value === "l") return 0.5;
  if (value === "g" || value === "ml") return 100;
  return 1;
}

export function applyPantryChange(
  snapshot: Snapshot,
  productId: string,
  action: "down" | "out" | "set",
  qty: number,
  month: string,
  now = new Date(),
): Snapshot {
  const product = snapshot.products.find((item) => item.id === productId);
  if (!product) return snapshot;
  let onHand = product.onHand ?? 0;
  if (action === "down") onHand = Math.max(0, Math.round((onHand - pantryStep(product.unit)) * 1000) / 1000);
  if (action === "out") onHand = 0;
  if (action === "set") onHand = Math.max(0, Math.round(qty * 1000) / 1000);
  const kind: StockEvent["kind"] = onHand === 0 ? "finished" : "remaining";
  const record = action !== "down" || onHand === 0;
  const learned = record ? measureUse(product, snapshot.lines, snapshot.stock, now, { kind, qty: onHand }) : null;
  const products = snapshot.products.map((item) =>
    item.id === productId
      ? {
          ...item,
          onHand,
          coverageDays: learned?.coverageDays ?? item.coverageDays,
          coverageSamples: learned?.samples ?? item.coverageSamples,
        }
      : item,
  );
  const stock = record ? [...snapshot.stock, { id: crypto.randomUUID(), productId, at: now.toISOString(), kind, qty: onHand }] : snapshot.stock;
  let lines = snapshot.lines;
  if (kind === "finished" && !lines.some((line) => line.productId === productId && line.monthKey === month && line.status === "pending")) {
    const current = products.find((item) => item.id === productId) ?? product;
    const line: ShopLine = {
      id: crypto.randomUUID(),
      monthKey: month || currentMonthKey(now),
      productId: current.id,
      categoryId: current.categoryId,
      name: current.name,
      unit: current.unit,
      qtyPlanned: current.defaultQty || 1,
      estimatedUnitPrice: current.estimatedUnitPrice,
      qtyBought: 0,
      actualTotal: null,
      status: "pending",
      boughtAt: null,
      store: "",
    };
    lines = [...lines, line];
  }
  return { ...snapshot, products, stock, lines };
}
