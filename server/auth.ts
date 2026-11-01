import { betterAuth } from "better-auth";
import type { Env } from "./env";
export function auth(env: Env) {
  return betterAuth({
    database: env.DB,
    baseURL: env.APP_ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.APP_ORIGIN],
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID ?? "",
        clientSecret: env.GOOGLE_CLIENT_SECRET ?? "",
      },
    },
    session: { expiresIn: 30 * 86400, updateAge: 86400 },
    advanced: { useSecureCookies: env.APP_ORIGIN.startsWith("https://") },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 40 },
  });
}
