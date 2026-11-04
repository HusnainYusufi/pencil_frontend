import { isUuid } from "@/lib/actions";
import { requireAccess, userApi } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";

/** Downloads the signed e-invoice XML (the authority-stamped copy once cleared). */
export async function GET(_request: Request, { params }: RouteContext<"/invoices/[id]/xml">) {
  await requireAccess({ feature: Feat.SALES_INVOICES, permission: Perm.INVOICES_READ });
  const { id } = await params;
  if (!isUuid(id)) return new Response("Not found", { status: 404 });
  const { filename, xml } = await userApi<{ filename: string; xml: string }>(`/sales-invoices/${id}/einvoice/xml`);
  return new Response(xml, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "content-disposition": `attachment; filename="${filename.replace(/[^\w.-]/g, "_")}"`,
      "cache-control": "no-store",
    },
  });
}
