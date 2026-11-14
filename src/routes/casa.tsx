import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/casa/chrome";
import { CategoryGlyph } from "@/components/casa/icons";
import { Button, Card, EmptyState, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { formatQty, parseDecimal } from "@/lib/casa/format";
import { pantryStep } from "@/lib/casa/stock";
import { useCasa } from "@/lib/casa/store";
import type { Product } from "@/lib/casa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/casa")({
  head: () => ({ meta: [{ title: "Em casa · CasaFlow" }] }),
  component: CasaPage,
});

function CasaPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <Pantry />;
}

function Pantry() {
  const products = useCasa((state) => state.products);
  const categories = useCasa((state) => state.categories);
  const lines = useCasa((state) => state.lines);
  const viewMonth = useCasa((state) => state.viewMonth);
  const markFinished = useCasa((state) => state.markFinished);
  const markRemaining = useCasa((state) => state.markRemaining);
  const lowerPantry = useCasa((state) => state.lowerPantry);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"tem" | "acabou">("tem");
  const [editing, setEditing] = useState<Product | null>(null);
  const [qty, setQty] = useState("");

  const named = useMemo(() => {
    const text = query.trim().toLowerCase();
    return products
      .filter((product) => product.onHand != null)
      .filter((product) => !text || product.name.toLowerCase().includes(text))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [products, query]);
  const stocked = named.filter((product) => (product.onHand ?? 0) > 0);
  const gone = named.filter((product) => (product.onHand ?? 0) <= 0);
  const shown = tab === "tem" ? stocked : gone;
  const ordered = [...categories].sort((a, b) => a.order - b.order);

  return (
    <Reveal>
      <header>
        <p className="text-xs tracking-[0.16em] text-muted uppercase">Em casa</p>
        <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight text-ink">O que ainda tem</h1>
        <p className="mt-2 text-sm text-muted">
          {stocked.length === 0 ? "Nada anotado ainda" : stocked.length === 1 ? "1 item em casa" : `${stocked.length} itens em casa`}
          {gone.length > 0 ? ` · ${gone.length} acabou` : ""}
        </p>
      </header>

      <input className={cn(fieldClass, "mt-5 rounded-full")} placeholder="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button type="button" className={cn("h-11 rounded-full text-sm font-medium", tab === "tem" ? "bg-hero text-on-hero" : "bg-sunken text-ink")} onClick={() => setTab("tem")}>
          Tem
        </button>
        <button type="button" className={cn("h-11 rounded-full text-sm font-medium", tab === "acabou" ? "bg-hero text-on-hero" : "bg-sunken text-ink")} onClick={() => setTab("acabou")}>
          Acabou
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            title={query ? "Nada com esse nome" : tab === "tem" ? "A casa ainda está vazia" : "Nada acabou"}
            detail={
              query
                ? "Tente outro nome."
                : tab === "tem"
                  ? "Quando uma compra entrar, a quantidade aparece aqui."
                  : "O que acabar fica nesta lista e entra para comprar de novo."
            }
          />
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {ordered.map((category) => {
            const rows = shown.filter((product) => product.categoryId === category.id);
            if (rows.length === 0) return null;
            return (
              <Card key={category.id} className="rounded-[2rem]">
                <div className="flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-full bg-sunken text-ink">
                    <CategoryGlyph name={category.icon} className="size-4" />
                  </span>
                  <h2 className="font-medium text-ink">{category.name}</h2>
                </div>
                <ul className="mt-2">
                  {rows.map((product) => {
                    const pending = lines.some((line) => line.productId === product.id && line.monthKey === viewMonth && line.status === "pending");
                    return (
                      <li key={product.id} className="border-t border-line py-3 first:border-t-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <h3 className="truncate font-display text-2xl text-ink">{product.name}</h3>
                          <p className="shrink-0 font-display text-3xl tabular-nums text-ink">
                            {formatQty(product.onHand ?? 0)}
                            <span className="ml-1 text-base text-muted">{product.unit}</span>
                          </p>
                        </div>
                        {tab === "tem" ? (
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            <Button variant="secondary" onClick={() => lowerPantry(product.id)}>
                              − {formatQty(pantryStep(product.unit))}
                            </Button>
                            <Button onClick={() => markFinished(product.id)}>Acabou</Button>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setEditing(product);
                                setQty(formatQty(product.onHand ?? 0));
                              }}
                            >
                              Ajustar
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="text-sm text-muted">{pending ? "Já está na lista" : "Fora da lista"}</p>
                            <Button
                              variant="secondary"
                              onClick={() => {
                                setEditing(product);
                                setQty("");
                              }}
                            >
                              Ainda tem
                            </Button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={Boolean(editing)} onOpenChange={(open) => !open && setEditing(null)} title={editing ? editing.name : "Quantidade"} description="Quanto ainda tem agora.">
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (!editing) return;
            const value = parseDecimal(qty);
            if (value == null || value < 0) return;
            markRemaining(editing.id, value);
            setEditing(null);
          }}
        >
          <input className={fieldClass} inputMode="decimal" placeholder={editing ? `Quantidade em ${editing.unit}` : "Quantidade"} value={qty} onChange={(event) => setQty(event.target.value)} />
          <Button type="submit" size="lg">
            Guardar
          </Button>
        </form>
      </Modal>
    </Reveal>
  );
}
