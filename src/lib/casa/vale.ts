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
