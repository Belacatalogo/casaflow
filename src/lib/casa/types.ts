export type ThemeMode = "light" | "dark" | "system";

export type Swatch = "terra" | "gold" | "clay" | "sand" | "ink" | "bark";

export type Settings = {
  householdName: string;
  people: number;
  monthlyBudget: number;
  theme: ThemeMode;
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
  /** Days one unit lasts in a household of 3. */
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
};

export type Snapshot = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  lines: ShopLine[];
};

export const defaultSettings: Settings = {
  householdName: "Casa da família",
  people: 3,
  monthlyBudget: 2200,
  theme: "system",
};
