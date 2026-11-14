import assert from "node:assert/strict";
import test from "node:test";
import { guessProduct, sameProductName } from "./classify.ts";
import { parseReceiptDocument, parseTextLine } from "./receipt.ts";

test("óleo, leite, arroz e sabão caem na categoria certa", () => {
  assert.equal(guessProduct("Óleo")?.icon, "wheat");
  assert.equal(guessProduct("lata de leite")?.icon, "milk");
  assert.equal(guessProduct("Arroz tipo 1")?.icon, "wheat");
  assert.equal(guessProduct("sabão em pó")?.icon, "spray");
  assert.equal(guessProduct("água sanitária")?.icon, "spray");
  assert.equal(guessProduct("pão francês")?.icon, "croissant");
  assert.equal(guessProduct("banana prata")?.unit, "kg");
});

test("não confunde sabão com sabonete nem pão com sabão", () => {
  assert.equal(guessProduct("sabonete")?.icon, "droplets");
  assert.equal(guessProduct("sabão")?.icon, "spray");
});

test("reconhece o mesmo produto com acento", () => {
  assert.equal(sameProductName("Óleo", "OLEO DE SOJA 900ML"), true);
  assert.equal(sameProductName("sal", "salgadinho"), false);
});

test("lê itens e ignora o total da nota", () => {
  const text = [
    "ARROZ TIPO 1 5KG 1 UN 28,90 28,90",
    "LEITE INTEGRAL 12 UN 5,49 65,88",
    "OLEO DE SOJA 900ML 1 UN 7,99",
    "Valor Total 102,77",
  ].join("\n");
  const items = parseReceiptDocument(text);
  assert.equal(items.length, 3);
  assert.equal(items[0]?.name.startsWith("Arroz"), true);
  assert.equal(items[0]?.total, 28.9);
  assert.equal(items[1]?.qty, 12);
  assert.equal(items[1]?.total, 65.88);
  assert.equal(parseTextLine("Valor Total 102,77"), null);
});
