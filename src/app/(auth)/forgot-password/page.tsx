import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { ForgotForm } from "./forgot-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.forgotTitle };
}

export default async function ForgotPasswordPage() {
  const { dict } = await getI18n();
  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-[32px] leading-tight">{dict.auth.forgotTitle}</h1>
        <p className="mt-1 text-ink-2">{dict.auth.forgotSubtitle}</p>
        <ForgotForm />
      </div>
      <p className="mt-5 text-center text-[13.5px]">
        <Link href="/login" className="text-ink-2 underline underline-offset-4 hover:text-ink">
          {dict.auth.backToSignIn}
        </Link>
      </p>
    </>
  );
}
