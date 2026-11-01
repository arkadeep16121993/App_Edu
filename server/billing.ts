import { z } from "zod";
import type { Env } from "./env";
export async function digest(text: string) {
  return Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
export async function validSignature(
  raw: string,
  signature: string,
  secret: string,
) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(signature.match(/.{2}/g)!, (s) =>
    parseInt(s, 16),
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    bytes,
    new TextEncoder().encode(raw),
  );
}
export async function razorpay(env: Env, path: string, body?: unknown) {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: `Basic ${btoa(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`)}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) throw new Error("Payment provider request failed");
  return response.json() as Promise<Record<string, any>>;
}
const eventSchema = z.object({
  event: z.string(),
  account_id: z.string().optional(),
  payload: z.object({
    subscription: z
      .object({
        entity: z.object({
          id: z.string(),
          plan_id: z.string(),
          current_end: z.number().nullable().optional(),
          status: z.string(),
        }),
      })
      .optional(),
    payment: z
      .object({
        entity: z.object({
          id: z.string(),
          status: z.string(),
          amount: z.number(),
          currency: z.string(),
          subscription_id: z.string().optional(),
        }),
      })
      .optional(),
  }),
});
export async function processEvent(env: Env, eventId: string, raw: string) {
  const event = eventSchema.parse(JSON.parse(raw));
  const hash = await digest(raw);
  const prior = await env.DB.prepare(
    "SELECT payload_hash,status FROM payment_events WHERE id=?",
  )
    .bind(eventId)
    .first<{ payload_hash: string; status: string }>();
  if (prior && prior.payload_hash !== hash)
    throw new Error("Event identifier conflict");
  if (prior?.status === "processed") return { duplicate: true };
  await env.DB.prepare(
    "INSERT OR IGNORE INTO payment_events(id,payload_hash,event_type,status,received_at) VALUES(?,?,?,'pending',?)",
  )
    .bind(eventId, hash, event.event, Date.now())
    .run();
  if (event.event.includes("refund") || event.event.includes("dispute"))
    throw new Error("Manual refund/dispute reconciliation required");
  const entity = event.payload.subscription?.entity;
  if (!entity) {
    await env.DB.prepare(
      "UPDATE payment_events SET status='ignored' WHERE id=?",
    )
      .bind(eventId)
      .run();
    return { ignored: true };
  }
  const sub = await env.DB.prepare(
    "SELECT id,provider_id,plan FROM subscriptions WHERE provider_id=?",
  )
    .bind(entity.id)
    .first<{ id: string; provider_id: string; plan: string }>();
  if (
    !sub ||
    sub.plan !== entity.plan_id ||
    entity.plan_id !== env.RAZORPAY_PLAN_ID
  )
    throw new Error("Unknown subscription or unexpected plan");
  // Query provider state rather than trusting delayed webhook period/status alone.
  const canonical = await razorpay(
    env,
    `subscriptions/${encodeURIComponent(entity.id)}`,
  );
  if (canonical.plan_id !== sub.plan) throw new Error("Provider plan mismatch");
  const statements: D1PreparedStatement[] = [];
  if (event.event === "subscription.charged") {
    const p = event.payload.payment?.entity;
    if (
      !p ||
      p.status !== "captured" ||
      p.amount !== 14900 ||
      p.currency !== "INR"
    )
      throw new Error("Unexpected captured payment");
    const payment = await razorpay(env, `payments/${encodeURIComponent(p.id)}`);
    if (
      payment.status !== "captured" ||
      payment.amount !== 14900 ||
      payment.currency !== "INR" ||
      payment.invoice_id == null
    )
      throw new Error("Payment not verified");
    const invoice = await razorpay(
      env,
      `invoices/${encodeURIComponent(payment.invoice_id)}`,
    );
    if (
      invoice.subscription_id !== sub.provider_id ||
      invoice.payment_id !== p.id ||
      invoice.status !== "paid"
    )
      throw new Error("Payment belongs to another invoice");
    // Never extend a delayed old payment to a later unpaid current period.
    const paidEnd = invoice.billing_end;
    if (
      typeof paidEnd !== "number" ||
      paidEnd * 1000 > Date.now() + 35 * 86400000
    )
      throw new Error("Invalid billing period; manual reconciliation required");
    statements.push(
      env.DB.prepare(
        "UPDATE subscriptions SET paid_through=MAX(paid_through,?),status=? WHERE id=?",
      ).bind(paidEnd * 1000, canonical.status, sub.id),
    );
  } else if (
    [
      "subscription.cancelled",
      "subscription.halted",
      "subscription.completed",
      "subscription.paused",
    ].includes(event.event)
  ) {
    statements.push(
      env.DB.prepare("UPDATE subscriptions SET status=? WHERE id=?").bind(
        canonical.status,
        sub.id,
      ),
    );
  } else if (
    event.event.includes("refund") ||
    event.event.includes("dispute")
  ) {
    throw new Error("Manual refund/dispute reconciliation required");
  }
  statements.push(
    env.DB.prepare(
      "UPDATE payment_events SET status='processed' WHERE id=?",
    ).bind(eventId),
  );
  await env.DB.batch(statements);
  return { processed: true };
}
