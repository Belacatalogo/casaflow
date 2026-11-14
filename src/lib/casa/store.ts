import { toast } from "sonner";
import { create } from "zustand";
import { categoryForGuess, guessProduct, sameProductName, tidyProductName } from "@/lib/casa/classify";
import { currentMonthKey, monthTitle, round2, shiftMonth } from "@/lib/casa/format";
import { planLine } from "@/lib/casa/logic";
import { applyPantryChange } from "@/lib/casa/stock";
import { adjustPantry, createHome, joinHome, loadHome, saveHome, type HomeState } from "@/lib/casa/home.functions";
import { visitSnapshot } from "@/lib/casa/visit";
import { emptyHome, isUntouchedDemo } from "@/lib/casa/seed";
import { applyTheme, commitSnapshot, loadSnapshot, readThemePreference } from "@/lib/casa/storage";
import {
  defaultSettings,
  type Category,
  type LineStatus,
  type Product,
  type Settings,
  type ShopLine,
  type Snapshot,
  type Swatch,
} from "@/lib/casa/types";

const MONTH_RE = /^\d{4}-\d{2}$/;

export type ProductInput = {
  name: string;
  categoryId: string;
  unit: string;
  defaultQty: number;
  estimatedUnitPrice: number;
  coverageDays: number;
  recurring: boolean;
};

type CasaState = Snapshot & {
  ready: boolean;
  error: string | null;
  viewMonth: string;
  hydrate: () => Promise<void>;
  setViewMonth: (month: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addCategory: (input: { name: string; icon: string; swatch: Swatch }) => void;
  updateCategory: (id: string, patch: Partial<Pick<Category, "name" | "icon" | "swatch">>) => void;
  removeCategory: (id: string) => void;
  saveProduct: (input: ProductInput, id?: string) => string;
  removeProduct: (id: string) => void;
  addProductToMonth: (productId: string, month?: string) => boolean;
  updateLine: (id: string, patch: Partial<ShopLine>) => void;
  markBought: (id: string, input: { qtyBought: number; actualTotal: number; store: string; offCard?: boolean }) => void;
  setStatus: (id: string, status: LineStatus) => void;
  removeLine: (id: string) => void;
  generateMonth: (month: string) => number;
  createPlanned: (
    month: string,
    drafts: { productId: string; qty: number; unitPrice: number }[],
  ) => number;
  clearData: () => Promise<void>;
  importSnapshot: (snapshot: Snapshot) => void;
  recordPurchases: (items: { name: string; qty: number; unit?: string; total: number; store?: string; offCard?: boolean }[]) => number;
  markFinished: (productId: string) => void;
  markRemaining: (productId: string, qty: number) => void;
  lowerPantry: (productId: string) => void;
  accessRole: "pending" | "owner" | "kitchen" | "none";
  homeCode: string;
  remoteStamp: string;
  visit: boolean;
  loadVisit: () => void;
  connectHome: () => Promise<void>;
  pullHome: () => Promise<void>;
  createHouse: () => Promise<void>;
  joinHouse: (code: string) => Promise<string | null>;
  changePantry: (productId: string, action: "down" | "out") => Promise<void>;
};

function snapshotOf(state: Pick<CasaState, "settings" | "categories" | "products" | "lines" | "stock">): Snapshot {
  return {
    settings: state.settings,
    categories: state.categories,
    products: state.products,
    lines: state.lines,
    stock: state.stock ?? [],
  };
}

function persist(get: () => CasaState) {
  if (get().visit) return;
  commitSnapshot(snapshotOf(get()));
  if (get().accessRole !== "owner") return;
  dirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void pushHome(get);
  }, 800);
}

let dirty = false;
let saveTimer: ReturnType<typeof setTimeout> | undefined;

async function pushHome(get: () => CasaState) {
  try {
    const result = await saveHome({ data: snapshotOf(get()) });
    dirty = false;
    useCasa.setState({ remoteStamp: result.updatedAt });
  } catch {
    dirty = true;
  }
}

function adoptHome(set: (partial: Partial<CasaState>) => void, get: () => CasaState, home: HomeState) {
  if (dirty && get().accessRole === "owner" && home.role === "owner") {
    set({ accessRole: home.role, homeCode: home.code });
    return;
  }
  const snapshot = home.snapshot;
  const next = {
    settings: { ...defaultSettings, ...snapshot.settings },
    categories: snapshot.categories,
    products: snapshot.products,
    lines: snapshot.lines,
    stock: snapshot.stock ?? [],
  };
  set({
    ...next,
    accessRole: home.role,
    homeCode: home.code,
    remoteStamp: home.updatedAt,
    ready: true,
  });
  applyTheme(next.settings.theme);
  commitSnapshot(next);
}

let started = false;

function initialMonth(): string {
  if (typeof localStorage === "undefined") return "";
  const stored = localStorage.getItem("casaflow-month");
  return stored && MONTH_RE.test(stored) ? stored : "";
}

function noteStock(
  get: () => CasaState,
  set: (partial: Partial<CasaState>) => void,
  productId: string,
  mark: { kind: "finished" | "remaining"; qty: number },
  addToList: boolean,
) {
  const product = get().products.find((item) => item.id === productId);
  const month = get().viewMonth;
  if (!product || !month) return;
  const at = new Date();
  const action = mark.kind === "finished" ? "out" : "set";
  const next = applyPantryChange(snapshotOf(get()), productId, action, mark.qty, month, at);
  const added = next.lines.length > get().lines.length;
  set({ products: next.products, stock: next.stock, lines: next.lines });
  persist(get);
  const learned = next.products.find((item) => item.id === productId);
  const duration = learned && (learned.coverageSamples ?? 0) > (product.coverageSamples ?? 0) ? ` Dura cerca de ${learned.coverageDays} dias.` : "";
  if (mark.kind === "remaining") {
    toast.success(`Anotei o que sobrou de ${product.name}.${duration}`);
    return;
  }
  toast.success(added ? `${product.name} acabou e entrou na lista.${duration}` : `${product.name} acabou.${duration}`);
}

export const useCasa = create<CasaState>((set, get) => ({
  ready: false,
  error: null,
  viewMonth: "",
  settings: { ...defaultSettings, theme: readThemePreference() ?? defaultSettings.theme },
  categories: [],
  products: [],
  lines: [],
  stock: [],
  accessRole: "pending",
  homeCode: "",
  remoteStamp: "",
  visit: false,

  hydrate: async () => {
    if (started) return;
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("casaflow-visit") === "1") {
      started = true;
      get().loadVisit();
      return;
    }
    started = true;
    try {
      let snapshot = await loadSnapshot();
      const theme = snapshot?.settings.theme ?? readThemePreference() ?? defaultSettings.theme;
      if (!snapshot || isUntouchedDemo(snapshot)) {
        snapshot = emptyHome(theme);
        await commitSnapshot(snapshot);
      }
      const storedMonth = initialMonth();
      applyTheme(snapshot.settings.theme);
      set({
        ...snapshot,
        settings: { ...defaultSettings, ...snapshot.settings },
        stock: snapshot.stock ?? [],
        ready: true,
        error: null,
        viewMonth: storedMonth || currentMonthKey(),
      });
    } catch {
      started = false;
      set({ ready: false, error: "Não foi possível abrir os dados neste celular." });
    }
  },

  setViewMonth: (month) => {
    set({ viewMonth: month });
    localStorage.setItem("casaflow-month", month);
  },

  updateSettings: (patch) => {
    const settings = { ...get().settings, ...patch };
    if (patch.people != null) settings.people = Math.min(12, Math.max(1, Math.round(patch.people)));
    if (patch.monthlyBudget != null) settings.monthlyBudget = Math.max(0, patch.monthlyBudget);
    if (patch.mealDaily != null) settings.mealDaily = Math.min(500, Math.max(0, patch.mealDaily));
    if (patch.cardBalance != null) settings.cardBalance = Math.max(0, patch.cardBalance);
    if (patch.cardSetAt != null) settings.cardSetAt = patch.cardSetAt;
    if (patch.householdName != null) settings.householdName = patch.householdName.slice(0, 48);
    set({ settings });
    if (patch.theme) applyTheme(settings.theme);
    persist(get);
  },

  addCategory: (input) => {
    const name = input.name.trim();
    if (name.length < 2) {
      toast("O nome da categoria precisa de pelo menos 2 letras.");
      return;
    }
    const category: Category = {
      id: crypto.randomUUID(),
      name,
      icon: input.icon,
      swatch: input.swatch,
      order: get().categories.length,
    };
    set({ categories: [...get().categories, category] });
    persist(get);
    toast.success("Categoria criada.");
  },

  updateCategory: (id, patch) => {
    set({
      categories: get().categories.map((category) =>
        category.id === id ? { ...category, ...patch, name: (patch.name ?? category.name).trim() || category.name } : category,
      ),
    });
    persist(get);
  },

  removeCategory: (id) => {
    if (get().products.some((product) => product.categoryId === id)) {
      toast("Essa categoria ainda tem produtos. Apague ou mude esses produtos antes.");
      return;
    }
    set({ categories: get().categories.filter((category) => category.id !== id) });
    persist(get);
    toast.success("Categoria removida.");
  },

  saveProduct: (input, id) => {
    const name = input.name.trim();
    const now = new Date().toISOString();
    if (id) {
      const current = get().products.find((product) => product.id === id);
      if (!current) return id;
      const next: Product = { ...current, ...input, name };
      set({
        products: get().products.map((product) => (product.id === id ? next : product)),
        lines: get().lines.map((line) =>
          line.productId === id && line.status === "pending"
            ? { ...line, name: next.name, unit: next.unit, categoryId: next.categoryId }
            : line,
        ),
      });
      persist(get);
      return id;
    }
    const product: Product = {
      id: crypto.randomUUID(),
      ...input,
      name,
      createdAt: now,
    };
    set({ products: [...get().products, product] });
    persist(get);
    return product.id;
  },

  removeProduct: (id) => {
    set({
      products: get().products.filter((product) => product.id !== id),
      lines: get().lines.filter((line) => !(line.productId === id && line.status === "pending")),
    });
    persist(get);
    toast.success("Produto removido do catálogo.");
  },

  addProductToMonth: (productId, month) => {
    const product = get().products.find((item) => item.id === productId);
    const target = month ?? get().viewMonth;
    if (!product || !target) return false;
    const pending = get().lines.some(
      (line) => line.productId === productId && line.monthKey === target && line.status === "pending",
    );
    if (pending) {
      toast("Esse item já está na lista.");
      return false;
    }
    const line = planLine(product, target, get().settings.people, get().lines);
    set({ lines: [...get().lines, line] });
    persist(get);
    return true;
  },

  updateLine: (id, patch) => {
    set({
      lines: get().lines.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    });
    persist(get);
  },

  markBought: (id, input) => {
    const when = new Date().toISOString();
    const line = get().lines.find((item) => item.id === id);
    set({
      lines: get().lines.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "bought",
              qtyBought: input.qtyBought,
              actualTotal: input.actualTotal,
              store: input.store.trim(),
              boughtAt: item.boughtAt ?? when,
              offCard: input.offCard ? true : undefined,
            }
          : item,
      ),
      products: line
        ? get().products.map((product) =>
            product.id === line.productId
              ? { ...product, onHand: Math.round(((product.onHand ?? 0) + input.qtyBought) * 1000) / 1000 }
              : product,
          )
        : get().products,
    });
    persist(get);
    toast.success(`${line?.name ?? "Compra"} registrada.`);
  },

  setStatus: (id, status) => {
    set({
      lines: get().lines.map((line) => {
        if (line.id !== id) return line;
        if (status === "pending") {
          return { ...line, status, qtyBought: 0, actualTotal: null, boughtAt: null, store: "", offCard: undefined };
        }
        if (status === "skipped") return { ...line, status };
        return line;
      }),
    });
    persist(get);
    if (status === "pending") toast("Item voltou para a lista.");
    if (status === "skipped") toast("Item pulado.");
  },

  removeLine: (id) => {
    set({ lines: get().lines.filter((line) => line.id !== id) });
    persist(get);
    toast.success("Item removido.");
  },

  generateMonth: (month) => {
    const recurring = get().products.filter((product) => product.recurring);
    if (recurring.length === 0) {
      toast("Cadastre um produto e marque para repetir todo mês.");
      return 0;
    }
    const recurringIds = new Set(recurring.map((product) => product.id));
    const monthLines = get().lines.filter((line) => line.monthKey === month);
    const covered = new Set(monthLines.filter((line) => line.status !== "skipped").map((line) => line.productId));
    const reviveIds = new Set(
      monthLines
        .filter((line) => line.status === "skipped" && recurringIds.has(line.productId) && !covered.has(line.productId))
        .map((line) => line.id),
    );
    const present = new Set(monthLines.map((line) => line.productId));
    const additions = recurring
      .filter((product) => !present.has(product.id))
      .map((product) => planLine(product, month, get().settings.people, get().lines));
    if (additions.length === 0 && reviveIds.size === 0) {
      toast("Esses produtos já estão na lista.");
      return 0;
    }
    set({
      lines: [
        ...get().lines.map((line) => (reviveIds.has(line.id) ? { ...line, status: "pending" as const } : line)),
        ...additions,
      ],
    });
    persist(get);
    const count = additions.length + reviveIds.size;
    toast.success(`${count} ${count === 1 ? "item entrou" : "itens entraram"} na lista.`);
    return count;
  },

  createPlanned: (month, drafts) => {
    const existing = new Set(get().lines.filter((line) => line.monthKey === month).map((line) => line.productId));
    const additions: ShopLine[] = [];
    for (const draft of drafts) {
      if (existing.has(draft.productId) || draft.qty <= 0 || draft.unitPrice <= 0) continue;
      const product = get().products.find((item) => item.id === draft.productId);
      if (!product) continue;
      additions.push({
        ...planLine(product, month, get().settings.people, get().lines),
        qtyPlanned: draft.qty,
        estimatedUnitPrice: draft.unitPrice,
      });
    }
    if (additions.length === 0) {
      toast("Nada novo para acrescentar.");
      return 0;
    }
    set({ lines: [...get().lines, ...additions], viewMonth: month });
    localStorage.setItem("casaflow-month", month);
    persist(get);
    toast.success(`Lista de ${monthTitle(month)} pronta.`);
    return additions.length;
  },

  recordPurchases: (items) => {
    const month = get().viewMonth;
    if (!month) return 0;
    const categories = get().categories;
    const now = new Date().toISOString();
    const products = [...get().products];
    const lines = [...get().lines];
    let count = 0;
    for (const item of items) {
      const rawName = item.name.trim().replace(/\s+/g, " ");
      const total = round2(item.total);
      const qty = item.qty > 0 ? item.qty : 1;
      if (rawName.length < 2 || total <= 0) continue;
      const guess = guessProduct(rawName);
      const category = categoryForGuess(categories, guess) ?? categories[0];
      const receiptUnit = item.unit?.trim() || "";
      const unit = (receiptUnit || guess?.unit || "un").trim() || "un";
      const unitPrice = round2(total / qty);
      let product = products.find((entry) => sameProductName(entry.name, rawName));
      if (!product) {
        product = {
          id: crypto.randomUUID(),
          name: tidyProductName(rawName),
          categoryId: category?.id ?? "",
          unit,
          defaultQty: qty,
          estimatedUnitPrice: unitPrice,
          coverageDays: guess?.coverageDays ?? 30,
          recurring: guess?.recurring ?? false,
          createdAt: now,
          onHand: qty,
        };
        products.push(product);
      } else {
        const index = products.findIndex((entry) => entry.id === product?.id);
        products[index] = {
          ...product,
          estimatedUnitPrice: unitPrice,
          unit: receiptUnit || product.unit,
          onHand: Math.round(((product.onHand ?? 0) + qty) * 1000) / 1000,
        };
        product = products[index];
      }
      const pendingIndex = lines.findIndex((line) => line.productId === product?.id && line.monthKey === month && line.status === "pending");
      const storeName = item.store?.trim() ?? "";
      const lineUnit = receiptUnit || product.unit;
      if (pendingIndex >= 0) {
        const line = lines[pendingIndex];
        lines[pendingIndex] = {
          ...line,
          status: "bought",
          unit: lineUnit,
          qtyBought: qty,
          actualTotal: total,
          estimatedUnitPrice: unitPrice,
          store: storeName || line.store,
          boughtAt: now,
          offCard: item.offCard ? true : undefined,
        };
      } else {
        lines.push({
          id: crypto.randomUUID(),
          monthKey: month,
          productId: product.id,
          categoryId: product.categoryId,
          name: product.name,
          unit: lineUnit,
          qtyPlanned: qty,
          estimatedUnitPrice: unitPrice,
          qtyBought: qty,
          actualTotal: total,
          status: "bought",
          boughtAt: now,
          store: storeName,
          offCard: item.offCard ? true : undefined,
        });
      }
      count += 1;
    }
    if (count === 0) {
      toast("Nada para lançar.");
      return 0;
    }
    set({ products, lines });
    persist(get);
    toast.success(count === 1 ? "Produto lançado e salvo." : `${count} produtos lançados. Os que faltavam foram criados.`);
    return count;
  },

  markFinished: (productId) => {
    noteStock(get, set, productId, { kind: "finished", qty: 0 }, true);
  },

  markRemaining: (productId, qty) => {
    if (qty < 0) return;
    if (qty === 0) {
      noteStock(get, set, productId, { kind: "finished", qty: 0 }, true);
      return;
    }
    noteStock(get, set, productId, { kind: "remaining", qty }, false);
  },

  lowerPantry: (productId) => {
    const product = get().products.find((item) => item.id === productId);
    const month = get().viewMonth;
    if (!product || !month || (product.onHand ?? 0) <= 0) return;
    const next = applyPantryChange(snapshotOf(get()), productId, "down", 0, month, new Date());
    const added = next.lines.length > get().lines.length;
    set({ products: next.products, stock: next.stock, lines: next.lines });
    persist(get);
    const left = next.products.find((item) => item.id === productId)?.onHand ?? 0;
    toast.success(left === 0 ? (added ? `${product.name} acabou e entrou na lista.` : `${product.name} acabou.`) : `${product.name} diminuiu.`);
  },

  clearData: async () => {
    if (get().visit) {
      toast("Na visita nada é apagado.");
      return;
    }
    const current = get();
    const snapshot = emptyHome(current.settings.theme, {
      ...current.settings,
      householdName: current.settings.householdName || defaultSettings.householdName,
    });
    if (current.categories.length > 0) snapshot.categories = current.categories;
    set({ ...snapshot, viewMonth: get().viewMonth || currentMonthKey(), ready: true, error: null });
    await commitSnapshot(snapshot);
    toast.success("Produtos e compras apagados.");
  },

  importSnapshot: (snapshot) => {
    if (get().visit) {
      toast("Na visita nada é salvo.");
      return;
    }
    set({ ...snapshot, ready: true, error: null });
    applyTheme(snapshot.settings.theme);
    commitSnapshot(snapshot);
    toast.success("Dados trazidos para este celular.");
  },

  loadVisit: () => {
    const snapshot = visitSnapshot();
    applyTheme(snapshot.settings.theme);
    set({
      ...snapshot,
      ready: true,
      error: null,
      viewMonth: currentMonthKey(),
      accessRole: "owner",
      homeCode: "VISITA",
      remoteStamp: "",
      visit: true,
    });
  },

  connectHome: async () => {
    try {
      const home = await loadHome();
      if (!home) {
        set({ accessRole: "none" });
        return;
      }
      dirty = false;
      adoptHome(set, get, home);
    } catch {
      set({ accessRole: "none" });
    }
  },

  pullHome: async () => {
    if (dirty || get().accessRole === "none" || get().accessRole === "pending") return;
    try {
      const home = await loadHome();
      if (!home || home.updatedAt === get().remoteStamp) return;
      adoptHome(set, get, home);
    } catch {
      /* keep the local copy */
    }
  },

  createHouse: async () => {
    const home = await createHome({ data: snapshotOf(get()) });
    dirty = false;
    adoptHome(set, get, home);
  },

  joinHouse: async (code) => {
    try {
      const home = await joinHome({ data: { code } });
      dirty = false;
      adoptHome(set, get, home);
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : "Não consegui entrar na casa.";
    }
  },

  changePantry: async (productId, action) => {
    const home = await adjustPantry({ data: { productId, action } });
    dirty = false;
    adoptHome(set, get, home);
  },
}));

export function useMonthShift() {
  const viewMonth = useCasa((state) => state.viewMonth);
  const setViewMonth = useCasa((state) => state.setViewMonth);
  return {
    viewMonth,
    previous: () => setViewMonth(shiftMonth(viewMonth, -1)),
    next: () => setViewMonth(shiftMonth(viewMonth, 1)),
  };
}
