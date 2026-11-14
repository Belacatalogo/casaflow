const MONTHS = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const qtyFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function currentMonthKey(now = new Date()): string {
  return monthKey(now);
}

export function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + delta, 1));
}

export function daysInMonth(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export function monthLabel(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTHS[month - 1] ?? key;
  return `${name} de ${year}`;
}

export function monthTitle(key: string): string {
  const label = monthLabel(key);
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function monthShort(key: string): string {
  const [year, month] = key.split("-").map(Number);
  const name = MONTHS[month - 1] ?? key;
  return `${name.slice(0, 3)}/${String(year).slice(2)}`;
}

export function formatMoney(value: number): string {
  if (!Number.isFinite(value)) return moneyFmt.format(0);
  return moneyFmt.format(value);
}

export function formatQty(value: number): string {
  if (!Number.isFinite(value)) return "0";
  return qtyFmt.format(value);
}

export function formatDay(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function roundQty(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 1;
  if (value >= 10) return Math.round(value);
  return Math.max(0.5, Math.round(value * 2) / 2);
}

export function parseDecimal(raw: string): number | null {
  const trimmed = raw.trim().replace(",", ".");
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null;
}

export function decimalToInput(value: number): string {
  return String(round2(value)).replace(".", ",");
}

export function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function hashUnit(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
}
