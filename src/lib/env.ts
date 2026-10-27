import "server-only";
import { z } from "zod";

const schema = z.object({
  PENCIL_API_URL: z.url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(240).default(60),
  /** Tags logs and the non-production banner. */
  PENCIL_ENVIRONMENT: z.enum(["local", "staging", "production"]).default("local"),
  COOKIE_SECURE: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => (v === undefined ? process.env.NODE_ENV === "production" : v === "true")),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const report = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
  throw new Error(`Invalid pencil_frontend environment:\n${report}`);
}
if (process.env.NODE_ENV === "production" && !parsed.data.COOKIE_SECURE) {
  throw new Error("COOKIE_SECURE must be true in production");
}

/** Server-only configuration. Never import from a Client Component. */
export const env = {
  apiUrl: parsed.data.PENCIL_API_URL.replace(/\/$/, ""),
  sessionSecret: parsed.data.SESSION_SECRET,
  idleTimeoutMs: parsed.data.SESSION_IDLE_MINUTES * 60_000,
  cookieSecure: parsed.data.COOKIE_SECURE,
  environment: parsed.data.PENCIL_ENVIRONMENT,
};
