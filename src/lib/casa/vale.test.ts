import assert from "node:assert/strict";
import test from "node:test";
import { businessDays, isBusinessDay, monthVale } from "./vale.ts";

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
