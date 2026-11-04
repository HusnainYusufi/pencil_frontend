import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { ResetForm } from "./reset-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.resetTitle };
}

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const [{ dict }, params] = await Promise.all([getI18n(), searchParams]);
  const token = typeof params.token === "string" ? params.token : "";
  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-[32px] leading-tight">{dict.auth.resetTitle}</h1>
        <p className="mt-1 text-ink-2">{dict.auth.resetSubtitle}</p>
        <ResetForm token={token} />
      </div>
      <p className="mt-5 text-center text-[13.5px]">
        <Link href="/forgot-password" className="text-ink-2 underline underline-offset-4 hover:text-ink">
          {dict.auth.forgotPassword}
        </Link>
      </p>
    </>
  );
}
