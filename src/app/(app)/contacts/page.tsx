import { CheckCircle2, Plus, Search, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatAmount } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact, Page, SubledgerReconciliation } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.contacts.title };
}

const ROLES = ["customer", "supplier"] as const;

export default async function ContactsPage({ searchParams }: PageProps<"/contacts">) {
  const ws = await requireAccess({ feature: Feat.CONTACTS, permission: Perm.CONTACTS_READ });
  const [{ dict, t, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const c = dict.contacts;
  const role = ROLES.find((r) => r === params.role);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const currency = ws.company.baseCurrency;

  const [result, recon] = await Promise.all([
    userApi<Page<Contact>>("/contacts", { query: { role, search: search || undefined, page, pageSize: 25 } }),
    userApi<SubledgerReconciliation[]>("/contacts/reconciliation"),
  ]);
  const href = (next: { role?: string }) => {
    const query = new URLSearchParams();
    if (next.role) query.set("role", next.role);
    if (search) query.set("q", search);
    const qs = query.toString();
    return qs ? `/contacts?${qs}` : "/contacts";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.salesPurchases}
        title={c.title}
        description={c.subtitle}
        actions={
          ws.can(Perm.CONTACTS_MANAGE) && (
            <ButtonLink href="/contacts/new">
              <Plus className="size-4" aria-hidden />
              {c.newContact}
            </ButtonLink>
          )
        }
      />

      <section aria-label={c.reconciliation} className="grid gap-px overflow-hidden rounded-lg border border-line bg-line sm:grid-cols-2">
        {recon.map((r) => (
          <div key={r.ledger} className="flex items-start gap-3 bg-surface px-5 py-4">
            {r.reconciled ? (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
            ) : (
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
            )}
            <div className="min-w-0">
              <p className="text-[12.5px] text-muted">{r.ledger === "receivables" ? c.receivables : c.payables}</p>
              <p className="mt-0.5 text-[20px] font-semibold">
                <Amount value={r.control} currency={currency} showCurrency />
              </p>
              <p className={cn("mt-1 text-[12.5px]", r.reconciled ? "text-muted" : "text-warning")}>
                {r.reconciled
                  ? c.reconciled
                  : t(c.unassigned, {
                      amount: `${formatAmount(r.unassigned, currency)} ${currency}`,
                      ledger: r.ledger === "receivables" ? c.receivables : c.payables,
                    })}
              </p>
            </div>
          </div>
        ))}
      </section>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={c.roles} className="flex gap-1">
          {[undefined, ...ROLES].map((value) => (
            <Link
              key={value ?? "all"}
              href={href({ role: value })}
              aria-current={role === value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                role === value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {value === "customer" ? c.customers : value === "supplier" ? c.suppliers : c.all}
            </Link>
          ))}
        </nav>
        <form className="flex items-center gap-2" role="search">
          {role && <input type="hidden" name="role" value={role} />}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={search} aria-label={dict.common.search} placeholder={dict.common.search} className="w-64 ps-9" />
          </div>
          <Button type="submit" variant="secondary">
            {dict.common.apply}
          </Button>
        </form>
      </div>

      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState
            title={c.empty}
            action={
              ws.can(Perm.CONTACTS_MANAGE) && (
                <ButtonLink href="/contacts/new" variant="secondary">
                  {c.newContact}
                </ButtonLink>
              )
            }
          >
            {c.emptyBody}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{c.name}</Th>
                  <Th className="hidden md:table-cell">{c.taxNumber}</Th>
                  <Th className="hidden lg:table-cell">{c.readiness}</Th>
                  <Th align="right">{c.receivable}</Th>
                  <Th align="right">{c.payable}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((contact) => (
                  <tr key={contact.id} className={cn("relative hover:bg-surface-2/50", !contact.isActive && "opacity-60")}>
                    <Td>
                      <Link href={`/contacts/${contact.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {localName(contact, locale)}
                      </Link>
                      <div className="mt-0.5 flex flex-wrap gap-1.5 text-[11.5px] text-muted">
                        {contact.code && <span className="num font-mono">{contact.code}</span>}
                        {contact.isCustomer && <span>{c.customer}</span>}
                        {contact.isSupplier && <span>{c.supplier}</span>}
                        {!contact.isActive && <span>{c.inactive}</span>}
                      </div>
                    </Td>
                    <Td className="hidden font-mono text-[12.5px] text-ink-2 md:table-cell">
                      <span className="num">{contact.taxNumber ?? "—"}</span>
                    </Td>
                    <Td className="hidden lg:table-cell">
                      {contact.isCustomer &&
                        (contact.einvoiceReadiness.ready ? (
                          <Badge tone="success">{c.ready}</Badge>
                        ) : (
                          <Badge tone="warning">{c.notReady}</Badge>
                        ))}
                    </Td>
                    <Td align="right">
                      <Amount value={contact.balances.receivable} currency={currency} blankZero />
                    </Td>
                    <Td align="right">
                      <Amount value={contact.balances.payable} currency={currency} blankZero />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/contacts" params={{ role, q: search || undefined }} />
          </>
        )}
      </Card>
    </div>
  );
}
