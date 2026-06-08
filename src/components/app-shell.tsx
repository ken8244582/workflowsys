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
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#1e3a5f]">
              <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <span className="text-base font-semibold text-[#1e3a5f]">流程管理平台</span>
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
