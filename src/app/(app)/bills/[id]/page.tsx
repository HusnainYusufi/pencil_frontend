import { FileMinus2, HandCoins } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { FormMessage } from "@/components/ui/interactive";
import { Badge, ButtonLink, Card, DataList, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate, isZeroAmount } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { PurchaseDetail } from "@/lib/types";
import { DeleteBillButton, PostBillButton, VoidBillDialog } from "./bill-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.billsTitle };
}

export default async function BillPage({ params, searchParams }: PageProps<"/bills/[id]">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_READ });
  const [{ id }, query, { dict, t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();
  let doc: PurchaseDetail;
  try {
    doc = await userApi<PurchaseDetail>(`/purchase-bills/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const p = dict.purchases;
  const iv = dict.invoices;
  const c = doc.currency;
  const canManage = ws.can(Perm.BILLS_MANAGE);
  const draft = doc.status === "DRAFT";
  const posted = doc.status === "POSTED";
  const done =
    query.done === "posted" ? t(p.posted, { number: doc.number ?? "" }) : query.done === "saved" ? p.saved : query.done === "voided" ? p.voided : undefined;
  const voidable = posted && !doc.adjustments.some((a) => a.status === "POSTED") && (doc.type !== "BILL" || isZeroAmount(doc.amountPaid));
  const payable = posted && doc.type === "BILL" && !isZeroAmount(doc.balanceDue) && doc.contact;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href={doc.type === "EXPENSE" ? "/expenses" : "/bills"} className="hover:text-ink">
            {p.types[doc.type]}
          </Link>
        }
        title={<span className="num">{doc.number ?? p.statuses.DRAFT}</span>}
        description={doc.contact ? localName(doc.contact, locale) : undefined}
        actions={
          canManage && (
            <>
              {draft && <DeleteBillButton id={doc.id} />}
              {draft && <PostBillButton id={doc.id} />}
              {voidable && <VoidBillDialog id={doc.id} />}
              {posted && doc.type === "BILL" && (
                <ButtonLink href={`/bills/new?type=CREDIT_NOTE&original=${doc.id}`} variant="secondary">
                  <FileMinus2 className="size-4" aria-hidden />
                  {p.newCredit}
                </ButtonLink>
              )}
              {payable && (
                <ButtonLink href={`/supplier-payments/new?contact=${doc.contact!.id}&bill=${doc.id}`}>
                  <HandCoins className="size-4" aria-hidden />
                  {p.pay}
                </ButtonLink>
              )}
            </>
          )
        }
      />
      {done && <FormMessage tone="success">{done}</FormMessage>}
      {doc.status === "VOID" && doc.voidedAt && <FormMessage tone="danger">{t(iv.voidedOn, { date: formatDate(doc.voidedAt, locale), reason: doc.voidReason ?? "" })}</FormMessage>}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card flush className="min-w-0">
          <Table>
            <thead>
              <tr>
                <Th className="w-10">#</Th>
                <Th>{iv.description}</Th>
                <Th align="right">{iv.quantity}</Th>
                <Th align="right">{iv.unitPrice}</Th>
                <Th>{iv.taxRate}</Th>
                <Th align="right">{iv.tax}</Th>
                <Th align="right">{iv.lineTotal}</Th>
              </tr>
            </thead>
            <tbody>
              {doc.lines.map((l) => (
                <tr key={l.id}>
                  <Td className="font-mono text-[12px] text-muted">{l.lineNo}</Td>
                  <Td>
                    <span dir="auto">{l.description}</span>
                    <span className="mt-0.5 block text-[12px] text-muted">
                      <span className="num">{l.account.code}</span> · {localName(l.account, locale)}
                    </span>
                  </Td>
                  <Td align="right">
                    <span className="num">{l.quantity}</span>
                  </Td>
                  <Td align="right">
                    <span className="num">{l.unitPrice}</span>
                  </Td>
                  <Td className="text-ink-2">{localName(l.taxRate, locale)}</Td>
                  <Td align="right">
                    <Amount value={l.taxAmount} currency={c} />
                  </Td>
                  <Td align="right">
                    <Amount value={l.totalAmount} currency={c} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <dl className="ms-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-8 gap-y-1.5 p-5 text-[13.5px]">
            <dt className="text-muted">{iv.taxable}</dt>
            <dd className="text-end"><Amount value={doc.taxableAmount} currency={c} /></dd>
            <dt className="text-muted">{iv.tax}</dt>
            <dd className="text-end"><Amount value={doc.taxTotal} currency={c} /></dd>
            <dt className="border-t border-line pt-1.5 font-semibold">{iv.total}</dt>
            <dd className="border-t border-line pt-1.5 text-end font-semibold"><Amount value={doc.total} currency={c} showCurrency /></dd>
            {posted && doc.type === "BILL" && (
              <>
                <dt className="font-semibold">{iv.balanceDue}</dt>
                <dd className="text-end font-semibold"><Amount value={doc.balanceDue} currency={c} showCurrency /></dd>
              </>
            )}
          </dl>
        </Card>
        <Card>
          <DataList
            items={[
              { label: dict.common.status, value: <Badge tone={posted ? "success" : draft ? "warning" : "neutral"}>{p.statuses[doc.status]}</Badge> },
              { label: p.billDate, value: formatDate(doc.billDate, locale) },
              ...(doc.dueDate ? [{ label: p.dueDate, value: formatDate(doc.dueDate, locale) }] : []),
              { label: p.supplierReference, value: doc.supplierReference, mono: true },
              ...(doc.supplier?.vatNumber ? [{ label: iv.vat, value: doc.supplier.vatNumber, mono: true }] : []),
              ...(doc.paidFrom ? [{ label: p.paidFrom, value: `${doc.paidFrom.code} · ${localName(doc.paidFrom, locale)}` }] : []),
              ...(doc.originalBill
                ? [{ label: p.originalBill, value: <Link href={`/bills/${doc.originalBill.id}`} className="num font-mono underline underline-offset-4">{doc.originalBill.number}</Link> }]
                : []),
              ...(doc.reason ? [{ label: p.reason, value: doc.reason }] : []),
              ...(doc.journalEntry && ws.can(Perm.JOURNALS_READ)
                ? [{ label: iv.journal, value: <Link href={`/journals/${doc.journalEntry.id}`} className="num font-mono underline underline-offset-4">{doc.journalEntry.number}</Link> }]
                : []),
              ...doc.payments.map((pay) => ({
                label: `${p.payments} · ${pay.number}`,
                value: (
                  <Link href={`/supplier-payments/${pay.id}`} className="underline underline-offset-4">
                    <Amount value={pay.amount} currency={c} />
                  </Link>
                ),
              })),
              ...doc.adjustments.map((a) => ({
                label: `${p.credits} · ${a.number ?? ""}`,
                value: (
                  <Link href={`/bills/${a.id}`} className="underline underline-offset-4">
                    <Amount value={a.total} currency={c} />
                  </Link>
                ),
              })),
            ]}
          />
        </Card>
      </div>
    </div>
  );
}
