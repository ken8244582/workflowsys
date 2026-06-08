'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

export interface UserInfo {
  userId: number;
  username: string;
  displayName: string;
  isSuperAdmin: boolean;
  mustChangePassword: boolean;
}

export interface MenuItem {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  sort_order: number;
  is_visible: boolean;
}

interface AuthContextType {
  user: UserInfo | null;
  menus: MenuItem[];
  loading: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session');
      const data = await res.json();
      if (data.authenticated) {
        setUser({
          userId: data.user.userId,
          username: data.user.username,
          displayName: data.user.displayName || data.user.username,
          isSuperAdmin: data.user.isSuperAdmin,
          mustChangePassword: data.user.mustChangePassword,
        });
        setMenus(data.menus || []);
        setAuthenticated(true);
      } else {
        setUser(null);
        setMenus([]);
        setAuthenticated(false);
      }
    } catch {
      setUser(null);
      setMenus([]);
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        setAuthenticated(true);
        await refreshSession();
        return { success: true };
      }
      return { success: false, error: data.error || '登录失败' };
    } catch {
      return { success: false, error: '网络错误' };
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMenus([]);
    setAuthenticated(false);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, menus, loading, authenticated, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
