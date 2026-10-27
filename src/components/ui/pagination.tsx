import Link from "next/link";
import { getI18n } from "@/i18n/server";
import type { PageMeta } from "@/lib/types";
import { buttonClass, cn } from "./primitives";

/** Server-rendered pagination that preserves the current filters. */
export async function Pagination({
  meta,
  basePath,
  params,
}: {
  meta: PageMeta;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  if (meta.totalPages <= 1) return null;
  const { dict, t } = await getI18n();
  const href = (page: number) => {
    const search = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) search.set(k, v);
    search.set("page", String(page));
    return `${basePath}?${search.toString()}`;
  };
  const from = (meta.page - 1) * meta.pageSize + 1;
  const to = Math.min(meta.total, meta.page * meta.pageSize);

  return (
    <nav aria-label={dict.common.pagination} className="flex items-center justify-between gap-4 px-4 py-3 text-[13px] text-muted">
      <span className="tabular">{t(dict.common.showingRange, { from, to, total: meta.total })}</span>
      <div className="flex gap-2">
        <Link
          href={href(meta.page - 1)}
          aria-disabled={meta.page <= 1}
          className={cn(buttonClass("secondary", "sm"), meta.page <= 1 && "pointer-events-none opacity-40")}
        >
          {dict.common.previous}
        </Link>
        <Link
          href={href(meta.page + 1)}
          aria-disabled={meta.page >= meta.totalPages}
          className={cn(buttonClass("secondary", "sm"), meta.page >= meta.totalPages && "pointer-events-none opacity-40")}
        >
          {dict.common.next}
        </Link>
      </div>
    </nav>
  );
}
