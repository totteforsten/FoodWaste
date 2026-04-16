import { createHmac } from "crypto";
import type { WebhookEvent } from "@/types/domain";

export interface WebhookPayload<T = unknown> {
  id: string;
  event: WebhookEvent;
  orgId: string;
  data: T;
  createdAt: number;
}

export function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

export async function deliver(
  url: string,
  secret: string,
  payload: WebhookPayload
): Promise<{ ok: boolean; status: number; error?: string }> {
  const body = JSON.stringify(payload);
  const signature = signPayload(secret, body);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-FoodWaste-Event": payload.event,
        "X-FoodWaste-Signature": `sha256=${signature}`,
        "X-FoodWaste-Delivery": payload.id
      },
      body,
      signal: AbortSignal.timeout(5000)
    });
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, status: 0, error: (e as Error).message };
  }
}
