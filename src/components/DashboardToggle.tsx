"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

export function DashboardToggle({
  current,
  simpleLabel,
  advancedLabel
}: {
  current: "simple" | "advanced";
  simpleLabel: string;
  advancedLabel: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function set(view: "simple" | "advanced") {
    const next = new URLSearchParams(sp.toString());
    if (view === "simple") next.delete("view");
    else next.set("view", view);
    const q = next.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="seg-toggle">
      <button
        type="button"
        className={current === "simple" ? "active" : ""}
        onClick={() => set("simple")}
      >{simpleLabel}</button>
      <button
        type="button"
        className={current === "advanced" ? "active" : ""}
        onClick={() => set("advanced")}
      >{advancedLabel}</button>
    </div>
  );
}
