import assert from "node:assert/strict";
import test from "node:test";
import { measureUse } from "./stock.ts";
import type { Product, ShopLine } from "./types.ts";

const meat: Product = {
  id: "meat",
  name: "Carne",
  categoryId: "c",
  unit: "kg",
  defaultQty: 1,
  estimatedUnitPrice: 40,
  coverageDays: 7,
  recurring: true,
  createdAt: "2026-01-01T00:00:00.000Z",
};

function purchase(daysAgo: number, qty: number): ShopLine {
  const when = new Date("2026-11-14T12:00:00.000Z");
  when.setDate(when.getDate() - daysAgo);
  return {
    id: `b-${daysAgo}`,
    monthKey: "2026-10",
    productId: "meat",
    categoryId: "c",
    name: "Carne",
    unit: "kg",
    qtyPlanned: qty,
    estimatedUnitPrice: 40,
    qtyBought: qty,
    actualTotal: qty * 40,
    status: "bought",
    boughtAt: when.toISOString(),
    store: "",
  };
}

test("quando acaba, aprende quantos dias dura cada quilo", () => {
  const now = new Date("2026-11-14T12:00:00.000Z");
  const learned = measureUse(meat, [purchase(20, 2)], [], now, { kind: "finished", qty: 0 });
  assert.equal(learned?.coverageDays, 10);
  assert.equal(learned?.samples, 1);
});

test("o que sobrou entra na conta do que foi usado", () => {
  const now = new Date("2026-11-14T12:00:00.000Z");
  const learned = measureUse(meat, [purchase(30, 5)], [], now, { kind: "remaining", qty: 2 });
  assert.equal(learned?.coverageDays, 10);
});
