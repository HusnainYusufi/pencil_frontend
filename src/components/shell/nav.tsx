"use client";

import { BookOpenText, Building2, CalendarRange, LayoutGrid, ListTree, Package, Percent, Scale, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/primitives";

export interface NavItem {
  href: string;
  label: string;
  icon: "dashboard" | "accounts" | "journals" | "trialBalance" | "periods" | "contacts" | "items" | "taxes" | "company";
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

const ICONS: Record<NavItem["icon"], LucideIcon> = {
  dashboard: LayoutGrid,
  accounts: ListTree,
  journals: BookOpenText,
  trialBalance: Scale,
  periods: CalendarRange,
  contacts: Users,
  items: Package,
  taxes: Percent,
  company: Building2,
};

/** Sections only list what the plan includes AND the role may open (built on the server). */
export function NavSections({ sections }: { sections: NavSection[] }) {
  const pathname = usePathname();
  return (
    <div className="space-y-6">
      {sections.map((section, index) => (
        <div key={section.label ?? index}>
          {section.label && (
            <p className="mb-1.5 px-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted">{section.label}</p>
          )}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = ICONS[item.icon];
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-md px-3 py-2 text-[13.5px] transition-colors duration-150",
                      active ? "font-medium text-ink" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-ink" : "text-muted group-hover:text-ink-2")} aria-hidden />
                    <span className={cn(active && "mark")}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
