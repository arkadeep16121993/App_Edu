import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { readFileSync } from "node:fs";
import { createHmac } from "node:crypto";
import demo from "../app/demo.json";
let mf: Miniflare;
let db: D1Database;
const origin = "http://localhost:5173";
const secret = "local-test-only-secret-with-at-least-32-characters";
const cookie = (token: string) =>
  `better-auth.session_token=${encodeURIComponent(token + "." + createHmac("sha256", secret).update(token).digest("base64"))}`;
async function request(path: string, user = "alice", body?: unknown) {
  return mf.dispatchFetch(origin + path, {
    method: body ? "POST" : "GET",
    headers: {
      Origin: origin,
      Cookie: cookie(user + "-token"),
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
beforeAll(async () => {
  mf = new Miniflare(
    convertV4MiniflareOptions({
      modules: true,
      scriptPath: ".wrangler/test-bundle/index.js",
      compatibilityDate: "2026-10-01",
      compatibilityFlags: ["nodejs_compat"],
      d1Databases: ["DB"],
      bindings: {
        APP_ORIGIN: origin,
        ACCOUNTS_ENABLED: "true",
        BILLING_ENABLED: "false",
        BETTER_AUTH_SECRET: secret,
        GOOGLE_CLIENT_ID: "test",
        GOOGLE_CLIENT_SECRET: "test",
      },
    }),
  );
  db = (await mf.getD1Database("DB")) as unknown as D1Database;
  for (const filename of ["0001_auth.sql", "0002_learning.sql"]) {
    const sql = readFileSync("migrations/" + filename, "utf8");
    for (const statement of sql
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean))
      await db.prepare(statement).run();
  }
  const now = Date.now();
  for (const u of ["alice", "bob"]) {
    await db
      .prepare(
        "INSERT INTO user(id,name,email,emailVerified,createdAt,updatedAt) VALUES(?,?,?,1,?,?)",
      )
      .bind(u, u, u + "@example.com", now, now)
      .run();
    await db
      .prepare(
        "INSERT INTO session(id,expiresAt,token,createdAt,updatedAt,userId) VALUES(?,?,?,?,?,?)",
      )
      .bind(u + "-session", now + 86400000, u + "-token", now, now, u)
      .run();
  }
  for (const q of demo.slice(0, 6))
    await db
      .prepare(
        "INSERT INTO question_versions VALUES(?,?,?,?,?,'practice','published','Test fixture','Original fixture','en','test')",
      )
      .bind(q.id, q.family, q.topic, q.skill, JSON.stringify(q))
      .run();
}, 30000);
afterAll(async () => {
  await mf?.dispose();
});
describe("D1-backed Worker", () => {
  it("reads a real Better Auth signed session through D1", async () => {
    const r = await request("/api/auth/get-session");
    expect(r.status).toBe(200);
    const s = (await r.json()) as any;
    expect(s.user.id).toBe("alice");
  });
  it("resumes one mission, keeps keys private, rejects cross-account access and altered retries", async () => {
    const body = { topic_id: "1-1", client_request_id: crypto.randomUUID() };
    const r = await request("/api/v1/missions/next", "alice", body);
    expect(r.status).toBe(201);
    const m = (await r.json()) as any;
    expect(m.questions).toHaveLength(6);
    expect(m.questions[0]).not.toHaveProperty("answer");
    expect(m.questions[0]).not.toHaveProperty("reviewer");
    const again = await request("/api/v1/missions/next", "alice", {
      ...body,
      client_request_id: crypto.randomUUID(),
    });
    expect(((await again.json()) as any).id).toBe(m.id);
    const attempt = {
      attempt_id: crypto.randomUUID(),
      item_version: m.questions[0].id,
      selected_option: 0,
      active_ms: 1000,
      source: "online",
    };
    expect(
      (await request(`/api/v1/missions/${m.id}/attempts`, "bob", attempt))
        .status,
    ).toBe(404);
    expect(
      (await request(`/api/v1/missions/${m.id}/attempts`, "alice", attempt))
        .status,
    ).toBe(200);
    expect(
      (await request(`/api/v1/missions/${m.id}/attempts`, "alice", attempt))
        .status,
    ).toBe(200);
    expect(
      (
        await request(`/api/v1/missions/${m.id}/attempts`, "alice", {
          ...attempt,
          selected_option: 1,
        })
      ).status,
    ).toBe(409);
    expect(
      (
        await db
          .prepare("SELECT count(*) AS n FROM attempts")
          .first<{ n: number }>()
      )?.n,
    ).toBe(1);
    expect(
      (await request(`/api/v1/missions/${m.id}/finish`, "alice", {})).status,
    ).toBe(409);
    for (const q of m.questions.slice(1))
      expect(
        (
          await request(`/api/v1/missions/${m.id}/attempts`, "alice", {
            ...attempt,
            attempt_id: crypto.randomUUID(),
            item_version: q.id,
          })
        ).status,
      ).toBe(200);
    for (let i = 0; i < 2; i++)
      expect(
        (await request(`/api/v1/missions/${m.id}/finish`, "alice", {})).status,
      ).toBe(200);
    expect(
      (
        await db
          .prepare("SELECT count(*) AS n FROM xp_ledger")
          .first<{ n: number }>()
      )?.n,
    ).toBe(1);
    expect(
      (
        await db
          .prepare("SELECT SUM(eligible) AS n FROM attempts")
          .first<{ n: number }>()
      )?.n,
    ).toBe(0);
  });
  it("enforces origin, input validation and disabled billing", async () => {
    expect(
      (
        await mf.dispatchFetch(origin + "/api/v1/missions/next", {
          method: "POST",
          headers: {
            Origin: "https://evil.example",
            "Content-Type": "application/json",
          },
          body: "{}",
        })
      ).status,
    ).toBe(403);
    expect(
      (await request("/api/v1/missions/next", "bob", { user_id: "alice" }))
        .status,
    ).toBe(422);
    expect((await request("/api/v1/billing/start", "alice", {})).status).toBe(
      503,
    );
    expect(
      (
        await mf.dispatchFetch(origin + "/api/billing/webhook", {
          method: "POST",
          body: "{}",
        })
      ).status,
    ).toBe(503);
  });
  it("requires an expiring invitation for private circles", async () => {
    const r = await request("/api/v1/groups", "alice", {
      name: "Our study circle",
    });
    expect(r.status).toBe(201);
    const g = (await r.json()) as any;
    expect((await request("/api/v1/groups", "bob")).status).toBe(200);
    expect(
      (
        await request("/api/v1/groups/join", "bob", {
          invite: crypto.randomUUID(),
        })
      ).status,
    ).toBe(404);
    expect(
      (await request("/api/v1/groups/join", "bob", { invite: g.invite }))
        .status,
    ).toBe(200);
    const groups = (await (
      await request("/api/v1/groups", "bob")
    ).json()) as any;
    expect(groups.groups).toHaveLength(1);
  });
});
