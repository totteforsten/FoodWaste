import Link from "next/link";
import { SidebarNav } from "./SidebarNav";
import { getSession } from "@/lib/session";
import { translator, LOCALE_LABEL } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n-server";

export function Sidebar() {
  const session = getSession();
  const locale = getLocale();
  const t = translator(locale);

  // Role-based nav tree.
  const crewOnly = session.role === "crew";
  const manager = session.role === "serviceManager" || session.role === "chef";
  const admin = session.role === "admin" || session.role === "orgAdmin";

  const items: Array<{ section?: string; href?: string; label?: string; icon?: string }> = [];

  if (crewOnly) {
    items.push({ section: t("nav.operate") });
    items.push({ href: "/register", label: t("nav.register"), icon: "Trash2" });
    items.push({ href: "/", label: t("nav.dashboard"), icon: "LayoutDashboard" });
    items.push({ section: t("nav.configure") });
    items.push({ href: "/settings", label: t("nav.settings"), icon: "Settings" });
  } else if (manager) {
    items.push({ section: t("nav.operate") });
    items.push({ href: "/", label: t("nav.dashboard"), icon: "LayoutDashboard" });
    items.push({ href: "/register", label: t("nav.register"), icon: "Trash2" });
    items.push({ href: "/voyages", label: t("nav.voyages"), icon: "Map" });
    items.push({ section: t("nav.analyze") });
    items.push({ href: "/reports", label: t("nav.reports"), icon: "FileBarChart" });
    items.push({ href: "/sustainability", label: t("nav.sustainability"), icon: "Leaf" });
    items.push({ section: t("nav.configure") });
    items.push({ href: "/settings", label: t("nav.settings"), icon: "Settings" });
  } else {
    items.push({ section: t("nav.operate") });
    items.push({ href: "/", label: t("nav.dashboard"), icon: "LayoutDashboard" });
    items.push({ href: "/register", label: t("nav.register"), icon: "Trash2" });
    items.push({ href: "/voyages", label: t("nav.voyages"), icon: "Map" });
    items.push({ href: "/vessels", label: t("nav.vessels"), icon: "Ship" });
    items.push({ section: t("nav.analyze") });
    items.push({ href: "/reports", label: t("nav.reports"), icon: "FileBarChart" });
    items.push({ href: "/sustainability", label: t("nav.sustainability"), icon: "Leaf" });
    items.push({ section: t("nav.configure") });
    items.push({ href: "/menu", label: t("nav.menu"), icon: "BookOpen" });
    items.push({ href: "/integrations", label: t("nav.integrations"), icon: "Webhook" });
    items.push({ href: "/settings", label: t("nav.settings"), icon: "Settings" });
  }

  const roleKey = `role.${session.role}`;

  return (
    <aside className="app-sidebar">
      <Link href="/" className="sidebar-logo" style={{ textDecoration: "none", color: "inherit" }}>
        <span className="mark">F</span>
        <span>
          Ferry<span style={{ color: "#9FD4F0" }}>Waste</span>
        </span>
      </Link>

      <div className="sidebar-user">
        <div className="sidebar-user-name">{session.displayName}</div>
        <div className="sidebar-user-role">{t(roleKey)}</div>
      </div>

      <SidebarNav items={items} />

      <div className="sidebar-footer">
        <div className="tiny" style={{ color: "rgba(255,255,255,0.7)" }}>
          {LOCALE_LABEL[locale]} · v1.1
        </div>
      </div>
    </aside>
  );
}
