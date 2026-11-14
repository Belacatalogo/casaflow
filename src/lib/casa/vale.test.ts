import assert from "node:assert/strict";
import test from "node:test";
import { businessDays, cardPosition, creditsBetween, isBusinessDay, lastBusinessDay, monthVale } from "./vale.ts";

test("novembro de 2026 tira Finados e Consciência Negra", () => {
  assert.equal(isBusinessDay(2026, 11, 2), false);
  assert.equal(isBusinessDay(2026, 11, 3), true);
  assert.equal(isBusinessDay(2026, 11, 14), false);
  assert.equal(isBusinessDay(2026, 11, 20), false);
  assert.equal(businessDays("2026-11"), 19);
  assert.equal(monthVale(30, "2026-11").total, 570);
});

test("dezembro de 2026 tira só o Natal no meio da semana", () => {
  assert.equal(businessDays("2026-12"), 22);
  assert.equal(monthVale(30, "2026-12").total, 660);
});

test("carnaval e Corpus Christi não entram; quarta de cinzas entra", () => {
  assert.equal(isBusinessDay(2026, 2, 16), false);
  assert.equal(isBusinessDay(2026, 2, 17), false);
  assert.equal(isBusinessDay(2026, 2, 18), true);
  assert.equal(isBusinessDay(2026, 4, 3), false);
  assert.equal(isBusinessDay(2026, 6, 4), false);
  assert.equal(businessDays("2026-02"), 18);
});

test("feriados de Goiânia: 24 de maio e 24 de outubro", () => {
  assert.equal(isBusinessDay(2026, 5, 1), false);
  assert.equal(businessDays("2026-05"), 20);
  assert.equal(isBusinessDay(2026, 10, 12), false);
  assert.equal(isBusinessDay(2026, 10, 28), true);
  assert.equal(businessDays("2026-10"), 21);
});

test("o crédito do mês seguinte cai no último dia útil", () => {
  assert.equal(lastBusinessDay("2026-11"), "2026-11-30");
  assert.equal(lastBusinessDay("2026-10"), "2026-10-30");
  assert.equal(lastBusinessDay("2026-02"), "2026-02-27");
  const none = creditsBetween(30, "2026-11-14", "2026-11-14");
  assert.equal(none.length, 0);
  const december = creditsBetween(30, "2026-11-14", "2026-11-30");
  assert.equal(december.length, 1);
  assert.equal(december[0].forMonth, "2026-12");
  assert.equal(december[0].amount, 660);
  const alreadyIn = creditsBetween(30, "2026-11-30", "2026-12-01");
  assert.equal(alreadyIn.length, 0);
});

test("o saldo informado não conta compra antiga e recebe o crédito depois", () => {
  const anchorAt = new Date(2026, 10, 14, 12).toISOString();
  const lines = [
    { status: "bought", boughtAt: new Date(2026, 10, 10, 12).toISOString(), actualTotal: 40 },
    { status: "bought", boughtAt: new Date(2026, 10, 16, 12).toISOString(), actualTotal: 12.5 },
    { status: "bought", boughtAt: new Date(2026, 10, 16, 13).toISOString(), actualTotal: 20, offCard: true },
  ];
  const today = cardPosition({ daily: 30, anchor: 80, anchorAt, lines, now: new Date(2026, 10, 16, 18) });
  assert.equal(today.spent, 12.5);
  assert.equal(today.credited, 0);
  assert.equal(today.balance, 67.5);
  const afterPay = cardPosition({ daily: 30, anchor: 80, anchorAt, lines, now: new Date(2026, 10, 30, 18) });
  assert.equal(afterPay.credited, 660);
  assert.equal(afterPay.balance, 727.5);
});
