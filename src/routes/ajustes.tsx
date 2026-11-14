import { createFileRoute, Link } from "@tanstack/react-router";
import { UserButton } from "@/lib/auth/gates";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { PageIntro, Reveal } from "@/components/casa/chrome";
import { ICON_OPTIONS } from "@/components/casa/icons";
import { SWATCHES } from "@/components/casa/dialogs";
import { Button, Card, Field, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { sanitizeSnapshot } from "@/lib/casa/sanitize";
import { decimalToInput, formatMoney, monthTitle, parseDecimal, shiftMonth, currentMonthKey } from "@/lib/casa/format";
import { monthVale } from "@/lib/casa/vale";
import { useCasa } from "@/lib/casa/store";
import type { ListMode, Swatch, ThemeMode } from "@/lib/casa/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ajustes")({
  head: () => ({ meta: [{ title: "Ajustes · CasaFlow" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const ready = useCasa((state) => state.ready);
  if (!ready) return <PageSkeleton />;
  return <SettingsScreen />;
}

const MODES: { id: ListMode; label: string }[] = [
  { id: "completa", label: "Tudo" },
  { id: "economia", label: "Economia" },
  { id: "acabando", label: "Acabando" },
];

const THEMES: { id: ThemeMode; label: string }[] = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Escuro" },
  { id: "system", label: "Sistema" },
];

function SettingsScreen() {
  const settings = useCasa((state) => state.settings);
  const categories = useCasa((state) => state.categories);
  const updateSettings = useCasa((state) => state.updateSettings);
  const addCategory = useCasa((state) => state.addCategory);
  const updateCategory = useCasa((state) => state.updateCategory);
  const removeCategory = useCasa((state) => state.removeCategory);
  const clearData = useCasa((state) => state.clearData);
  const importSnapshot = useCasa((state) => state.importSnapshot);
  const homeCode = useCasa((state) => state.homeCode);
  const [name, setName] = useState(settings.householdName);
  const [daily, setDaily] = useState(decimalToInput(settings.mealDaily ?? 30));
  const [categoryName, setCategoryName] = useState("");
  const [icon, setIcon] = useState("basket");
  const [swatch, setSwatch] = useState<Swatch>("terra");
  const [confirmReset, setConfirmReset] = useState(false);
  const [dropCategory, setDropCategory] = useState<string | null>(null);

  useEffect(() => {
    setName(settings.householdName);
    setDaily(decimalToInput(settings.mealDaily ?? 30));
  }, [settings.householdName, settings.mealDaily]);

  function exportData() {
    const state = useCasa.getState();
    const blob = new Blob(
      [JSON.stringify({ settings: state.settings, categories: state.categories, products: state.products, lines: state.lines }, null, 2)],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "casaflow.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Cópia salva neste celular.");
  }

  return (
    <Reveal>
      <PageIntro eyebrow="Ajustes" title="A casa" lede="O vale do mês, as pessoas e as categorias. A casa fica na sua conta, no celular e no tablet." />
      <Card className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl text-ink">Conta</h2>
            <p className="mt-1 font-display text-3xl tracking-[0.18em] text-ink">{homeCode || "—"}</p>
          </div>
          <UserButton />
        </div>
        <p className="mt-3 text-pretty text-sm text-muted">Quem entra com esse código só vê o que ainda tem em casa.</p>
        {homeCode ? (
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <Button
              variant="secondary"
              onClick={() => {
                void navigator.clipboard.writeText(homeCode).then(
                  () => toast.success("Código copiado."),
                  () => toast("Não consegui copiar. Anote o código."),
                );
              }}
            >
              Copiar código
            </Button>
            <KitchenQr code={homeCode} />
          </div>
        ) : null}
      </Card>

      <Card className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nome da casa">
            <input
              className={fieldClass}
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={() => {
                const next = name.trim();
                if (next.length >= 2) updateSettings({ householdName: next });
                else setName(settings.householdName);
              }}
            />
          </Field>
          <Field label="Vale por dia útil" hint="Sábado, domingo e feriado de Goiânia não entram">
            <input
              className={fieldClass}
              inputMode="decimal"
              value={daily}
              onChange={(event) => setDaily(event.target.value)}
              onBlur={() => {
                const value = parseDecimal(daily);
                if (value != null && value >= 0) updateSettings({ mealDaily: value });
              }}
            />
          </Field>
        </div>
        <ul className="mt-4 grid gap-2 text-sm text-muted sm:grid-cols-3">
          {[0, 1, 2].map((offset) => {
            const key = shiftMonth(currentMonthKey(), offset);
            const vale = monthVale(settings.mealDaily ?? 30, key);
            return (
              <li key={key} className="rounded-2xl bg-sunken px-3 py-2">
                <p className="font-medium text-ink">{monthTitle(key)}</p>
                <p>
                  {vale.days} dias úteis · {formatMoney(vale.total)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Pessoas</p>
            <p className="text-sm text-muted">Só uma anotação. Não muda preços nem quantidades.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" aria-label="Menos uma pessoa" onClick={() => updateSettings({ people: settings.people - 1 })}>
              −
            </Button>
            <span className="w-8 text-center font-display text-2xl tabular-nums">{settings.people}</span>
            <Button variant="secondary" size="icon" aria-label="Mais uma pessoa" onClick={() => updateSettings({ people: settings.people + 1 })}>
              +
            </Button>
          </div>
        </div>
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">Modo da lista</p>
          <p className="text-sm text-muted">Economia deixa só o essencial, na quantidade dos meses anteriores. Acabando deixa só o que está no fim.</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {MODES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("h-11 rounded-full text-sm font-medium", (settings.listMode ?? "completa") === item.id ? "bg-hero text-on-hero" : "bg-sunken text-ink")}
                onClick={() => updateSettings({ listMode: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5">
          <p className="text-sm font-medium text-ink">Tema</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {THEMES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cn("h-11 rounded-full text-sm font-medium", settings.theme === item.id ? "bg-hero text-on-hero" : "bg-sunken text-ink")}
                onClick={() => updateSettings({ theme: item.id })}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="mt-3">
        <h2 className="font-display text-2xl text-ink">Categorias</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {[...categories]
            .sort((a, b) => a.order - b.order)
            .map((category) => (
              <li key={category.id} className="flex flex-wrap items-center gap-2">
                <input
                  className={cn(fieldClass, "min-w-0 flex-1")}
                  defaultValue={category.name}
                  aria-label={`Nome de ${category.name}`}
                  onBlur={(event) => updateCategory(category.id, { name: event.target.value })}
                />
                <div className="flex gap-1">
                  {SWATCHES.map((tone) => (
                    <button
                      key={tone}
                      type="button"
                      aria-label={swatchLabel(tone)}
                      className={cn("size-7 rounded-full", swatchClass(tone), category.swatch === tone && "outline-2 outline-offset-2 outline-ink")}
                      onClick={() => updateCategory(category.id, { swatch: tone })}
                    />
                  ))}
                </div>
                <Button variant="ghost" aria-label={`Excluir categoria ${category.name}`} onClick={() => setDropCategory(category.id)}>
                  Excluir {category.name}
                </Button>
              </li>
            ))}
        </ul>
        <form
          className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (categoryName.trim().length < 2) {
              toast("O nome precisa de pelo menos 2 letras.");
              return;
            }
            addCategory({ name: categoryName, icon, swatch });
            setCategoryName("");
          }}
        >
          <Field label="Nova categoria">
            <input className={fieldClass} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Pet, festa, farmácia" />
          </Field>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((option) => (
              <button key={option.id} type="button" className={cn("h-10 rounded-full px-3 text-sm", icon === option.id ? "bg-hero text-on-hero" : "bg-sunken text-ink")} onClick={() => setIcon(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
          <Button type="submit" variant="secondary">
            Adicionar categoria
          </Button>
        </form>
      </Card>

      <Card className="mt-3">
        <h2 className="font-display text-2xl text-ink">Seus dados</h2>
        <p className="mt-1 text-pretty text-muted">Ficam só neste celular. Salve uma cópia para não perder, ou traga a cópia de outro aparelho.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" onClick={exportData}>
            Salvar cópia
          </Button>
          <label className="inline-flex h-11 cursor-pointer items-center rounded-full bg-sunken px-4 text-sm font-medium text-ink">
            Trazer cópia
            <input
              type="file"
              accept="application/json"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (!file) return;
                try {
                  const parsed = sanitizeSnapshot(JSON.parse(await file.text()));
                  if (!parsed) {
                    toast("Esse arquivo não parece do CasaFlow.");
                    return;
                  }
                  importSnapshot(parsed);
                } catch {
                  toast("Não consegui ler o arquivo.");
                }
              }}
            />
          </label>
          <Button variant="soft" onClick={() => setConfirmReset(true)}>
            Apagar produtos e compras
          </Button>
          <Button asChild variant="ghost">
            <Link to="/historico">Abrir histórico</Link>
          </Button>
        </div>
      </Card>

      <Modal open={confirmReset} onOpenChange={setConfirmReset} title="Apagar produtos e compras?" description="A lista, os produtos e o histórico somem. Categorias, vale e tema continuam.">
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              void clearData();
              setConfirmReset(false);
            }}
          >
            Apagar tudo
          </Button>
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
            Cancelar
          </Button>
        </div>
      </Modal>
      <Modal
        open={Boolean(dropCategory)}
        onOpenChange={(open) => !open && setDropCategory(null)}
        title="Excluir esta categoria?"
        description={categories.find((category) => category.id === dropCategory)?.name ?? "Os produtos dela ficam sem categoria."}
      >
        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={() => {
              if (!dropCategory) return;
              const current = categories.find((category) => category.id === dropCategory)?.name ?? "Categoria";
              removeCategory(dropCategory);
              toast.success(`${current} excluída.`);
              setDropCategory(null);
            }}
          >
            Excluir
          </Button>
          <Button variant="secondary" onClick={() => setDropCategory(null)}>
            Cancelar
          </Button>
        </div>
      </Modal>
    </Reveal>
  );
}

function swatchLabel(swatch: Swatch) {
  if (swatch === "terra") return "Terracota";
  if (swatch === "gold") return "Dourado";
  if (swatch === "clay") return "Barro";
  if (swatch === "sand") return "Areia";
  if (swatch === "ink") return "Preto";
  return "Marrom";
}

function swatchClass(swatch: Swatch) {
  if (swatch === "terra") return "bg-terra";
  if (swatch === "gold") return "bg-gold";
  if (swatch === "clay") return "bg-terra-deep";
  if (swatch === "sand") return "bg-gold-deep";
  if (swatch === "ink") return "bg-ink";
  return "bg-muted";
}

function KitchenQr({ code }: { code: string }) {
  const [src, setSrc] = useState("");
  useEffect(() => {
    void QRCode.toDataURL(code, { margin: 1, width: 160, color: { dark: "#1c1916", light: "#fffaf4" } }).then(setSrc);
  }, [code]);
  if (!src) return null;
  return <img src={src} alt={`QR do código ${code}`} className="size-28 rounded-2xl border border-line bg-surface" />;
}
