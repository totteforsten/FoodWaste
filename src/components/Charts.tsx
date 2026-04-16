"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from "recharts";

const STENA = {
  navy: "#003D6B",
  blue: "#0095DB",
  blue600: "#0077B6",
  sky: "#E6F2F8",
  green: "#2E7D32",
  red: "#E30613",
  amber: "#F59E0B",
  purple: "#8B5CF6",
  teal: "#14B8A6"
};

const PIE_COLORS = [STENA.navy, STENA.blue, STENA.green, STENA.amber, STENA.purple, STENA.teal, STENA.red];

export function TrendArea({
  data,
  dataKey = "kg",
  height = 260,
  label = "kg"
}: {
  data: Array<{ date: string; [k: string]: number | string }>;
  dataKey?: string;
  height?: number;
  label?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={STENA.blue} stopOpacity={0.45} />
            <stop offset="100%" stopColor={STENA.blue} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEF" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5C6A78" }} tickFormatter={(d) => d.slice(5)} />
        <YAxis tick={{ fontSize: 11, fill: "#5C6A78" }} />
        <Tooltip
          contentStyle={{ border: "1px solid #E4EAEF", borderRadius: 10, fontSize: 12 }}
          formatter={(v: number) => [`${v.toFixed(1)} ${label}`, label]}
        />
        <Area type="monotone" dataKey={dataKey} stroke={STENA.navy} strokeWidth={2} fill="url(#trendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({
  data,
  height = 240
}: {
  data: Array<{ name: string; value: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
          {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg`} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HorizontalBars({
  data,
  height = 260
}: {
  data: Array<{ name: string; kg: number }>;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEF" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11, fill: "#5C6A78" }} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#2B3945" }} width={140} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)} kg`} />
        <Bar dataKey="kg" fill={STENA.blue} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
