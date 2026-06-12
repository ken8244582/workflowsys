'use client';

import { useAuth } from '@/components/auth-provider';

/**
 * 权限检查 Hook
 * 用于在页面中检查用户是否有某个菜单路径的某个操作权限
 */
export function usePermission() {
  const { hasPermission, getPermission, user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  /**
   * 检查用户是否有指定路径的查看权限（用于页面访问控制）
   * @param path 菜单路径
   * @returns 是否有查看权限
   */
  const canView = (path: string): boolean => hasPermission(path, 'view');

  /**
   * 检查用户是否有指定路径的新增权限
   * @param path 菜单路径
   * @returns 是否有新增权限
   */
  const canAdd = (path: string): boolean => hasPermission(path, 'add');

  /**
   * 检查用户是否有指定路径的修改权限
   * @param path 菜单路径
   * @returns 是否有修改权限
   */
  const canEdit = (path: string): boolean => hasPermission(path, 'edit');

  /**
   * 检查用户是否有指定路径的删除权限
   * @param path 菜单路径
   * @returns 是否有删除权限
   */
  const canDelete = (path: string): boolean => hasPermission(path, 'delete');

  /**
   * 获取用户在指定路径的所有权限
   * @param path 菜单路径
   * @returns 权限对象，如果没有权限返回 null
   */
  const getPerms = (path: string) => getPermission(path);

  return {
    hasPermission,
    canView,
    canAdd,
    canEdit,
    canDelete,
    getPermissions: getPerms,
    isSuperAdmin,
  };
}