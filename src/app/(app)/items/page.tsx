import { Plus, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { Pagination } from "@/components/ui/pagination";
import { Button, ButtonLink, Card, cn, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { Item, ItemType, Page } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.items.title };
}

const TYPES: ItemType[] = ["GOODS", "SERVICE"];

export default async function ItemsPage({ searchParams }: PageProps<"/items">) {
  const ws = await requireAccess({ feature: Feat.ITEMS, permission: Perm.ITEMS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const it = dict.items;
  const type = TYPES.find((v) => v === params.type);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const page = Math.max(1, Number.parseInt(typeof params.page === "string" ? params.page : "1", 10) || 1);
  const result = await userApi<Page<Item>>("/items", { query: { type, search: search || undefined, page, pageSize: 25 } });
  const units = it.units as Record<string, string>;
  const href = (value?: ItemType) => {
    const query = new URLSearchParams();
    if (value) query.set("type", value);
    if (search) query.set("q", search);
    const qs = query.toString();
    return qs ? `/items?${qs}` : "/items";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.salesPurchases}
        title={it.title}
        description={it.subtitle}
        actions={
          ws.can(Perm.ITEMS_MANAGE) && (
            <ButtonLink href="/items/new">
              <Plus className="size-4" aria-hidden />
              {it.newItem}
            </ButtonLink>
          )
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={it.type} className="flex gap-1">
          {[undefined, ...TYPES].map((value) => (
            <Link
              key={value ?? "all"}
              href={href(value)}
              aria-current={type === value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                type === value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {value === "GOODS" ? it.goods : value === "SERVICE" ? it.services : it.all}
            </Link>
          ))}
        </nav>
        <form className="flex items-center gap-2" role="search">
          {type && <input type="hidden" name="type" value={type} />}
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
            title={it.empty}
            action={
              ws.can(Perm.ITEMS_MANAGE) && (
                <ButtonLink href="/items/new" variant="secondary">
                  {it.newItem}
                </ButtonLink>
              )
            }
          >
            {it.emptyBody}
          </EmptyState>
        ) : (
          <>
            <Table>
              <thead>
                <tr>
                  <Th className="w-36">{it.code}</Th>
                  <Th>{it.name}</Th>
                  <Th className="hidden md:table-cell">{it.unit}</Th>
                  <Th className="hidden lg:table-cell">{it.salesTax}</Th>
                  <Th align="right">{it.salePrice}</Th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((item) => (
                  <tr key={item.id} className={cn("relative hover:bg-surface-2/50", !item.isActive && "opacity-60")}>
                    <Td className="font-mono text-[12.5px] text-ink-2">
                      <span className="num">{item.code}</span>
                    </Td>
                    <Td>
                      <Link href={`/items/${item.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {localName(item, locale)}
                      </Link>
                      <div className="mt-0.5 text-[11.5px] text-muted">
                        {item.type === "GOODS" ? it.goods : it.services}
                        {!item.isActive && ` · ${it.inactive}`}
                      </div>
                    </Td>
                    <Td className="hidden text-ink-2 md:table-cell">{units[item.unitCode] ?? item.unitCode}</Td>
                    <Td className="hidden font-mono text-[12.5px] text-ink-2 lg:table-cell">{item.salesTaxCode?.code ?? "—"}</Td>
                    <Td align="right">{item.salePrice ? <Amount value={item.salePrice} currency={ws.company.baseCurrency} /> : <span className="text-muted">—</span>}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination meta={result.meta} basePath="/items" params={{ type, q: search || undefined }} />
          </>
        )}
      </Card>
    </div>
  );
}
