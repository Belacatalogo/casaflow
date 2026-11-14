import { toast } from "sonner";
import { categoryForGuess, guessProduct } from "@/lib/casa/classify";
import { useEffect, useMemo, useState } from "react";
import { SUGGESTED_STORES } from "@/lib/casa/seed";
import { decimalToInput, formatMoney, formatQty, monthTitle, parseDecimal } from "@/lib/casa/format";
import { lineEstimate, productHistory, suggestQty } from "@/lib/casa/logic";
import { coverageText } from "@/lib/casa/stock";
import { useCasa } from "@/lib/casa/store";
import type { Product, ShopLine } from "@/lib/casa/types";
import { CategoryGlyph, ICON_OPTIONS } from "@/components/casa/icons";
import { Button, Field, Modal, fieldClass } from "@/components/ui/controls";
import { cn } from "@/lib/utils";

const SWATCHES = ["terra", "gold", "clay", "sand", "ink", "bark"] as const;

function PaySource({ offCard, onChange }: { offCard: boolean; onChange: (offCard: boolean) => void }) {
  return (
    <div>
      <p className="text-sm font-medium text-ink">De onde saiu</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button
          type="button"
          className={cn("h-11 rounded-full text-sm font-medium", !offCard ? "bg-hero text-on-hero" : "bg-sunken text-ink")}
          onClick={() => onChange(false)}
        >
          Cartão alimentação
        </button>
        <button
          type="button"
          className={cn("h-11 rounded-full text-sm font-medium", offCard ? "bg-hero text-on-hero" : "bg-sunken text-ink")}
          onClick={() => onChange(true)}
        >
          Fora do cartão
        </button>
      </div>
    </div>
  );
}

function Toggle({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("h-7 w-12 rounded-full p-1 transition-colors", on ? "bg-terra-fill" : "bg-line")}
    >
      <span className={cn("block size-5 rounded-full bg-surface transition-transform", on && "translate-x-5")} />
    </button>
  );
}

type ProductDraft = {
  name: string;
  categoryId: string;
  unit: string;
  defaultQty: string;
  estimatedUnitPrice: string;
  coverageDays: string;
  recurring: boolean;
};

function emptyDraft(categoryId: string): ProductDraft {
  return {
    name: "",
    categoryId,
    unit: "un",
    defaultQty: "1",
    estimatedUnitPrice: "",
    coverageDays: "30",
    recurring: true,
  };
}

function fromProduct(product: Product): ProductDraft {
  return {
    name: product.name,
    categoryId: product.categoryId,
    unit: product.unit,
    defaultQty: decimalToInput(product.defaultQty),
    estimatedUnitPrice: decimalToInput(product.estimatedUnitPrice),
    coverageDays: String(product.coverageDays),
    recurring: product.recurring,
  };
}

export function ProductDialog({
  open,
  product,
  onList = false,
  onOpenChange,
}: {
  open: boolean;
  product?: Product | null;
  onList?: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const categories = useCasa((state) => state.categories);
  const saveProduct = useCasa((state) => state.saveProduct);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const [draft, setDraft] = useState<ProductDraft>(() => emptyDraft(categories[0]?.id ?? ""));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [details, setDetails] = useState(false);
  const [touched, setTouched] = useState({ category: false, unit: false, coverage: false, recurring: false });
  const guess = guessProduct(draft.name);
  const guessedCategory = categoryForGuess(categories, guess);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setDetails(Boolean(product));
    setTouched({ category: Boolean(product), unit: Boolean(product), coverage: Boolean(product), recurring: Boolean(product) });
    setDraft(product ? fromProduct(product) : emptyDraft(categories[0]?.id ?? ""));
  }, [open, product, categories]);

  function applyName(name: string) {
    setDraft((current) => {
      const nextGuess = guessProduct(name);
      const category = categoryForGuess(categories, nextGuess);
      return {
        ...current,
        name,
        categoryId: touched.category ? current.categoryId : (category?.id ?? current.categoryId),
        unit: touched.unit ? current.unit : (nextGuess?.unit ?? current.unit),
        coverageDays: touched.coverage ? current.coverageDays : nextGuess ? String(nextGuess.coverageDays) : current.coverageDays,
        recurring: touched.recurring ? current.recurring : (nextGuess?.recurring ?? false),
      };
    });
  }

  function save() {
    const defaultQty = draft.defaultQty.trim() === "" ? 1 : parseDecimal(draft.defaultQty);
    const estimatedUnitPrice = draft.estimatedUnitPrice.trim() === "" ? 0 : parseDecimal(draft.estimatedUnitPrice);
    const coverageDays = draft.coverageDays.trim() === "" ? (product?.coverageDays ?? guess?.coverageDays ?? 30) : parseDecimal(draft.coverageDays);
    const next: Record<string, string> = {};
    if (draft.name.trim().length < 2) next.name = "Dê um nome ao produto.";
    if (!draft.categoryId) next.categoryId = "Escolha uma categoria.";
    if (!draft.unit.trim()) next.unit = "Informe a unidade.";
    if (defaultQty == null || defaultQty <= 0) next.defaultQty = "Quantidade maior que zero.";
    if (estimatedUnitPrice == null || estimatedUnitPrice < 0) next.estimatedUnitPrice = "Preço inválido.";
    if (coverageDays == null || coverageDays < 1) next.coverageDays = "Duração inválida.";
    setErrors(next);
    if (Object.keys(next).length || defaultQty == null || estimatedUnitPrice == null || coverageDays == null) return;
    const id = saveProduct(
      {
        name: draft.name,
        categoryId: draft.categoryId,
        unit: draft.unit.trim(),
        defaultQty,
        estimatedUnitPrice,
        coverageDays: Math.round(coverageDays),
        recurring: draft.recurring,
      },
      product?.id,
    );
    if (!product && onList) {
      const added = addProductToMonth(id);
      toast.success(added ? `${draft.name.trim()} entrou na lista.` : "Produto criado.");
    } else {
      toast.success(product ? "Produto atualizado." : "Produto criado.");
    }
    onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={product ? "Editar produto" : "Novo produto"}
      description={product ? "O preço e a duração o sistema completa sozinho." : "Só o nome. O preço entra pela nota. A duração, quando o produto acabar."}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field label="Nome" error={errors.name}>
          <input className={fieldClass} value={draft.name} onChange={(event) => applyName(event.target.value)} />
        </Field>
        {draft.name.trim().length >= 2 ? (
          <p className="-mt-2 text-sm text-muted">
            {categories.find((category) => category.id === draft.categoryId)?.name ?? "Sem categoria"} · {draft.unit}
            {draft.recurring ? " · entra todo mês" : " · só desta vez"}
            {guessedCategory && !touched.category ? ". Pode trocar abaixo." : ""}
          </p>
        ) : null}
        {product && coverageText(product) ? <p className="-mt-2 text-sm text-muted">{coverageText(product)}. O sistema aprende quando acaba.</p> : null}
        {details ? (
          <>
        <Field label="Categoria" error={errors.categoryId}>
          <select
            className={fieldClass}
            value={draft.categoryId}
            onChange={(event) => {
              setTouched((current) => ({ ...current, category: true }));
              setDraft({ ...draft, categoryId: event.target.value });
            }}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Unidade" error={errors.unit} hint="kg, L, un, pct">
            <input
              className={fieldClass}
              value={draft.unit}
              onChange={(event) => {
                setTouched((current) => ({ ...current, unit: true }));
                setDraft({ ...draft, unit: event.target.value });
              }}
            />
          </Field>
          <Field label="Quantidade habitual" error={errors.defaultQty}>
            <input inputMode="decimal" className={fieldClass} value={draft.defaultQty} onChange={(event) => setDraft({ ...draft, defaultQty: event.target.value })} />
          </Field>
        </div>
        <Field label="Preço, se souber" error={errors.estimatedUnitPrice} hint="Opcional. A nota preenche.">
          <input inputMode="decimal" className={fieldClass} value={draft.estimatedUnitPrice} onChange={(event) => setDraft({ ...draft, estimatedUnitPrice: event.target.value })} placeholder="0,00" />
        </Field>
        <div className="flex items-center justify-between gap-3 rounded-2xl bg-sunken px-3 py-3">
          <span className="text-sm text-ink">Repetir todo mês</span>
          <Toggle
            on={draft.recurring}
            label="Repetir todo mês"
            onClick={() => {
              setTouched((current) => ({ ...current, recurring: true }));
              setDraft({ ...draft, recurring: !draft.recurring });
            }}
          />
        </div>
          </>
        ) : (
          <button type="button" className="text-left text-sm font-medium text-terra-deep" onClick={() => setDetails(true)}>
            Ajustar categoria e unidade
          </button>
        )}
        <Button type="submit" size="lg" className="w-full">
          Salvar
        </Button>
      </form>
    </Modal>
  );
}

export function ProductHistoryDialog({ product, onOpenChange }: { product: Product | null; onOpenChange: (open: boolean) => void }) {
  const lines = useCasa((state) => state.lines);
  const history = product ? productHistory(lines, product.id) : [];
  const months = new Map<string, { qty: number; total: number }>();
  for (const line of history) {
    const current = months.get(line.monthKey) ?? { qty: 0, total: 0 };
    current.qty += line.qtyBought;
    current.total += line.actualTotal ?? 0;
    months.set(line.monthKey, current);
  }
  const rows = [...months.entries()];
  const spent = rows.reduce((sum, [, row]) => sum + row.total, 0);
  const units = history.flatMap((line) => (line.qtyBought > 0 && line.actualTotal != null ? [line.actualTotal / line.qtyBought] : []));
  const average = units.length ? units.reduce((sum, price) => sum + price, 0) / units.length : 0;
  const last = units[0] ?? 0;

  return (
    <Modal open={Boolean(product)} onOpenChange={onOpenChange} title={product?.name ?? "Produto"} description="Preço e gasto mês a mês. A nota atualiza isso sozinha.">
      {product ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {units.length ? `Último ${formatMoney(last)} · média ${formatMoney(average)} · ${formatMoney(spent)} no total` : "Ainda sem compra."}
            {coverageText(product) ? ` · ${coverageText(product).toLowerCase()}` : " · a duração aparece quando você marcar que acabou"}
          </p>
          {rows.length === 0 ? (
            <p className="text-sm text-muted">Quando a nota tiver este produto, o valor de cada mês entra aqui.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-line">
              {rows.map(([month, row]) => (
                <li key={month} className="flex items-baseline justify-between gap-3 py-3">
                  <span>
                    <span className="block font-medium text-ink">{monthTitle(month)}</span>
                    <span className="block text-sm text-muted">
                      {formatQty(row.qty)} {product.unit}
                      {row.qty > 0 ? ` · ${formatMoney(row.total / row.qty)} cada` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums text-ink">{formatMoney(row.total)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </Modal>
  );
}

export function AddDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const products = useCasa((state) => state.products);
  const categories = useCasa((state) => state.categories);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const people = useCasa((state) => state.settings.people);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setCreating(false);
  }, [open]);

  const pending = useMemo(
    () => new Set(lines.filter((line) => line.monthKey === viewMonth && line.status === "pending").map((line) => line.productId)),
    [lines, viewMonth],
  );
  const visible = products.filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <Modal open={open && !creating} onOpenChange={onOpenChange} title="Adicionar à lista" description="Escolha um produto ou cadastre um novo.">
        <input className={fieldClass} placeholder="Buscar produto" value={query} onChange={(event) => setQuery(event.target.value)} />
        <ul className="mt-3 max-h-80 divide-y divide-line overflow-y-auto">
          {visible.map((product) => {
            const suggestion = suggestQty(product, lines, people);
            const category = categories.find((item) => item.id === product.categoryId);
            return (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <span className="grid size-10 place-items-center rounded-2xl bg-sunken text-ink">
                  <CategoryGlyph name={category?.icon ?? "basket"} className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink">{product.name}</span>
                  <span className="block text-sm text-muted">
                    {formatQty(suggestion.qty)} {product.unit} · {suggestion.reason}
                  </span>
                </span>
                <Button
                  variant={pending.has(product.id) ? "secondary" : "primary"}
                  disabled={pending.has(product.id)}
                  onClick={() => {
                    if (pending.has(product.id)) return;
                    const added = addProductToMonth(product.id);
                    if (added) {
                      toast.success(`${product.name} entrou na lista.`);
                      onOpenChange(false);
                    }
                  }}
                >
                  {pending.has(product.id) ? "Na lista" : "Incluir"}
                </Button>
              </li>
            );
          })}
        </ul>
        {visible.length === 0 ? <p className="py-6 text-sm text-muted">Nenhum produto com esse nome.</p> : null}
        <Button variant="secondary" className="mt-3 w-full" onClick={() => setCreating(true)}>
          Cadastrar produto novo
        </Button>
      </Modal>
      <ProductDialog open={open && creating} onList onOpenChange={(next) => (next ? setCreating(true) : onOpenChange(false))} />
    </>
  );
}

export function BuyDialog({ line, onOpenChange }: { line: ShopLine | null; onOpenChange: (open: boolean) => void }) {
  const markBought = useCasa((state) => state.markBought);
  const [qty, setQty] = useState("1");
  const [total, setTotal] = useState("");
  const [store, setStore] = useState("");
  const [offCard, setOffCard] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!line) return;
    setQty(decimalToInput(line.qtyBought || line.qtyPlanned));
    setTotal(decimalToInput(line.actualTotal ?? lineEstimate(line)));
    setStore(line.store);
    setOffCard(line.offCard === true);
    setError("");
  }, [line]);

  function save() {
    if (!line) return;
    const qtyBought = parseDecimal(qty);
    const actualTotal = parseDecimal(total);
    if (qtyBought == null || qtyBought <= 0) {
      setError("Informe a quantidade comprada.");
      return;
    }
    if (actualTotal == null || actualTotal <= 0) {
      setError("Informe o valor pago.");
      return;
    }
    markBought(line.id, { qtyBought, actualTotal, store, offCard });
    onOpenChange(false);
  }

  return (
    <Modal open={Boolean(line)} onOpenChange={onOpenChange} title={line ? line.name : "Registrar compra"} description="Quanto você pagou?">
      {line ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <p className="text-sm text-muted">
            Planejado: {formatQty(line.qtyPlanned)} {line.unit} · estimado {formatMoney(lineEstimate(line))}
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade">
              <input inputMode="decimal" className={fieldClass} value={qty} onChange={(event) => setQty(event.target.value)} />
            </Field>
            <Field label="Valor pago">
              <input inputMode="decimal" className={fieldClass} value={total} onChange={(event) => setTotal(event.target.value)} />
            </Field>
          </div>
          <Field label="Onde comprou" hint="Opcional">
            <input className={fieldClass} value={store} onChange={(event) => setStore(event.target.value)} placeholder="Mercado, feira, padaria" />
          </Field>
          <PaySource offCard={offCard} onChange={setOffCard} />
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_STORES.map((name) => (
              <button key={name} type="button" className={cn("h-9 rounded-full px-3 text-sm", store === name ? "bg-terra-soft text-terra-deep" : "bg-sunken text-ink")} onClick={() => setStore(name)}>
                {name}
              </button>
            ))}
          </div>
          {error ? <p className="text-sm text-terra-deep">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full">
            Registrar compra
          </Button>
        </form>
      ) : null}
    </Modal>
  );
}

export function PlanDialog({ line, onOpenChange }: { line: ShopLine | null; onOpenChange: (open: boolean) => void }) {
  const updateLine = useCasa((state) => state.updateLine);
  const removeLine = useCasa((state) => state.removeLine);
  const [qty, setQty] = useState("1");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!line) return;
    setQty(decimalToInput(line.qtyPlanned));
    setPrice(decimalToInput(line.estimatedUnitPrice));
    setError("");
  }, [line]);

  function save() {
    if (!line) return;
    const qtyPlanned = parseDecimal(qty);
    const estimatedUnitPrice = price.trim() === "" ? 0 : parseDecimal(price);
    if (qtyPlanned == null || qtyPlanned <= 0 || estimatedUnitPrice == null || estimatedUnitPrice < 0) {
      setError("Quantidade e preço precisam ser válidos.");
      return;
    }
    updateLine(line.id, { qtyPlanned, estimatedUnitPrice });
    toast.success("Item atualizado.");
    onOpenChange(false);
  }

  return (
    <Modal open={Boolean(line)} onOpenChange={onOpenChange} title={line?.name ?? "Editar item"} description="Ajuste a quantidade e o preço previsto.">
      {line ? (
        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            save();
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <Field label={`Quantidade (${line.unit})`}>
              <input inputMode="decimal" className={fieldClass} value={qty} onChange={(event) => setQty(event.target.value)} />
            </Field>
            <Field label="Preço de cada um">
              <input inputMode="decimal" className={fieldClass} value={price} onChange={(event) => setPrice(event.target.value)} />
            </Field>
          </div>
          {error ? <p className="text-sm text-terra-deep">{error}</p> : null}
          <Button type="submit" size="lg" className="w-full">
            Salvar
          </Button>
          <Button
            variant="soft"
            className="w-full"
            onClick={() => {
              removeLine(line.id);
              onOpenChange(false);
            }}
          >
            Remover da lista
          </Button>
        </form>
      ) : null}
    </Modal>
  );
}

export function PurchaseDialog({
  open,
  initialName = "",
  onOpenChange,
}: {
  open: boolean;
  initialName?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const categories = useCasa((state) => state.categories);
  const recordPurchases = useCasa((state) => state.recordPurchases);
  const [name, setName] = useState(initialName);
  const [total, setTotal] = useState("");
  const [offCard, setOffCard] = useState(false);
  const [error, setError] = useState("");
  const guess = guessProduct(name);
  const category = categoryForGuess(categories, guess);

  useEffect(() => {
    if (!open) return;
    setName(initialName);
    setTotal("");
    setOffCard(false);
    setError("");
  }, [open, initialName]);

  function save() {
    const value = parseDecimal(total);
    if (name.trim().length < 2) {
      setError("Diga o que você comprou.");
      return;
    }
    if (value == null || value <= 0) {
      setError("Informe o valor pago.");
      return;
    }
    recordPurchases([{ name, qty: 1, total: value, unit: guess?.unit, offCard }]);
    onOpenChange(false);
  }

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Comprei agora" description="O nome escolhe a categoria. Você informa só o valor.">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <Field label="O que comprou">
          <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Óleo, leite, arroz" />
        </Field>
        {name.trim().length >= 2 ? (
          <p className="-mt-2 text-sm text-muted">
            {category ? category.name : "Não reconheci. Vai para a primeira categoria"} · {guess?.unit ?? "un"}
            {guess?.recurring ? " · entra todo mês" : " · só desta vez"}
          </p>
        ) : null}
        <Field label="Valor pago">
          <input inputMode="decimal" className={fieldClass} value={total} onChange={(event) => setTotal(event.target.value)} placeholder="0,00" />
        </Field>
        <PaySource offCard={offCard} onChange={setOffCard} />
        {error ? <p className="text-sm text-terra-deep">{error}</p> : null}
        <Button type="submit" size="lg" className="w-full">
          Lançar
        </Button>
      </form>
    </Modal>
  );
}

export { ICON_OPTIONS, SWATCHES };
