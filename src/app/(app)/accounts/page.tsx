import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Amount } from "@/components/amount";
import { FormMessage } from "@/components/ui/interactive";
import { Badge, Button, Card, cn, EmptyState, Input, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { indentClass, isoDate, localName } from "@/lib/format";
import { net, negate } from "@/lib/money";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import { ACCOUNT_TYPES, type Account, type AccountType, type FiscalYear, type TrialBalance } from "@/lib/types";
import { setAccountActive } from "./actions";
import { NewAccountDialog } from "./new-account-dialog";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.accounts.title };
}

/** Liabilities, equity and revenue normally carry credit balances: show them positive. */
const CREDIT_NORMAL = new Set<AccountType>(["LIABILITY", "EQUITY", "REVENUE"]);

/** Depth-first order with depth, from the flat list (children sorted by code). */
function toTree(accounts: Account[]): Array<Account & { depth: number }> {
  const children = new Map<string | null, Account[]>();
  const ids = new Set(accounts.map((a) => a.id));
  for (const account of accounts) {
    const parent = account.parentId && ids.has(account.parentId) ? account.parentId : null;
    children.set(parent, [...(children.get(parent) ?? []), account]);
  }
  const out: Array<Account & { depth: number }> = [];
  const walk = (parent: string | null, depth: number) => {
    for (const account of (children.get(parent) ?? []).sort((a, b) => a.code.localeCompare(b.code, "en", { numeric: true }))) {
      out.push({ ...account, depth });
      walk(account.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

export default async function AccountsPage({ searchParams }: PageProps<"/accounts">) {
  const ws = await requireAccess({ feature: Feat.CHART_OF_ACCOUNTS, permission: Perm.ACCOUNTS_READ });
  const [{ dict, locale }, params] = await Promise.all([getI18n(), searchParams]);
  const type = ACCOUNT_TYPES.find((value) => value === params.type);
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const showInactive = params.inactive === "1";
  const canManage = ws.can(Perm.ACCOUNTS_MANAGE);
  const canStatement = ws.has(Feat.LEDGER_REPORTS) && ws.can(Perm.REPORTS_READ);
  const currency = ws.company.baseCurrency;
  const today = isoDate(requestNow());

  const [accounts, balances] = await Promise.all([
    userApi<Account[]>("/accounts", { query: { includeInactive: showInactive } }),
    canStatement
      ? userApi<FiscalYear[]>("/fiscal-years").then((years) => {
          const year = years.find((y) => y.startDate <= today && today <= y.endDate);
          return userApi<TrialBalance>("/reports/trial-balance", { query: { from: year?.startDate, to: today, includeZero: false } });
        })
      : null,
  ]);

  const closing = new Map((balances?.rows ?? []).map((row) => [row.accountId, net(row.closing, currency)]));
  const needle = search.toLowerCase();
  const rows = toTree(accounts).filter(
    (a) =>
      (!type || a.type === type) &&
      (!needle || a.code.toLowerCase().startsWith(needle) || a.name.toLowerCase().includes(needle) || (a.nameAr ?? "").includes(search)),
  );
  const parents = toTree(accounts.filter((a) => a.isGroup && a.isActive)).map((a) => ({
    id: a.id,
    label: `${" ".repeat(a.depth)}${a.code} · ${localName(a, locale)}`,
  }));
  const subtypes = dict.accounts.subtypes as Record<string, string>;
  const errorMessages = dict.errors as Record<string, string>;
  const actionError = typeof params.error === "string" ? (errorMessages[params.error] ?? dict.errors.generic) : undefined;

  const filterHref = (next: Record<string, string | undefined>) => {
    const query = new URLSearchParams();
    const merged = { type, q: search || undefined, inactive: showInactive ? "1" : undefined, ...next };
    for (const [key, value] of Object.entries(merged)) if (value) query.set(key, value);
    const qs = query.toString();
    return qs ? `/accounts?${qs}` : "/accounts";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.accounting}
        title={dict.accounts.title}
        description={dict.accounts.subtitle}
        actions={canManage && <NewAccountDialog parents={parents} />}
      />

      {actionError && (
        <FormMessage tone="danger">
          {actionError}
          {typeof params.balance === "string" && <span className="num ms-1">({params.balance} {currency})</span>}
        </FormMessage>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label={dict.accounts.type} className="flex flex-wrap gap-1">
          {[undefined, ...ACCOUNT_TYPES].map((value) => (
            <Link
              key={value ?? "all"}
              href={filterHref({ type: value })}
              aria-current={type === value ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-[13px] transition-colors duration-150",
                type === value ? "bg-ink text-bg" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
              )}
            >
              {value ? dict.accounts.types[value] : dict.accounts.allTypes}
            </Link>
          ))}
        </nav>
        <form className="flex items-center gap-2" role="search">
          {type && <input type="hidden" name="type" value={type} />}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <Input name="q" defaultValue={search} placeholder={dict.accounts.searchPlaceholder} aria-label={dict.common.search} className="w-60 ps-9" />
          </div>
          <label className="flex items-center gap-2 whitespace-nowrap text-[13px] text-ink-2">
            <input type="checkbox" name="inactive" value="1" defaultChecked={showInactive} className="size-4 accent-ink" />
            {dict.accounts.showInactive}
          </label>
          <Button type="submit" variant="secondary">
            {dict.common.apply}
          </Button>
        </form>
      </div>

      <Card flush>
        {rows.length === 0 ? (
          <EmptyState title={dict.common.none} />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th className="w-28">{dict.accounts.code}</Th>
                <Th>{dict.accounts.name}</Th>
                <Th className="hidden md:table-cell">{dict.accounts.category}</Th>
                {canStatement && <Th align="right">{dict.accounts.balance}</Th>}
                <Th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {rows.map((account) => {
                const balance = closing.get(account.id) ?? "0";
                const shown = CREDIT_NORMAL.has(account.type) ? negate(balance) : balance;
                return (
                  <tr key={account.id} className={cn("group hover:bg-surface-2/50", !account.isActive && "opacity-60")}>
                    <Td className="font-mono text-[12.5px] text-ink-2">
                      <span className="num">{account.code}</span>
                    </Td>
                    <Td className={cn("!ps-0", account.isGroup && "font-medium")}>
                      <div className={cn("flex items-center gap-2", indentClass(account.depth))}>
                        {canStatement && !account.isGroup ? (
                          <Link href={`/accounts/${account.id}`} className="hover:underline">
                            {localName(account, locale)}
                          </Link>
                        ) : (
                          <span>{localName(account, locale)}</span>
                        )}
                        {account.isGroup && (
                          <Badge tone="neutral" dot={false}>
                            {dict.accounts.group}
                          </Badge>
                        )}
                        {account.systemKey && (
                          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted">{dict.accounts.system}</span>
                        )}
                        {!account.isActive && <Badge tone="neutral">{dict.accounts.inactive}</Badge>}
                        {!account.allowManualPosting && (
                          <span title={dict.accounts.controlHint} className="rounded bg-info-bg px-1.5 text-[11px] text-info">
                            {dict.accounts.control}
                          </span>
                        )}
                      </div>
                    </Td>
                    <Td className="hidden text-[13px] text-ink-2 md:table-cell">{subtypes[account.subtype]}</Td>
                    {canStatement && (
                      <Td align="right" className={cn(account.isGroup && "font-medium")}>
                        <Amount value={shown} currency={currency} />
                      </Td>
                    )}
                    <Td className="whitespace-nowrap text-end">
                      {canManage && !account.systemKey && (
                        <form action={setAccountActive} className="inline opacity-0 transition-opacity duration-150 group-hover:opacity-100 focus-within:opacity-100">
                          <input type="hidden" name="id" value={account.id} />
                          <input type="hidden" name="active" value={String(!account.isActive)} />
                          <button type="submit" className="text-[12.5px] text-ink-2 hover:text-ink hover:underline">
                            {account.isActive ? dict.accounts.deactivate : dict.accounts.activate}
                          </button>
                        </form>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  );
}
