import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { JournalSourceLabel } from "@/components/journal-badges";
import { Button, ButtonLink, Card, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY, isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { negate } from "@/lib/money";
import { Feat, Perm } from "@/lib/permissions";
import type { AccountStatement } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.statement.title };
}

const CREDIT_NORMAL = new Set(["LIABILITY", "EQUITY", "REVENUE"]);

export default async function AccountStatementPage({ params, searchParams }: PageProps<"/accounts/[id]">) {
  await requireAccess({ feature: Feat.LEDGER_REPORTS, permission: Perm.REPORTS_READ });
  const [{ id }, query, { dict, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();

  const from = typeof query.from === "string" && DATE_ONLY.test(query.from) ? query.from : undefined;
  const to = typeof query.to === "string" && DATE_ONLY.test(query.to) ? query.to : undefined;
  const cursor = typeof query.cursor === "string" ? query.cursor.slice(0, 512) : undefined;
  // From a "before closing" trial balance, hide the year-end closing entry so the figures agree.
  const includeClosing = query.closing === "0" ? false : undefined;

  let statement: AccountStatement;
  try {
    statement = await userApi<AccountStatement>(`/reports/account-statement/${id}`, { query: { from, to, cursor, limit: 100, includeClosing } });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const { account, currency } = statement;
  // Show balances on the account's normal side (credit accounts positive when in credit).
  const sign = (amount: string) => (CREDIT_NORMAL.has(account.type) ? negate(amount) : amount);
  const nextHref = statement.nextCursor
    ? `/accounts/${id}?${new URLSearchParams({ from: statement.from, to: statement.to, cursor: statement.nextCursor, ...(includeClosing === false && { closing: "0" }) })}`
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/accounts" className="hover:text-ink">
            {dict.accounts.title}
          </Link>
        }
        title={
          <>
            <span className="num font-mono text-[0.7em] text-ink-2">{account.code}</span> {localName(account, locale)}
          </>
        }
        description={dict.statement.title}
      />

      <form className="flex flex-wrap items-end gap-3">
        <label className="space-y-1.5 text-[13px] font-medium">
          <span className="block">{dict.common.from}</span>
          <Input type="date" name="from" defaultValue={statement.from} className="w-44" />
        </label>
        <label className="space-y-1.5 text-[13px] font-medium">
          <span className="block">{dict.common.to}</span>
          <Input type="date" name="to" defaultValue={statement.to} className="w-44" />
        </label>
        <Button type="submit" variant="secondary">
          {dict.common.apply}
        </Button>
      </form>

      <div className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        <div className="bg-surface px-5 py-4">
          <p className="text-[12.5px] text-muted">
            {dict.statement.opening} · {formatDate(statement.from, locale)}
          </p>
          <p className="mt-1 text-[24px] font-semibold">
            <Amount value={sign(statement.openingBalance)} currency={currency} showCurrency />
          </p>
        </div>
        <div className="bg-surface px-5 py-4">
          <p className="text-[12.5px] text-muted">
            {dict.statement.closing} · {formatDate(statement.to, locale)}
          </p>
          <p className="mt-1 text-[24px] font-semibold">
            <Amount value={sign(statement.closingBalance)} currency={currency} showCurrency />
          </p>
        </div>
      </div>

      <Card flush>
        {statement.items.length === 0 ? (
          <EmptyState title={dict.statement.noActivity} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{dict.common.date}</Th>
                <Th>{dict.statement.entry}</Th>
                <Th>{dict.statement.description}</Th>
                <Th className="hidden lg:table-cell">{dict.journals.source}</Th>
                <Th align="right">{dict.statement.debit}</Th>
                <Th align="right">{dict.statement.credit}</Th>
                <Th align="right">{dict.statement.balance}</Th>
              </tr>
            </thead>
            <tbody>
              {statement.items.map((line) => (
                <tr key={line.id} className="hover:bg-surface-2/50">
                  <Td className="whitespace-nowrap text-ink-2">{formatDate(line.date, locale)}</Td>
                  <Td>
                    <Link href={`/journals/${line.journalEntryId}`} className="font-mono text-[12.5px] hover:underline">
                      <span className="num">{line.number}</span>
                    </Link>
                  </Td>
                  <Td className="max-w-[22rem] truncate">{line.description ?? line.reference ?? "—"}</Td>
                  <Td className="hidden lg:table-cell">
                    <JournalSourceLabel source={line.source} />
                  </Td>
                  <Td align="right">
                    <Amount value={line.debit} currency={currency} blankZero />
                  </Td>
                  <Td align="right">
                    <Amount value={line.credit} currency={currency} blankZero />
                  </Td>
                  <Td align="right" className="font-medium">
                    <Amount value={sign(line.balance)} currency={currency} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        {nextHref && (
          <div className="border-t border-line px-4 py-3 text-center">
            <ButtonLink href={nextHref} variant="secondary" size="sm">
              {dict.statement.loadMore}
            </ButtonLink>
          </div>
        )}
      </Card>
    </div>
  );
}
