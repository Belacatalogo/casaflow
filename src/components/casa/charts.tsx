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
  const data = points.filter((_, index) => index % (points.length > 20 ? 2 : 1) === 0 || index === points.length - 1);
  return (
    <div className="h-56 w-full min-w-0" role="img" aria-label="Evolução do gasto no mês contra o ritmo do orçamento">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis dataKey="day" tick={axis} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip content={<Tip />} />
          <Area type="monotone" dataKey="ritmo" name="Ritmo" stroke="var(--gold)" fill="transparent" strokeDasharray="4 4" dot={false} />
          <Area type="monotone" dataKey="realizado" name="Realizado" stroke="var(--terra)" fill="var(--terra-soft)" dot={false} connectNulls={false} />
        </AreaChart>
      </ResponsiveContainer>
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
          <Bar dataKey="realizado" name="Realizado" fill="var(--terra)" radius={[8, 8, 0, 0]} maxBarSize={28} />
          <Bar dataKey="projecao" name="Projeção" fill="var(--gold)" radius={[8, 8, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
