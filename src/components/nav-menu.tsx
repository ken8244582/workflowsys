'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import type { MenuItem } from '@/components/auth-provider';

// Static menu items for fallback / initial render
interface SubMenu {
  label: string;
  href: string;
}

interface MenuGroup {
  label: string;
  href?: string;
  children?: SubMenu[];
}

function buildMenuTree(menus: MenuItem[]): MenuGroup[] {
  const topMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);
  return topMenus.map(top => {
    const children = menus
      .filter(m => m.parent_id === top.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    if (children.length > 0) {
      return {
        label: top.name,
        children: children.map(c => ({ label: c.name, href: c.path || '#' })),
      };
    }
    return {
      label: top.name,
      href: top.path || '#',
    };
  });
}

export function NavMenu() {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { menus, user, logout } = useAuth();

  const menuItems = buildMenuTree(menus);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const isParentActive = (item: MenuGroup) => {
    if (item.children) {
      return item.children.some((child) => pathname.startsWith(child.href));
    }
    return false;
  };

  return (
    <nav className="ml-6 flex flex-1 items-center gap-0.5">
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

      {/* User info & logout */}
      {user && (
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {user.displayName || user.username}
            {user.isSuperAdmin && <span className="ml-1 text-[#f59e0b]">[管理员]</span>}
          </span>
          <button
            onClick={logout}
            className="rounded-md px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            退出
          </button>
        </div>
      )}
    </nav>
  );
}
