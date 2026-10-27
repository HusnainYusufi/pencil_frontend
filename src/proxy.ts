import { NextResponse, type NextRequest } from "next/server";
import { ApiError, apiRequest } from "@/lib/api";
import { env } from "@/lib/env";
import {
  SESSION_COOKIE,
  checkSessionLimits,
  expiredCookieOptions,
  sealSession,
  sessionCookieOptions,
  unsealSession,
  type AppSession,
  type TokenResponse,
} from "@/lib/session";

/** Reachable signed out (signed-in users are sent on to the app). */
const PUBLIC_PATHS = new Set(["/login", "/signup"]);
/** Signed in, but no company picked yet. */
const COMPANYLESS_PATHS = new Set(["/select-company"]);
/** Refresh the access token this long before it expires. */
const REFRESH_AHEAD_MS = 2 * 60_000;
/** Re-seal the cookie at most this often just to record activity. */
const ACTIVITY_WRITE_MS = 60_000;

/**
 * Runs before every page and Server Action:
 *  1. per-request CSP nonce + hardened security headers;
 *  2. session gate (redirects to /login), idle timeout, absolute expiry;
 *  3. company gate (users of several companies pick one first);
 *  4. silent access-token refresh using the rotating refresh token.
 */
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = contentSecurityPolicy(nonce);
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.has(path);
  const now = Date.now();

  let session = await unsealSession(request.cookies.get(SESSION_COOKIE)?.value);
  let endReason: string | null = null;
  let cookieUpdate: { value: string; session: AppSession } | "clear" | null = null;

  // The app sends users here when the API rejected their session (revoked,
  // disabled, signed out elsewhere). Drop the cookie instead of bouncing back.
  const rejected = isPublic && ["expired", "idle", "signed-out"].includes(request.nextUrl.searchParams.get("reason") ?? "");
  if (session && rejected) {
    session = null;
    cookieUpdate = "clear";
  }

  if (session) {
    endReason = checkSessionLimits(session, now);
    let rotated = false;
    if (!endReason && session.accessExpiresAt - now < REFRESH_AHEAD_MS) {
      const refreshed = await refresh(session, now);
      if (refreshed === "failed") endReason = "expired";
      else if (refreshed) {
        session = refreshed;
        rotated = true;
      }
    }
    if (endReason) {
      session = null;
      cookieUpdate = "clear";
    } else if (rotated || now - session.lastActiveAt > ACTIVITY_WRITE_MS) {
      session = { ...session, lastActiveAt: now };
      cookieUpdate = { value: await sealSession(session), session };
    }
  }

  if (!session && !isPublic) {
    const login = new URL("/login", request.url);
    if (path !== "/") login.searchParams.set("next", path + request.nextUrl.search);
    if (endReason) login.searchParams.set("reason", endReason);
    return finalize(NextResponse.redirect(login), csp, cookieUpdate);
  }
  if (session && isPublic) {
    return finalize(NextResponse.redirect(new URL("/", request.url)), csp, cookieUpdate);
  }
  if (session && !session.activeTenantId && !COMPANYLESS_PATHS.has(path)) {
    return finalize(NextResponse.redirect(new URL("/select-company", request.url)), csp, cookieUpdate);
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  if (cookieUpdate) {
    // Make the fresh session visible to Server Components in this same request.
    if (cookieUpdate === "clear") request.cookies.delete(SESSION_COOKIE);
    else request.cookies.set(SESSION_COOKIE, cookieUpdate.value);
    requestHeaders.set("cookie", request.cookies.toString());
  }
  return finalize(NextResponse.next({ request: { headers: requestHeaders } }), csp, cookieUpdate);
}

/**
 * Rotates the refresh token. If a parallel request already rotated it
 * ("stale"), keep going with the still-valid access token instead of
 * signing the user out.
 */
async function refresh(session: AppSession, now: number): Promise<AppSession | "failed" | null> {
  try {
    const tokens = await apiRequest<TokenResponse>("/auth/refresh", {
      method: "POST",
      body: { refreshToken: session.refreshToken },
    });
    return {
      ...session,
      accessToken: tokens.accessToken,
      accessExpiresAt: now + tokens.expiresIn * 1000,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: Math.min(session.refreshExpiresAt, Date.parse(tokens.refreshTokenExpiresAt)),
      lastActiveAt: now,
      activeTenantId: tokens.activeTenantId,
    };
  } catch (error) {
    const stale = error instanceof ApiError && error.code === "INVALID_TOKEN";
    if (stale && session.accessExpiresAt > now) return null;
    if (error instanceof ApiError && error.status >= 500 && session.accessExpiresAt > now) return null;
    return "failed";
  }
}

function finalize(
  response: NextResponse,
  csp: string,
  cookieUpdate: { value: string; session: AppSession } | "clear" | null,
): NextResponse {
  const h = response.headers;
  h.set("Content-Security-Policy", csp);
  h.set("X-Frame-Options", "DENY");
  h.set("X-Content-Type-Options", "nosniff");
  h.set("Referrer-Policy", "strict-origin-when-cross-origin");
  h.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()");
  h.set("Cross-Origin-Opener-Policy", "same-origin");
  h.set("Cross-Origin-Resource-Policy", "same-origin");
  // Financial data must never be stored by the browser or intermediaries.
  h.set("Cache-Control", "no-store, max-age=0");
  if (env.cookieSecure) h.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  if (cookieUpdate === "clear") {
    response.cookies.set(SESSION_COOKIE, "", expiredCookieOptions());
  } else if (cookieUpdate) {
    response.cookies.set(SESSION_COOKIE, cookieUpdate.value, sessionCookieOptions(cookieUpdate.session));
  }
  return response;
}

function contentSecurityPolicy(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`}`,
    "img-src 'self' blob: data:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt).*)"],
};
