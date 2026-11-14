import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/casa/chrome";
import { ProductDialog, ProductHistoryDialog } from "@/components/casa/dialogs";
import { CategoryGlyph } from "@/components/casa/icons";
import { Button, Card, EmptyState, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
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
  const viewMonth = useCasa((state) => state.viewMonth);
  const addProductToMonth = useCasa((state) => state.addProductToMonth);
  const removeProduct = useCasa((state) => state.removeProduct);
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [editing, setEditing] = useState<Product | null>(null);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);
  const [drop, setDrop] = useState<Product | null>(null);
  const [openHistory, setOpenHistory] = useState<Product | null>(null);

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
        <p className="mt-2 text-sm text-muted">Toque no produto para usar.</p>
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
          <EmptyState title="Nenhum produto" detail="Cadastre o primeiro produto." action={<Button onClick={() => setCreating(true)}>Cadastrar</Button>} />
        </div>
      ) : (
        <Card className="mt-5 rounded-[2rem] p-0">
          <ul>
            {visible.map((product) => {
              const category = categories.find((item) => item.id === product.categoryId);
              const pending = lines.some((line) => line.productId === product.id && line.monthKey === viewMonth && line.status === "pending");
              return (
                <li key={product.id} className="border-t border-line first:border-t-0">
                  <button type="button" className="flex w-full items-center gap-3 px-4 py-3 text-left" onClick={() => setSelected(product)}>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sunken text-ink">
                      <CategoryGlyph name={category?.icon ?? "basket"} className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{product.name}</span>
                      <span className="block truncate text-sm text-muted">{category?.name ?? "Sem categoria"}</span>
                    </span>
                    {pending ? <span className="shrink-0 text-sm text-muted">Na lista</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      <Modal
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name ?? "Produto"}
        description={selected ? categories.find((item) => item.id === selected.categoryId)?.name ?? "" : ""}
      >
        {selected ? (
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              disabled={lines.some((line) => line.productId === selected.id && line.monthKey === viewMonth && line.status === "pending")}
              onClick={() => {
                const added = addProductToMonth(selected.id);
                if (added) toast.success(`${selected.name} entrou na lista.`);
                setSelected(null);
              }}
            >
              {lines.some((line) => line.productId === selected.id && line.monthKey === viewMonth && line.status === "pending") ? "Já está na lista" : "Colocar na lista"}
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setOpenHistory(selected);
                setSelected(null);
              }}
            >
              Ver preços
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => {
                setEditing(selected);
                setSelected(null);
              }}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setDrop(selected);
                setSelected(null);
              }}
            >
              Tirar
            </Button>
          </div>
        ) : null}
      </Modal>
      <ProductHistoryDialog product={openHistory} onOpenChange={(open) => !open && setOpenHistory(null)} />
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
