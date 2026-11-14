import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/casa/chrome";
import { ProductDialog } from "@/components/casa/dialogs";
import { CategoryGlyph } from "@/components/casa/icons";
import { Button, Card, EmptyState, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatMoney, formatQty, parseDecimal } from "@/lib/casa/format";
import { productHistory, suggestQty } from "@/lib/casa/logic";
import { coverageText } from "@/lib/casa/stock";
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
  const markFinished = useCasa((state) => state.markFinished);
  const markRemaining = useCasa((state) => state.markRemaining);
  const removeProduct = useCasa((state) => state.removeProduct);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [leftover, setLeftover] = useState<Product | null>(null);
  const [leftQty, setLeftQty] = useState("");
  const [drop, setDrop] = useState<Product | null>(null);
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
      <header>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Catálogo</p>
        <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">Produtos da casa</h1>
        <p className="mt-2 text-pretty text-sm text-muted">O que se repete. Daqui o item vai para a lista do mês.</p>
        <Button className="mt-4 w-full sm:w-auto" onClick={() => setCreating(true)}>
          <Plus className="size-4" />
          Novo produto
        </Button>
      </header>
      <input className={cn(fieldClass, "mt-5 rounded-full")} placeholder="Buscar produto" value={query} onChange={(event) => setQuery(event.target.value)} />
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
            const prices = history.flatMap((line) => (line.qtyBought > 0 && line.actualTotal != null ? [line.actualTotal / line.qtyBought] : []));
            const avg = prices.length ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
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
                <p className="mt-3 text-sm text-muted">
                  Último {last?.actualTotal != null && last.qtyBought > 0 ? formatMoney(last.actualTotal / last.qtyBought) : "—"}
                  {" · "}
                  média {prices.length ? formatMoney(avg) : "—"}
                  {" · "}
                  sugerido {formatQty(suggestion.qty)} {product.unit}
                  {product.recurring ? " · todo mês" : ""}
                  {coverageText(product) ? ` · ${coverageText(product).toLowerCase()}` : ""}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button size="lg" onClick={() => markFinished(product.id)}>Acabou</Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={() => {
                      setLeftover(product);
                      setLeftQty("");
                    }}
                  >
                    Sobrou
                  </Button>
                  <Button
                    size="lg"
                    disabled={pending}
                    onClick={() => {
                      if (pending) return;
                      const added = addProductToMonth(product.id);
                      if (added) toast.success(`${product.name} entrou na lista deste mês.`);
                    }}
                    variant={pending ? "secondary" : "primary"}
                  >
                    {pending ? "Na lista" : "Incluir neste mês"}
                  </Button>
                  <Button size="lg" variant="secondary" onClick={() => setEditing(product)}>
                    Editar
                  </Button>
                  <Button size="lg" variant="ghost" onClick={() => setOpenHistory(openHistory === product.id ? null : product.id)}>
                    Preços
                  </Button>
                  <Button size="lg" variant="ghost" aria-label={`Tirar ${product.name} do catálogo`} onClick={() => setDrop(product)}>
                    Tirar do catálogo
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
      <Modal
        open={Boolean(drop)}
        onOpenChange={(open) => !open && setDrop(null)}
        title={drop ? `Tirar ${drop.name} do catálogo?` : "Tirar do catálogo"}
        description="As compras já feitas continuam no histórico."
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              if (!drop) return;
              removeProduct(drop.id);
              toast.success(`${drop.name} saiu do catálogo.`);
              setDrop(null);
            }}
          >
            Tirar
          </Button>
          <Button variant="secondary" onClick={() => setDrop(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
      <Modal open={Boolean(leftover)} onOpenChange={(open) => !open && setLeftover(null)} title={leftover ? `Quanto ainda tem de ${leftover.name}?` : "Sobrou"} description="A data é de agora. Não precisa preencher.">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!leftover) return;
            const qty = parseDecimal(leftQty);
            if (qty == null || qty < 0) return;
            markRemaining(leftover.id, qty);
            setLeftover(null);
          }}
        >
          <input className={fieldClass} inputMode="decimal" placeholder={leftover ? `Quantidade em ${leftover.unit}` : "Quantidade"} value={leftQty} onChange={(event) => setLeftQty(event.target.value)} />
          <Button type="submit" size="lg">
            Guardar
          </Button>
        </form>
      </Modal>
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
