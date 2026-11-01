import { describe, it, expect } from "vitest";
import { readiness, score, nextReview, safeQuestion } from "../shared/rules";
import { validSignature } from "../server/billing";
import demo from "../app/demo.json";
describe("learning boundaries", () => {
  it("does not infer readiness from demo or assisted evidence", () => {
    expect(
      readiness(
        Array.from({ length: 20 }, () => ({
          correct: true,
          at: Date.now(),
          eligible: false,
          delayed: true,
        })),
      ).label,
    ).toBe("Building evidence");
  });
  it("requires at least five observations", () => {
    expect(
      readiness(
        Array.from({ length: 4 }, () => ({
          correct: true,
          at: Date.now(),
          eligible: true,
          delayed: true,
        })),
      ).accuracy,
    ).toBe(null);
  });
  it("requires multiple days and delayed checks for secure", () => {
    const now = Date.now();
    const evidence = Array.from({ length: 8 }, (_, i) => ({
      correct: i !== 0,
      at: now - i * 86400000,
      eligible: true,
      delayed: i > 5,
    }));
    expect(readiness(evidence, now).label).toBe("Secure");
    expect(
      readiness(
        evidence.map((e) => ({ ...e, delayed: false })),
        now,
      ).label,
    ).toBe("Developing");
  });
  it("ages stale evidence and excludes future evidence", () => {
    const now = Date.now();
    const e = Array.from({ length: 8 }, (_, i) => ({
      correct: true,
      at: now - (16 + i) * 86400000,
      eligible: true,
      delayed: true,
    }));
    expect(readiness(e, now).label).toBe("Review due");
    expect(
      readiness(
        e.map((e) => ({ ...e, at: now + 10000 })),
        now,
      ).count,
    ).toBe(0);
  });
  it("uses canonical NEET scoring and resets failed reviews", () => {
    expect(score([true, false, null, true])).toBe(7);
    expect(nextReview(false, 3, 0)).toEqual({ step: 0, dueAt: 86400000 });
  });
  it("keeps keys, hints and explanations outside pre-answer payloads", () => {
    for (const q of demo) {
      const p = safeQuestion(q);
      expect(p).not.toHaveProperty("answer");
      expect(p).not.toHaveProperty("hints");
      expect(p).not.toHaveProperty("solution");
      expect(p.options).toHaveLength(4);
    }
  });
});
describe("webhook integrity", () => {
  it("accepts only HMAC of the exact raw body", async () => {
    const secret = "test-webhook-secret";
    const body = '{"event":"subscription.charged"}';
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = Array.from(
      new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
      ),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    expect(await validSignature(body, signature, secret)).toBe(true);
    expect(await validSignature(body + " ", signature, secret)).toBe(false);
    expect(await validSignature(body, "bad", secret)).toBe(false);
  });
});
