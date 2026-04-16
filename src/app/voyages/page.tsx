import { getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { voyageKpis } from "@/lib/kpis";
import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function VoyagesPage() {
  const session = getSession();
  const t = translator(getLocale());

  const [allVessels, voyages, allEntries] = await Promise.all([
    getVessels(),
    getVoyages(undefined, 200),
    getWasteEntries({ sinceMs: Date.now() - 60 * 86400_000, limit: 10000 })
  ]);

  // Scope by assigned vessel for non-admin.
  const vessels = session.canSeeAllVessels
    ? allVessels
    : allVessels.filter(v => v.id === session.assignedVesselId);
  const scopedVoyages = session.canSeeAllVessels
    ? voyages
    : voyages.filter(v => v.vesselId === session.assignedVesselId);
  const entries = session.canSeeAllVessels
    ? allEntries
    : allEntries.filter(e => e.vesselId === session.assignedVesselId);

  const vesselName = Object.fromEntries(vessels.map(v => [v.id, v.name]));

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>{t("voy.title")}</h1>
          <p className="muted">{t("voy.subtitle")}</p>
        </div>
      </div>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>{t("voy.reference")}</th>
              {session.canSeeAllVessels && <th>{t("dash.vessels")}</th>}
              <th>{t("dash.route")}</th>
              <th>{t("voy.departure")}</th>
              <th className="right">{t("voy.pax")}</th>
              <th className="right">{t("voy.covers")}</th>
              <th className="right">{t("voy.waste")}</th>
              <th className="right">g/{t("dash.perCover")}</th>
              <th className="right">{t("voy.cost")}</th>
              <th className="right">{t("voy.pctRevenue")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {scopedVoyages.slice(0, 40).map(v => {
              const vEntries = entries.filter(e => e.voyageId === v.id);
              const k = voyageKpis(vEntries, v);
              const gPer = k.wastePerCoverKg ? Math.round(k.wastePerCoverKg * 1000) : 0;
              return (
                <tr key={v.id}>
                  <td className="mono">{v.reference}</td>
                  {session.canSeeAllVessels && <td>{vesselName[v.vesselId] ?? v.vesselId}</td>}
                  <td className="muted">{v.departurePort}→{v.arrivalPort}</td>
                  <td className="muted">{new Date(v.departureAt).toLocaleDateString()}</td>
                  <td className="right">{v.paxCount?.toLocaleString() ?? "—"}</td>
                  <td className="right">{v.coversServed?.toLocaleString() ?? "—"}</td>
                  <td className="right">{k.totalKg.toFixed(1)} kg</td>
                  <td className="right">
                    {gPer ? <span className={gPer > 115 ? "delta-up" : "delta-down"}>{gPer}</span> : "—"}
                  </td>
                  <td className="right">€{k.totalCost.toFixed(0)}</td>
                  <td className="right">
                    {k.wasteToRevenueRatio != null ? `${k.wasteToRevenueRatio.toFixed(1)}%` : "—"}
                  </td>
                  <td className="right">
                    <Link href={`/voyages/${v.id}`} className="btn btn-ghost btn-small">
                      {t("common.open")}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
