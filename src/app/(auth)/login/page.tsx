import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { LoginForm } from "./login-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.signInTitle };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { dict } = await getI18n();
  const params = await searchParams;
  const reasons: Record<string, string> = {
    idle: dict.auth.reasonIdle,
    expired: dict.auth.reasonExpired,
    "signed-out": dict.auth.reasonSignedOut,
  };
  const reason = typeof params.reason === "string" ? reasons[params.reason] : undefined;
  const next = typeof params.next === "string" ? params.next : "/";

  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-[32px] leading-tight">{dict.auth.signInTitle}</h1>
        <p className="mt-1 text-ink-2">{dict.auth.signInSubtitle}</p>
        {reason && (
          <p role="status" className="mt-5 rounded-md bg-accent-soft px-3 py-2 text-[13px] text-accent-ink">
            {reason}
          </p>
        )}
        <LoginForm next={next} />
      </div>
      <p className="mt-5 text-center text-[13.5px] text-ink-2">
        {dict.auth.noAccount}{" "}
        <Link href="/signup" className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-4">
          {dict.auth.startTrial}
        </Link>
      </p>
    </>
  );
}
