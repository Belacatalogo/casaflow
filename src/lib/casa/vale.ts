/** Meal voucher paid only on a Goiânia business day. */
export const DEFAULT_MEAL_DAILY = 30;

/** Monday–Friday that is not a national or Goiânia holiday. */
export function isBusinessDay(year: number, month: number, day: number): boolean {
  const date = new Date(year, month - 1, day);
  const week = date.getDay();
  if (week === 0 || week === 6) return false;
  return !holidayKeys(year).has(key(month, day));
}

export function businessDays(monthKey: string): number {
  const [year, month] = monthKey.split("-").map(Number);
  if (!year || !month) return 0;
  const last = new Date(year, month, 0).getDate();
  let count = 0;
  for (let day = 1; day <= last; day += 1) {
    if (isBusinessDay(year, month, day)) count += 1;
  }
  return count;
}

export function monthVale(daily: number, monthKey: string): { days: number; daily: number; total: number } {
  const rate = Number.isFinite(daily) && daily > 0 ? daily : 0;
  const days = businessDays(monthKey);
  return { days, daily: rate, total: Math.round(rate * days * 100) / 100 };
}

export type ValeCredit = { on: string; forMonth: string; amount: number };

export type CardLine = { status: string; boughtAt: string | null; actualTotal: number | null; offCard?: boolean };

/** Last weekday that is not a Goiânia holiday, as YYYY-MM-DD. */
export function lastBusinessDay(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const last = new Date(year, month, 0).getDate();
  for (let day = last; day >= 1; day -= 1) {
    if (isBusinessDay(year, month, day)) return dateKey(year, month, day);
  }
  return dateKey(year, month, 1);
}

export function dayKey(date: Date): string {
  return dateKey(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

/** Vale of the next month, paid on the last business day of this one. */
export function creditsBetween(daily: number, afterDay: string, throughDay: string): ValeCredit[] {
  const found: ValeCredit[] = [];
  let month = shiftKey(afterDay.slice(0, 7), -1);
  for (let guard = 0; guard < 36 && month <= throughDay.slice(0, 7); guard += 1) {
    const credit = creditFor(month, daily);
    if (credit.on > afterDay && credit.on <= throughDay) found.push(credit);
    month = shiftKey(month, 1);
  }
  return found;
}

export function nextCredit(daily: number, afterDay: string): ValeCredit {
  let month = shiftKey(afterDay.slice(0, 7), -1);
  for (let guard = 0; guard < 36; guard += 1) {
    const credit = creditFor(month, daily);
    if (credit.on > afterDay) return credit;
    month = shiftKey(month, 1);
  }
  return creditFor(month, daily);
}

export function cardPosition(input: {
  daily: number;
  anchor: number | null;
  anchorAt: string | null;
  lines: CardLine[];
  now?: Date;
}): { ready: boolean; balance: number; spent: number; credited: number; credits: ValeCredit[]; next: ValeCredit | null } {
  const now = input.now ?? new Date();
  if (input.anchor == null || !input.anchorAt) {
    return { ready: false, balance: 0, spent: 0, credited: 0, credits: [], next: nextCredit(input.daily, dayKey(now)) };
  }
  const anchorDate = new Date(input.anchorAt);
  const afterDay = Number.isNaN(anchorDate.getTime()) ? "9999-12-31" : dayKey(anchorDate);
  const credits = creditsBetween(input.daily, afterDay, dayKey(now));
  const credited = roundMoney(credits.reduce((sum, credit) => sum + credit.amount, 0));
  const spent = roundMoney(
    input.lines.reduce((sum, line) => {
      if (line.status !== "bought" || line.offCard || !line.boughtAt || line.boughtAt <= input.anchorAt!) return sum;
      return sum + (line.actualTotal ?? 0);
    }, 0),
  );
  return {
    ready: true,
    balance: roundMoney(input.anchor + credited - spent),
    spent,
    credited,
    credits,
    next: nextCredit(input.daily, dayKey(now)),
  };
}

function creditFor(payMonth: string, daily: number): ValeCredit {
  const forMonth = shiftKey(payMonth, 1);
  return { on: lastBusinessDay(payMonth), forMonth, amount: monthVale(daily, forMonth).total };
}

function shiftKey(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return dateKey(date.getFullYear(), date.getMonth() + 1, 1).slice(0, 7);
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function key(month: number, day: number): string {
  return `${month}-${day}`;
}

/** Easter Sunday, local calendar. */
function easter(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function holidayKeys(year: number): Set<string> {
  const fixed = [
    [1, 1],
    [4, 21],
    [5, 1],
    [5, 24],
    [9, 7],
    [10, 12],
    [10, 24],
    [11, 2],
    [11, 15],
    [11, 20],
    [12, 25],
  ];
  const sunday = easter(year);
  const movable = [addDays(sunday, -48), addDays(sunday, -47), addDays(sunday, -2), addDays(sunday, 60)];
  const keys = new Set(fixed.map(([month, day]) => key(month, day)));
  for (const date of movable) keys.add(key(date.getMonth() + 1, date.getDate()));
  return keys;
}
