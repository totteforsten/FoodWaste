import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ONE_YEAR = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const res = NextResponse.json({ ok: true });

  const setOrClear = (name: string, value: unknown) => {
    if (typeof value === "string" && value.length > 0) {
      res.cookies.set(name, value, { path: "/", maxAge: ONE_YEAR, sameSite: "lax" });
    } else if (value === null) {
      res.cookies.delete(name);
    }
  };

  setOrClear("locale", body.locale);
  setOrClear("role", body.role);
  setOrClear("assignedVesselId", body.assignedVesselId);
  setOrClear("displayName", body.displayName);

  return res;
}
