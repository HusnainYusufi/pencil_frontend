import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { QrCode } from "@/components/sales/qr-code";
import { formatAmount, formatDate, isZeroAmount } from "@/i18n/format";
import { dictionaryFor } from "@/i18n/server";
import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { PartySnapshot, SalesInvoiceDetail } from "@/lib/types";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "Invoice" };

const en = dictionaryFor("en").invoices;
const ar = dictionaryFor("ar").invoices;

/** "English / العربية" label pairs: KSA invoices are customarily bilingual. */
const both = (key: keyof typeof en & keyof typeof ar) => `${en[key] as string} / ${ar[key] as string}`;

function Party({ title, party }: { title: string; party: PartySnapshot | null }) {
  if (!party) return null;
  const a = party.address;
  const address = a ? [a.buildingNumber, a.street, a.district, a.city, a.postalCode, a.country].filter(Boolean).join(", ") : null;
  return (
    <div className="space-y-1">
      <p className="text-[11px] uppercase tracking-[0.12em] text-neutral-500">{title}</p>
      <p className="font-semibold">{party.name}</p>
      {party.nameAr && <p dir="rtl">{party.nameAr}</p>}
      {party.vatNumber && (
        <p className="text-[12px]">
          {both("vat")}: <span className="num font-mono">{party.vatNumber}</span>
        </p>
      )}
      {party.idScheme && party.idNumber && (
        <p className="text-[12px]">
          {party.idScheme}: <span className="num font-mono">{party.idNumber}</span>
        </p>
      )}
      {address && <p className="text-[12px] text-neutral-600">{address}</p>}
    </div>
  );
}

export default async function PrintInvoicePage({ params }: PageProps<"/print/invoices/[id]">) {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_READ });
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const doc = await userApi<SalesInvoiceDetail>(`/sales-invoices/${id}`);
  if (doc.status === "DRAFT") notFound();
  const c = doc.currency;
  const money = (v: string) => <span className="num font-mono">{formatAmount(v, c)}</span>;
  const title =
    doc.type === "INVOICE"
      ? doc.kind === "STANDARD"
        ? `${en.taxInvoice} / ${ar.taxInvoice}`
        : `${en.simplifiedTaxInvoice} / ${ar.simplifiedTaxInvoice}`
      : `${en.types[doc.type]} / ${ar.types[doc.type]}`;

  return (
    <div className="min-h-dvh bg-neutral-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] justify-end px-4 print:hidden">
        <PrintButton label={`${en.print} / ${ar.print}`} />
      </div>
      <article className="mx-auto max-w-[210mm] space-y-6 bg-white p-10 text-[13px] text-neutral-900 shadow print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-6">
          <div>
            <h1 className="text-2xl font-semibold">{title}</h1>
            <p className="mt-1 text-[12px] text-neutral-600">
              <span className="num font-mono text-[14px] text-neutral-900">{doc.number}</span>
              {doc.status === "VOID" && <span className="ms-3 font-semibold text-red-700">VOID / ملغاة</span>}
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-0.5 text-[12px]">
              <dt className="text-neutral-500">{both("issueDate")}</dt>
              <dd className="num">{formatDate(doc.issueDate, "en")}</dd>
              {doc.supplyDate && (
                <>
                  <dt className="text-neutral-500">{both("supplyDate")}</dt>
                  <dd className="num">{formatDate(doc.supplyDate, "en")}</dd>
                </>
              )}
              {doc.dueDate && doc.type === "INVOICE" && (
                <>
                  <dt className="text-neutral-500">{both("dueDate")}</dt>
                  <dd className="num">{formatDate(doc.dueDate, "en")}</dd>
                </>
              )}
              {doc.originalInvoice && (
                <>
                  <dt className="text-neutral-500">{both("originalInvoice")}</dt>
                  <dd className="num font-mono">{doc.originalInvoice.number}</dd>
                </>
              )}
              {doc.reason && (
                <>
                  <dt className="text-neutral-500">{both("reason")}</dt>
                  <dd>{doc.reason}</dd>
                </>
              )}
              {doc.reference && (
                <>
                  <dt className="text-neutral-500">{both("reference")}</dt>
                  <dd>{doc.reference}</dd>
                </>
              )}
            </dl>
          </div>
          {doc.qrCode && <QrCode value={doc.qrCode} label="ZATCA QR" className="size-36 shrink-0" />}
        </header>

        <section className="grid grid-cols-2 gap-8">
          <Party title={both("seller")} party={doc.seller} />
          <Party title={both("buyer")} party={doc.buyer} />
        </section>

        <table className="w-full border-collapse text-[12px]">
          <thead>
            <tr className="border-b border-neutral-400 text-start text-[10.5px] uppercase tracking-[0.08em] text-neutral-500">
              <th className="py-2 text-start">#</th>
              <th className="py-2 text-start">{both("description")}</th>
              <th className="py-2 text-end">{both("quantity")}</th>
              <th className="py-2 text-end">{both("unitPrice")}</th>
              <th className="py-2 text-end">{both("discount")}</th>
              <th className="py-2 text-end">{both("taxRate")}</th>
              <th className="py-2 text-end">{both("tax")}</th>
              <th className="py-2 text-end">{both("lineTotal")}</th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l) => (
              <tr key={l.id} className="border-b border-neutral-200 align-top">
                <td className="py-2 text-neutral-500">{l.lineNo}</td>
                <td className="py-2" dir="auto">
                  {l.description}
                  {l.exemptionCode && <span className="block text-[10.5px] text-neutral-500">{l.exemptionCode}</span>}
                </td>
                <td className="num py-2 text-end font-mono">{l.quantity}</td>
                <td className="num py-2 text-end font-mono">{l.unitPrice}</td>
                <td className="py-2 text-end">{isZeroAmount(l.discount) ? "" : money(l.discount)}</td>
                <td className="num py-2 text-end font-mono">{l.taxPercent}%</td>
                <td className="py-2 text-end">{money(l.taxAmount)}</td>
                <td className="py-2 text-end">{money(l.totalAmount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <dl className="ms-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-8 gap-y-1">
          <dt className="text-neutral-600">{both("taxable")}</dt>
          <dd className="text-end">{money(doc.taxableAmount)}</dd>
          <dt className="text-neutral-600">{both("tax")}</dt>
          <dd className="text-end">{money(doc.taxTotal)}</dd>
          <dt className="border-t border-neutral-400 pt-1 font-semibold">{both("total")}</dt>
          <dd className="border-t border-neutral-400 pt-1 text-end font-semibold">
            {money(doc.total)} <span className="text-[11px] font-normal">{c}</span>
          </dd>
        </dl>

        {(doc.notes || doc.terms) && (
          <footer className="space-y-2 border-t border-neutral-300 pt-4 text-[12px] text-neutral-700">
            {doc.notes && <p dir="auto">{doc.notes}</p>}
            {doc.terms && <p dir="auto">{doc.terms}</p>}
          </footer>
        )}
      </article>
    </div>
  );
}
