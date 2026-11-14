import type { Category, Settings, Snapshot, ThemeMode } from "@/lib/casa/types";
import { defaultSettings } from "@/lib/casa/types";

export const SUGGESTED_STORES = ["Mercado", "Feira", "Padaria", "Açougue", "Farmácia"];

const DEMO_IDS = new Set([
  "p-arroz",
  "p-feijao",
  "p-cafe",
  "p-oleo",
  "p-acucar",
  "p-macarrao",
  "p-molho",
  "p-azeite",
  "p-biscoito",
  "p-banana",
  "p-tomate",
  "p-cebola",
  "p-batata",
  "p-alface",
  "p-limao",
  "p-frango",
  "p-patinho",
  "p-linguica",
  "p-ovos",
  "p-leite",
  "p-queijo",
  "p-manteiga",
  "p-iogurte",
  "p-detergente",
  "p-sabao",
  "p-papel",
  "p-desinf",
  "p-amaciante",
  "p-sabonete",
  "p-shampoo",
  "p-pasta",
  "p-pao",
]);

export function starterCategories(): Category[] {
  return [
    { id: "cat-horti", name: "Hortifruti", icon: "apple", swatch: "terra", order: 0 },
    { id: "cat-merc", name: "Mercearia", icon: "wheat", swatch: "gold", order: 1 },
    { id: "cat-prot", name: "Proteínas", icon: "beef", swatch: "clay", order: 2 },
    { id: "cat-latic", name: "Laticínios", icon: "milk", swatch: "sand", order: 3 },
    { id: "cat-limp", name: "Limpeza", icon: "spray", swatch: "ink", order: 4 },
    { id: "cat-hig", name: "Higiene", icon: "droplets", swatch: "bark", order: 5 },
    { id: "cat-pad", name: "Padaria", icon: "croissant", swatch: "gold", order: 6 },
  ];
}

export function emptyHome(theme?: ThemeMode, settings?: Settings): Snapshot {
  return {
    settings: { ...defaultSettings, ...settings, theme: theme ?? settings?.theme ?? defaultSettings.theme },
    categories: starterCategories(),
    products: [],
    lines: [],
  };
}

export function isUntouchedDemo(snapshot: Snapshot): boolean {
  if (snapshot.products.length === 0) return false;
  return snapshot.products.every((product) => DEMO_IDS.has(product.id));
}
