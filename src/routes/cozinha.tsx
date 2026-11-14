import { createFileRoute } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { formatQty } from "@/lib/casa/format";
import { useCasa } from "@/lib/casa/store";
import { Button } from "@/components/ui/controls";

export const Route = createFileRoute("/cozinha")({
  head: () => ({ meta: [{ title: "Em casa · CasaFlow" }] }),
  component: KitchenPage,
});

function KitchenPage() {
  const products = useCasa((state) => state.products);
  const changePantry = useCasa((state) => state.changePantry);
  const available = products
    .filter((product) => (product.onHand ?? 0) > 0)
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <main className="mx-auto w-full max-w-lg">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.16em] text-muted uppercase">Cozinha</p>
          <h1 className="mt-1 font-display text-[2rem] leading-none tracking-tight">Em casa</h1>
          <p className="mt-2 text-sm text-muted">Toque quando diminuir ou acabar.</p>
        </div>
        <UserButton />
      </div>
      {available.length === 0 ? (
        <p className="mt-8 text-pretty text-muted">Nada anotado ainda. Quando uma compra entrar, ela aparece aqui.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {available.map((product) => (
            <li key={product.id} className="rounded-[2rem] border border-line bg-surface p-4 shadow-card">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="font-display text-2xl text-ink">{product.name}</h2>
                <p className="font-display text-3xl tabular-nums text-ink">
                  {formatQty(product.onHand ?? 0)} {product.unit}
                </p>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button size="lg" variant="secondary" onClick={() => void changePantry(product.id, "down")}>
                  Diminuir
                </Button>
                <Button size="lg" onClick={() => void changePantry(product.id, "out")}>
                  Acabou
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
