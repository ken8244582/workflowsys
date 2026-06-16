'use client';

import { useAuth } from '@/components/auth-provider';
import { NavMenu } from '@/components/nav-menu';
import { ChangePasswordDialog } from '@/components/change-password-dialog';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export function AppShell({ children }: { children: React.ReactNode }) {
  const { authenticated, loading, user } = useAuth();
  const pathname = usePathname();

  // Redirect to login if not authenticated and not on login page
  useEffect(() => {
    if (!loading && !authenticated && pathname !== '/login') {
      window.location.href = '/login';
    }
  }, [loading, authenticated, pathname]);

  // Login page has no shell
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-sm text-muted-foreground">加载中...</div>
      </div>
    );
  }

  // Not authenticated
  if (!authenticated) {
    return null;
  }

  return (
    <>
      {user?.mustChangePassword && <ChangePasswordDialog />}
      <header className="sticky top-0 z-50 border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="株齿" className="h-8 w-8 rounded object-contain" />
            <span className="text-base font-semibold text-[#1e3a5f]">株齿流程管理平台</span>
          </div>
          <NavMenu />
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {children}
      </main>
    </>
  );
}
