import { KpiCard } from "@/components/KpiCard";
import { TrendArea, DonutChart, HorizontalBars } from "@/components/Charts";
import { DashboardToggle } from "@/components/DashboardToggle";
import {
  getOutlets, getVessels, getVoyages, getWasteEntries
} from "@/lib/data-source";
import {
  summarize, dailySeries, breakdownByStream,
  breakdownByOutlet, breakdownByStage
} from "@/lib/kpis";
import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";
import { AlertTriangle, Plus, Download, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: { view?: string; vessel?: string };
}) {
  const session = getSession();
  const locale = getLocale();
  const t = translator(locale);

  // Crew role: always simple, register-first.
  const isCrew = session.role === "crew";
  const view: "simple" | "advanced" =
    isCrew ? "simple"
    : searchParams.view === "advanced" ? "advanced"
    : "simple";

  const [allVessels, allOutlets, voyages, allEntries] = await Promise.all([
    getVessels(),
    getOutlets(),
    getVoyages(undefined, 500),
    getWasteEntries({ sinceMs: Date.now() - 30 * 86400_000, limit: 10000 })
  ]);

  // Scope by role/vessel selection
  const scopedVesselId = session.canSeeAllVessels
    ? (searchParams.vessel || undefined)
    : session.assignedVesselId;

  const vessels = scopedVesselId
    ? allVessels.filter(v => v.id === scopedVesselId)
    : allVessels;
  const outlets = scopedVesselId
    ? allOutlets.filter(o => o.vesselId === scopedVesselId)
    : allOutlets;
  const entries = scopedVesselId
    ? allEntries.filter(e => e.vesselId === scopedVesselId)
    : allEntries;
  const scopedVoyages = scopedVesselId
    ? voyages.filter(v => v.vesselId === scopedVesselId)
    : voyages;

  const since = Date.now() - 30 * 86400_000;
  const totalCovers = scopedVoyages
    .filter(v => v.departureAt >= since)
    .reduce((s, v) => s + (v.coversServed ?? 0), 0);

  const summary = summarize(entries, totalCovers);
  const trend = dailySeries(entries, 30);
  const benchmark = 115;
  const gPerCover = summary.wastePerCoverKg ? Math.round(summary.wastePerCoverKg * 1000) : 0;
  const deltaPct = benchmark > 0 && gPerCover ? Math.round(((gPerCover - benchmark) / benchmark) * 100) : 0;

  // -------- Crew landing: minimal --------
  if (isCrew) {
    const todayEntries = entries.filter(e => e.occurredAt >= Date.now() - 86400_000);
    const todayKg = todayEntries.reduce((s, e) => s + e.weightKg, 0);
    const myVessel = allVessels.find(v => v.id === session.assignedVesselId);

    return (
      <>
        <div className="hero hero-crew">
          <h1>{t("crew.hi", { name: session.displayName })}</h1>
          <p>{myVessel?.name ?? ""}{myVessel?.route ? ` · ${myVessel.route}` : ""}</p>
          <Link href="/register" className="btn btn-accent btn-xlarge mt-2">
            <Plus size={22} />{t("crew.quickLog")}
          </Link>
        </div>

        <div className="kpi-grid">
          <KpiCard label={t("crew.todayTotal")} value={`${todayKg.toFixed(1)} kg`} sub={`${todayEntries.length} ${t("dash.entries")}`} tone="navy" />
          <KpiCard label={t("dash.co2e")} value={`${(todayKg * 2.5).toFixed(1)} kg`} tone="green" />
        </div>

        <div className="card">
          <div className="card-header">
            <h3><Clock size={16} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />{t("crew.recent")}</h3>
          </div>
          <ul className="recent-list">
            {todayEntries.slice(0, 10).map(e => {
              const outlet = allOutlets.find(o => o.id === e.outletId);
              return (
                <li key={e.id} className="recent-item">
                  <div>
                    <strong>{e.weightKg.toFixed(1)} kg</strong>
                    <span className="muted"> · {outlet?.name ?? e.outletId} · {t(`stage.${e.stage}`)}</span>
                  </div>
                  <div className="muted tiny">
                    {new Date(e.occurredAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </div>
                </li>
              );
            })}
            {todayEntries.length === 0 && <li className="muted" style={{ padding: 12 }}>—</li>}
          </ul>
        </div>
      </>
    );
  }

  // -------- Manager / admin landing --------
  return (
    <>
      <div className="hero">
        <div className="row-between" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <div className="hero-kicker">{t("dash.fleet")} · {t("common.last30Days")}</div>
            <h1>
              {scopedVesselId
                ? (allVessels.find(v => v.id === scopedVesselId)?.name ?? t("dash.title"))
                : t("dash.title")}
            </h1>
            <p>{t("dash.subtitle")}</p>
          </div>
          <div className="row">
            <Link href="/register" className="btn btn-accent"><Plus size={16} />{t("nav.register")}</Link>
            {session.canSeeFinance && (
              <Link href="/reports" className="btn btn-secondary"><Download size={16} />{t("common.export")}</Link>
            )}
          </div>
        </div>
      </div>

      <div className="row-between mb-2">
        {session.canSeeAdvanced && (
          <DashboardToggle
            current={view}
            simpleLabel={t("common.simple")}
            advancedLabel={t("common.advanced")}
          />
        )}
        <div className="muted tiny">{summary.entryCount.toLocaleString()} {t("dash.entries")}</div>
      </div>

      <div className="kpi-grid">
        <KpiCard
          label={t("dash.totalWaste")}
          value={`${summary.totalKg.toFixed(1)} kg`}
          sub={`${summary.totalCo2eKg.toFixed(0)} kg CO₂e`}
          tone="navy"
        />
        <KpiCard
          label={t("dash.wastePerCover")}
          value={gPerCover ? `${gPerCover} g` : "—"}
          sub={
            gPerCover ? (
              <span>
                {t("dash.vsBenchmark")}{" "}
                <span className={deltaPct > 0 ? "delta-up" : "delta-down"}>
                  {deltaPct > 0 ? "▲" : "▼"} {Math.abs(deltaPct)}%
                </span>
              </span>
            ) : t("dash.noCovers")
          }
        />
        <KpiCard
          label={t("dash.costOfWaste")}
          value={`€${summary.totalCost.toFixed(0)}`}
          sub={summary.wasteCostPerCover != null ? `€${summary.wasteCostPerCover.toFixed(2)} ${t("dash.perCover")}` : ""}
          tone="red"
        />
        <KpiCard
          label={t("dash.co2e")}
          value={`${summary.totalCo2eKg.toFixed(0)} kg`}
          sub={t("dash.target")}
          tone="green"
        />
      </div>

      {gPerCover > 130 && (
        <div className="alert alert-warn mb-3">
          <AlertTriangle size={18} />
          <div>
            <strong>{t("dash.aboveBenchmark")}</strong>{" "}
            {t("dash.aboveBenchmarkExpl", { g: gPerCover })}
          </div>
        </div>
      )}

      {/* Simple view — just trend + vessels */}
      <div className="card mb-3">
        <div className="card-header">
          <h3>{t("dash.dailyWaste")}</h3>
          <span className="muted tiny">{t("dash.kgPerDay")}</span>
        </div>
        <TrendArea data={trend} dataKey="kg" />
      </div>

      {view === "simple" && !scopedVesselId && session.canSeeAllVessels && (
        <div className="card">
          <div className="card-header">
            <h3>{t("dash.vessels")}</h3>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>{t("dash.vessels")}</th>
                <th>{t("dash.route")}</th>
                <th className="right">{t("dash.outlets")}</th>
                <th className="right">{t("voy.waste")}</th>
                <th className="right">{t("dash.gPerCover")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {allVessels.map(v => {
                const vEntries = allEntries.filter(e => e.vesselId === v.id);
                const vCovers = voyages.filter(x => x.vesselId === v.id).reduce((s, x) => s + (x.coversServed ?? 0), 0);
                const vKg = vEntries.reduce((s, e) => s + e.weightKg, 0);
                const vOutlets = allOutlets.filter(o => o.vesselId === v.id).length;
                const gPer = vCovers > 0 ? Math.round((vKg / vCovers) * 1000) : 0;
                return (
                  <tr key={v.id}>
                    <td><strong>{v.name}</strong></td>
                    <td className="muted">{v.route ?? "—"}</td>
                    <td className="right">{vOutlets}</td>
                    <td className="right">{vKg.toFixed(1)} kg</td>
                    <td className="right">
                      {gPer ? <span className={gPer > 115 ? "delta-up" : "delta-down"}>{gPer}</span> : "—"}
                    </td>
                    <td className="right">
                      <Link href={`/?vessel=${v.id}`} className="btn btn-ghost btn-small">{t("common.open")}</Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Advanced view — full breakdowns */}
      {view === "advanced" && (
        <>
          <div className="grid-2 mb-3">
            <div className="card">
              <div className="card-header">
                <h3>{t("dash.byStream")}</h3>
                <span className="muted tiny">{t("dash.foodVsBev")}</span>
              </div>
              <DonutChart
                data={breakdownByStream(entries).map(s => ({ name: t(`stream.${s.stream}`), value: s.kg }))}
              />
            </div>
            <div className="card">
              <div className="card-header">
                <h3>{t("dash.whereHappens")}</h3>
                <span className="muted tiny">{t("dash.byStage")}</span>
              </div>
              <HorizontalBars
                data={breakdownByStage(entries).map(s => ({ name: t(`stage.${s.stage}`), kg: s.kg }))}
              />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-header">
              <h3>{t("dash.topOutlets")}</h3>
              <span className="muted tiny">{t("dash.last30")}</span>
            </div>
            <HorizontalBars
              data={breakdownByOutlet(entries, Object.fromEntries(outlets.map(o => [o.id, o.name])))
                .slice(0, 8).map(o => ({ name: o.name, kg: o.kg }))}
            />
          </div>
        </>
      )}
    </>
  );
}
