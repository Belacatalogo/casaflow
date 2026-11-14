import { daysInMonth, hashUnit, monthKey, round2, roundQty, shiftMonth } from "@/lib/casa/format";
import type { Category, Product, Settings, ShopLine, Snapshot } from "@/lib/casa/types";

type Spec = {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  qty: number;
  price: number;
  days: number;
  every?: number;
};

const CATEGORIES: Category[] = [
  { id: "cat-horti", name: "Hortifruti", icon: "apple", swatch: "terra", order: 0 },
  { id: "cat-merc", name: "Mercearia", icon: "wheat", swatch: "gold", order: 1 },
  { id: "cat-prot", name: "Proteínas", icon: "beef", swatch: "clay", order: 2 },
  { id: "cat-latic", name: "Laticínios", icon: "milk", swatch: "sand", order: 3 },
  { id: "cat-limp", name: "Limpeza", icon: "spray", swatch: "ink", order: 4 },
  { id: "cat-hig", name: "Higiene", icon: "droplets", swatch: "bark", order: 5 },
  { id: "cat-pad", name: "Padaria", icon: "croissant", swatch: "gold", order: 6 },
];

const SPECS: Spec[] = [
  { id: "p-arroz", name: "Arroz tipo 1", categoryId: "cat-merc", unit: "pct 5 kg", qty: 2, price: 34.9, days: 22 },
  { id: "p-feijao", name: "Feijão carioca", categoryId: "cat-merc", unit: "kg", qty: 3, price: 8.9, days: 12 },
  { id: "p-cafe", name: "Café torrado 500 g", categoryId: "cat-merc", unit: "pct", qty: 4, price: 22.9, days: 12 },
  { id: "p-oleo", name: "Óleo de soja", categoryId: "cat-merc", unit: "un 900 ml", qty: 3, price: 7.9, days: 15 },
  { id: "p-acucar", name: "Açúcar cristal", categoryId: "cat-merc", unit: "kg", qty: 2, price: 5.2, days: 20 },
  { id: "p-macarrao", name: "Macarrão espaguete", categoryId: "cat-merc", unit: "pct 500 g", qty: 6, price: 4.6, days: 8 },
  { id: "p-molho", name: "Molho de tomate", categoryId: "cat-merc", unit: "un", qty: 6, price: 3.5, days: 8 },
  { id: "p-azeite", name: "Azeite extra virgem", categoryId: "cat-merc", unit: "un 500 ml", qty: 1, price: 38.9, days: 45, every: 2 },
  { id: "p-biscoito", name: "Biscoito cream cracker", categoryId: "cat-merc", unit: "pct", qty: 4, price: 5.9, days: 12 },
  { id: "p-banana", name: "Banana prata", categoryId: "cat-horti", unit: "kg", qty: 5, price: 6.9, days: 6 },
  { id: "p-tomate", name: "Tomate italiano", categoryId: "cat-horti", unit: "kg", qty: 3, price: 8.4, days: 7 },
  { id: "p-cebola", name: "Cebola", categoryId: "cat-horti", unit: "kg", qty: 2, price: 5.4, days: 18 },
  { id: "p-batata", name: "Batata inglesa", categoryId: "cat-horti", unit: "kg", qty: 4, price: 4.9, days: 12 },
  { id: "p-alface", name: "Alface crespa", categoryId: "cat-horti", unit: "un", qty: 4, price: 3.8, days: 4 },
  { id: "p-limao", name: "Limão tahiti", categoryId: "cat-horti", unit: "kg", qty: 1, price: 6.5, days: 14 },
  { id: "p-frango", name: "Frango inteiro", categoryId: "cat-prot", unit: "kg", qty: 6, price: 14.9, days: 7 },
  { id: "p-patinho", name: "Patinho moído", categoryId: "cat-prot", unit: "kg", qty: 3, price: 42.9, days: 10 },
  { id: "p-linguica", name: "Linguiça toscana", categoryId: "cat-prot", unit: "kg", qty: 2, price: 27.9, days: 12 },
  { id: "p-ovos", name: "Ovos brancos", categoryId: "cat-prot", unit: "dz", qty: 4, price: 14.5, days: 5 },
  { id: "p-leite", name: "Leite integral", categoryId: "cat-latic", unit: "L", qty: 18, price: 5.69, days: 2 },
  { id: "p-queijo", name: "Queijo mussarela", categoryId: "cat-latic", unit: "kg", qty: 0.8, price: 49.9, days: 16 },
  { id: "p-manteiga", name: "Manteiga com sal", categoryId: "cat-latic", unit: "un 200 g", qty: 2, price: 13.9, days: 16 },
  { id: "p-iogurte", name: "Iogurte natural", categoryId: "cat-latic", unit: "un", qty: 8, price: 3.49, days: 5 },
  { id: "p-detergente", name: "Detergente neutro", categoryId: "cat-limp", unit: "un", qty: 4, price: 2.79, days: 12 },
  { id: "p-sabao", name: "Sabão em pó", categoryId: "cat-limp", unit: "cx 1,6 kg", qty: 2, price: 19.9, days: 20 },
  { id: "p-papel", name: "Papel higiênico 12 rolos", categoryId: "cat-limp", unit: "pct", qty: 2, price: 24.9, days: 20 },
  { id: "p-desinf", name: "Desinfetante", categoryId: "cat-limp", unit: "un 2 L", qty: 2, price: 8.4, days: 18 },
  { id: "p-amaciante", name: "Amaciante", categoryId: "cat-limp", unit: "un 2 L", qty: 1, price: 16.9, days: 30 },
  { id: "p-sabonete", name: "Sabonete", categoryId: "cat-hig", unit: "un", qty: 8, price: 2.9, days: 6 },
  { id: "p-shampoo", name: "Shampoo", categoryId: "cat-hig", unit: "un 350 ml", qty: 1, price: 22.9, days: 40, every: 2 },
  { id: "p-pasta", name: "Pasta de dente", categoryId: "cat-hig", unit: "un", qty: 2, price: 7.5, days: 25 },
  { id: "p-pao", name: "Pão francês", categoryId: "cat-pad", unit: "un", qty: 50, price: 1.25, days: 1 },
];

const PENDING = new Set([
  "p-banana",
  "p-alface",
  "p-limao",
  "p-patinho",
  "p-queijo",
  "p-manteiga",
  "p-iogurte",
  "p-papel",
  "p-desinf",
  "p-shampoo",
  "p-macarrao",
]);

const STORES: Record<string, string[]> = {
  "cat-horti": ["Sacolão da Praça", "Hortifruti Central"],
  "cat-merc": ["Assaí", "Atacadão"],
  "cat-prot": ["Açougue Bom Corte", "Assaí"],
  "cat-latic": ["Carrefour", "Laticínios Serra"],
  "cat-limp": ["Atacadão", "Assaí"],
  "cat-hig": ["Drogaria São Paulo", "Drogal"],
  "cat-pad": ["Padaria São Jorge"],
};

export const SUGGESTED_STORES = [
  "Assaí",
  "Atacadão",
  "Carrefour",
  "Sacolão da Praça",
  "Açougue Bom Corte",
  "Padaria São Jorge",
  "Drogaria São Paulo",
];

function included(spec: Spec, offset: number): boolean {
  const every = spec.every ?? 1;
  return Math.abs(offset) % every === 0;
}

export function buildSeed(now = new Date()): Snapshot {
  const current = monthKey(now);
  const createdAt = now.toISOString();
  const products: Product[] = SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    categoryId: spec.categoryId,
    unit: spec.unit,
    defaultQty: spec.qty,
    estimatedUnitPrice: spec.price,
    coverageDays: spec.days,
    recurring: true,
    createdAt,
  }));

  const lines: ShopLine[] = [];
  for (const offset of [-3, -2, -1, 0]) {
    const key = shiftMonth(current, offset);
    const dim = daysInMonth(key);
    const maxDay = offset === 0 ? Math.max(1, Math.min(dim, now.getDate())) : dim;
    const monthFactor = 1 + (3 + offset) * 0.03;
    for (const spec of SPECS) {
      if (!included(spec, offset)) continue;
      const pending = offset === 0 && PENDING.has(spec.id);
      const qty =
        offset === 0 ? spec.qty : roundQty(spec.qty * (0.86 + hashUnit(`${spec.id}:${key}:q`) * 0.28));
      let factor = 0.94 + hashUnit(`${spec.id}:${key}:p`) * 0.12;
      if (spec.id === "p-cafe" && offset === 0) factor = 1.16;
      if (spec.id === "p-cafe" && offset === -1) factor = 0.98;
      const actualUnit = round2(spec.price * factor * monthFactor);
      let day = 1 + Math.floor(hashUnit(`${spec.id}:${key}:d`) * Math.max(1, maxDay - 1));
      if (offset === 0 && spec.id === "p-ovos") day = Math.min(maxDay, 2);
      day = Math.min(maxDay, Math.max(1, day));
      const stores = STORES[spec.categoryId] ?? ["Mercado"];
      const store = stores[Math.floor(hashUnit(`${spec.id}:${key}:s`) * stores.length)] ?? stores[0];
      const boughtAt = new Date(
        Number(key.slice(0, 4)),
        Number(key.slice(5, 7)) - 1,
        day,
        11,
        15,
      ).toISOString();
      lines.push({
        id: `${key}:${spec.id}`,
        monthKey: key,
        productId: spec.id,
        categoryId: spec.categoryId,
        name: spec.name,
        unit: spec.unit,
        qtyPlanned: qty,
        estimatedUnitPrice: spec.price,
        qtyBought: pending ? 0 : qty,
        actualTotal: pending ? null : round2(qty * actualUnit),
        status: pending ? "pending" : "bought",
        boughtAt: pending ? null : boughtAt,
        store: pending ? "" : store,
      });
    }
  }

  const settings: Settings = {
    householdName: "Casa da família",
    people: 3,
    monthlyBudget: 1700,
    theme: "system",
  };

  return { settings, categories: CATEGORIES, products, lines };
}
