import { clamp } from "@/lib/casa/format";
import type { Category, LineStatus, Product, Settings, ShopLine, Snapshot, Swatch, ThemeMode } from "@/lib/casa/types";

const SWATCHES = new Set<Swatch>(["terra", "gold", "clay", "sand", "ink", "bark"]);
const STATUSES = new Set<LineStatus>(["pending", "bought", "skipped"]);

function themeOf(value: unknown): ThemeMode {
  return value === "light" || value === "dark" || value === "system" ? value : "system";
}

function num(value: unknown, fallback = 0): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeSnapshot(raw: unknown): Snapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<Snapshot>;
  if (!value.settings || !Array.isArray(value.categories) || !Array.isArray(value.products) || !Array.isArray(value.lines)) {
    return null;
  }
  const settings: Settings = {
    householdName: String(value.settings.householdName || "Minha casa").slice(0, 48),
    people: clamp(Math.round(num(value.settings.people, 1)), 1, 12),
    monthlyBudget: Math.max(0, num(value.settings.monthlyBudget, 0)),
    theme: themeOf(value.settings.theme),
  };
  const categories: Category[] = value.categories
    .filter((category) => category && typeof category.id === "string" && typeof category.name === "string")
    .map((category, index) => ({
      id: category.id,
      name: category.name.slice(0, 40),
      icon: typeof category.icon === "string" ? category.icon : "basket",
      swatch: SWATCHES.has(category.swatch) ? category.swatch : "terra",
      order: Number.isFinite(category.order) ? category.order : index,
    }));
  const products: Product[] = value.products
    .filter((product) => product && typeof product.id === "string" && typeof product.name === "string")
    .map((product) => ({
      id: product.id,
      name: product.name.slice(0, 80),
      categoryId: String(product.categoryId ?? ""),
      unit: String(product.unit ?? "un").slice(0, 24),
      defaultQty: Math.max(0.5, num(product.defaultQty, 1)),
      estimatedUnitPrice: Math.max(0, num(product.estimatedUnitPrice, 0)),
      coverageDays: Math.max(1, num(product.coverageDays, 30)),
      recurring: Boolean(product.recurring),
      createdAt: typeof product.createdAt === "string" ? product.createdAt : new Date().toISOString(),
    }));
  const lines: ShopLine[] = value.lines
    .filter((line) => line && typeof line.id === "string" && typeof line.monthKey === "string")
    .map((line) => {
      const status = STATUSES.has(line.status) ? line.status : "pending";
      return {
        id: line.id,
        monthKey: line.monthKey,
        productId: String(line.productId ?? ""),
        categoryId: String(line.categoryId ?? ""),
        name: String(line.name ?? "Item").slice(0, 80),
        unit: String(line.unit ?? "un").slice(0, 24),
        qtyPlanned: Math.max(0, num(line.qtyPlanned, 1)),
        estimatedUnitPrice: Math.max(0, num(line.estimatedUnitPrice, 0)),
        qtyBought: Math.max(0, num(line.qtyBought, 0)),
        actualTotal: line.actualTotal == null ? null : Math.max(0, num(line.actualTotal, 0)),
        status,
        boughtAt: typeof line.boughtAt === "string" ? line.boughtAt : null,
        store: String(line.store ?? "").slice(0, 40),
      };
    });
  return { settings, categories, products, lines };
}
