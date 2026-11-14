export type ThemeMode = "light" | "dark" | "system";

export type ListMode = "completa" | "economia" | "acabando";

export type Swatch = "terra" | "gold" | "clay" | "sand" | "ink" | "bark";

export type Settings = {
  householdName: string;
  people: number;
  monthlyBudget: number;
  theme: ThemeMode;
  listMode: ListMode;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  swatch: Swatch;
  order: number;
};

export type Product = {
  id: string;
  name: string;
  categoryId: string;
  unit: string;
  defaultQty: number;
  estimatedUnitPrice: number;
  /** Days one unit lasts in this household. */
  coverageDays: number;
  recurring: boolean;
  createdAt: string;
};

export type LineStatus = "pending" | "bought" | "skipped";

export type ShopLine = {
  id: string;
  monthKey: string;
  productId: string;
  categoryId: string;
  name: string;
  unit: string;
  qtyPlanned: number;
  estimatedUnitPrice: number;
  qtyBought: number;
  actualTotal: number | null;
  status: LineStatus;
  boughtAt: string | null;
  store: string;
  /** Kept on the list even in Economia or Acabando. */
  hold?: boolean;
};

export type Snapshot = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  lines: ShopLine[];
};

export const defaultSettings: Settings = {
  householdName: "Minha casa",
  people: 1,
  monthlyBudget: 0,
  theme: "system",
  listMode: "completa",
};
