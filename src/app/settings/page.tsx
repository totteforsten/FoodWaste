import { isAdminConfigured } from "@/lib/firebase-admin";
import { getSession } from "@/lib/session";
import { translator } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";
import { getVessels } from "@/lib/data-source";
import { PreferencesCard } from "./PreferencesCard";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const configured = isAdminConfigured();
  const session = getSession();
  const locale = getLocale();
  const t = translator(locale);
  const vessels = await getVessels();

  return (
    <>
      <div className="row-between mb-2">
        <div>
          <h1>{t("set.title")}</h1>
          <p className="muted">{t("set.subtitle")}</p>
        </div>
      </div>

      <div className={`alert ${configured ? "alert-success" : "alert-warn"} mb-3`}>
        <div>{configured ? t("set.firebaseConnected") : t("set.firebaseDemo")}</div>
      </div>

      <PreferencesCard
        locale={locale}
        role={session.role}
        displayName={session.displayName}
        assignedVesselId={session.assignedVesselId}
        vessels={vessels.map(v => ({ id: v.id, name: v.name }))}
      />

      <div className="grid-2 mb-3">
        <div className="card" id="org">
          <h3>{t("set.org")}</h3>
          <div className="form-grid mt-2">
            <div className="form-row"><label>{t("set.orgName")}</label><input defaultValue={process.env.APP_ORG_NAME ?? "Stena Line"} /></div>
            <div className="form-row"><label>{t("set.currency")}</label><input defaultValue={process.env.APP_DEFAULT_CURRENCY ?? "EUR"} /></div>
            <div className="form-row"><label>{t("set.emissionFactor")}</label><input type="number" step="0.1" defaultValue={process.env.APP_DEFAULT_EMISSION_FACTOR_KG_CO2E_PER_KG ?? "2.5"} /></div>
            <div className="form-row"><label>{t("set.baseline")}</label><input type="number" defaultValue="160" /></div>
          </div>
        </div>
        <div className="card">
          <h3>{locale === "sv" ? "Svinntaxonomi" : "Waste taxonomy"}</h3>
          <p className="muted tiny">
            {locale === "sv"
              ? "Mappad mot FLW-protokollet, WRAP HaFS, Generation Wastes kategorier och MARPOL Annex V Kategori B."
              : "Mapped to the FLW Protocol, WRAP HaFS, Generation Waste buckets and MARPOL Annex V Category B."}
          </p>
          <ul className="tiny muted" style={{ marginTop: 8 }}>
            <li><strong>{t("reg.bucketKitchen")}</strong> → pre-consumer prep &amp; spoilage</li>
            <li><strong>{t("reg.bucketBuffet")}</strong> → pre-consumer overproduction</li>
            <li><strong>{t("reg.bucketPlate")}</strong> → post-consumer &amp; returned</li>
            <li><strong>{t("reg.bucketCrew")}</strong> → employee meal</li>
            <li><strong>{t("reg.bucketBeverage")}</strong> → spill / draft-line purge</li>
          </ul>
        </div>
      </div>
    </>
  );
}
