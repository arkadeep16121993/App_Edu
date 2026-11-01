import { DatabaseSync } from "node:sqlite";
import { writeFileSync } from "node:fs";
import { getMigrations } from "better-auth/db/migration";
const db = new DatabaseSync(":memory:");
const migration = await getMigrations({
  database: db,
  rateLimit: { enabled: true, storage: "database" },
});
writeFileSync("migrations/0001_auth.sql", await migration.compileMigrations());
db.close();
