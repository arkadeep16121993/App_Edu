import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { secureHeaders } from "hono/secure-headers";
import { z, ZodError } from "zod";
import { auth } from "./auth";
import { digest, processEvent, razorpay, validSignature } from "./billing";
import { safeQuestion } from "../shared/rules";
import { possibleError } from "../shared/learning";
import type { Question } from "../shared/types";
import type { Env } from "./env";
const app = new Hono<{
  Bindings: Env;
  Variables: { userId: string; requestId: string };
}>();
const id = z.string().uuid();
const fail = (
  status: 401 | 403 | 404 | 409 | 422 | 429 | 503,
  message: string,
) => {
  throw new HTTPException(status, { message });
};
app.use(
  "*",
  secureHeaders({
    referrerPolicy: "strict-origin-when-cross-origin",
    xFrameOptions: "DENY",
  }),
);
app.use("/api/*", async (c, next) => {
  c.set("requestId", crypto.randomUUID());
  c.header("Cache-Control", "no-store");
  c.header("X-Request-ID", c.get("requestId"));
  if (
    !["GET", "HEAD", "OPTIONS"].includes(c.req.method) &&
    c.req.path !== "/api/billing/webhook"
  ) {
    const origin = c.req.header("Origin");
    if (origin !== c.env.APP_ORIGIN)
      fail(403, "Request origin is not trusted.");
  }
  const size = Number(c.req.header("Content-Length") ?? 0);
  if (size > 32768) fail(422, "Request is too large.");
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const raw = await c.req.raw.clone().arrayBuffer();
    if (raw.byteLength > 32768) fail(422, "Request is too large.");
  }
  await next();
});
app.get("/api/health", (c) =>
  c.json({
    ok: true,
    service: "physics-path",
    billing: c.env.BILLING_ENABLED === "true",
  }),
);
app.get("/api/v1/config", async (c) => {
  const count = await c.env.DB.prepare(
    "SELECT count(*) AS n FROM question_versions WHERE status='published' AND pool='practice'",
  ).first<{ n: number }>();
  return c.json({
    accountsEnabled:
      c.env.ACCOUNTS_ENABLED === "true" &&
      !!c.env.GOOGLE_CLIENT_ID &&
      !!c.env.GOOGLE_CLIENT_SECRET &&
      !!c.env.BETTER_AUTH_SECRET,
    billingEnabled: c.env.BILLING_ENABLED === "true",
    contentReady: (count?.n ?? 0) >= 6,
  });
});
app.all("/api/auth/*", async (c) => {
  if (
    c.env.ACCOUNTS_ENABLED !== "true" ||
    !c.env.GOOGLE_CLIENT_ID ||
    !c.env.GOOGLE_CLIENT_SECRET ||
    !c.env.BETTER_AUTH_SECRET
  )
    return c.json(
      {
        code: "AUTH_NOT_CONFIGURED",
        message: "Google sign-in is not connected yet.",
      },
      503,
    );
  return auth(c.env).handler(c.req.raw);
});
app.post("/api/billing/webhook", async (c) => {
  if (c.env.BILLING_ENABLED !== "true" || !c.env.RAZORPAY_WEBHOOK_SECRET)
    fail(503, "Billing is not enabled.");
  const raw = await c.req.text();
  if (
    !(await validSignature(
      raw,
      c.req.header("x-razorpay-signature") ?? "",
      c.env.RAZORPAY_WEBHOOK_SECRET!,
    ))
  )
    fail(401, "Invalid webhook signature.");
  const eventId = c.req.header("x-razorpay-event-id");
  if (!eventId || eventId.length > 200) fail(422, "Missing event identifier.");
  return c.json(await processEvent(c.env, eventId!, raw));
});
app.use("/api/v1/*", async (c, next) => {
  if (c.env.ACCOUNTS_ENABLED !== "true" || !c.env.BETTER_AUTH_SECRET)
    fail(401, "Sign in to save account progress.");
  const session = await auth(c.env).api.getSession({
    headers: c.req.raw.headers,
  });
  if (!session) fail(401, "Please sign in.");
  c.set("userId", session!.user.id);
  if (c.req.method !== "GET") {
    const bucket = Math.floor(Date.now() / 60000),
      key = `${session!.user.id}:${bucket}`;
    const limit = await c.env.DB.prepare(
      "INSERT INTO rate_limits(key,count,reset_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count",
    )
      .bind(key, Date.now() + 60000)
      .first<{ count: number }>();
    if ((limit?.count ?? 0) > 60)
      fail(429, "Please wait a minute and try again.");
    await c.env.DB.prepare("DELETE FROM rate_limits WHERE reset_at<?")
      .bind(Date.now() - 60000)
      .run();
  }
  await next();
});
async function owned(db: D1Database, missionId: string, userId: string) {
  const m = await db
    .prepare("SELECT id,status FROM missions WHERE id=? AND user_id=?")
    .bind(missionId, userId)
    .first<{ id: string; status: string }>();
  if (!m) fail(404, "Mission not found.");
  return m!;
}
async function missionPayload(db: D1Database, id: string) {
  const items = await db
    .prepare(
      "SELECT q.payload,i.position,i.hinted FROM mission_items i JOIN question_versions q ON q.id=i.item_version WHERE i.mission_id=? ORDER BY i.position",
    )
    .bind(id)
    .all<{ payload: string; position: number; hinted: number }>();
  const attempts = await db
    .prepare(
      "SELECT a.id,a.item_version,a.selected,a.correct,i.hinted FROM attempts a JOIN mission_items i ON i.mission_id=a.mission_id AND i.item_version=a.item_version WHERE a.mission_id=? ORDER BY a.received_at",
    )
    .bind(id)
    .all();
  return {
    id,
    questions: items.results.map((i) => ({
      ...safeQuestion(JSON.parse(i.payload) as Question),
      hinted: !!i.hinted,
    })),
    attempts: attempts.results,
  };
}
app.get("/api/v1/bootstrap", async (c) => {
  const m = await c.env.DB.prepare(
    "SELECT id FROM missions WHERE user_id=? AND status='active'",
  )
    .bind(c.get("userId"))
    .first<{ id: string }>();
  const premium = await c.env.DB.prepare(
    "SELECT MAX(paid_through) AS until FROM subscriptions WHERE user_id=?",
  )
    .bind(c.get("userId"))
    .first<{ until: number }>();
  return c.json({
    unfinishedMission: m ? await missionPayload(c.env.DB, m.id) : null,
    entitlement: {
      premium: (premium?.until ?? 0) > Date.now(),
      paidThrough: premium?.until ?? 0,
    },
    dueCount: 0,
    readiness: [],
  });
});
app.post("/api/v1/missions/next", async (c) => {
  const b = z
    .object({ topic_id: z.string().max(20).optional(), client_request_id: id })
    .strict()
    .parse(await c.req.json());
  const user = c.get("userId");
  const existing = await c.env.DB.prepare(
    "SELECT id FROM missions WHERE user_id=? AND (status='active' OR request_id=?) ORDER BY created_at DESC LIMIT 1",
  )
    .bind(user, b.client_request_id)
    .first<{ id: string }>();
  if (existing) return c.json(await missionPayload(c.env.DB, existing.id));
  const rows = await c.env.DB.prepare(
    "SELECT q.id,q.family FROM question_versions q WHERE q.status='published' AND q.pool='practice' AND (? IS NULL OR q.topic=?) ORDER BY (SELECT COUNT(*) FROM attempts a WHERE a.user_id=? AND a.item_version=q.id),q.id LIMIT 30",
  )
    .bind(b.topic_id ?? null, b.topic_id ?? null, user)
    .all<{ id: string; family: string }>();
  const families = new Set<string>();
  const chosen = rows.results
    .filter((q) => {
      if (families.has(q.family)) return false;
      families.add(q.family);
      return true;
    })
    .slice(0, 6);
  if (chosen.length !== 6)
    fail(
      503,
      "Reviewed questions are not available for this topic yet. You can use starter practice.",
    );
  const mid = crypto.randomUUID();
  try {
    await c.env.DB.batch([
      c.env.DB.prepare(
        "INSERT INTO missions(id,user_id,topic,created_at,request_id) VALUES(?,?,?,?,?)",
      ).bind(mid, user, b.topic_id ?? null, Date.now(), b.client_request_id),
      ...chosen.map((q, i) =>
        c.env.DB.prepare(
          "INSERT INTO mission_items(mission_id,position,item_version) VALUES(?,?,?)",
        ).bind(mid, i, q.id),
      ),
    ]);
  } catch (e) {
    const concurrent = await c.env.DB.prepare(
      "SELECT id FROM missions WHERE user_id=? AND (status='active' OR request_id=?)",
    )
      .bind(user, b.client_request_id)
      .first<{ id: string }>();
    if (concurrent)
      return c.json(await missionPayload(c.env.DB, concurrent.id));
    throw e;
  }
  return c.json(await missionPayload(c.env.DB, mid), 201);
});
app.post("/api/v1/missions/:id/hints", async (c) => {
  const m = await owned(c.env.DB, c.req.param("id"), c.get("userId"));
  if (m.status !== "active") fail(409, "This mission is finished.");
  const b = z
    .object({ item_version: z.string().max(100) })
    .strict()
    .parse(await c.req.json());
  const q = await c.env.DB.prepare(
    "SELECT q.payload FROM mission_items i JOIN question_versions q ON q.id=i.item_version WHERE i.mission_id=? AND i.item_version=? AND q.status='published'",
  )
    .bind(m.id, b.item_version)
    .first<{ payload: string }>();
  if (!q) fail(404, "Question not found.");
  await c.env.DB.prepare(
    "UPDATE mission_items SET hinted=1 WHERE mission_id=? AND item_version=?",
  )
    .bind(m.id, b.item_version)
    .run();
  return c.json({ hints: (JSON.parse(q!.payload) as Question).hints });
});
app.post("/api/v1/missions/:id/attempts", async (c) => {
  const b = z
    .object({
      attempt_id: id,
      item_version: z.string().max(100),
      selected_option: z.number().int().min(0).max(3),
      active_ms: z.number().int().min(0).max(3600000),
      source: z.literal("online"),
    })
    .strict()
    .parse(await c.req.json());
  const user = c.get("userId");
  const m = await owned(c.env.DB, c.req.param("id"), user);
  const hash = await digest(JSON.stringify(b));
  const prior = await c.env.DB.prepare(
    "SELECT payload_hash FROM attempts WHERE id=? OR (mission_id=? AND item_version=?)",
  )
    .bind(b.attempt_id, m.id, b.item_version)
    .first<{ payload_hash: string }>();
  if (prior && prior.payload_hash !== hash)
    fail(409, "This answer was already submitted with different data.");
  if (!prior && m.status !== "active") fail(409, "Mission is finished.");
  const row = await c.env.DB.prepare(
    "SELECT q.payload,i.hinted FROM mission_items i JOIN question_versions q ON q.id=i.item_version WHERE i.mission_id=? AND i.item_version=? AND q.status='published'",
  )
    .bind(m.id, b.item_version)
    .first<{ payload: string; hinted: number }>();
  if (!row) fail(404, "Question unavailable; contact the pilot owner.");
  const q = JSON.parse(row!.payload) as Question;
  const correct = q.answer === b.selected_option;
  // MVP stores all account practice as ineligible until the exposure/freshness engine is commissioned.
  if (!prior) {
    try {
      await c.env.DB.prepare(
        "INSERT INTO attempts(id,user_id,mission_id,item_version,selected,correct,eligible,received_at,payload_hash) VALUES(?,?,?,?,?,?,0,?,?)",
      )
        .bind(
          b.attempt_id,
          user,
          m.id,
          b.item_version,
          b.selected_option,
          Number(correct),
          Date.now(),
          hash,
        )
        .run();
    } catch (e) {
      const raced = await c.env.DB.prepare(
        "SELECT payload_hash FROM attempts WHERE id=? OR (mission_id=? AND item_version=?)",
      )
        .bind(b.attempt_id, m.id, b.item_version)
        .first<{ payload_hash: string }>();
      if (!raced) throw e;
      if (raced.payload_hash !== hash)
        fail(409, "This answer was already submitted with different data.");
    }
  }
  return c.json({
    attempt_id: b.attempt_id,
    result: correct ? "correct" : "incorrect",
    canonical_score: correct ? 4 : -1,
    short_explanation: q.solution,
    correct_option: q.answer,
    error: correct ? null : possibleError(q, b.selected_option),
    concept_id: q.conceptId ?? null,
    question_type: q.questionType ?? null,
    sync_status: "verified_practice",
    assessment_eligible: false,
  });
});
app.post("/api/v1/missions/:id/finish", async (c) => {
  const user = c.get("userId"),
    m = await owned(c.env.DB, c.req.param("id"), user);
  const counts = await c.env.DB.prepare(
    "SELECT (SELECT count(*) FROM attempts WHERE mission_id=?) AS answered,(SELECT count(*) FROM mission_items WHERE mission_id=?) AS assigned",
  )
    .bind(m.id, m.id)
    .first<{ answered: number; assigned: number }>();
  if (counts?.answered !== counts?.assigned || !counts?.assigned)
    fail(409, "Answer every question before finishing.");
  const day = new Date().toISOString().slice(0, 10);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "UPDATE missions SET status='finished',finished_at=COALESCE(finished_at,?) WHERE id=?",
    ).bind(Date.now(), m.id),
    c.env.DB.prepare(
      "INSERT OR IGNORE INTO xp_ledger(user_id,source_id,value,day) SELECT ?,?,10,? WHERE (SELECT COALESCE(SUM(value),0) FROM xp_ledger WHERE user_id=? AND day=?)<=20",
    ).bind(user, m.id, day, user, day),
  ]);
  return c.json({ finished: true });
});
app.get("/api/v1/progress", async (c) => {
  const user = c.get("userId");
  const total = await c.env.DB.prepare(
    "SELECT COALESCE(SUM(value),0) AS xp FROM xp_ledger WHERE user_id=?",
  )
    .bind(user)
    .first<{ xp: number }>();
  const history = await c.env.DB.prepare(
    "SELECT id,topic,status,created_at FROM missions WHERE user_id=? ORDER BY created_at DESC LIMIT 50",
  )
    .bind(user)
    .all();
  return c.json({
    xp: total?.xp ?? 0,
    missions: history.results,
    readiness: [],
    note: "Readiness is gated pending reviewed evidence and exposure tracking.",
  });
});
app.get("/api/v1/groups", async (c) => {
  const groups = await c.env.DB.prepare(
    "SELECT g.id,g.name FROM groups g JOIN memberships m ON m.group_id=g.id WHERE m.user_id=?",
  )
    .bind(c.get("userId"))
    .all();
  return c.json({ groups: groups.results });
});
app.post("/api/v1/groups", async (c) => {
  const b = z
    .object({ name: z.string().trim().min(2).max(50) })
    .strict()
    .parse(await c.req.json());
  const user = c.get("userId");
  const count = await c.env.DB.prepare(
    "SELECT count(*) AS n FROM memberships WHERE user_id=?",
  )
    .bind(user)
    .first<{ n: number }>();
  if ((count?.n ?? 0) >= 5) fail(422, "You can join up to five circles.");
  const gid = crypto.randomUUID(),
    invite = crypto.randomUUID();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO groups(id,name,owner_id,invite_hash,expires_at,created_at) VALUES(?,?,?,?,?,?)",
    ).bind(
      gid,
      b.name,
      user,
      await digest(invite),
      Date.now() + 7 * 86400000,
      Date.now(),
    ),
    c.env.DB.prepare("INSERT INTO memberships VALUES(?,?)").bind(gid, user),
  ]);
  return c.json({ group: { id: gid, name: b.name }, invite }, 201);
});
app.post("/api/v1/groups/join", async (c) => {
  const b = z
    .object({ invite: id })
    .strict()
    .parse(await c.req.json());
  const g = await c.env.DB.prepare(
    "SELECT id FROM groups WHERE invite_hash=? AND expires_at>?",
  )
    .bind(await digest(b.invite), Date.now())
    .first<{ id: string }>();
  if (!g) fail(404, "Invite is invalid or expired.");
  const user = c.get("userId");
  await c.env.DB.prepare(
    "INSERT OR IGNORE INTO memberships(group_id,user_id) SELECT ?,? WHERE (SELECT COUNT(*) FROM memberships WHERE group_id=?)<10 AND (SELECT COUNT(*) FROM memberships WHERE user_id=?)<5",
  )
    .bind(g!.id, user, g!.id, user)
    .run();
  const member = await c.env.DB.prepare(
    "SELECT 1 FROM memberships WHERE group_id=? AND user_id=?",
  )
    .bind(g!.id, user)
    .first();
  if (!member) fail(422, "Circle or account membership limit reached.");
  return c.json({ joined: true });
});
app.post("/api/v1/billing/start", async (c) => {
  const e = c.env;
  if (
    e.BILLING_ENABLED !== "true" ||
    !e.RAZORPAY_KEY_ID ||
    !e.RAZORPAY_KEY_SECRET ||
    !e.RAZORPAY_PLAN_ID
  )
    fail(503, "Subscriptions are not active yet.");
  const user = c.get("userId");
  const premium = await e.DB.prepare(
    "SELECT 1 FROM subscriptions WHERE user_id=? AND paid_through>?",
  )
    .bind(user, Date.now())
    .first();
  if (premium) fail(409, "You already have active paid access.");
  let pending = await e.DB.prepare(
    "SELECT id,provider_id FROM subscriptions WHERE user_id=? AND status IN ('creating','created','authenticated')",
  )
    .bind(user)
    .first<{ id: string; provider_id: string | null }>();
  if (pending?.provider_id) {
    const remote = await razorpay(
      e,
      `subscriptions/${encodeURIComponent(pending.provider_id)}`,
    );
    return c.json({ url: remote.short_url });
  }
  if (pending)
    fail(
      409,
      "Your subscription is being created. Please wait for reconciliation.",
    );
  const sid = crypto.randomUUID();
  try {
    await e.DB.prepare(
      "INSERT INTO subscriptions(id,user_id,plan,created_at) VALUES(?,?,?,?)",
    )
      .bind(sid, user, e.RAZORPAY_PLAN_ID!, Date.now())
      .run();
  } catch {
    fail(409, "A subscription is already being created.");
  }
  const provider = await razorpay(e, "subscriptions", {
    plan_id: e.RAZORPAY_PLAN_ID,
    total_count: 120,
    quantity: 1,
    customer_notify: 1,
    notes: { app_subscription_id: sid },
  });
  await e.DB.prepare(
    "UPDATE subscriptions SET provider_id=?,status=? WHERE id=?",
  )
    .bind(provider.id, provider.status, sid)
    .run();
  return c.json({ url: provider.short_url });
});
app.notFound((c) =>
  c.json(
    {
      code: "NOT_FOUND",
      message: "API route not found.",
      request_id: c.get("requestId"),
    },
    404,
  ),
);
app.onError((err, c) => {
  if (err instanceof ZodError)
    return c.json(
      {
        code: "INVALID_INPUT",
        message: "Please check the request fields.",
        request_id: c.get("requestId"),
      },
      422,
    );
  if (err instanceof HTTPException)
    return c.json(
      {
        code: `HTTP_${err.status}`,
        message: err.message,
        request_id: c.get("requestId"),
      },
      err.status,
    );
  if (err instanceof SyntaxError)
    return c.json(
      {
        code: "INVALID_JSON",
        message: "Invalid JSON body.",
        request_id: c.get("requestId"),
      },
      422,
    );
  console.error(
    JSON.stringify({
      requestId: c.get("requestId"),
      route: c.req.path,
      code: "INTERNAL_ERROR",
    }),
  );
  return c.json(
    {
      code: "INTERNAL_ERROR",
      message: "The request could not be completed. Please try again.",
      request_id: c.get("requestId"),
    },
    500,
  );
});
export default app;
