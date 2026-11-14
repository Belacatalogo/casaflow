import Dexie, { type Table } from "dexie";
import type { Category, Product, Settings, ShopLine, Snapshot } from "@/lib/casa/types";

type MetaRow = { id: string; value: string };

class CasaDB extends Dexie {
  categories!: Table<Category, string>;
  products!: Table<Product, string>;
  lines!: Table<ShopLine, string>;
  meta!: Table<MetaRow, string>;

  constructor() {
    super("casaflow");
    this.version(1).stores({
      categories: "id, order",
      products: "id, categoryId",
      lines: "id, monthKey, productId, status",
      meta: "id",
    });
  }
}

const LS_SNAPSHOT = "casaflow-snapshot";
const LS_SETTINGS = "casaflow-settings";
const LS_THEME = "casaflow-theme";

let db: CasaDB | null = null;
let mode: "idb" | "local" = "idb";
let queue: Promise<void> = Promise.resolve();

function getDb(): CasaDB {
  if (!db) db = new CasaDB();
  return db;
}

export function readThemePreference(): Settings["theme"] | null {
  if (typeof localStorage === "undefined") return null;
  const value = localStorage.getItem(LS_THEME);
  if (value === "light" || value === "dark" || value === "system") return value;
  return null;
}

export function applyTheme(theme: Settings["theme"]) {
  if (typeof document === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) meta.setAttribute("content", bg);
  }
  try {
    localStorage.setItem(LS_THEME, theme);
  } catch {
    /* ignore quota */
  }
}

async function readIdb(): Promise<Snapshot | null> {
  const database = getDb();
  const seeded = await database.meta.get("seeded");
  if (!seeded) return null;
  const [categories, products, lines, settingsRow, stockRow] = await Promise.all([
    database.categories.toArray(),
    database.products.toArray(),
    database.lines.toArray(),
    database.meta.get("settings"),
    database.meta.get("stock"),
  ]);
  if (!settingsRow) return null;
  const settings = JSON.parse(settingsRow.value) as Settings;
  const stock = stockRow ? (JSON.parse(stockRow.value) as Snapshot["stock"]) : [];
  return { settings, categories, products, lines, stock };
}

function readLocal(): Snapshot | null {
  const raw = localStorage.getItem(LS_SNAPSHOT);
  if (!raw) return null;
  return JSON.parse(raw) as Snapshot;
}

export async function loadSnapshot(): Promise<Snapshot | null> {
  try {
    const snapshot = await readIdb();
    mode = "idb";
    return snapshot;
  } catch {
    mode = "local";
    try {
      return readLocal();
    } catch {
      return null;
    }
  }
}

async function writeNow(snapshot: Snapshot) {
  localStorage.setItem(LS_SETTINGS, JSON.stringify(snapshot.settings));
  localStorage.setItem(LS_THEME, snapshot.settings.theme);
  if (mode === "local") {
    localStorage.setItem(LS_SNAPSHOT, JSON.stringify(snapshot));
    return;
  }
  const database = getDb();
  await database.transaction("rw", database.categories, database.products, database.lines, database.meta, async () => {
    await database.categories.clear();
    await database.products.clear();
    await database.lines.clear();
    await database.categories.bulkAdd(snapshot.categories);
    await database.products.bulkAdd(snapshot.products);
    await database.lines.bulkAdd(snapshot.lines);
    await database.meta.put({ id: "settings", value: JSON.stringify(snapshot.settings) });
    await database.meta.put({ id: "stock", value: JSON.stringify(snapshot.stock ?? []) });
    await database.meta.put({ id: "seeded", value: "1" });
  });
}

export function commitSnapshot(snapshot: Snapshot) {
  const copy = structuredClone(snapshot);
  queue = queue
    .catch(() => undefined)
    .then(() => writeNow(copy))
    .catch(() => {
      mode = "local";
      localStorage.setItem(LS_SNAPSHOT, JSON.stringify(copy));
    });
  return queue;
}
