"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isLocale, LOCALE_COOKIE } from "@/i18n/config";
import { assertUuid, safeNext, str } from "@/lib/actions";
import { apiRequest } from "@/lib/api";
import { clientContext, getSession } from "@/lib/dal";
import { env } from "@/lib/env";
import { SESSION_COOKIE, expiredCookieOptions, sealSession, sessionCookieOptions } from "@/lib/session";

export async function logout(): Promise<void> {
  const session = await getSession();
  if (session) {
    // Revoke server-side too, so a copied cookie is useless afterwards.
    await apiRequest("/auth/logout", { method: "POST", token: session.accessToken, client: await clientContext() }).catch(
      () => undefined,
    );
  }
  // A __Host- cookie is only removed by a Set-Cookie with the same Secure/Path
  // attributes; a bare delete() would be ignored by the browser.
  (await cookies()).set(SESSION_COOKIE, "", expiredCookieOptions());
  redirect("/login?reason=signed-out");
}

/** Make another company active: the API checks membership and issues a token scoped to it. */
export async function selectCompany(form: FormData): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  const tenantId = assertUuid(str(form, "tenantId"));

  const now = Date.now();
  const result = await apiRequest<{ accessToken: string; expiresIn: number; activeTenantId: string }>("/auth/switch-tenant", {
    method: "POST",
    body: { tenantId },
    token: session.accessToken,
    client: await clientContext(),
  });
  const next = {
    ...session,
    accessToken: result.accessToken,
    accessExpiresAt: now + result.expiresIn * 1000,
    activeTenantId: result.activeTenantId,
    lastActiveAt: now,
  };
  (await cookies()).set(SESSION_COOKIE, await sealSession(next), sessionCookieOptions(next));
  redirect(safeNext(form.get("next")));
}

/** Language preference: a plain cookie read on the server (no client storage). */
export async function setLocale(form: FormData): Promise<void> {
  const locale = str(form, "locale");
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 365 * 24 * 3600,
    sameSite: "lax",
    secure: env.cookieSecure,
    httpOnly: true,
  });
}
