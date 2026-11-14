import { currentMonthKey, shiftMonth } from "@/lib/casa/format";
import { starterCategories } from "@/lib/casa/seed";
import type { Product, ShopLine, Snapshot } from "@/lib/casa/types";

const VISIT_KEY = "casaflow-visit";

export function visitRequested(pathname: string): boolean {
  return pathname === "/visita";
}

export function visitOn(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(VISIT_KEY) === "1";
}

export function markVisit() {
  sessionStorage.setItem(VISIT_KEY, "1");
}

export function clearVisit() {
  sessionStorage.removeItem(VISIT_KEY);
}

function product(partial: Product): Product {
  return partial;
}

function line(partial: ShopLine): ShopLine {
  return partial;
}

export function visitSnapshot(now = new Date()): Snapshot {
  const month = currentMonthKey(now);
  const previous = shiftMonth(month, -1);
  const older = shiftMonth(month, -2);
  const products: Product[] = [
    product({ id: "visit-arroz", name: "Arroz", categoryId: "cat-merc", unit: "kg", defaultQty: 5, estimatedUnitPrice: 6.5, coverageDays: 30, coverageSamples: 2, recurring: true, createdAt: now.toISOString(), onHand: 3 }),
    product({ id: "visit-feijao", name: "Feijão", categoryId: "cat-merc", unit: "kg", defaultQty: 1, estimatedUnitPrice: 8, coverageDays: 28, coverageSamples: 2, recurring: true, createdAt: now.toISOString(), onHand: 1 }),
    product({ id: "visit-oleo", name: "Óleo", categoryId: "cat-merc", unit: "un", defaultQty: 1, estimatedUnitPrice: 8.5, coverageDays: 21, coverageSamples: 2, recurring: true, createdAt: now.toISOString(), onHand: 1 }),
    product({ id: "visit-cafe", name: "Café", categoryId: "cat-merc", unit: "un", defaultQty: 1, estimatedUnitPrice: 18, coverageDays: 25, coverageSamples: 1, recurring: true, createdAt: now.toISOString(), onHand: 1 }),
    product({ id: "visit-carne", name: "Carne", categoryId: "cat-prot", unit: "kg", defaultQty: 2, estimatedUnitPrice: 42, coverageDays: 10, coverageSamples: 2, recurring: true, createdAt: now.toISOString(), onHand: 1.5 }),
    product({ id: "visit-tomate", name: "Tomate", categoryId: "cat-horti", unit: "kg", defaultQty: 1, estimatedUnitPrice: 7, coverageDays: 8, coverageSamples: 1, recurring: true, createdAt: now.toISOString(), onHand: 0.8 }),
    product({ id: "visit-leite", name: "Leite", categoryId: "cat-latic", unit: "un", defaultQty: 12, estimatedUnitPrice: 5.2, coverageDays: 2, coverageSamples: 2, recurring: true, createdAt: now.toISOString(), onHand: 4 }),
    product({ id: "visit-sabao", name: "Sabão em pó", categoryId: "cat-limp", unit: "un", defaultQty: 1, estimatedUnitPrice: 22, coverageDays: 35, coverageSamples: 1, recurring: true, createdAt: now.toISOString(), onHand: 1 }),
  ];
  const lines: ShopLine[] = [
    bought("visit-arroz", "Arroz", "cat-merc", "kg", previous, 5, 32, 40),
    bought("visit-feijao", "Feijão", "cat-merc", "kg", previous, 2, 8, 50),
    bought("visit-oleo", "Óleo", "cat-merc", "un", previous, 2, 8.5, 55),
    bought("visit-carne", "Carne", "cat-prot", "kg", previous, 3, 40, 20),
    bought("visit-leite", "Leite", "cat-latic", "un", previous, 12, 5, 15),
    bought("visit-arroz", "Arroz", "cat-merc", "kg", older, 5, 6.2, 70),
    bought("visit-oleo", "Óleo", "cat-merc", "un", older, 2, 8, 80),
    bought("visit-carne", "Carne", "cat-prot", "kg", month, 2, 42, 6),
    bought("visit-leite", "Leite", "cat-latic", "un", month, 8, 5.2, 4),
    pending("visit-oleo", "Óleo", "cat-merc", "un", month, 1, 8.5),
    pending("visit-sabao", "Sabão em pó", "cat-limp", "un", month, 1, 22),
    pending("visit-tomate", "Tomate", "cat-horti", "kg", month, 1, 7),
  ];
  return {
    settings: {
      householdName: "Casa da visita",
      people: 2,
      monthlyBudget: 1500,
      theme: "system",
      listMode: "completa",
    },
    categories: starterCategories(),
    products,
    lines,
    stock: [
      { id: "visit-stock-oleo", productId: "visit-oleo", at: new Date(now.getTime() - 21 * 86400000).toISOString(), kind: "finished", qty: 0 },
    ],
  };

  function bought(id: string, name: string, categoryId: string, unit: string, monthKey: string, qty: number, price: number, daysAgo: number): ShopLine {
    const when = new Date(now.getTime() - daysAgo * 86400000).toISOString();
    return line({
      id: `${id}-${monthKey}`,
      monthKey,
      productId: id,
      categoryId,
      name,
      unit,
      qtyPlanned: qty,
      estimatedUnitPrice: price,
      qtyBought: qty,
      actualTotal: Math.round(qty * price * 100) / 100,
      status: "bought",
      boughtAt: when,
      store: "Mercado",
    });
  }

  function pending(id: string, name: string, categoryId: string, unit: string, monthKey: string, qty: number, price: number): ShopLine {
    return line({
      id: `${id}-${monthKey}-falta`,
      monthKey,
      productId: id,
      categoryId,
      name,
      unit,
      qtyPlanned: qty,
      estimatedUnitPrice: price,
      qtyBought: 0,
      actualTotal: null,
      status: "pending",
      boughtAt: null,
      store: "",
    });
  }
}
