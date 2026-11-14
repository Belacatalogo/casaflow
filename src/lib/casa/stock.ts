import type { Product, ShopLine, StockEvent } from "./types.ts";

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
