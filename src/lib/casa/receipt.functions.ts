import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { isProductBarcode, parseReceiptDocument, receiptStoreName, receiptUrls } from "@/lib/casa/receipt";
import type { ReceiptItem } from "@/lib/casa/receipt";

export type ReadCodeResult =
  | { kind: "receipt"; items: ReceiptItem[]; store: string }
  | { kind: "product"; name: string }
  | { kind: "empty"; message: string };

async function fetchText(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "Mozilla/5.0",
      },
    });
    if (!response.ok) return null;
    const text = await response.text();
    return text.slice(0, 1_500_000);
  } catch {
    return null;
  }
}

async function lookupBarcode(code: string): Promise<ReadCodeResult> {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_pt`, {
      signal: AbortSignal.timeout(8000),
      headers: { "user-agent": "CasaFlow" },
    });
    if (!response.ok) return { kind: "empty", message: "Não achei esse produto. Digite o nome e o valor." };
    const body = (await response.json()) as { product?: { product_name?: string; product_name_pt?: string } };
    const name = body.product?.product_name_pt?.trim() || body.product?.product_name?.trim() || "";
    if (name.length < 2) return { kind: "empty", message: "Não achei esse produto. Digite o nome e o valor." };
    return { kind: "product", name };
  } catch {
    return { kind: "empty", message: "Não consegui consultar o código. Digite o nome e o valor." };
  }
}

export const readCode = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((input: { raw: string }) => {
    const raw = String(input?.raw ?? "").trim();
    if (raw.length < 6 || raw.length > 2500) throw new Error("Código inválido.");
    return { raw };
  })
  .handler(async ({ data }): Promise<ReadCodeResult> => {
    if (isProductBarcode(data.raw)) return lookupBarcode(data.raw);
    const urls = receiptUrls(data.raw);
    if (urls.length === 0) {
      const items = parseReceiptDocument(data.raw);
      if (items.length > 0) return { kind: "receipt", items, store: receiptStoreName(data.raw) };
      return { kind: "empty", message: "Esse código não é de uma nota. Aponte para o QR da nota fiscal." };
    }
    for (const url of urls) {
      const html = await fetchText(url);
      if (!html) continue;
      const items = parseReceiptDocument(html);
      if (items.length > 0) return { kind: "receipt", items, store: receiptStoreName(html) };
    }
    return {
      kind: "empty",
      message: "A nota não abriu daqui. Cole o texto dela no campo abaixo, ou lance item por item.",
    };
  });
