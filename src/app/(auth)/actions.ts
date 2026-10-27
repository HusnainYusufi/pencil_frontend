"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getI18n } from "@/i18n/server";
import { safeNext, str, toActionError, type ActionState } from "@/lib/actions";
import { apiRequest } from "@/lib/api";
import { clientContext } from "@/lib/dal";
import { SESSION_COOKIE, sealSession, sessionCookieOptions, sessionFromTokens, type TokenResponse } from "@/lib/session";
import type { CompanySummary } from "@/lib/types";

interface AuthResponse extends TokenResponse {
  user: { id: string };
  tenants: CompanySummary[];
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_RULE = /^(?=.*\p{L})(?=.*\d).+$/u;

async function startSession(result: AuthResponse) {
  const session = sessionFromTokens(result, result.user.id);
  (await cookies()).set(SESSION_COOKIE, await sealSession(session), sessionCookieOptions(session));
  return session;
}

export async function login(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { dict } = await getI18n();
  const email = str(form, "email");
  const password = form.get("password");
  const fieldErrors: Record<string, string> = {};
  if (!EMAIL.test(email) || email.length > 254) fieldErrors.email = dict.errors.fieldInvalid;
  if (typeof password !== "string" || !password || password.length > 128) fieldErrors.password = dict.errors.fieldInvalid;
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  let session;
  try {
    const result = await apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      client: await clientContext(),
    });
    session = await startSession(result);
  } catch (error) {
    return toActionError(error);
  }
  const next = safeNext(form.get("next"));
  redirect(session.activeTenantId ? next : `/select-company?next=${encodeURIComponent(next)}`);
}

export async function signup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const { dict, locale } = await getI18n();
  const country = str(form, "country") === "JO" ? "JO" : "SA";
  const input = {
    fullName: str(form, "fullName"),
    email: str(form, "email"),
    password: typeof form.get("password") === "string" ? (form.get("password") as string) : "",
    legalName: str(form, "legalName"),
    taxNumber: str(form, "taxNumber").replace(/\s/g, ""),
  };

  const fieldErrors: Record<string, string> = {};
  if (input.fullName.length < 2 || input.fullName.length > 150) fieldErrors.fullName = dict.errors.fieldInvalid;
  if (!EMAIL.test(input.email) || input.email.length > 254) fieldErrors.email = dict.errors.fieldInvalid;
  if (input.password.length < 10 || input.password.length > 128 || !PASSWORD_RULE.test(input.password)) {
    fieldErrors.password = dict.auth.passwordHint;
  }
  if (input.legalName.length < 2 || input.legalName.length > 200) fieldErrors.legalName = dict.errors.fieldInvalid;
  if (input.taxNumber) {
    const valid = country === "SA" ? /^3\d{13}3$/.test(input.taxNumber) : /^\d{6,15}$/.test(input.taxNumber);
    if (!valid) fieldErrors.taxNumber = country === "SA" ? dict.auth.vatHintSA : dict.auth.vatHintJO;
  }
  if (Object.keys(fieldErrors).length) return { ok: false, fieldErrors };

  try {
    const result = await apiRequest<AuthResponse>("/auth/signup", {
      method: "POST",
      body: {
        fullName: input.fullName,
        email: input.email,
        password: input.password,
        locale,
        company: { legalName: input.legalName, country, taxNumber: input.taxNumber || undefined, locale },
      },
      client: await clientContext(),
    });
    await startSession(result);
  } catch (error) {
    const state = await toActionError(error);
    // The API reports nested fields as "company.legalName"; map them to the inputs.
    for (const [key, message] of Object.entries(state.fieldErrors ?? {})) {
      if (key.startsWith("company.")) state.fieldErrors![key.slice("company.".length)] = message;
    }
    return state;
  }
  redirect("/");
}
