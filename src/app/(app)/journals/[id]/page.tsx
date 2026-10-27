import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { JournalSourceLabel, JournalStatusBadge } from "@/components/journal-badges";
import { FormMessage } from "@/components/ui/interactive";
import { Card, DataList, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate, localName } from "@/lib/format";
import { sumAmounts } from "@/lib/money";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { JournalDetail } from "@/lib/types";
import { DeleteDraftButton, PostButton, ReverseDialog } from "./entry-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.journals.title };
}

export default async function JournalDetailPage({ params, searchParams }: PageProps<"/journals/[id]">) {
  const ws = await requireAccess({ feature: Feat.JOURNALS, permission: Perm.JOURNALS_READ });
  const [{ id }, query, { dict, t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();

  let entry: JournalDetail;
  try {
    entry = await userApi<JournalDetail>(`/journal-entries/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }

  const canPost = ws.can(Perm.JOURNALS_POST);
  const posted = entry.status === "POSTED";
  const reversible = posted && !entry.reversedBy && entry.source !== "REVERSAL";
  const canStatement = ws.has(Feat.LEDGER_REPORTS) && ws.can(Perm.REPORTS_READ);
  const withCostCenters = entry.lines.some((line) => line.costCenter);
  const messages: Record<string, string> = {
    saved: dict.journals.draftSaved,
    posted: t(dict.journals.entryPosted, { number: entry.number ?? "" }),
    reversed: t(dict.journals.entryReversed, { number: entry.number ?? "" }),
  };
  const done = typeof query.done === "string" ? messages[query.done] : undefined;

  const link = (target: { id: string; number: string | null }) => (
    <Link href={`/journals/${target.id}`} className="font-mono text-[13px] underline decoration-line-strong underline-offset-4 hover:decoration-ink">
      <span className="num">{target.number ?? "—"}</span>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/journals" className="hover:text-ink">
            {dict.journals.title}
          </Link>
        }
        title={<span className="num">{entry.number ?? dict.journals.draft}</span>}
        description={entry.memo ?? undefined}
        actions={
          canPost && (
            <>
              {!posted && <DeleteDraftButton id={entry.id} />}
              {!posted && <PostButton id={entry.id} />}
              {reversible && <ReverseDialog id={entry.id} today={isoDate(requestNow())} />}
            </>
          )
        }
      />

      {done && <FormMessage tone="success">{done}</FormMessage>}

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card flush className="min-w-0">
          <Table>
            <thead>
              <tr>
                <Th className="w-10">#</Th>
                <Th>{dict.journals.account}</Th>
                <Th>{dict.journals.lineDescription}</Th>
                {withCostCenters && <Th>{dict.journals.costCenter}</Th>}
                <Th align="right">{dict.journals.debit}</Th>
                <Th align="right">{dict.journals.credit}</Th>
              </tr>
            </thead>
            <tbody>
              {entry.lines.map((line) => (
                <tr key={line.id}>
                  <Td className="font-mono text-[12px] text-muted">{line.lineNo}</Td>
                  <Td>
                    <span className="num me-2 font-mono text-[12.5px] text-ink-2">{line.account.code}</span>
                    {canStatement ? (
                      <Link href={`/accounts/${line.account.id}`} className="hover:underline">
                        {localName(line.account, locale)}
                      </Link>
                    ) : (
                      localName(line.account, locale)
                    )}
                  </Td>
                  <Td className="text-ink-2">{line.description ?? "—"}</Td>
                  {withCostCenters && (
                    <Td className="text-ink-2">{line.costCenter ? localName(line.costCenter, locale) : "—"}</Td>
                  )}
                  <Td align="right">
                    <Amount value={line.debit} currency={entry.currency} blankZero />
                  </Td>
                  <Td align="right">
                    <Amount value={line.credit} currency={entry.currency} blankZero />
                  </Td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-2/40 font-semibold">
                <Td colSpan={withCostCenters ? 4 : 3}>{dict.journals.totals}</Td>
                <Td align="right">
                  <Amount value={sumAmounts(entry.lines.map((l) => l.debit), entry.currency)} currency={entry.currency} />
                </Td>
                <Td align="right">
                  <Amount value={sumAmounts(entry.lines.map((l) => l.credit), entry.currency)} currency={entry.currency} />
                </Td>
              </tr>
            </tfoot>
          </Table>
        </Card>

        <Card>
          <DataList
            items={[
              { label: dict.common.status, value: <JournalStatusBadge status={entry.status} reversed={Boolean(entry.reversedBy)} /> },
              { label: dict.journals.entryDate, value: formatDate(entry.date, locale) },
              { label: dict.journals.source, value: <JournalSourceLabel source={entry.source} /> },
              { label: dict.journals.reference, value: entry.reference },
              {
                label: dict.journals.amount,
                value: <Amount value={entry.totalAmount} currency={entry.currency} showCurrency className="font-semibold" />,
              },
              ...(entry.postedAt
                ? [{ label: dict.journals.posted, value: formatDate(entry.postedAt, locale, { dateStyle: "medium", timeStyle: "short" }) }]
                : []),
              ...(entry.reversalOf ? [{ label: dict.journals.reversalOf, value: link(entry.reversalOf) }] : []),
              ...(entry.reversedBy ? [{ label: dict.journals.reversedByLabel, value: link(entry.reversedBy) }] : []),
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
