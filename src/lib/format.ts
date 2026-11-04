const DAY = 86_400_000;

export function money(n: number, opts: { cents?: boolean } = {}): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: opts.cents ? 2 : 0,
    maximumFractionDigits: opts.cents ? 2 : 0,
  }).format(n);
}

export function compactMoney(n: number): string {
  if (Math.abs(n) >= 1000) return "$" + (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "") + "k";
  return money(n);
}

/** Parse a date-only string (YYYY-MM-DD) as a local calendar day. */
export function parseDay(d: string): Date {
  const [y, m, day] = d.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, day);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Whole calendar days from a to b (b - a). */
export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

export function shortDate(d: string | Date): string {
  const date = typeof d === "string" ? (d.length === 10 ? parseDay(d) : new Date(d)) : d;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function relative(iso: string, now = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const m = Math.round(diff / 60_000);
  if (Math.abs(m) < 1) return "just now";
  if (m < 0) {
    const fm = -m;
    if (fm < 60) return `in ${fm} min`;
    if (fm < 60 * 24) return `in ${Math.round(fm / 60)} h`;
    return `in ${Math.round(fm / 1440)} days`;
  }
  if (m < 60) return `${m} min ago`;
  if (m < 60 * 24) return `${Math.round(m / 60)} h ago`;
  const d = Math.round(m / 1440);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

export function firstName(name: string | null | undefined): string {
  return (name ?? "there").split(" ")[0];
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}
