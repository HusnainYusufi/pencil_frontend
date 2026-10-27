import "server-only";
import { sealData, unsealData } from "iron-session";
import { env } from "./env";

/**
 * Lives only in an encrypted (AES-256-GCM via iron-session), httpOnly,
 * SameSite=Strict cookie. The browser can neither read nor forge it; API
 * tokens never reach client JavaScript. Profile, permissions and plan are
 * NOT cached here: they are read from GET /me per request, so a role change
 * or a feature toggle by Pencil staff applies on the next navigation.
 */
export interface AppSession {
  accessToken: string;
  refreshToken: string;
  /** epoch ms */
  accessExpiresAt: number;
  /** epoch ms; absolute end of the session (no sliding past it). */
  refreshExpiresAt: number;
  /** epoch ms; drives the idle timeout. */
  lastActiveAt: number;
  userId: string;
  /** null until the user picks a company (members of several companies). */
  activeTenantId: string | null;
}

/** `__Host-` prefix: Secure, Path=/, no Domain, so subdomains can't plant or read it. */
export const SESSION_COOKIE = env.cookieSecure ? "__Host-pencil_session" : "pencil_session";

/** Matches the API's refresh-token lifetime. */
const MAX_TTL_SECONDS = 30 * 24 * 3600;

export function sealSession(session: AppSession): Promise<string> {
  return sealData(session, { password: env.sessionSecret, ttl: MAX_TTL_SECONDS });
}

export async function unsealSession(value: string | undefined): Promise<AppSession | null> {
  if (!value) return null;
  try {
    const session = await unsealData<AppSession>(value, { password: env.sessionSecret, ttl: MAX_TTL_SECONDS });
    return session && typeof session.accessToken === "string" ? session : null;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(session: AppSession) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "strict" as const,
    path: "/",
    expires: new Date(session.refreshExpiresAt),
  };
}

/** Attributes for clearing the cookie: must match those it was set with. */
export function expiredCookieOptions() {
  return { httpOnly: true, secure: env.cookieSecure, sameSite: "strict" as const, path: "/", expires: new Date(0) };
}

export type SessionEndReason = "idle" | "expired" | "signed-out";

/** Validates the session's time limits; null when it may continue. */
export function checkSessionLimits(session: AppSession, now = Date.now()): SessionEndReason | null {
  if (now >= session.refreshExpiresAt) return "expired";
  if (now - session.lastActiveAt > env.idleTimeoutMs) return "idle";
  return null;
}

/** Shape shared by /auth/login, /auth/signup and /auth/refresh. */
export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  activeTenantId: string | null;
}

export function sessionFromTokens(tokens: TokenResponse, userId: string, now = Date.now()): AppSession {
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: now + tokens.expiresIn * 1000,
    refreshExpiresAt: Date.parse(tokens.refreshTokenExpiresAt),
    lastActiveAt: now,
    userId,
    activeTenantId: tokens.activeTenantId,
  };
}
