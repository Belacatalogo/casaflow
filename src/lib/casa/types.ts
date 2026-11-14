export type ThemeMode = "light" | "dark" | "system";

export type ListMode = "completa" | "economia" | "acabando";

export type Swatch = "terra" | "gold" | "clay" | "sand" | "ink" | "bark";

export type Settings = {
  householdName: string;
  people: number;
  monthlyBudget: number;
  /** Reais do vale por dia útil. O saldo do mês é esse valor vezes os dias úteis. */
  mealDaily: number;
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
  /** How many real measurements produced coverageDays. Zero means it is still a guess. */
  coverageSamples?: number;
  recurring: boolean;
  createdAt: string;
  /** Quantity still at home, in the product unit. Unknown until a purchase or a count. */
  onHand?: number;
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

export type StockEvent = {
  id: string;
  productId: string;
  at: string;
  kind: "finished" | "remaining";
  qty: number;
};

export type Snapshot = {
  settings: Settings;
  categories: Category[];
  products: Product[];
  lines: ShopLine[];
  stock: StockEvent[];
};

export const defaultSettings: Settings = {
  householdName: "Minha casa",
  people: 1,
  monthlyBudget: 0,
  mealDaily: 30,
  theme: "system",
  listMode: "completa",
};
