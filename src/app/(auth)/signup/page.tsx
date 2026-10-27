import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { SignupForm } from "./signup-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.signUpTitle };
}

export default async function SignupPage() {
  const { dict } = await getI18n();
  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
        <h1 className="font-display text-[32px] leading-tight">{dict.auth.signUpTitle}</h1>
        <p className="mt-1 text-ink-2">{dict.auth.signUpSubtitle}</p>
        <SignupForm />
      </div>
      <p className="mt-5 text-center text-[13.5px] text-ink-2">
        {dict.auth.haveAccount}{" "}
        <Link href="/login" className="font-medium text-ink underline decoration-accent decoration-2 underline-offset-4">
          {dict.auth.signIn}
        </Link>
      </p>
    </>
  );
}
