import type { Metadata } from "next";
import Link from "next/link";
import { getI18n } from "@/i18n/server";
import { apiRequest } from "@/lib/api";
import { AcceptForm } from "./accept-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.auth.acceptInvite };
}

interface Invitation {
  email: string;
  fullName: string;
  company: { id: string; name: string };
  needsPassword: boolean;
}

export default async function InvitePage({ searchParams }: PageProps<"/invite">) {
  const [{ dict, t }, params] = await Promise.all([getI18n(), searchParams]);
  const token = typeof params.token === "string" ? params.token : "";
  let invitation: Invitation | null = null;
  if (token) {
    try {
      invitation = await apiRequest<Invitation>("/auth/invitation", { query: { token } });
    } catch {
      invitation = null;
    }
  }

  return (
    <>
      <div className="rounded-xl border border-line bg-surface p-8 shadow-card">
        {invitation ? (
          <>
            <h1 className="font-display text-[32px] leading-tight">{t(dict.auth.inviteTitle, { company: invitation.company.name })}</h1>
            <p className="mt-1 text-ink-2">
              {t(dict.auth.inviteSubtitle, { email: invitation.email })}
              {invitation.needsPassword && <> {dict.auth.inviteSetPassword}</>}
            </p>
            <AcceptForm token={token} needsPassword={invitation.needsPassword} fullName={invitation.fullName} />
          </>
        ) : (
          <p role="alert" className="text-ink-2">
            {dict.auth.linkInvalid}
          </p>
        )}
      </div>
      <p className="mt-5 text-center text-[13.5px]">
        <Link href="/login" className="text-ink-2 underline underline-offset-4 hover:text-ink">
          {dict.auth.backToSignIn}
        </Link>
      </p>
    </>
  );
}
