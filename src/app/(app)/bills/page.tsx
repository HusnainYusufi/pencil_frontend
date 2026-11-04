import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireAccess } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { PurchaseList } from "./list";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.billsTitle };
}

export default async function BillsPage({ searchParams }: PageProps<"/bills">) {
  const ws = await requireAccess({ feature: Feat.BILLS, permission: Perm.BILLS_READ });
  return <PurchaseList ws={ws} expenses={false} params={await searchParams} />;
}
