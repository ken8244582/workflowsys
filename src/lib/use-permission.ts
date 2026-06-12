'use client';

import { useAuth } from '@/components/auth-provider';

/**
 * 权限检查 Hook
 * 用于在页面中检查用户是否有某个菜单路径的某个操作权限
 * 支持任意操作类型的权限检查
 * 
 * @param pagePath 可选的页面路径，如果提供则返回的 can() 只需要 action 参数
 * 
 * 使用示例：
 * // 在页面中使用（推荐）
 * const { can } = usePermission('/functional/list');
 * if (can('add')) { ... }
 * 
 * // 或者使用完整参数
 * const { can } = usePermission();
 * if (can('/functional/list', 'add')) { ... }
 */
export function usePermission(pagePath?: string) {
  const { hasPermission, getPermission, user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;

  /**
   * 检查用户是否有指定路径的某个操作权限
   * 如果 hook 初始化时提供了 pagePath，则只需传入 action
   * 否则需要传入完整 path 和 action
   */
  const can = (pathOrAction: string, action?: string): boolean => {
    if (pagePath && action === undefined) {
      // 模式1: can('add') - 使用预设的 pagePath
      return hasPermission(pagePath, pathOrAction);
    } else if (action !== undefined) {
      // 模式2: can('/functional/list', 'add') - 完整参数
      return hasPermission(pathOrAction, action);
    }
    return false;
  };

  /**
   * 检查用户是否有指定路径的查看权限
   */
  const canView = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'view') : false;
  };

  /**
   * 检查用户是否有指定路径的新增权限
   */
  const canAdd = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'add') : false;
  };

  /**
   * 检查用户是否有指定路径的修改权限
   */
  const canEdit = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'edit') : false;
  };

  /**
   * 检查用户是否有指定路径的删除权限
   */
  const canDelete = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'delete') : false;
  };

  /**
   * 检查用户是否有指定路径的导出权限
   */
  const canExport = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'export') : false;
  };

  /**
   * 检查用户是否有指定路径的初始化权限
   */
  const canInit = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'init') : false;
  };

  /**
   * 检查用户是否有指定路径的下发权限
   */
  const canPublish = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'publish') : false;
  };

  /**
   * 检查用户是否有指定路径的重置密码权限
   */
  const canResetPassword = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'reset_password') : false;
  };

  /**
   * 检查用户是否有指定路径的配置权限权限
   */
  const canConfigPermission = (path?: string): boolean => {
    const targetPath = pagePath ?? path;
    return targetPath ? hasPermission(targetPath, 'config_permission') : false;
  };

  /**
   * 获取用户在指定路径的所有权限
   */
  const getPerms = (path?: string) => {
    const targetPath = pagePath ?? path;
    return targetPath ? getPermission(targetPath) : null;
  };

  return {
    hasPermission,
    can,
    canView,
    canAdd,
    canEdit,
    canDelete,
    canExport,
    canInit,
    canPublish,
    canResetPassword,
    canConfigPermission,
    getPermissions: getPerms,
    isSuperAdmin,
  };
}