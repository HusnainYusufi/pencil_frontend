import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { JournalSourceLabel, JournalStatusBadge } from "@/components/journal-badges";
import { Pagination } from "@/components/ui/pagination";
import { Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { FormMessage } from "@/components/ui/interactive";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { DATE_ONLY } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { JournalStatus, JournalSummary, Page } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.journals.title };
}

const STATUSES: JournalStatus[] = ["DRAFT", "POSTED"];

export default async function JournalsPage({ searchParams }: PageProps<"/journals">) {
  const ws = await requireAccess({ feature: Feat.JOURNALS, permission: Perm.JOURNALS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const status = STATUSES.find((s) => s === params.status);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const from = typeof params.from === "string" && DATE_ONLY.test(params.from) ? params.from : undefined;
  const to = typeof params.to === "string" && DATE_ONLY.test(params.to) ? params.to : undefined;
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);

  const result = await userApi<Page<JournalSummary>>("/journal-entries", {
    query: { status, search: search || undefined, from, to, page, pageSize: 25 },
  });
  const canPost = ws.can(Perm.JOURNALS_POST);
  const filters = { status, q: search || undefined, from, to };

  const statusHref = (value?: JournalStatus) => {
    const query = new URLSearchParams();
    for (const [key, v] of Object.entries({ ...filters, status: value })) if (v) query.set(key, v);
    const qs = query.toString();
    return qs ? `/journals?${qs}` : "/journals";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.accounting}
        title={dict.journals.title}
        description={dict.journals.subtitle}
        actions={
          canPost && (
            <ButtonLink href="/journals/new">
              <Plus className="size-4" aria-hidden />
              {dict.journals.newEntry}
            </ButtonLink>
          )
        }
      />

      {params.done === "deleted" && <FormMessage tone="success">{dict.journals.draftDeleted}</FormMessage>}

      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <nav aria-label={dict.common.status} className="flex gap-1">
          {[undefined, ...STATUSES].map((value) => (
            <Link
              key={value ?? "all"}
              href={statusHref(value)}
              aria-current={status === value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                status === value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {value === "DRAFT" ? dict.journals.draft : value === "POSTED" ? dict.journals.posted : dict.journals.filterAll}
            </Link>
          ))}
        </nav>
        <form className="flex flex-wrap items-end gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={search} aria-label={dict.common.search} placeholder={dict.common.search} className="w-52 ps-9" />
          </div>
          <Input type="date" name="from" defaultValue={from} aria-label={dict.common.from} className="w-40" />
          <Input type="date" name="to" defaultValue={to} aria-label={dict.common.to} className="w-40" />
          <Button type="submit" variant="secondary">
            {dict.common.apply}
          </Button>
        </form>
      </div>

      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState
            title={dict.journals.noEntries}
            action={
              canPost && (
                <ButtonLink href="/journals/new" variant="secondary">
                  {dict.journals.newEntry}
                </ButtonLink>
              )
            }
          >
            {dict.journals.noEntriesBody}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{dict.journals.number}</Th>
                  <Th>{dict.common.date}</Th>
                  <Th>{dict.journals.memo}</Th>
                  <Th className="hidden md:table-cell">{dict.journals.reference}</Th>
                  <Th className="hidden lg:table-cell">{dict.journals.source}</Th>
                  <Th>{dict.common.status}</Th>
                  <Th align="right">{dict.journals.amount}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((entry) => (
                  <tr key={entry.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      {/* The whole row is clickable via the stretched link on the number. */}
                      <Link href={`/journals/${entry.id}`} className="font-mono text-[12.5px] after:absolute after:inset-0 hover:underline">
                        <span className="num">{entry.number ?? dict.journals.draft}</span>
                      </Link>
                    </Td>
                    <Td className="whitespace-nowrap text-ink-2">{formatDate(entry.date, locale)}</Td>
                    <Td className="max-w-[20rem] truncate">{entry.memo ?? "—"}</Td>
                    <Td className="hidden text-ink-2 md:table-cell">{entry.reference ?? "—"}</Td>
                    <Td className="hidden lg:table-cell">
                      <JournalSourceLabel source={entry.source} />
                    </Td>
                    <Td>
                      <JournalStatusBadge status={entry.status} />
                    </Td>
                    <Td align="right">
                      <Amount value={entry.totalAmount} currency={entry.currency} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/journals" params={filters} />
          </>
        )}
      </Card>
    </div>
  );
}
