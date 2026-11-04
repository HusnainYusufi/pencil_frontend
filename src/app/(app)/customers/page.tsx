import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Pagination } from "@/components/ui/pagination";
import { Badge, Button, ButtonLink, Card, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact, Page } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.customers.title };
}

export default async function CustomersPage({ searchParams }: PageProps<"/customers">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.CONTACTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const includeInactive = params.inactive === "1";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<Contact>>("/contacts", {
    query: { search: search || undefined, includeInactive: includeInactive || undefined, customers: true, page, pageSize: 25 },
  });
  const canManage = ws.can(Perm.CONTACTS_MANAGE);
  const c = dict.customers;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.sales}
        title={c.title}
        description={c.subtitle}
        actions={
          canManage && (
            <ButtonLink href="/customers/new">
              <Plus className="size-4" aria-hidden />
              {c.newCustomer}
            </ButtonLink>
          )
        }
      />

      <form className="flex flex-wrap items-center gap-2" role="search">
        <div className="relative">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input name="q" defaultValue={search} aria-label={dict.common.search} placeholder={c.searchPlaceholder} className="w-72 ps-9" />
        </div>
        <label className="flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="inactive" value="1" defaultChecked={includeInactive} className="size-4 accent-ink" />
          {dict.accounts.showInactive}
        </label>
        <Button type="submit" variant="secondary">
          {dict.common.apply}
        </Button>
      </form>

      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState
            title={c.noCustomers}
            action={
              canManage && (
                <ButtonLink href="/customers/new" variant="secondary">
                  {c.newCustomer}
                </ButtonLink>
              )
            }
          >
            {c.noCustomersBody}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{c.name}</Th>
                  <Th className="hidden md:table-cell">{c.type}</Th>
                  <Th className="hidden md:table-cell">{c.taxNumber}</Th>
                  <Th className="hidden lg:table-cell">{c.city}</Th>
                  <Th className="hidden lg:table-cell">{c.phone}</Th>
                  <Th>{dict.common.status}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((contact) => (
                  <tr key={contact.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/customers/${contact.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {localName(contact, locale)}
                      </Link>
                      {contact.code && <span className="num ms-2 font-mono text-[12px] text-muted">{contact.code}</span>}
                    </Td>
                    <Td className="hidden text-ink-2 md:table-cell">{contact.type === "BUSINESS" ? c.business : c.individual}</Td>
                    <Td className="hidden md:table-cell">
                      <span className="num font-mono text-[12.5px]">{contact.taxNumber ?? "—"}</span>
                    </Td>
                    <Td className="hidden text-ink-2 lg:table-cell">{contact.address.city ?? "—"}</Td>
                    <Td className="hidden lg:table-cell">
                      <span className="num">{contact.phone ?? "—"}</span>
                    </Td>
                    <Td>{contact.isActive ? <Badge tone="success">{c.active}</Badge> : <Badge>{c.inactive}</Badge>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/customers" params={{ q: search || undefined, inactive: includeInactive ? "1" : undefined }} />
          </>
        )}
      </Card>
    </div>
  );
}
