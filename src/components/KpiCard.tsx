import type { ReactNode } from "react";
import clsx from "clsx";

interface Props {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "default" | "navy" | "green" | "red";
}

export function KpiCard({ label, value, sub, tone = "default" }: Props) {
  return (
    <div className={clsx("kpi", tone === "navy" && "kpi-navy", tone === "green" && "kpi-green", tone === "red" && "kpi-red")}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  );
}
