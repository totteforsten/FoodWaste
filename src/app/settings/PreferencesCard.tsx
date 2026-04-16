"use client";

import { useState } from "react";
import type { UserRole } from "@/types/domain";
import type { Locale } from "@/lib/i18n";
import { LOCALE_LABEL, translator } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { Check, Globe, UserCog, Ship } from "lucide-react";

const ROLES: UserRole[] = ["admin", "orgAdmin", "serviceManager", "chef", "crew", "viewer"];

export function PreferencesCard({
  locale, role, displayName, assignedVesselId, vessels
}: {
  locale: Locale;
  role: UserRole;
  displayName: string;
  assignedVesselId?: string;
  vessels: Array<{ id: string; name: string }>;
}) {
  const t = translator(locale);
  const router = useRouter();
  const [loc, setLoc] = useState<Locale>(locale);
  const [r, setR] = useState<UserRole>(role);
  const [name, setName] = useState(displayName);
  const [vid, setVid] = useState(assignedVesselId ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const needsVessel = r === "serviceManager" || r === "chef" || r === "crew";

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch("/api/prefs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locale: loc,
        role: r,
        displayName: name,
        assignedVesselId: needsVessel ? vid : null
      })
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="card mb-3">
      <div className="card-header">
        <h3><UserCog size={18} style={{ verticalAlign: "text-bottom", marginRight: 6 }} />
          {locale === "sv" ? "Vy och språk" : "View and language"}
        </h3>
      </div>

      <div className="form-grid mt-2">
        <div className="form-row">
          <label><Globe size={14} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />{t("set.language")}</label>
          <div className="seg-toggle">
            <button type="button" className={loc === "sv" ? "active" : ""} onClick={() => setLoc("sv")}>
              {LOCALE_LABEL.sv}
            </button>
            <button type="button" className={loc === "en" ? "active" : ""} onClick={() => setLoc("en")}>
              {LOCALE_LABEL.en}
            </button>
          </div>
        </div>

        <div className="form-row">
          <label>{locale === "sv" ? "Ditt namn" : "Your name"}</label>
          <input value={name} onChange={e => setName(e.target.value)} />
        </div>

        <div className="form-row">
          <label>{t("set.role")}</label>
          <select value={r} onChange={e => setR(e.target.value as UserRole)}>
            {ROLES.map(x => <option key={x} value={x}>{t(`role.${x}`)}</option>)}
          </select>
        </div>

        {needsVessel && (
          <div className="form-row">
            <label><Ship size={14} style={{ verticalAlign: "text-bottom", marginRight: 4 }} />{t("set.vesselAssign")}</label>
            <select value={vid} onChange={e => setVid(e.target.value)}>
              <option value="">— {t("common.none")} —</option>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
        )}
      </div>

      <p className="muted tiny mt-2">{t("set.roleHint")}</p>
      {needsVessel && (
        <p className="muted tiny">{t("set.vesselAssignHint")}</p>
      )}

      <div className="row mt-2">
        <button className="btn btn-accent" disabled={saving} onClick={save}>
          {saving ? t("common.saving") : t("common.save")}
        </button>
        {saved && <span className="chip employee"><Check size={12} /> {t("common.saved")}</span>}
      </div>
    </div>
  );
}
