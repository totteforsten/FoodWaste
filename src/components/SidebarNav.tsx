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
  Leaf,
  type LucideIcon
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard, Trash2, Ship, Map, BookOpen, Settings, Webhook, FileBarChart, Leaf
};

interface Item {
  section?: string;
  href?: string;
  label?: string;
  icon?: string;
}

export function SidebarNav({ items }: { items: Item[] }) {
  const pathname = usePathname();
  return (
    <nav className="sidebar-nav">
      {items.map((n, i) => {
        if (n.section) return <div key={`s-${i}`} className="sidebar-section">{n.section}</div>;
        const Icon = n.icon ? ICONS[n.icon] : null;
        const active = pathname === n.href || (n.href !== "/" && pathname.startsWith(n.href ?? ""));
        return (
          <Link key={n.href} href={n.href!} className={active ? "active" : ""}>
            {Icon && <Icon size={16} strokeWidth={2} />}
            <span>{n.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
