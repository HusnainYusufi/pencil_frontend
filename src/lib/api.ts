import "server-only";
import { randomUUID } from "node:crypto";
import { env } from "./env";

/** Mirrors the API's `{ error: { code, message, details, requestId } }` shape. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
    readonly requestId?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string;
  idempotencyKey?: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  /** End-user context forwarded for the audit trail. */
  client?: { ip?: string; userAgent?: string };
}

/**
 * Server-to-server call to the Pencil API. Runs only on the Next.js server
 * (proxy, Server Components, Server Actions); never from the browser.
 */
export async function apiRequest<T>(path: string, req: ApiRequest = {}): Promise<T> {
  const url = new URL(`${env.apiUrl}${path}`);
  for (const [key, value] of Object.entries(req.query ?? {})) {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
  }

  const headers: Record<string, string> = { accept: "application/json", "x-request-id": randomUUID() };
  if (req.body !== undefined) headers["content-type"] = "application/json";
  if (req.token) headers.authorization = `Bearer ${req.token}`;
  if (req.idempotencyKey) headers["idempotency-key"] = req.idempotencyKey;
  if (req.client?.ip) headers["x-forwarded-for"] = req.client.ip;
  if (req.client?.userAgent) headers["user-agent"] = req.client.userAgent.slice(0, 512);

  let response: Response;
  try {
    response = await fetch(url, {
      method: req.method ?? "GET",
      headers,
      body: req.body === undefined ? undefined : JSON.stringify(req.body),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(503, "SERVICE_UNAVAILABLE", "The Pencil API is unreachable. Try again shortly.");
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  const payload: unknown = text ? safeJson(text) : undefined;

  if (!response.ok) {
    const error = (payload as { error?: { code?: string; message?: string; details?: unknown; requestId?: string } })?.error;
    throw new ApiError(
      response.status,
      error?.code ?? "INTERNAL",
      error?.message ?? `Request failed (${response.status})`,
      error?.details,
      error?.requestId,
    );
  }
  return payload as T;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
