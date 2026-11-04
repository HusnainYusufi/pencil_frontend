import type { Metadata } from "next";
import { getI18n } from "@/i18n/server";
import { requireAccess } from "@/lib/dal";
import { Feat, Perm } from "@/lib/permissions";
import { PurchaseList } from "../bills/list";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return { title: dict.purchases.expensesTitle };
}

export default async function ExpensesPage({ searchParams }: PageProps<"/expenses">) {
  const ws = await requireAccess({ feature: Feat.EXPENSES, permission: Perm.BILLS_READ });
  return <PurchaseList ws={ws} expenses params={await searchParams} />;
}
