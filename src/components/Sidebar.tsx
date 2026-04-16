"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Trash2,
  Ship,
  Map,
  BookOpen,
  Settings,
  Webhook,
  FileBarChart,
  Leaf
} from "lucide-react";

const NAV = [
  { section: "Operate" },
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/log", label: "Log waste", icon: Trash2 },
  { href: "/voyages", label: "Voyages", icon: Map },
  { href: "/vessels", label: "Vessels & outlets", icon: Ship },
  { section: "Analyze" },
  { href: "/reports", label: "Reports", icon: FileBarChart },
  { href: "/sustainability", label: "Sustainability", icon: Leaf },
  { section: "Configure" },
  { href: "/menu", label: "Menu items", icon: BookOpen },
  { href: "/integrations", label: "Integrations", icon: Webhook },
  { href: "/settings", label: "Settings", icon: Settings }
] as const;

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="app-sidebar">
      <div className="sidebar-logo">
        <span className="mark">F</span>
        <span>
          Ferry<span style={{ color: "#9FD4F0" }}>Waste</span>
        </span>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((n, i) =>
          "section" in n ? (
            <div key={`s-${i}`} className="sidebar-section">{n.section}</div>
          ) : (
            <Link
              key={n.href}
              href={n.href as string}
              className={pathname === n.href ? "active" : ""}
            >
              <n.icon size={16} strokeWidth={2} />
              <span>{n.label}</span>
            </Link>
          )
        )}
      </nav>

      <div style={{ marginTop: 32, padding: 12, borderRadius: 10, background: "rgba(255,255,255,0.06)" }}>
        <div className="tiny" style={{ color: "rgba(255,255,255,0.7)" }}>
          Demo data shown. Configure Firebase in <code style={{ background: "rgba(255,255,255,0.1)", color: "#fff" }}>.env.local</code> to go live.
        </div>
      </div>
    </aside>
  );
}
