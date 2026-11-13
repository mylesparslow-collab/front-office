import { BUCKETS, type Bucket } from "@/lib/metrics";
import { compactMoney, money } from "@/lib/format";

export const BUCKET_COLORS: Record<Bucket, string> = {
  "Not due": "#e4e1da",
  "1-30": "#f8d77a",
  "31-60": "#f5b82e",
  "61-90": "#e9677a",
  "90+": "#d7263d",
};

export function AgingBar({ data }: { data: Record<Bucket, { total: number; count: number }> }) {
  const total = BUCKETS.reduce((s, b) => s + data[b].total, 0) || 1;
  return (
    <div>
      <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-canvas ring-1 ring-line" role="img" aria-label="Open balances by age">
        {BUCKETS.map((b) =>
          data[b].total > 0 ? (
            <div key={b} style={{ width: `${(data[b].total / total) * 100}%`, background: BUCKET_COLORS[b] }} className="h-full border-r-2 border-paper last:border-r-0" title={`${b}: ${money(data[b].total)}`} />
          ) : null,
        )}
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {BUCKETS.map((b) => (
          <div key={b} className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="size-2 shrink-0 rounded-[3px]" style={{ background: BUCKET_COLORS[b] }} />
              <span className="truncate text-[11.5px] font-medium text-muted">{b === "Not due" ? "Not due" : `${b} days`}</span>
            </div>
            <div className={`num mt-1 text-[15px] font-semibold ${b === "90+" || b === "61-90" ? "text-red" : "text-ink"}`}>{compactMoney(data[b].total)}</div>
            <div className="text-[11.5px] text-faint">{data[b].count} open</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MonthlyBars({ rows, height = 180 }: { rows: { label: string; total: number }[]; height?: number }) {
  const max = Math.max(...rows.map((r) => r.total), 1);
  const nice = niceCeil(max);
  const w = 100 / rows.length;
  return (
    <div>
      <div className="relative" style={{ height }}>
        {[0, 0.5, 1].map((t) => (
          <div key={t} className="absolute inset-x-0 border-t border-dashed border-line" style={{ bottom: `${t * 100}%` }}>
            <span className="num absolute -top-2.5 right-0 bg-paper pl-1 text-[10.5px] text-faint">{compactMoney(nice * t)}</span>
          </div>
        ))}
        <div className="absolute inset-0 flex items-end pr-10">
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            return (
              <div key={r.label} className="group flex h-full flex-col items-center justify-end px-[8%]" style={{ width: `${w}%` }}>
                <span className="num mb-1 text-[11px] font-semibold text-ink-2 opacity-0 transition group-hover:opacity-100">{compactMoney(r.total)}</span>
                <div
                  className="w-full max-w-11 rounded-t-[5px] transition-all"
                  style={{ height: `${(r.total / nice) * 100}%`, minHeight: r.total ? 3 : 0, background: last ? "#d7263d" : "#f5b82e" }}
                  title={money(r.total)}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="mt-2 flex pr-10">
        {rows.map((r, i) => (
          <div key={r.label} className={`text-center text-[11.5px] ${i === rows.length - 1 ? "font-semibold text-ink" : "text-muted"}`} style={{ width: `${w}%` }}>
            {r.label}
          </div>
        ))}
      </div>
    </div>
  );
}

function niceCeil(n: number) {
  const p = Math.pow(10, Math.floor(Math.log10(n)));
  const m = n / p;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p;
}

export function Funnel({ steps }: { steps: { label: string; value: number; sub?: string }[] }) {
  const max = Math.max(...steps.map((s) => s.value), 1);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => (
        <div key={s.label}>
          <div className="mb-1 flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-ink-2">{s.label}</span>
            <span className="num font-semibold text-ink">
              {s.value}
              {s.sub && <span className="ml-1.5 font-normal text-muted">{s.sub}</span>}
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-canvas ring-1 ring-line">
            <div className="h-full rounded-full" style={{ width: `${(s.value / max) * 100}%`, background: i === steps.length - 1 ? "#d7263d" : i === 0 ? "#f8d77a" : "#f5b82e" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
