import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { ApiError, apiRequest, type ApiRequest } from "./api";
import { hasPermission } from "./permissions";
import { SESSION_COOKIE, unsealSession, type AppSession } from "./session";
import type { CompanySummary, Me } from "./types";

/**
 * Data Access Layer: the only path from UI code to the API. Every read and
 * every Server Action re-verifies the session here (never trust the client).
 * The proxy keeps tokens fresh, so this never has to write cookies.
 */
export const getSession = cache(async (): Promise<AppSession | null> => {
  return unsealSession((await cookies()).get(SESSION_COOKIE)?.value);
});

export async function clientContext(): Promise<ApiRequest["client"]> {
  const h = await headers();
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? undefined,
    userAgent: h.get("user-agent") ?? undefined,
  };
}

/** Authenticated API call as the signed-in user, in their active company. */
export async function userApi<T>(path: string, req: Omit<ApiRequest, "token" | "client"> = {}): Promise<T> {
  const session = await getSession();
  if (!session) redirect("/login");
  try {
    return await apiRequest<T>(path, { ...req, token: session.accessToken, client: await clientContext() });
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 401) redirect("/login?reason=expired");
      // Plan or role changed since the page was rendered.
      if (error.code === "FEATURE_NOT_AVAILABLE") redirect("/forbidden?reason=plan");
      if (error.code === "TENANT_REQUIRED" || error.code === "TENANT_ACCESS_DENIED") redirect("/select-company");
    }
    throw error;
  }
}

/** Who am I, which company, what may I do: once per request. */
export const getMe = cache(async (): Promise<Me> => userApi<Me>("/me"));

export interface Workspace extends Me {
  company: CompanySummary;
  can: (permission: string) => boolean;
  has: (feature: string) => boolean;
}

/** Every page inside the app: a signed-in user working in a company. */
export const requireWorkspace = cache(async (): Promise<Workspace> => {
  const me = await getMe();
  if (!me.activeTenant) redirect("/select-company");
  return {
    ...me,
    company: me.activeTenant,
    can: (permission) => hasPermission(me.permissions, permission),
    has: (feature) => me.entitlements[feature]?.enabled === true,
  };
});

/**
 * Gate for a page or action: the plan must include the feature (toggled by
 * Pencil staff per plan or per company) and the role must grant the permission.
 * The API enforces both again; this keeps users off dead-end screens.
 */
export async function requireAccess({ feature, permission }: { feature?: string; permission?: string }): Promise<Workspace> {
  const ws = await requireWorkspace();
  if (feature && !ws.has(feature)) redirect(`/forbidden?reason=plan&feature=${encodeURIComponent(feature)}`);
  if (permission && !ws.can(permission)) redirect("/forbidden?reason=role");
  return ws;
}
