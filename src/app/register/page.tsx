import { getOutlets, getVessels, getVoyages, getWasteEntries } from "@/lib/data-source";
import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { RegisterForm } from "./RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const session = getSession();
  const locale = getLocale();
  const t = translator(locale);

  const [allVessels, allOutlets, voyages, recentEntries] = await Promise.all([
    getVessels(),
    getOutlets(),
    getVoyages(undefined, 30),
    getWasteEntries({ sinceMs: Date.now() - 86400_000, limit: 50 })
  ]);

  // Role-based scoping.
  const vessels = session.canSeeAllVessels
    ? allVessels
    : allVessels.filter(v => v.id === session.assignedVesselId);

  const outlets = session.canSeeAllVessels
    ? allOutlets
    : allOutlets.filter(o => o.vesselId === session.assignedVesselId);

  const scopedVoyages = session.canSeeAllVessels
    ? voyages
    : voyages.filter(v => v.vesselId === session.assignedVesselId);

  const myEntries = session.canSeeAllVessels
    ? recentEntries
    : recentEntries.filter(e => e.vesselId === session.assignedVesselId);

  const todayKg = myEntries.reduce((s, e) => s + e.weightKg, 0);

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>{t("reg.title")}</h1>
          <p className="muted">{t("reg.subtitle")}</p>
        </div>
        <div className="row">
          <div className="kpi-inline">
            <div className="kpi-inline-label">{t("crew.todayTotal")}</div>
            <div className="kpi-inline-value">{todayKg.toFixed(1)} kg</div>
          </div>
        </div>
      </div>

      <RegisterForm
        locale={locale}
        role={session.role}
        vessels={vessels}
        outlets={outlets}
        voyages={scopedVoyages}
        recent={myEntries.slice(0, 6)}
      />
    </>
  );
}
