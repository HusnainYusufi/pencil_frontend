import { FileCode2, FileMinus2, FilePlus2, HandCoins, Pencil, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Amount } from "@/components/amount";
import { EInvoiceBadge, InvoiceStatusBadge } from "@/components/sales/badges";
import { QrCode } from "@/components/sales/qr-code";
import { FormMessage } from "@/components/ui/interactive";
import { ButtonLink, Card, DataList, PageHeader, Table, Td, Th } from "@/components/ui/primitives";
import { formatDate, isZeroAmount } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { ApiError } from "@/lib/api";
import { requireAccess, userApi } from "@/lib/dal";
import { localName } from "@/lib/format";
import { Feat, Perm } from "@/lib/permissions";
import type { SalesInvoiceDetail } from "@/lib/types";
import { DeleteDraftButton, IssueDialog, RetryButton, VoidDialog } from "./document-actions";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.invoices.title };
}

export default async function InvoicePage({ params, searchParams }: PageProps<"/invoices/[id]">) {
  const ws = await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_READ });
  const [{ id }, query, { dict, t, locale }] = await Promise.all([params, searchParams, getI18n()]);
  if (!isUuid(id)) notFound();

  let doc: SalesInvoiceDetail;
  try {
    doc = await userApi<SalesInvoiceDetail>(`/sales-invoices/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
  const iv = dict.invoices;
  const c = doc.currency;
  const draft = doc.status === "DRAFT";
  const issued = doc.status === "ISSUED";
  const canManage = ws.can(Perm.INVOICES_MANAGE);
  const canIssue = ws.can(Perm.INVOICES_ISSUE);
  const einvoice = doc.einvoice;
  const voidable = issued && (!einvoice || einvoice.status === "REJECTED") && !doc.adjustments.some((a) => a.status === "ISSUED") && isZeroAmount(doc.amountPaid) && (doc.type === "CREDIT_NOTE" || isZeroAmount(doc.amountCredited));
  const adjustable = issued && doc.type === "INVOICE" && einvoice?.status !== "REJECTED";
  const payable = issued && doc.type !== "CREDIT_NOTE" && !isZeroAmount(doc.balanceDue) && doc.contact && ws.has(Feat.SALES_INVOICES) && ws.can(Perm.PAYMENTS_MANAGE);
  const messages: Record<string, string> = {
    saved: iv.draftSaved,
    issued: t(iv.issued, { number: doc.number ?? "" }),
    voided: iv.voided,
    retried: iv.retried,
  };
  const done = typeof query.done === "string" ? messages[query.done] : undefined;
  const messagesFromZatca = [...(einvoice?.errors ?? []), ...(einvoice?.warnings ?? [])];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={
          <Link href="/invoices" className="hover:text-ink">
            {iv.types[doc.type]} · {iv.kinds[doc.kind]}
          </Link>
        }
        title={<span className="num">{doc.number ?? iv.statuses.DRAFT}</span>}
        description={doc.contact ? localName(doc.contact, locale) : iv.walkIn}
        actions={
          <>
            {draft && canManage && <DeleteDraftButton id={doc.id} />}
            {draft && canManage && (
              <ButtonLink href={`/invoices/${doc.id}/edit`} variant="secondary">
                <Pencil className="size-4" aria-hidden />
                {dict.common.edit}
              </ButtonLink>
            )}
            {draft && canIssue && <IssueDialog id={doc.id} />}
            {issued && einvoice?.status === "PENDING" && canIssue && <RetryButton id={doc.id} />}
            {voidable && canIssue && <VoidDialog id={doc.id} />}
            {adjustable && canManage && (
              <>
                <ButtonLink href={`/invoices/new?type=CREDIT_NOTE&original=${doc.id}`} variant="secondary">
                  <FileMinus2 className="size-4" aria-hidden />
                  {iv.creditNote}
                </ButtonLink>
                <ButtonLink href={`/invoices/new?type=DEBIT_NOTE&original=${doc.id}`} variant="secondary">
                  <FilePlus2 className="size-4" aria-hidden />
                  {iv.debitNote}
                </ButtonLink>
              </>
            )}
            {payable && (
              <ButtonLink href={`/payments/new?contact=${doc.contact!.id}&invoice=${doc.id}`}>
                <HandCoins className="size-4" aria-hidden />
                {iv.recordPayment}
              </ButtonLink>
            )}
            {!draft && (
              <ButtonLink href={`/print/invoices/${doc.id}`} variant="secondary" target="_blank">
                <Printer className="size-4" aria-hidden />
                {iv.print}
              </ButtonLink>
            )}
          </>
        }
      />

      {done && <FormMessage tone="success">{done}</FormMessage>}
      {doc.status === "VOID" && doc.voidedAt && (
        <FormMessage tone="danger">{t(iv.voidedOn, { date: formatDate(doc.voidedAt, locale), reason: doc.voidReason ?? "" })}</FormMessage>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="min-w-0 space-y-6">
          <Card flush>
            <Table>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>{iv.description}</Th>
                  <Th align="right">{iv.quantity}</Th>
                  <Th align="right">{iv.unitPrice}</Th>
                  <Th align="right">{iv.discount}</Th>
                  <Th>{iv.taxRate}</Th>
                  <Th align="right">{iv.tax}</Th>
                  <Th align="right">{iv.lineTotal}</Th>
                </tr>
              </thead>
              <tbody>
                {doc.lines.map((line) => (
                  <tr key={line.id}>
                    <Td className="font-mono text-[12px] text-muted">{line.lineNo}</Td>
                    <Td>
                      <span dir="auto">{line.description}</span>
                      <span className="mt-0.5 block text-[12px] text-muted">
                        <span className="num">{line.account.code}</span> · {localName(line.account, locale)}
                      </span>
                    </Td>
                    <Td align="right">
                      <span className="num">{line.quantity}</span>
                    </Td>
                    <Td align="right">
                      <span className="num">{line.unitPrice}</span>
                    </Td>
                    <Td align="right">
                      <Amount value={line.discount} currency={c} blankZero />
                    </Td>
                    <Td className="text-ink-2">
                      {localName(line.taxRate, locale)}
                      {line.exemptionCode && <span className="num block font-mono text-[11px] text-muted">{line.exemptionCode}</span>}
                    </Td>
                    <Td align="right">
                      <Amount value={line.taxAmount} currency={c} />
                    </Td>
                    <Td align="right">
                      <Amount value={line.totalAmount} currency={c} />
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <dl className="ms-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-8 gap-y-1.5 p-5 text-[13.5px]">
              {!isZeroAmount(doc.discountTotal) && (
                <>
                  <dt className="text-muted">{iv.subtotal}</dt>
                  <dd className="text-end"><Amount value={doc.subtotal} currency={c} /></dd>
                  <dt className="text-muted">{iv.discountTotal}</dt>
                  <dd className="text-end"><Amount value={doc.discountTotal} currency={c} /></dd>
                </>
              )}
              <dt className="text-muted">{iv.taxable}</dt>
              <dd className="text-end"><Amount value={doc.taxableAmount} currency={c} /></dd>
              <dt className="text-muted">{iv.tax}</dt>
              <dd className="text-end"><Amount value={doc.taxTotal} currency={c} /></dd>
              <dt className="border-t border-line pt-1.5 font-semibold">{iv.total}</dt>
              <dd className="border-t border-line pt-1.5 text-end font-semibold"><Amount value={doc.total} currency={c} showCurrency /></dd>
              {issued && (
                <>
                  {!isZeroAmount(doc.amountPaid) && (
                    <>
                      <dt className="text-muted">{iv.paid}</dt>
                      <dd className="text-end"><Amount value={doc.amountPaid} currency={c} /></dd>
                    </>
                  )}
                  {!isZeroAmount(doc.amountCredited) && (
                    <>
                      <dt className="text-muted">{iv.credited}</dt>
                      <dd className="text-end"><Amount value={doc.amountCredited} currency={c} /></dd>
                    </>
                  )}
                  <dt className="font-semibold">{iv.balanceDue}</dt>
                  <dd className="text-end font-semibold"><Amount value={doc.balanceDue} currency={c} showCurrency /></dd>
                </>
              )}
            </dl>
          </Card>

          {(doc.adjustments.length > 0 || doc.payments.length > 0) && (
            <Card title={`${iv.adjustments} · ${iv.paymentsReceived}`} flush>
              <Table>
                <tbody>
                  {doc.adjustments.map((a) => (
                    <tr key={a.id}>
                      <Td>
                        <Link href={`/invoices/${a.id}`} className="font-mono text-[12.5px] hover:underline">
                          <span className="num">{a.number}</span>
                        </Link>
                        <span className="ms-2 text-[12px] text-muted">{iv.types[a.type]}</span>
                      </Td>
                      <Td className="text-ink-2">{formatDate(a.issueDate, locale)}</Td>
                      <Td><InvoiceStatusBadge status={a.status} /></Td>
                      <Td align="right"><Amount value={a.total} currency={c} /></Td>
                    </tr>
                  ))}
                  {doc.payments.map((p) => (
                    <tr key={p.id}>
                      <Td>
                        <Link href={`/payments/${p.id}`} className="font-mono text-[12.5px] hover:underline">
                          <span className="num">{p.number}</span>
                        </Link>
                      </Td>
                      <Td className="text-ink-2">{formatDate(p.date, locale)}</Td>
                      <Td />
                      <Td align="right"><Amount value={p.amount} currency={c} /></Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <DataList
              items={[
                { label: dict.common.status, value: <InvoiceStatusBadge status={doc.status} /> },
                { label: iv.issueDate, value: formatDate(doc.issueDate, locale) },
                { label: iv.supplyDate, value: doc.supplyDate ? formatDate(doc.supplyDate, locale) : null },
                ...(doc.type === "INVOICE" ? [{ label: iv.dueDate, value: doc.dueDate ? formatDate(doc.dueDate, locale) : null }] : []),
                { label: iv.paymentMeansLabel, value: iv.paymentMeans[doc.paymentMeans] },
                ...(doc.originalInvoice
                  ? [{
                      label: iv.originalInvoice,
                      value: (
                        <Link href={`/invoices/${doc.originalInvoice.id}`} className="font-mono text-[13px] underline underline-offset-4">
                          <span className="num">{doc.originalInvoice.number}</span>
                        </Link>
                      ),
                    }]
                  : []),
                ...(doc.reason ? [{ label: iv.reason, value: doc.reason }] : []),
                { label: iv.reference, value: doc.reference },
                ...(doc.journalEntry && ws.can(Perm.JOURNALS_READ)
                  ? [{
                      label: iv.journal,
                      value: (
                        <Link href={`/journals/${doc.journalEntry.id}`} className="font-mono text-[13px] underline underline-offset-4">
                          <span className="num">{doc.journalEntry.number}</span>
                        </Link>
                      ),
                    }]
                  : []),
              ]}
            />
          </Card>

          {!draft && (
            <Card title={iv.einvoice}>
              <div className="space-y-4">
                {doc.qrCode && <QrCode value={doc.qrCode} label={iv.einvoice} className="mx-auto size-44 rounded-md bg-white p-2" />}
                {einvoice ? (
                  <>
                    <DataList
                      items={[
                        { label: iv.einvoiceStatus, value: <EInvoiceBadge status={einvoice.status} /> },
                        { label: iv.icv, value: <span className="num">{einvoice.icv}</span> },
                        { label: iv.attempts, value: <span className="num">{einvoice.attempts}</span> },
                        ...(einvoice.status === "PENDING" && einvoice.nextAttemptAt
                          ? [{ label: iv.nextAttempt, value: formatDate(einvoice.nextAttemptAt, locale, { dateStyle: "medium", timeStyle: "short" }) }]
                          : []),
                        { label: iv.hash, value: <span className="num break-all font-mono text-[11px]">{einvoice.invoiceHash}</span> },
                      ]}
                    />
                    {messagesFromZatca.length > 0 && (
                      <div>
                        <p className="mb-1 text-[12.5px] font-medium">{iv.authorityMessages}</p>
                        <ul className="space-y-1 text-[12px] text-ink-2" dir="ltr">
                          {messagesFromZatca.map((m, i) => (
                            <li key={i}>
                              <span className="font-mono">{m.code}</span> {m.message}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <ButtonLink href={`/invoices/${doc.id}/xml`} variant="secondary" size="sm" prefetch={false}>
                      <FileCode2 className="size-4" aria-hidden />
                      {iv.downloadXml}
                    </ButtonLink>
                  </>
                ) : (
                  <p className="text-[12.5px] text-muted">{doc.qrCode ? iv.phaseOne : iv.notOnboarded}</p>
                )}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
