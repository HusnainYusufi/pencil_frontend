import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, DataList, PageHeader, Table, Td, Th, type Tone } from "@/components/ui/primitives";
import { formatDate } from "@/i18n/format";
import { getI18n } from "@/i18n/server";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import type { EInvoicingStatus, EInvoicingUnit } from "@/lib/types";
import { OnboardForm } from "./onboard-form";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.einvoicing.title };
}

const UNIT_TONE: Record<EInvoicingUnit["status"], Tone> = { ACTIVE: "success", PENDING: "warning", REVOKED: "neutral" };

export default async function EInvoicingPage() {
  const ws = await requireAccess({ feature: Feat.EINVOICING, permission: Perm.INVOICES_READ });
  const canManage = ws.can(Perm.EINVOICING_MANAGE);
  const [{ dict, locale }, status, units] = await Promise.all([
    getI18n(),
    userApi<EInvoicingStatus>("/einvoicing/status"),
    canManage ? userApi<EInvoicingUnit[]>("/einvoicing/units") : Promise.resolve([] as EInvoicingUnit[]),
  ]);
  const e = dict.einvoicing;
  const iv = dict.invoices;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={dict.nav.settings} title={e.title} description={e.subtitle} />

      {!status.required ? (
        <Card>
          <p className="text-ink-2">{e.notRequired}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card title={e.activeDevice}>
              {status.activeUnit ? (
                <DataList
                  items={[
                    { label: e.authority, value: status.provider },
                    { label: e.environment, value: e.environments[status.activeUnit.environment] },
                    { label: e.deviceName, value: status.activeUnit.name },
                    { label: "CN", value: status.activeUnit.commonName, mono: true },
                    { label: e.lastCounter, value: <span className="num">{status.activeUnit.lastIcv}</span> },
                    {
                      label: e.certificateExpires,
                      value: status.activeUnit.certificateExpiresAt ? formatDate(status.activeUnit.certificateExpiresAt, locale) : null,
                    },
                  ]}
                />
              ) : (
                <p className="text-ink-2">{e.noDevice}</p>
              )}
            </Card>
            <Card title={e.documents}>
              <DataList
                items={(["CLEARED", "REPORTED", "PENDING", "REJECTED"] as const).map((s) => ({
                  label: iv.einvoiceStatuses[s],
                  value: <span className="num font-mono">{status.documents[s] ?? 0}</span>,
                }))}
              />
            </Card>
          </div>

          {canManage && (
            <Card title={e.onboard} description={e.onboardBody}>
              <OnboardForm hasActive={Boolean(status.activeUnit)} />
              <p className="mt-4 text-[12.5px] text-muted">
                <Link href="/settings/company" className="underline underline-offset-4">
                  {dict.nav.companyProfile}
                </Link>
              </p>
            </Card>
          )}

          {units.length > 0 && (
            <Card title={e.devices} flush>
              <Table>
                <thead>
                  <tr>
                    <Th>{e.deviceName}</Th>
                    <Th>{e.environment}</Th>
                    <Th>{dict.common.status}</Th>
                    <Th align="right">{e.lastCounter}</Th>
                    <Th className="hidden lg:table-cell">{e.lastError}</Th>
                    <Th>{dict.common.date}</Th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id}>
                      <Td>{u.name}</Td>
                      <Td className="text-ink-2">{e.environments[u.environment]}</Td>
                      <Td>
                        <Badge tone={UNIT_TONE[u.status]}>{e.statuses[u.status]}</Badge>
                      </Td>
                      <Td align="right">
                        <span className="num">{u.lastIcv}</span>
                      </Td>
                      <Td className="hidden max-w-[18rem] truncate text-[12px] text-muted lg:table-cell" >
                        <span title={u.lastError ?? undefined}>{u.lastError ?? "—"}</span>
                      </Td>
                      <Td className="whitespace-nowrap text-ink-2">{formatDate(u.createdAt, locale)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
