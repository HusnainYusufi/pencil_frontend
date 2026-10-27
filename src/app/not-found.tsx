import { ButtonLink } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";

export default async function NotFound() {
  const { dict } = await getI18n();
  return (
    <main className="ruled flex min-h-dvh items-center justify-center px-5">
      <div className="max-w-md text-center">
        <p className="font-mono text-[12px] tracking-[0.18em] text-muted">404</p>
        <h1 className="mt-3 font-display text-[40px] leading-tight">
          <span className="mark">{dict.common.notFoundTitle}</span>
        </h1>
        <p className="mt-3 text-ink-2">{dict.common.notFoundBody}</p>
        <ButtonLink href="/" variant="secondary" className="mt-8">
          {dict.gate.backToDashboard}
        </ButtonLink>
      </div>
    </main>
  );
}
