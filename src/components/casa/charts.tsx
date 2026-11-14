import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/casa/format";
import type { MonthBar, PacePoint } from "@/lib/casa/logic";

function Tip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-surface px-3 py-2 text-sm shadow-card">
      <p className="mb-1 text-muted">{label}</p>
      {payload.map((item) => (
        <p key={item.name} className="tabular-nums text-ink">
          {item.name}: {formatMoney(Number(item.value ?? 0))}
        </p>
      ))}
    </div>
  );
}

const axis = { fill: "var(--muted)", fontSize: 12 };

export function PaceChart({ points }: { points: PacePoint[] }) {
  const last = points[points.length - 1]?.day ?? 1;
  const ticks = [1, 5, 10, 15, 20, 25, 30].filter((day) => day <= last);
  if (ticks[ticks.length - 1] !== last) ticks.push(last);
  return (
    <div className="h-56 w-full min-w-0" role="img" aria-label="Gasto do mês comparado com o vale">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" ticks={ticks} tick={axis} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="ritmo" name="Vale" stroke="var(--gold)" fill="transparent" strokeDasharray="4 4" dot={false} />
          <Area type="monotone" dataKey="realizado" name="Já pago" stroke="var(--terra)" fill="var(--terra-soft)" dot={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div className="mt-2 flex gap-4 text-sm text-muted">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-terra" /> Já pago</span>
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dashed border-gold" /> Vale</span>
      </div>
    </div>
  );
}

export function MonthChart({ rows }: { rows: MonthBar[] }) {
  return (
    <div className="h-64 w-full min-w-0" role="img" aria-label="Comparativo de gastos dos últimos meses">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<Tip />} />
          <Bar dataKey="realizado" name="Já pago" fill="var(--terra)" radius={[8, 8, 0, 0]} maxBarSize={28} />
          <Bar dataKey="projecao" name="Previsão" fill="var(--gold)" radius={[8, 8, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
