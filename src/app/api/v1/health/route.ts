import { NextResponse } from "next/server";
import { isAdminConfigured } from "@/lib/firebase-admin";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "ferry-food-waste-tracker",
    version: "1.0.0",
    firebase: isAdminConfigured() ? "connected" : "demo-mode",
    ts: Date.now()
  });
}
