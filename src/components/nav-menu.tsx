'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface SubMenu {
  label: string;
  href: string;
}

interface MenuItem {
  label: string;
  href?: string;
  children?: SubMenu[];
}

const menuItems: MenuItem[] = [
  { label: '统计概览', href: '/' },
  { label: '指标监控', href: '/monitoring' },
  {
    label: '职能流程',
    children: [
      { label: '职能流程架构', href: '/functional/architecture' },
      { label: '职能流程清单', href: '/functional/list' },
      { label: '职能流程修订记录', href: '/functional/revision' },
      { label: '职能流程指标清单', href: '/functional/indicators' },
    ],
  },
  {
    label: '端到端流程',
    children: [
      { label: '端到端流程清单', href: '/e2e/list' },
      { label: '端到端流程修订记录', href: '/e2e/revision' },
      { label: '端到端流程指标清单', href: '/e2e/indicators' },
    ],
  },
];

export function NavMenu() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isParentActive = (item: MenuItem) => {
    if (item.children) {
      return item.children.some((child) => pathname.startsWith(child.href));
    }
    return false;
  };

  return (
    <nav className="ml-6 flex items-center gap-0.5">
      {menuItems.map((item) => {
        const hasChildren = item.children && item.children.length > 0;
        const active = item.href ? isActive(item.href) : isParentActive(item);

        if (!hasChildren) {
          return (
            <Link
              key={item.label}
              href={item.href!}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {item.label}
            </Link>
          );
        }

        return (
          <div
            key={item.label}
            className="relative"
            onMouseEnter={() => setOpenMenu(item.label)}
            onMouseLeave={() => setOpenMenu(null)}
          >
            <button
              className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground'
              }`}
            >
              {item.label}
              <svg
                className={`h-3.5 w-3.5 transition-transform ${
                  openMenu === item.label ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {openMenu === item.label && (
              <div className="absolute left-0 top-full z-50 pt-2">
                <div className="w-48 rounded-lg border border-border bg-white py-1 shadow-lg">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={`block px-4 py-2 text-sm transition-colors ${
                        isActive(child.href)
                          ? 'bg-[#1e3a5f]/10 font-medium text-[#1e3a5f]'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                      }`}
                    >
                      {child.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
