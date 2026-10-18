export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86400000);
}

/** Monday-based start of week */
export function startOfWeek(iso: string): string {
  const d = parseISO(iso);
  const wd = (d.getDay() + 6) % 7;
  return addDays(iso, -wd);
}

export function fmtLong(iso: string): string {
  return new Intl.DateTimeFormat("lt-LT", { weekday: "long", month: "long", day: "numeric" }).format(parseISO(iso));
}
export function fmtShort(iso: string): string {
  return new Intl.DateTimeFormat("lt-LT", { month: "short", day: "numeric" }).format(parseISO(iso));
}
export function fmtMonth(iso: string): string {
  return new Intl.DateTimeFormat("lt-LT", { year: "numeric", month: "long" }).format(parseISO(iso));
}
export function fmtWeekdayShort(iso: string): string {
  return new Intl.DateTimeFormat("lt-LT", { weekday: "short" }).format(parseISO(iso));
}
export function fmtDateTime(ts: string): string {
  return new Intl.DateTimeFormat("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ts));
}

const WEEKDAY_GENITIVE = [
  "sekmadienio",
  "pirmadienio",
  "antradienio",
  "trečiadienio",
  "ketvirtadienio",
  "penktadienio",
  "šeštadienio",
];

/** Label for an overdue job carried over to today, e.g. "Iš pirmadienio". */
export function overdueLabel(date: string, today: string): string {
  const diff = diffDays(today, date);
  if (diff <= 0) return "";
  if (diff === 1) return "Iš vakar";
  if (diff < 7) return `Iš ${WEEKDAY_GENITIVE[parseISO(date).getDay()]}`;
  return `Nuo ${fmtShort(date)}`;
}