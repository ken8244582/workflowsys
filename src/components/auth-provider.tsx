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
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
  supported_actions: string[];
}

interface AuthContextType {
  user: UserInfo | null;
  menus: MenuItem[];
  permissions: Record<string, PathPermission>;
  loading: boolean;
  authenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasPermission: (path: string, action: 'view' | 'add' | 'edit' | 'delete') => boolean;
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
        setPermissions(data.permissions || {});
        setAuthenticated(true);
      } else {
        setUser(null);
        setMenus([]);
        setPermissions({});
        setAuthenticated(false);
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

  // Global 401 handler: if any API returns 401, redirect to login
  useEffect(() => {
    // Monkey-patch fetch to detect 401 responses globally
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      // Skip 401 handling for login endpoint (it returns 401 for wrong credentials)
      const url = typeof args[0] === 'string' ? args[0] : args[0] instanceof Request ? args[0].url : '';
      if (response.status === 401 && !url.includes('/api/auth/login')) {
        // Session expired — redirect to login
        setUser(null);
        setMenus([]);
        setPermissions({});
        setAuthenticated(false);
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
    setPermissions({});
    setAuthenticated(false);
    router.push('/login');
  };

  // 检查是否有特定路径的特定操作权限
  const hasPermission = useCallback((path: string, action: 'view' | 'add' | 'edit' | 'delete'): boolean => {
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
    
    switch (action) {
      case 'view':
        return perm.can_view && perm.supported_actions.includes('view');
      case 'add':
        return perm.can_add && perm.supported_actions.includes('add');
      case 'edit':
        return perm.can_edit && perm.supported_actions.includes('edit');
      case 'delete':
        return perm.can_delete && perm.supported_actions.includes('delete');
      default:
        return false;
    }
  }, [user?.isSuperAdmin, menus, permissions]);

  // 获取特定路径的完整权限信息
  const getPermission = useCallback((path: string): PathPermission | null => {
    // 超级管理员返回完整权限
    if (user?.isSuperAdmin) {
      const menu = menus.find(m => m.path === path);
      const supported = menu?.supported_actions ? JSON.parse(menu.supported_actions) : ['view'];
      return {
        can_view: true,
        can_add: supported.includes('add'),
        can_edit: supported.includes('edit'),
        can_delete: supported.includes('delete'),
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