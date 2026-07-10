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
  supported_actions?: string | null;
}

// 权限类型
export interface PathPermission {
  permissions: Record<string, boolean>; // 具体操作权限 {"view": true, "add": false, ...}
  supported_actions: string[];
}

const TOKEN_KEY = 'auth_token';

interface AuthContextType {
  user: UserInfo | null;
  menus: MenuItem[];
  permissions: Record<string, PathPermission>;
  loading: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (path: string, action: string) => boolean; // 支持任意操作类型
  getPermission: (path: string) => PathPermission | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [permissions, setPermissions] = useState<Record<string, PathPermission>>({});
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const router = useRouter();

  const refreshSession = useCallback(async () => {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/auth/session', { headers });
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
        setPermissions(data.permissions || {});
        setAuthenticated(true);
      } else {
        setUser(null);
        setMenus([]);
        setPermissions({});
        setAuthenticated(false);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      setUser(null);
      setMenus([]);
      setPermissions({});
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Global 401 handler + inject Authorization header for API requests
  useEffect(() => {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      // Inject Authorization header for API requests
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
        if (url.startsWith('/api/')) {
          if (args[1] && typeof args[1] === 'object') {
            const existingHeaders = (args[1] as RequestInit).headers;
            if (existingHeaders instanceof Headers) {
              if (!existingHeaders.has('Authorization')) {
                existingHeaders.set('Authorization', `Bearer ${token}`);
              }
            } else if (Array.isArray(existingHeaders)) {
              const hasAuth = existingHeaders.some(([k]) => k.toLowerCase() === 'authorization');
              if (!hasAuth) {
                (args[1] as RequestInit).headers = [...existingHeaders, ['Authorization', `Bearer ${token}`]];
              }
            } else if (typeof existingHeaders === 'object' && existingHeaders !== null) {
              const eh = existingHeaders as Record<string, string>;
              if (!Object.keys(eh).some(k => k.toLowerCase() === 'authorization')) {
                (args[1] as RequestInit).headers = { ...eh, Authorization: `Bearer ${token}` };
              }
            } else {
              (args[1] as RequestInit).headers = { Authorization: `Bearer ${token}` };
            }
          } else {
            args[1] = { headers: { Authorization: `Bearer ${token}` } };
          }
        }
      }

      const response = await originalFetch(...args);
      // Skip 401 handling for login endpoint (it returns 401 for wrong credentials)
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      if (response.status === 401 && !url.includes('/api/auth/login')) {
        // Session expired — redirect to login
        setUser(null);
        setMenus([]);
        setPermissions({});
        setAuthenticated(false);
        localStorage.removeItem(TOKEN_KEY);
        router.push('/login');
      }
      return response;
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [router]);

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
        // Store token in localStorage for iframe/preview where cookies may be blocked
        if (data.token) {
          localStorage.setItem(TOKEN_KEY, data.token);
        }
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
    localStorage.removeItem(TOKEN_KEY);
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    setMenus([]);
    setPermissions({});
    setAuthenticated(false);
    router.push('/login');
  };

  // 检查是否有特定路径的特定操作权限
  const hasPermission = useCallback((path: string, action: string): boolean => {
    // 超级管理员有所有权限
    if (user?.isSuperAdmin) {
      // 对于超管，只要菜单支持该操作就返回 true
      const menu = menus.find(m => m.path === path);
      if (menu?.supported_actions) {
        const supported = JSON.parse(menu.supported_actions);
        return supported.includes(action);
      }
      return true; // 没有定义时默认有权限
    }
    
    const perm = permissions[path];
    if (!perm) return false;
    
    // 检查该操作是否在支持列表中，并且权限为 true
    return perm.supported_actions.includes(action) && perm.permissions[action] === true;
  }, [user?.isSuperAdmin, menus, permissions]);

  // 获取特定路径的完整权限信息
  const getPermission = useCallback((path: string): PathPermission | null => {
    // 超级管理员返回完整权限
    if (user?.isSuperAdmin) {
      const menu = menus.find(m => m.path === path);
      const supported = menu?.supported_actions ? JSON.parse(menu.supported_actions) : ['view'];
      const fullPermissions: Record<string, boolean> = {};
      supported.forEach((a: string) => {
        fullPermissions[a] = true;
      });
      return {
        permissions: fullPermissions,
        supported_actions: supported,
      };
    }
    
    return permissions[path] || null;
  }, [user?.isSuperAdmin, menus, permissions]);

  return (
    <AuthContext.Provider value={{ 
      user, 
      menus, 
      permissions, 
      loading, 
      authenticated, 
      login, 
      logout, 
      refreshSession, 
      hasPermission,
      getPermission,
    }}>
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
