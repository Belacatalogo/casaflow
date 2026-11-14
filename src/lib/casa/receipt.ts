import { tidyProductName } from "./classify.ts";

export type ReceiptItem = {
  name: string;
  qty: number;
  unit: string;
  total: number;
};

const SKIP =
  /valor total|valor a pagar|valor pago|troco|desconto|tribut|forma de pagamento|cartao|pix|chave de acesso|cnpj|cpf do|consumidor|quantidade total|qtd total|descricao|codigo do produto|vl unit|valor unit|valor aproximado|informacao dos tributos|protocolo|serie da nota/;

function decode(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&/gi, "&")
    .replace(/"/gi, '"')
    .replace(/&#39;|'/gi, "'")
    .replace(/</gi, "<")
    .replace(/>/gi, ">");
}

function stripTags(value: string): string {
  return decode(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  return Number.isFinite(number) ? Math.round(number * 100) / 100 : null;
}

function parseQty(value: string): number {
  const number = Number(value.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(number) || number <= 0 || number > 999) return 1;
  return Math.round(number * 1000) / 1000;
}

function unitOf(token: string | undefined): string {
  const value = (token ?? "").toLowerCase();
  if (value === "kg") return "kg";
  if (value === "g") return "g";
  if (value === "l" || value === "lt") return "L";
  if (value === "ml") return "ml";
  return "";
}

export function parseTextLine(line: string): ReceiptItem | null {
  const clean = line.replace(/\s+/g, " ").trim();
  const moneys = [...clean.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2}/g)];
  if (moneys.length === 0) return null;
  const last = moneys[moneys.length - 1];
  const total = parseMoney(last[0]);
  if (total == null || total <= 0 || last.index == null) return null;
  let before = clean.slice(0, last.index).trim();
  if (moneys.length > 1 && moneys[0].index != null) before = clean.slice(0, moneys[0].index).trim();
  const qtyMatch = before.match(/(\d+(?:[.,]\d{1,3})?)\s*(kg|g|l|lt|ml|un|und|pc|pct)?\s*$/i);
  let name = before;
  let qty = 1;
  let unit = "";
  if (qtyMatch?.index != null && qtyMatch.index >= 3) {
    qty = parseQty(qtyMatch[1]);
    unit = unitOf(qtyMatch[2]);
    name = before.slice(0, qtyMatch.index).trim();
  }
  name = name.replace(/^[\d\s./-]+/, "").replace(/\s+/g, " ").trim();
  if (name.length < 3 || !/[a-zà-ÿ]/i.test(name)) return null;
  const folded = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
  if (SKIP.test(folded)) return null;
  return { name: tidyProductName(name), qty, unit, total };
}

function fromCells(cells: string[]): ReceiptItem | null {
  const moneys = cells.flatMap((cell) => {
    const match = cell.match(/\d{1,3}(?:\.\d{3})*,\d{2}/);
    const value = match ? parseMoney(match[0]) : null;
    return value != null && value > 0 ? [value] : [];
  });
  if (moneys.length === 0) return null;
  const nameCell = cells
    .filter((cell) => /[a-zà-ÿ]{3,}/i.test(cell) && !/^\d/.test(cell))
    .sort((a, b) => b.length - a.length)[0];
  if (!nameCell) return parseTextLine(cells.join(" "));
  const qtyCell = cells.find((cell) => /^\d+(?:[.,]\d+)?$/.test(cell.trim()));
  const unitCell = cells.find((cell) => /^(kg|g|l|lt|ml|un|und|pc|pct)$/i.test(cell.trim()));
  const item = parseTextLine(`${nameCell} ${qtyCell ?? "1"} ${unitCell ?? ""} ${moneys[moneys.length - 1].toFixed(2).replace(".", ",")}`);
  return item;
}

export function parseReceiptDocument(source: string): ReceiptItem[] {
  const found: ReceiptItem[] = [];
  if (/<\/tr>/i.test(source)) {
    const rows = source.replace(/<br\s*\/?>/gi, "\n").split(/<\/tr>/i);
    for (const row of rows) {
      const cells = row
        .split(/<\/t[dh]>/i)
        .map((cell) => stripTags(cell))
        .filter(Boolean);
      const item = cells.length >= 2 ? fromCells(cells) : parseTextLine(stripTags(row));
      if (item) found.push(item);
    }
  }
  if (found.length === 0) {
    const text = decode(source)
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .split(/\n+/)
      .map((line) => line.replace(/[ \t]+/g, " ").trim())
      .filter(Boolean);
    for (const line of text) {
      const item = parseTextLine(line);
      if (item) found.push(item);
    }
  }
  const seen = new Set<string>();
  const items: ReceiptItem[] = [];
  for (const item of found) {
    const key = `${item.name.toLowerCase()}|${item.total}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= 80) break;
  }
  return items;
}

export function receiptStoreName(source: string): string {
  const text = decode(source).replace(/<[^>]+>/g, "\n");
  const match = text.match(/nome fantasia[:\s]+([^\n]{3,50})/i) ?? text.match(/raz[aã]o social[:\s]+([^\n]{3,50})/i);
  return match ? tidyProductName(match[1]) : "";
}

const ACCESS_KEY = /\d{44}/;

export function accessKeyFrom(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const match = digits.match(/\d{44}/);
  return match?.[0] ?? (ACCESS_KEY.test(raw) ? raw.match(ACCESS_KEY)?.[0] ?? null : null);
}

export function isProductBarcode(raw: string): boolean {
  return /^\d{8,14}$/.test(raw.trim()) && raw.trim().length !== 44;
}

export function allowedReceiptUrl(value: string): string | null {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return null;
  }
  if (url.username || url.password) return null;
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || /^\d+\.\d+\.\d+\.\d+$/.test(host) || host.includes(":")) return null;
  const blob = `${host}${url.pathname}${url.search}`.toLowerCase();
  const ok = ["sefaz", "fazenda", "nfce", "sefin", "sefa."].some((part) => blob.includes(part));
  if (!ok) return null;
  return url.toString();
}

const QR_BY_UF: Record<string, string> = {
  "11": "https://www.nfce.sefin.ro.gov.br/consultanfce/consulta.jsp?p=",
  "12": "http://www.sefaznet.ac.gov.br/nfce/qrcode?p=",
  "13": "https://sistemas.sefaz.am.gov.br/nfceweb/formConsulta.do?p=",
  "15": "https://appnfc.sefa.pa.gov.br/portal/view/consultas/nfce/nfceForm.seam?p=",
  "17": "https://apps.sefaz.to.gov.br/portal-nfce/qrcode?p=",
  "21": "https://www.nfce.sefaz.ma.gov.br/portal/consultarNFCe.jsp?p=",
  "22": "https://www.sefaz.pi.gov.br/nfce/qrcode?p=",
  "23": "https://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html?p=",
  "24": "http://nfce.set.rn.gov.br/consultarNFCe.aspx?p=",
  "26": "https://nfce.sefaz.pe.gov.br/nfce/consulta?p=",
  "27": "https://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp?p=",
  "29": "https://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx?p=",
  "31": "https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=",
  "32": "https://app.sefaz.es.gov.br/ConsultaNFCe/qrcode.aspx?p=",
  "33": "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=",
  "35": "https://www.nfce.fazenda.sp.gov.br/qrcode?p=",
  "41": "https://www.fazenda.pr.gov.br/nfce/qrcode?p=",
  "42": "https://sat.sef.sc.gov.br/nfce/consulta?p=",
  "43": "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx?p=",
  "50": "https://www.dfe.ms.gov.br/nfce/qrcode?p=",
  "51": "https://www.sefaz.mt.gov.br/nfce/consultanfce?p=",
  "52": "https://nfe.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p=",
  "53": "https://www.fazenda.df.gov.br/nfce/qrcode?p=",
};

export function receiptUrls(raw: string): string[] {
  const urls: string[] = [];
  const direct = raw.match(/https?:\/\/[^\s]+/i)?.[0];
  const allowedDirect = direct ? allowedReceiptUrl(direct) : null;
  if (allowedDirect) urls.push(allowedDirect);
  const key = accessKeyFrom(raw);
  if (key) {
    const base = QR_BY_UF[key.slice(0, 2)];
    if (base) urls.push(`${base}${key}`);
  }
  return [...new Set(urls)].slice(0, 2);
}
