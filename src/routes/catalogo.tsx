import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageIntro, Reveal } from "@/components/casa/chrome";
import { ProductDialog } from "@/components/casa/dialogs";
import { CategoryGlyph } from "@/components/casa/icons";
import { Button, Card, EmptyState, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatMoney, formatQty } from "@/lib/casa/format";
import { productHistory, suggestQty } from "@/lib/casa/logic";
import { useCasa } from "@/lib/casa/store";
import type { Product } from "@/lib/casa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/catalogo")({
  head: () => ({ meta: [{ title: "Catálogo · CasaFlow" }] }),
  component: CatalogPage,
});

function CatalogPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Catalog />;
}

function Catalog() {
  const products = useCasa((state) => state.products);
  const categories = useCasa((state) => state.categories);
  const lines = useCasa((state) => state.lines);
  const people = useCasa((state) => state.settings.people);
  const viewMonth = useCasa((state) => state.viewMonth);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const removeProduct = useCasa((state) => state.removeProduct);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [openHistory, setOpenHistory] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      products
        .filter((product) => categoryId === "all" || product.categoryId === categoryId)
        .filter((product) => product.name.toLowerCase().includes(query.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR")),
    [products, categoryId, query],
  );

  return (
    <Reveal>
      <PageIntro
        eyebrow="Catálogo"
        title="Produtos"
        lede="O que a casa compra de novo. Daqui você manda o item para a lista."
        extra={
          <Button onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            Novo produto
          </Button>
        }
      />
      <input className={cn(fieldClass, "mt-5")} placeholder="Buscar no catálogo" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <FilterChip on={categoryId === "all"} onClick={() => setCategoryId("all")}>
          Tudo
        </FilterChip>
        {[...categories]
          .sort((a, b) => a.order - b.order)
          .map((category) => (
            <FilterChip key={category.id} on={categoryId === category.id} onClick={() => setCategoryId(category.id)}>
              {category.name}
            </FilterChip>
          ))}
      </div>

      {visible.length === 0 ? (
        <div className="mt-5">
          <EmptyState title="Nenhum produto" detail="Cadastre o que a casa compra para sugerir quantidade e preço." action={<Button onClick={() => setCreating(true)}>Cadastrar</Button>} />
        </div>
      ) : (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {visible.map((product) => {
            const category = categories.find((item) => item.id === product.categoryId);
            const suggestion = suggestQty(product, lines, people);
            const history = productHistory(lines, product.id);
            const last = history[0];
            const avg =
              history.length > 0 ? history.reduce((sum, line) => sum + (line.actualTotal ?? 0), 0) / history.length : 0;
            const pending = lines.some(
              (line) => line.productId === product.id && line.monthKey === viewMonth && line.status === "pending",
            );
            return (
              <Card key={product.id}>
                <div className="flex items-start gap-3">
                  <span className="grid size-11 place-items-center rounded-2xl bg-sunken text-ink">
                    <CategoryGlyph name={category?.icon ?? "basket"} className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate font-display text-2xl text-ink">{product.name}</h2>
                    <p className="text-sm text-muted">{category?.name} · {product.unit}</p>
                  </div>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <dt className="text-muted">Último</dt>
                    <dd className="mt-1 tabular-nums text-ink">{last?.actualTotal != null && last.qtyBought > 0 ? formatMoney(last.actualTotal / last.qtyBought) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Média</dt>
                    <dd className="mt-1 tabular-nums text-ink">{history.length ? formatMoney(avg) : "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Sugestão</dt>
                    <dd className="mt-1 tabular-nums text-ink">
                      {formatQty(suggestion.qty)} {product.unit}
                    </dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-pretty text-muted">
                  {formatQty(suggestion.qty)} {product.unit}, {suggestion.reason}. Uma unidade dura cerca de {product.coverageDays} dias.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    disabled={pending}
                    onClick={() => {
                      if (pending) return;
                      const added = addProductToMonth(product.id);
                      if (added) toast.success(`${product.name} entrou na lista.`);
                    }}
                    variant={pending ? "secondary" : "primary"}
                  >
                    {pending ? "Na lista" : "Incluir neste mês"}
                  </Button>
                  <Button variant="ghost" onClick={() => setEditing(product)}>
                    Editar
                  </Button>
                  <Button variant="ghost" onClick={() => setOpenHistory(openHistory === product.id ? null : product.id)}>
                    Preços
                  </Button>
                </div>
                {openHistory === product.id ? (
                  history.length === 0 ? (
                    <p className="mt-3 text-sm text-muted">Ainda sem compra registrada.</p>
                  ) : (
                    <ul className="mt-3 flex flex-col gap-1 text-sm">
                      {history.slice(0, 6).map((line) => (
                        <li key={line.id} className="flex justify-between gap-3 text-muted">
                          <span>{line.monthKey}</span>
                          <span className="tabular-nums text-ink">
                            {formatQty(line.qtyBought)} · {formatMoney(line.actualTotal ?? 0)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )
                ) : null}
                <button
                  type="button"
                  className="mt-4 text-sm text-terra-deep"
                  onClick={() => {
                    if (window.confirm("Tirar este produto? As compras já feitas continuam no histórico.")) removeProduct(product.id);
                  }}
                >
                  Tirar da lista de produtos
                </button>
              </Card>
            );
          })}
        </div>
      )}
      <ProductDialog open={creating || Boolean(editing)} product={editing} onOpenChange={(open) => {
        if (!open) {
          setCreating(false);
          setEditing(null);
        }
      }} />
    </Reveal>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={cn("h-10 shrink-0 rounded-full px-3 text-sm", on ? "bg-hero text-on-hero" : "bg-sunken text-ink")}>
      {children}
    </button>
  );
}
