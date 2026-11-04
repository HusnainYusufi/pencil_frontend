import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FormMessage } from "@/components/ui/interactive";
import { Pagination } from "@/components/ui/pagination";
import { ButtonLink, Card, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Contact, Page } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.suppliersTitle };
}

export default async function SuppliersPage({ searchParams }: PageProps<"/suppliers">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.CONTACTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<Contact>>("/contacts", { query: { suppliers: true, page, pageSize: 25 } });
  const p = dict.purchases;
  const c = dict.customers;
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.purchases}
        title={p.suppliersTitle}
        description={p.suppliersSubtitle}
        actions={
          ws.can(Perm.CONTACTS_MANAGE) && (
            <ButtonLink href="/suppliers/new">
              <Plus className="size-4" aria-hidden />
              {p.newSupplier}
            </ButtonLink>
          )
        }
      />
      {params.done === "saved" && <FormMessage tone="success">{c.saved}</FormMessage>}
      <Card flush>
        {result.items.length === 0 ? (
          <EmptyState title={p.noSuppliers} />
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>{c.name}</Th>
                  <Th>{c.taxNumber}</Th>
                  <Th className="hidden md:table-cell">{c.phone}</Th>
                  <Th className="hidden md:table-cell">{c.city}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((s) => (
                  <tr key={s.id} className="relative hover:bg-surface-2/50">
                    <Td>
                      <Link href={`/customers/${s.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {localName(s, locale)}
                      </Link>
                    </Td>
                    <Td>
                      <span className="num font-mono text-[12.5px]">{s.taxNumber ?? "—"}</span>
                    </Td>
                    <Td className="hidden md:table-cell">
                      <span className="num">{s.phone ?? "—"}</span>
                    </Td>
                    <Td className="hidden text-ink-2 md:table-cell">{s.address.city ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/suppliers" params={{}} />
          </>
        )}
      </Card>
    </div>
  );
}
