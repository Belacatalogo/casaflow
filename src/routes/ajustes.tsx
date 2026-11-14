import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { PageIntro, Reveal } from "@/components/casa/chrome";
import { ICON_OPTIONS } from "@/components/casa/icons";
import { SWATCHES } from "@/components/casa/dialogs";
import { Button, Card, Field, Modal, PageSkeleton, fieldClass } from "@/components/ui/controls";
import { sanitizeSnapshot } from "@/lib/casa/sanitize";
import { decimalToInput, parseDecimal } from "@/lib/casa/format";
import { useCasa } from "@/lib/casa/store";
import type { Swatch, ThemeMode } from "@/lib/casa/types";
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
  const [name, setName] = useState(settings.householdName);
  const [budget, setBudget] = useState(decimalToInput(settings.monthlyBudget));
  const [categoryName, setCategoryName] = useState("");
  const [icon, setIcon] = useState("basket");
  const [swatch, setSwatch] = useState<Swatch>("terra");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setName(settings.householdName);
    setBudget(decimalToInput(settings.monthlyBudget));
  }, [settings.householdName, settings.monthlyBudget]);

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
      <PageIntro eyebrow="Ajustes" title="A casa" lede="Limite do mês, pessoas e categorias. Tudo fica só neste celular." />

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
          <Field label="Limite do mês" hint="Usado no início e no gráfico">
            <input
              className={fieldClass}
              inputMode="decimal"
              value={budget}
              onChange={(event) => setBudget(event.target.value)}
              onBlur={() => {
                const value = parseDecimal(budget);
                if (value != null && value >= 0) updateSettings({ monthlyBudget: value });
              }}
            />
          </Field>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-ink">Pessoas</p>
            <p className="text-sm text-muted">Muda a quantidade sugerida.</p>
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
                <Button variant="ghost" onClick={() => removeCategory(category.id)}>
                  Excluir
                </Button>
              </li>
            ))}
        </ul>
        <form
          className="mt-4 flex flex-col gap-3 border-t border-line pt-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (categoryName.trim().length < 2) return;
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

      <Modal open={confirmReset} onOpenChange={setConfirmReset} title="Apagar produtos e compras?" description="A lista, os produtos e o histórico deste celular somem. Categorias, limite e tema continuam.">
        <div className="flex flex-col gap-2">
          <Button
            onClick={() => {
              void clearData();
              setConfirmReset(false);
            }}
          >
            Apagar
          </Button>
          <Button variant="secondary" onClick={() => setConfirmReset(false)}>
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
