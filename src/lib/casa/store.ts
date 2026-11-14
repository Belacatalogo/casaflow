import { toast } from "sonner";
import { create } from "zustand";
import { currentMonthKey, monthTitle, shiftMonth } from "@/lib/casa/format";
import { planLine } from "@/lib/casa/logic";
import { buildSeed } from "@/lib/casa/seed";
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
  markBought: (id: string, input: { qtyBought: number; actualTotal: number; store: string }) => void;
  setStatus: (id: string, status: LineStatus) => void;
  removeLine: (id: string) => void;
  generateMonth: (month: string) => number;
  createPlanned: (
    month: string,
    drafts: { productId: string; qty: number; unitPrice: number }[],
  ) => number;
  resetDemo: () => Promise<void>;
  importSnapshot: (snapshot: Snapshot) => void;
};

function snapshotOf(state: Pick<CasaState, "settings" | "categories" | "products" | "lines">): Snapshot {
  return {
    settings: state.settings,
    categories: state.categories,
    products: state.products,
    lines: state.lines,
  };
}

function persist(get: () => CasaState) {
  commitSnapshot(snapshotOf(get()));
}

let started = false;

function initialMonth(): string {
  if (typeof localStorage === "undefined") return "";
  const stored = localStorage.getItem("casaflow-month");
  return stored && MONTH_RE.test(stored) ? stored : "";
}

export const useCasa = create<CasaState>((set, get) => ({
  ready: false,
  error: null,
  viewMonth: "",
  settings: { ...defaultSettings, theme: readThemePreference() ?? defaultSettings.theme },
  categories: [],
  products: [],
  lines: [],

  hydrate: async () => {
    if (started) return;
    started = true;
    try {
      let snapshot = await loadSnapshot();
      if (!snapshot) {
        snapshot = buildSeed(new Date());
        await commitSnapshot(snapshot);
      }
      const storedMonth = initialMonth();
      applyTheme(snapshot.settings.theme);
      set({
        ...snapshot,
        ready: true,
        error: null,
        viewMonth: storedMonth || currentMonthKey(),
      });
    } catch {
      started = false;
      set({ ready: false, error: "Não foi possível abrir os dados neste aparelho." });
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
    if (patch.householdName != null) settings.householdName = patch.householdName.slice(0, 48);
    set({ settings });
    if (patch.theme) applyTheme(settings.theme);
    persist(get);
  },

  addCategory: (input) => {
    const name = input.name.trim();
    if (name.length < 2) return;
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
      toast("Essa categoria ainda tem produtos.");
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
      toast("Esse produto já está pendente na lista.");
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
    set({
      lines: get().lines.map((line) =>
        line.id === id
          ? {
              ...line,
              status: "bought",
              qtyBought: input.qtyBought,
              actualTotal: input.actualTotal,
              store: input.store.trim(),
              boughtAt: line.boughtAt ?? when,
            }
          : line,
      ),
    });
    persist(get);
    toast.success("Compra registrada.");
  },

  setStatus: (id, status) => {
    set({
      lines: get().lines.map((line) => {
        if (line.id !== id) return line;
        if (status === "pending") {
          return { ...line, status, qtyBought: 0, actualTotal: null, boughtAt: null, store: "" };
        }
        if (status === "skipped") return { ...line, status };
        return line;
      }),
    });
    persist(get);
    if (status === "pending") toast("Item voltou para a lista.");
    if (status === "skipped") toast("Item tirado desta lista.");
  },

  removeLine: (id) => {
    set({ lines: get().lines.filter((line) => line.id !== id) });
    persist(get);
    toast.success("Item removido.");
  },

  generateMonth: (month) => {
    const existing = new Set(get().lines.filter((line) => line.monthKey === month).map((line) => line.productId));
    const additions = get()
      .products.filter((product) => product.recurring && !existing.has(product.id))
      .map((product) => planLine(product, month, get().settings.people, get().lines));
    if (additions.length === 0) {
      toast("A lista desse mês já está completa.");
      return 0;
    }
    set({ lines: [...get().lines, ...additions] });
    persist(get);
    toast.success(`${additions.length} itens entraram na lista.`);
    return additions.length;
  },

  createPlanned: (month, drafts) => {
    const existing = new Set(get().lines.filter((line) => line.monthKey === month).map((line) => line.productId));
    const additions: ShopLine[] = [];
    for (const draft of drafts) {
      if (existing.has(draft.productId) || draft.qty <= 0) continue;
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

  resetDemo: async () => {
    const snapshot = buildSeed(new Date());
    const month = currentMonthKey();
    set({ ...snapshot, viewMonth: month, ready: true, error: null });
    localStorage.setItem("casaflow-month", month);
    applyTheme(snapshot.settings.theme);
    await commitSnapshot(snapshot);
    toast.success("Exemplo da casa restaurado.");
  },

  importSnapshot: (snapshot) => {
    set({ ...snapshot, ready: true, error: null });
    applyTheme(snapshot.settings.theme);
    commitSnapshot(snapshot);
    toast.success("Dados importados neste aparelho.");
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
