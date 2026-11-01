import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { z } from "zod";
const schema = z.array(
  z.object({
    id: z.string().min(1).max(100),
    family: z.string().min(1),
    topic: z.string(),
    skill: z.string(),
    stem: z.string().min(15),
    options: z.array(z.string().min(1)).length(4),
    answer: z.number().int().min(0).max(3),
    hints: z.array(z.string().min(1)).min(1),
    solution: z.string().min(15),
    error: z.string(),
    formula: z.string().optional(),
    conceptId: z.string().max(100).optional(),
    questionType: z.string().max(120).optional(),
    misconceptions: z
      .record(z.string().regex(/^[0-3]$/), z.string().max(400))
      .optional(),
    reviewer: z.string().min(3),
    provenance: z.string().min(5),
    language: z.literal("en"),
    syllabusVersion: z.string().min(1),
    pool: z.enum(["practice", "assessment"]),
    status: z.literal("published"),
  }),
);
if (!existsSync("content/reviewed.json")) {
  console.log(
    "No reviewed bank supplied. Starter demo is separate and remains guest-only.",
  );
  if (process.argv.includes("--import")) process.exitCode = 1;
} else {
  const items = schema.parse(
    JSON.parse(readFileSync("content/reviewed.json", "utf8")),
  );
  if (new Set(items.map((q) => q.id)).size !== items.length)
    throw new Error("Duplicate item version");
  if (items.some((q) => q.id.startsWith("demo-")))
    throw new Error("Starter fixtures cannot be published as reviewed content");
  console.log(`Validated ${items.length} reviewed items.`);
  if (process.argv.includes("--import")) {
    const quote = (s: string) => "'" + s.replaceAll("'", "''") + "'";
    const sql = items
      .map(
        (q) =>
          `INSERT INTO question_versions(id,family,topic,skill,payload,pool,status,reviewer,provenance,language,syllabus_version) VALUES(${[q.id, q.family, q.topic, q.skill, JSON.stringify(q), q.pool, q.status, q.reviewer, q.provenance, q.language, q.syllabusVersion].map(quote).join(",")});`,
      )
      .join("\n");
    mkdirSync(".wrangler", { recursive: true });
    writeFileSync(".wrangler/content-import.sql", sql);
    execFileSync(
      "npx",
      [
        "--no-install",
        "wrangler",
        "d1",
        "execute",
        "DB",
        "--local",
        "--file=.wrangler/content-import.sql",
      ],
      { stdio: "inherit" },
    );
  }
}
