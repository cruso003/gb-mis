'use client';

import { clsx } from 'clsx';
import {
  BarChart3,
  FolderOpen,
  Users,
  FileText,
  ScrollText,
  Settings,
  Shield,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard/indicators', label: 'Indicators', icon: BarChart3 },
  { href: '/dashboard/cases', label: 'Cases', icon: FolderOpen },
  { href: '/dashboard/beneficiaries', label: 'Beneficiaries', icon: Users },
  { href: '/dashboard/reports', label: 'Reports', icon: FileText },
  { href: '/dashboard/admin/users', label: 'Users', icon: Settings },
  { href: '/dashboard/admin/audit', label: 'Audit Log', icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-3 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Shield className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold leading-tight text-foreground">GB MIS</p>
          <p className="text-[10px] leading-tight text-muted-foreground">MOGCSP · LWEP</p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href) ?? false;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <p className="px-3 text-[10px] text-muted-foreground">
          World Bank IDA · LWEP 2022–2027
        </p>
      </div>
    </aside>
  );
}
