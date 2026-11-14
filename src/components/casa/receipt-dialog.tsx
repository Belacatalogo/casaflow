import { BrowserMultiFormatReader } from "@zxing/browser";
import { useEffect, useRef, useState } from "react";
import { categoryForGuess, guessProduct } from "@/lib/casa/classify";
import { parseReceiptDocument } from "@/lib/casa/receipt";
import { readCode } from "@/lib/casa/receipt.functions";
import type { ReceiptItem } from "@/lib/casa/receipt";
import { useCasa } from "@/lib/casa/store";
import { formatMoney, formatQty } from "@/lib/casa/format";
import { Button, Modal, fieldClass } from "@/components/ui/controls";

export function ReceiptDialog({
  open,
  onOpenChange,
  onProduct,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProduct: (name: string) => void;
}) {
  const categories = useCasa((state) => state.categories);
  const recordPurchases = useCasa((state) => state.recordPurchases);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"ask" | "camera" | "loading" | "review">("ask");
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [store, setStore] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhase("ask");
    setPaste("");
    setMessage("");
    setItems([]);
    setStore("");
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "camera") return;
    const video = videoRef.current;
    if (!video) return;
    let stopped = false;
    let controls: { stop: () => void } | undefined;
    const reader = new BrowserMultiFormatReader();
    void reader
      .decodeFromVideoDevice(undefined, video, (result, _error, scanner) => {
        controls = scanner;
        if (!result || stopped) return;
        stopped = true;
        scanner.stop();
        void read(result.getText());
      })
      .then((scanner) => {
        controls = scanner;
        if (stopped) scanner.stop();
      })
      .catch(() => {
        if (stopped) return;
        setMessage("A câmera não abriu. Cole o link ou o texto da nota.");
        setPhase("ask");
      });
    return () => {
      stopped = true;
      controls?.stop();
    };
  }, [open, phase]);

  async function read(raw: string) {
    const value = raw.trim();
    if (value.length < 6) {
      setMessage("Não li nada. Tente de novo.");
      setPhase("ask");
      return;
    }
    setPhase("loading");
    setMessage("");
    const pasted = parseReceiptDocument(value);
    if (pasted.length > 0 && !/^https?:\/\//i.test(value) && !/^\d{8,14}$/.test(value)) {
      setItems(pasted);
      setStore("");
      setPhase("review");
      return;
    }
    try {
      const result = await readCode({ data: { raw: value } });
      if (result.kind === "product") {
        onOpenChange(false);
        onProduct(result.name);
        return;
      }
      if (result.kind === "receipt") {
        setItems(result.items);
        setStore(result.store);
        setPhase("review");
        return;
      }
      setMessage(result.message);
      setPhase("ask");
    } catch {
      setMessage("Não consegui ler a nota. Cole o texto dela ou lance item por item.");
      setPhase("ask");
    }
  }

  function launch() {
    const count = recordPurchases(items.map((item) => ({ ...item, store })));
    if (count > 0) onOpenChange(false);
  }

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Escanear nota"
      description="Aponte para o QR da nota fiscal. Os itens e os valores entram juntos."
    >
      {phase === "camera" ? (
        <div className="flex flex-col gap-3">
          <video ref={videoRef} className="aspect-video w-full rounded-2xl bg-hero object-cover" muted autoPlay playsInline />
          <Button variant="secondary" onClick={() => setPhase("ask")}>
            Cancelar
          </Button>
        </div>
      ) : null}

      {phase === "loading" ? <p className="py-8 text-center text-muted">Lendo a nota…</p> : null}

      {phase === "ask" ? (
        <div className="flex flex-col gap-3">
          <Button size="lg" onClick={() => setPhase("camera")}>
            Abrir câmera
          </Button>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-ink">Ou cole o link, o código ou o texto da nota</span>
            <textarea className={`${fieldClass} h-28 py-2`} value={paste} onChange={(event) => setPaste(event.target.value)} />
          </label>
          {message ? <p className="text-sm text-pretty text-terra-deep">{message}</p> : null}
          <Button variant="secondary" disabled={paste.trim().length < 6} onClick={() => void read(paste)}>
            Ler o que colei
          </Button>
        </div>
      ) : null}

      {phase === "review" ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted">
            {items.length} {items.length === 1 ? "item" : "itens"}
            {store ? ` · ${store}` : ""}. Confira e lance.
          </p>
          <ul className="flex max-h-80 flex-col divide-y divide-line overflow-y-auto">
            {items.map((item, index) => {
              const guess = guessProduct(item.name);
              const category = categoryForGuess(categories, guess);
              return (
                <li key={`${item.name}-${index}`} className="flex items-start gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium text-ink">{item.name}</span>
                    <span className="block text-sm text-muted">
                      {category?.name ?? "Sem categoria"} · {formatQty(item.qty)} {item.unit || guess?.unit || "un"}
                    </span>
                  </span>
                  <span className="tabular-nums text-ink">{formatMoney(item.total)}</span>
                  <button
                    type="button"
                    className="text-sm text-muted"
                    onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    Tirar
                  </button>
                </li>
              );
            })}
          </ul>
          <Button size="lg" disabled={items.length === 0} onClick={launch}>
            Lançar compras
          </Button>
          <Button variant="secondary" onClick={() => setPhase("ask")}>
            Ler outra nota
          </Button>
        </div>
      ) : null}
    </Modal>
  );
}
