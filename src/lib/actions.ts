import "server-only";
import { getI18n } from "@/i18n/server";
import { ApiError } from "./api";

/** Result every Server Action returns to its form (useActionState). */
export interface ActionState {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
  /** Fresh idempotency key for the next submission of the same form. */
  nonce?: string;
}

/**
 * Maps an API failure into localised form state. Messages come from the
 * dictionary by error code (the API's codes are stable); field-level
 * validation errors keep the API's wording in English and a generic hint in
 * Arabic, since class-validator messages are not translated.
 */
export async function toActionError(error: unknown): Promise<ActionState> {
  if (!(error instanceof ApiError)) throw error; // redirects & unexpected errors propagate
  const { dict, locale } = await getI18n();
  const messages = dict.errors as Record<string, string>;

  const fieldErrors: Record<string, string> = {};
  if (Array.isArray(error.details)) {
    for (const item of error.details as Array<{ field?: string; errors?: string[] }>) {
      if (item.field && item.errors?.[0]) {
        fieldErrors[item.field] = locale === "en" ? item.errors[0] : dict.errors.fieldInvalid;
      }
    }
  }
  const reference = error.requestId ? ` (ref ${error.requestId.slice(0, 8)})` : "";
  return {
    ok: false,
    error: (messages[error.code] ?? dict.errors.generic) + (error.status >= 500 ? reference : ""),
    fieldErrors: Object.keys(fieldErrors).length ? fieldErrors : undefined,
  };
}

export const str = (form: FormData, key: string) => {
  const value = form.get(key);
  return typeof value === "string" ? value.trim() : "";
};

export const optional = (form: FormData, key: string) => str(form, key) || undefined;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export function assertUuid(value: string): string {
  if (!UUID.test(value)) throw new ApiError(400, "BAD_REQUEST", "Invalid identifier");
  return value;
}

export const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Only same-site relative paths: blocks open redirects like `//evil.com`. */
export function safeNext(value: FormDataEntryValue | string | null | undefined): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/";
  return value;
}
