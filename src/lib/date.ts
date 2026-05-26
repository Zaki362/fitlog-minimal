export function parseYmd(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(NaN);
  }
  return new Date(year, month - 1, day);
}

export function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayYmd(): string {
  return toYmd(new Date());
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekMonday(date: Date): Date {
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = normalized.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  return addDays(normalized, offset);
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function isBetweenInclusive(date: string, start: Date, end: Date): boolean {
  const parsed = parseYmd(date).getTime();
  return parsed >= start.getTime() && parsed <= end.getTime();
}

export function diffDays(fromYmd: string, toYmdValue = todayYmd()): number {
  const from = parseYmd(fromYmd).getTime();
  const to = parseYmd(toYmdValue).getTime();
  return Math.floor((to - from) / 86400000);
}

export function formatDateCN(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  const weekday = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parsed.getDay()];
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日 ${weekday}`;
}

export function formatShortDate(date: string): string {
  const parsed = parseYmd(date);
  if (Number.isNaN(parsed.getTime())) {
    return date;
  }
  return `${String(parsed.getMonth() + 1).padStart(2, "0")}${String(parsed.getDate()).padStart(2, "0")}`;
}

export function formatInputDate(date: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayYmd();
}

export function compareYmdDesc(a: string, b: string): number {
  return parseYmd(b).getTime() - parseYmd(a).getTime();
}

export function getLastNDates(days: number, referenceYmd = todayYmd()): string[] {
  const reference = parseYmd(referenceYmd);
  return Array.from({ length: days }, (_, index) => toYmd(addDays(reference, index - days + 1)));
}
