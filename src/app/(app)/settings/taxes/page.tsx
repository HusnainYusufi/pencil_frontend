import type { Metadata } from "next";
import { Badge, Card, cn, PageHeader } from "@/components/ui/primitives";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { isoDate, localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import { requestNow } from "@/lib/time";
import type { Account, TaxCode, TaxCodeKind, TaxTreatment } from "@/lib/types";
import { setTaxCodeActive } from "./actions";
import { ChangeRateDialog, NewTaxCodeDialog } from "./tax-dialogs";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.taxes.title };
}

const KINDS: TaxCodeKind[] = ["SALES", "PURCHASE", "WITHHOLDING"];
const TREATMENT_TONE: Record<TaxTreatment, "success" | "info" | "neutral" | "warning" | "accent"> = {
  STANDARD: "success",
  ZERO_RATED: "info",
  EXEMPT: "neutral",
  OUT_OF_SCOPE: "neutral",
  REVERSE_CHARGE: "warning",
  IMPORT: "warning",
  WITHHOLDING: "accent",
};

export default async function TaxCodesPage() {
  const ws = await requireAccess({ feature: Feat.TAX_CODES, permission: Perm.TAXES_READ });
  const { dict, locale } = await getI18n();
  const tx = dict.taxes;
  const canManage = ws.can(Perm.TAXES_MANAGE);
  const [codes, accounts] = await Promise.all([
    userApi<TaxCode[]>("/tax-codes", { query: { includeInactive: true } }),
    canManage ? userApi<Account[]>("/accounts", { query: { postableOnly: true } }) : Promise.resolve([]),
  ]);
  const today = isoDate(requestNow());
  const treatments = tx.treatments as Record<string, string>;
  const kindLabel: Record<TaxCodeKind, string> = { SALES: tx.sales, PURCHASE: tx.purchases, WITHHOLDING: tx.withholding };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={dict.nav.settings}
        title={tx.title}
        description={tx.subtitle}
        actions={
          canManage && (
            <NewTaxCodeDialog
              today={today}
              accounts={accounts.filter((a) => a.isActive).map((a) => ({ id: a.id, type: a.type, label: `${a.code} · ${localName(a, locale)}` }))}
            />
          )
        }
      />

      {KINDS.map((kind) => (
        <Card key={kind} title={kindLabel[kind]} flush>
          <ul className="divide-y divide-line">
            {codes
              .filter((c) => c.kind === kind)
              .map((code) => (
                <li key={code.id} className={cn("grid gap-3 px-5 py-4 md:grid-cols-[7rem_1fr_6rem_auto]", !code.isActive && "opacity-55")}>
                  <div>
                    <span className="num font-mono text-[13px] font-medium">{code.code}</span>
                    <div className="mt-1">
                      <Badge tone={code.isSystem ? "neutral" : "accent"} dot={false}>
                        {code.isSystem ? tx.system : tx.custom}
                      </Badge>
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium">{localName(code, locale)}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-muted">
                      <Badge tone={TREATMENT_TONE[code.treatment]}>{treatments[code.treatment]}</Badge>
                      {!code.recoverable && <span className="text-warning">{tx.notRecoverable}</span>}
                      {code.einvoiceCategory && (
                        <span>
                          {tx.category}: <span className="num font-mono text-ink-2">{code.einvoiceCategory}</span>
                        </span>
                      )}
                      {code.reasonCode && <span className="num font-mono">{code.reasonCode}</span>}
                      {code.returnBox && (
                        <span>
                          {tx.returnBox}: <span className="num font-mono text-ink-2">{code.returnBox}</span>
                        </span>
                      )}
                      {code.taxAccount && (
                        <span>
                          {tx.account}: <span className="num font-mono text-ink-2">{code.taxAccount.code}</span>
                        </span>
                      )}
                      {!code.isActive && <span>{tx.inactive}</span>}
                    </div>
                    {code.rates.length > 1 && (
                      <details className="mt-2 text-[12px]">
                        <summary className="cursor-pointer text-ink-2 hover:text-ink">{tx.history}</summary>
                        <table className="mt-2 text-start">
                          <tbody>
                            {code.rates.map((rate) => (
                              <tr key={rate.effectiveFrom}>
                                <td className="pe-4 font-mono">
                                  <span className="num">{rate.ratePercent}%</span>
                                </td>
                                <td className="pe-2 text-muted">{tx.from}</td>
                                <td className="pe-4">
                                  <span className="num">{rate.effectiveFrom}</span>
                                </td>
                                <td className="pe-2 text-muted">{rate.effectiveTo ? tx.to : ""}</td>
                                <td>{rate.effectiveTo ? <span className="num">{rate.effectiveTo}</span> : <Badge tone="success">{tx.current}</Badge>}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </details>
                    )}
                  </div>
                  <div className="text-end">
                    <span className="num text-[20px] font-semibold">{code.currentRate !== null ? `${code.currentRate}%` : "—"}</span>
                  </div>
                  {canManage && (
                    <div className="flex items-start justify-end gap-1">
                      {!code.isSystem && <ChangeRateDialog id={code.id} code={code.code} today={today} />}
                      <form action={setTaxCodeActive}>
                        <input type="hidden" name="id" value={code.id} />
                        <input type="hidden" name="active" value={String(!code.isActive)} />
                        <button type="submit" className="h-8 rounded-md px-3 text-[13px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                          {code.isActive ? tx.deactivate : tx.activate}
                        </button>
                      </form>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}
