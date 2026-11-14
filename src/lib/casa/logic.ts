import { currentMonthKey, daysInMonth, formatMoney, monthCount, monthLabel, round2, roundQty, shiftMonth } from "@/lib/casa/format";
import type { Category, Product, ShopLine } from "@/lib/casa/types";

export type MonthTotals = {
  count: number;
  boughtCount: number;
  pendingCount: number;
  skippedCount: number;
  actual: number;
  pendingEst: number;
  estimatedAll: number;
  projected: number;
  budget: number;
  savedVsEstimate: number;
};

export type PacePoint = {
  day: number;
  realizado: number | null;
  ritmo: number;
};

export type CategorySlice = {
  categoryId: string;
  name: string;
  actual: number;
  pending: number;
  share: number;
};

export type MonthBar = {
  monthKey: string;
  label: string;
  realizado: number;
  projecao: number;
};

export type Insight = {
  id: string;
  tone: "good" | "warn" | "neutral";
  title: string;
  detail: string;
  productId?: string;
};

export type ConsumptionRow = {
  productId: string;
  name: string;
  unit: string;
  categoryId: string;
  months: number;
  avgQty: number;
  avgSpend: number;
  lastUnitPrice: number | null;
  suggestedQty: number;
  suggestedPrice: number;
  reason: string;
};

export function lineEstimate(line: ShopLine): number {
  return round2(line.qtyPlanned * line.estimatedUnitPrice);
}

export function lineActual(line: ShopLine): number {
  return line.status === "bought" ? round2(line.actualTotal ?? 0) : 0;
}

export function unitPriceOf(line: ShopLine): number | null {
  if (line.status !== "bought" || line.actualTotal == null || line.qtyBought <= 0) return null;
  return line.actualTotal / line.qtyBought;
}

export function monthLines(lines: ShopLine[], month: string): ShopLine[] {
  return lines.filter((line) => line.monthKey === month);
}

export function summarizeMonth(lines: ShopLine[], month: string, budget: number): MonthTotals {
  const mine = monthLines(lines, month);
  const active = mine.filter((line) => line.status !== "skipped");
  const bought = mine.filter((line) => line.status === "bought");
  const pending = mine.filter((line) => line.status === "pending");
  const actual = round2(bought.reduce((sum, line) => sum + lineActual(line), 0));
  const pendingEst = round2(pending.reduce((sum, line) => sum + lineEstimate(line), 0));
  const estimatedAll = round2(active.reduce((sum, line) => sum + lineEstimate(line), 0));
  const boughtEstimate = round2(bought.reduce((sum, line) => sum + lineEstimate(line), 0));
  return {
    count: active.length,
    boughtCount: bought.length,
    pendingCount: pending.length,
    skippedCount: mine.length - active.length,
    actual,
    pendingEst,
    estimatedAll,
    projected: round2(actual + pendingEst),
    budget,
    savedVsEstimate: round2(boughtEstimate - actual),
  };
}

export function paceSeries(lines: ShopLine[], month: string, budget: number, now = new Date()): PacePoint[] {
  const days = daysInMonth(month);
  const isCurrent = month === currentMonthKey(now);
  const today = isCurrent ? Math.min(days, now.getDate()) : days;
  const byDay = new Map<number, number>();
  for (const line of monthLines(lines, month)) {
    if (line.status !== "bought" || line.actualTotal == null) continue;
    const day = line.boughtAt ? new Date(line.boughtAt).getDate() : 1;
    const safeDay = Math.min(days, Math.max(1, day));
    byDay.set(safeDay, (byDay.get(safeDay) ?? 0) + line.actualTotal);
  }
  const points: PacePoint[] = [];
  let running = 0;
  for (let day = 1; day <= days; day += 1) {
    running = round2(running + (byDay.get(day) ?? 0));
    points.push({
      day,
      realizado: day <= today ? running : null,
      ritmo: round2((budget * day) / days),
    });
  }
  return points;
}

export function categorySlices(
  lines: ShopLine[],
  categories: Category[],
  month: string,
): CategorySlice[] {
  const mine = monthLines(lines, month).filter((line) => line.status !== "skipped");
  const actualTotal = mine.reduce((sum, line) => sum + lineActual(line), 0);
  return categories
    .map((category) => {
      const rows = mine.filter((line) => line.categoryId === category.id);
      const actual = round2(rows.reduce((sum, line) => sum + lineActual(line), 0));
      const pending = round2(
        rows
          .filter((line) => line.status === "pending")
          .reduce((sum, line) => sum + lineEstimate(line), 0),
      );
      return {
        categoryId: category.id,
        name: category.name,
        actual,
        pending,
        share: actualTotal > 0 ? actual / actualTotal : 0,
      };
    })
    .filter((slice) => slice.actual > 0 || slice.pending > 0)
    .sort((a, b) => b.actual + b.pending - (a.actual + a.pending));
}

export function monthBars(lines: ShopLine[], endMonth: string, count = 4): MonthBar[] {
  const keys: string[] = [];
  for (let index = count - 1; index >= 0; index -= 1) keys.push(shiftMonth(endMonth, -index));
  return keys.map((key) => {
    const totals = summarizeMonth(lines, key, 0);
    return {
      monthKey: key,
      label: monthLabel(key).split(" de ")[0]?.slice(0, 3) ?? key,
      realizado: totals.actual,
      projecao: totals.projected,
    };
  });
}

export function suggestQty(
  product: Product,
  lines: ShopLine[],
  _people: number,
): { qty: number; reason: string } {
  const byMonth = new Map<string, number>();
  for (const line of lines) {
    if (line.productId !== product.id || line.status !== "bought" || line.qtyBought <= 0) continue;
    byMonth.set(line.monthKey, (byMonth.get(line.monthKey) ?? 0) + line.qtyBought);
  }
  const quantities = [...byMonth.values()];
  if (quantities.length >= 2) {
    const avg = quantities.reduce((sum, qty) => sum + qty, 0) / quantities.length;
    return { qty: roundQty(avg), reason: `média de ${monthCount(quantities.length)}` };
  }
  const fromCoverage = product.coverageDays > 0 ? 30 / product.coverageDays : product.defaultQty;
  return { qty: roundQty(fromCoverage), reason: "para durar cerca de 30 dias" };
}

export function suggestPrice(product: Product, lines: ShopLine[]): number {
  const bought = lines
    .filter((line) => line.productId === product.id && unitPriceOf(line) != null)
    .sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? ""));
  const last = bought[0];
  const price = last ? unitPriceOf(last) : null;
  return round2(price ?? product.estimatedUnitPrice);
}

export function planLine(
  product: Product,
  month: string,
  people: number,
  history: ShopLine[],
): ShopLine {
  const suggestion = suggestQty(product, history, people);
  return {
    id: crypto.randomUUID(),
    monthKey: month,
    productId: product.id,
    categoryId: product.categoryId,
    name: product.name,
    unit: product.unit,
    qtyPlanned: suggestion.qty,
    estimatedUnitPrice: suggestPrice(product, history),
    qtyBought: 0,
    actualTotal: null,
    status: "pending",
    boughtAt: null,
    store: "",
  };
}

function daysBetween(later: Date, earlier: Date): number {
  const utc = (date: Date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.round((utc(later) - utc(earlier)) / 86400000);
}

export function daysOfStock(product: Product, lines: ShopLine[], _people: number, now: Date): number | null {
  if (product.onHand != null) {
    if (product.onHand <= 0) return 0;
    const perUnit = product.coverageDays > 0 ? product.coverageDays : 30;
    return Math.round(product.onHand * perUnit);
  }
  const last = lines
    .filter((line) => line.productId === product.id && line.status === "bought" && line.boughtAt)
    .sort((a, b) => (b.boughtAt ?? "").localeCompare(a.boughtAt ?? ""))[0];
  if (!last?.boughtAt || last.qtyBought <= 0 || product.coverageDays <= 0) return null;
  const covered = product.coverageDays * last.qtyBought;
  return Math.round(covered - daysBetween(now, new Date(last.boughtAt)));
}

export function buildInsights(input: {
  lines: ShopLine[];
  products: Product[];
  categories: Category[];
  month: string;
  budget: number;
  people: number;
  now?: Date;
  limitName?: string;
  pace?: boolean;
}): Insight[] {
  const now = input.now ?? new Date();
  const totals = summarizeMonth(input.lines, input.month, input.budget);
  const insights: Insight[] = [];
  const isCurrent = input.month === currentMonthKey(now);

  if (totals.count === 0) {
    return [
      {
        id: "empty",
        tone: "neutral",
        title: "O mês ainda está vazio",
        detail: "Cadastre os produtos da casa e monte a lista deste mês.",
      },
    ];
  }

  const name = input.limitName ?? "vale";
  const hasLimit = input.budget > 0 || name === "cartão";

  if (hasLimit && totals.projected > input.budget) {
    insights.push({
      id: "over",
      tone: "warn",
      title: `A lista passa do ${name}`,
      detail: `Se comprar tudo, ${monthLabel(input.month)} fica em ${formatMoney(totals.projected)}. São ${formatMoney(totals.projected - input.budget)} a mais.`,
    });
  } else if (hasLimit && totals.projected > 0) {
    insights.push({
      id: "fit",
      tone: "good",
      title: isCurrent ? `Cabe no ${name}` : `Ficou dentro do ${name}`,
      detail: `A previsão é ${formatMoney(totals.projected)}. Sobram ${formatMoney(input.budget - totals.projected)}.`,
    });
  }

  if (input.pace !== false && isCurrent && input.budget > 0 && totals.actual > 0) {
    const day = now.getDate();
    const days = daysInMonth(input.month);
    const pace = input.budget * (day / days);
    if (totals.actual > pace * 1.12) {
      insights.push({
        id: "pace",
        tone: "warn",
        title: "Gastando rápido demais",
        detail: `Dia ${day} de ${days} e já foram ${formatMoney(totals.actual)}. Nesse ritmo, o limite de hoje seria ${formatMoney(pace)}.`,
      });
    }
  }

  const slices = categorySlices(input.lines, input.categories, input.month);
  const pendingLeader = [...slices].sort((a, b) => b.pending - a.pending)[0];
  if (pendingLeader && pendingLeader.pending >= 40) {
    insights.push({
      id: `pending-${pendingLeader.categoryId}`,
      tone: "neutral",
      title: `${pendingLeader.name} ainda está na lista`,
      detail: `Ainda faltam cerca de ${formatMoney(pendingLeader.pending)} nessa categoria.`,
    });
  }

  const leader = slices.find((slice) => slice.actual > 0);
  if (leader && leader.share >= 0.28) {
    insights.push({
      id: `share-${leader.categoryId}`,
      tone: "neutral",
      title: `${leader.name} pesa mais`,
      detail: `${Math.round(leader.share * 100)}% do que já foi pago foi para essa categoria.`,
    });
  }

  let spike: { name: string; pct: number; productId: string } | null = null;
  for (const line of monthLines(input.lines, input.month)) {
    const price = unitPriceOf(line);
    if (price == null) continue;
    const previous = input.lines
      .filter(
        (item) =>
          item.productId === line.productId &&
          item.monthKey < input.month &&
          unitPriceOf(item) != null,
      )
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))[0];
    const prevPrice = previous ? unitPriceOf(previous) : null;
    if (prevPrice == null || prevPrice <= 0) continue;
    const pct = (price - prevPrice) / prevPrice;
    if (pct >= 0.08 && (!spike || pct > spike.pct)) {
      spike = { name: line.name, pct, productId: line.productId };
    }
  }
  if (spike) {
    const alreadyPending = input.lines.some(
      (item) => item.productId === spike.productId && item.monthKey === input.month && item.status === "pending",
    );
    insights.push({
      id: `spike-${spike.productId}`,
      tone: "warn",
      title: `${spike.name} subiu de preço`,
      detail: `Está ${Math.round(spike.pct * 100)}% mais caro que da última vez.`,
      productId: alreadyPending ? undefined : spike.productId,
    });
  }

  for (const product of input.products) {
    const left = daysOfStock(product, input.lines, input.people, now);
    if (left == null || left > 5 || left < -3) continue;
    const pending = input.lines.some(
      (line) => line.productId === product.id && line.monthKey === input.month && line.status === "pending",
    );
    insights.push({
      id: `stock-${product.id}`,
      tone: left < 0 ? "warn" : "neutral",
      title: left < 0 ? `${product.name} deve ter acabado` : `${product.name} acaba em breve`,
      detail:
        left < 0
          ? pending
            ? "Pelo ritmo da casa, já acabou. Continua na lista."
            : "Pelo ritmo da casa, já acabou. Vale colocar de novo na lista."
          : pending
            ? `Deve durar mais ${left} dia${left === 1 ? "" : "s"}. Já está na lista.`
            : `Deve durar mais ${left} dia${left === 1 ? "" : "s"}.`,
      productId: pending ? undefined : product.id,
    });
    break;
  }

  const order = { warn: 0, neutral: 1, good: 2 };
  return insights.sort((a, b) => order[a.tone] - order[b.tone]).slice(0, 4);
}

export function consumptionRows(
  products: Product[],
  lines: ShopLine[],
  people: number,
): ConsumptionRow[] {
  return products
    .map((product) => {
      const byMonth = new Map<string, { qty: number; spend: number }>();
      const bought = lines.filter((line) => line.productId === product.id && line.status === "bought");
      for (const line of bought) {
        const current = byMonth.get(line.monthKey) ?? { qty: 0, spend: 0 };
        current.qty += line.qtyBought;
        current.spend += line.actualTotal ?? 0;
        byMonth.set(line.monthKey, current);
      }
      const months = [...byMonth.values()];
      const avgQty = months.length
        ? months.reduce((sum, row) => sum + row.qty, 0) / months.length
        : 0;
      const avgSpend = months.length
        ? months.reduce((sum, row) => sum + row.spend, 0) / months.length
        : 0;
      const suggestion = suggestQty(product, lines, people);
      return {
        productId: product.id,
        name: product.name,
        unit: product.unit,
        categoryId: product.categoryId,
        months: months.length,
        avgQty: roundQty(avgQty || suggestion.qty),
        avgSpend: round2(avgSpend),
        lastUnitPrice: suggestPrice(product, lines),
        suggestedQty: suggestion.qty,
        suggestedPrice: suggestPrice(product, lines),
        reason: suggestion.reason,
      };
    })
    .sort((a, b) => b.avgSpend - a.avgSpend);
}

export function productHistory(lines: ShopLine[], productId: string): ShopLine[] {
  return lines
    .filter((line) => line.productId === productId && line.status === "bought")
    .sort((a, b) => b.monthKey.localeCompare(a.monthKey) || (b.boughtAt ?? "").localeCompare(a.boughtAt ?? ""));
}
