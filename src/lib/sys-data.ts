import { getSupabaseClient } from '@/storage/database/supabase-client';
import bcrypt from 'bcryptjs';
import { type SessionPayload } from './auth';
import { type SysMenuFunction, type SysUserMenuFunction } from '@/storage/database/shared/schema';

export interface SysUser {
  id: number;
  username: string;
  password_hash: string;
  display_name: string | null;
  is_super_admin: boolean;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SysMenu {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  sort_order: number;
  is_visible: boolean;
  supported_actions: string | null; // JSON array of supported actions like ["view","add","edit","delete"]
  created_at: string;
  updated_at: string;
}

export interface SysUserMenu {
  id: number;
  user_id: number;
  menu_id: number;
  permissions: Record<string, boolean>; // JSON object like {"view": true, "add": false, "edit": false}
}

// 用户菜单权限详情（包含菜单信息和权限）
export interface UserMenuPermission {
  menu_id: number;
  menu_name: string;
  menu_path: string | null;
  supported_actions: string[];
  permissions: Record<string, boolean>; // 具体操作权限
}

const DEFAULT_PASSWORD = '123456';

// Seed initial data if not exists
export async function seedInitialData(): Promise<void> {
  const client = getSupabaseClient();

  // Check if super admin exists
  const { data: existingAdmin } = await client
    .from('sys_users')
    .select('id')
    .eq('username', '10020580')
    .maybeSingle();

  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    const { error: userError } = await client
      .from('sys_users')
      .insert({
        username: '10020580',
        password_hash: passwordHash,
        display_name: '超级管理员',
        is_super_admin: true,
        must_change_password: false,
        is_active: true,
      });
    if (userError) throw new Error(`创建超级管理员失败: ${userError.message}`);
  }

  // Check if menus exist
  const { data: existingMenus } = await client
    .from('sys_menus')
    .select('id')
    .limit(1);

  if (!existingMenus || existingMenus.length === 0) {
    const defaultMenus = [
      { name: '统计概览', path: '/', icon: 'LayoutDashboard', parent_id: null, sort_order: 1, is_visible: true, supported_actions: '["view"]' },
      { name: '职能流程', path: null, icon: 'GitBranch', parent_id: null, sort_order: 2, is_visible: true, supported_actions: '[]' },
      { name: '流程架构', path: '/functional/architecture', icon: null, parent_id: null, sort_order: 1, is_visible: true, supported_actions: '["view","add","edit","delete"]' },
      { name: '流程清单', path: '/functional/list', icon: null, parent_id: null, sort_order: 2, is_visible: true, supported_actions: '["view","add","edit","delete","export","import"]' },
      { name: '修订记录', path: '/functional/revision', icon: null, parent_id: null, sort_order: 3, is_visible: true, supported_actions: '["view","export"]' },
      { name: '修订计划', path: '/functional/plan', icon: null, parent_id: null, sort_order: 4, is_visible: true, supported_actions: '["view","add","edit","delete","export"]' },
      { name: '端到端流程', path: null, icon: 'Workflow', parent_id: null, sort_order: 3, is_visible: true, supported_actions: '[]' },
      { name: '流程概览', path: '/e2e/overview', icon: null, parent_id: null, sort_order: 1, is_visible: true, supported_actions: '["view"]' },
      { name: '流程管理', path: '/e2e/list', icon: null, parent_id: null, sort_order: 2, is_visible: true, supported_actions: '["view","add","edit","delete"]' },
      { name: '梳理计划', path: '/e2e/plan', icon: null, parent_id: null, sort_order: 3, is_visible: true, supported_actions: '["view","add","edit","delete"]' },
      { name: '评价体系', path: null, icon: 'Award', parent_id: null, sort_order: 4, is_visible: true, supported_actions: '[]' },
      { name: '成熟度自评', path: '/assessment/maturity', icon: null, parent_id: null, sort_order: 1, is_visible: true, supported_actions: '["view","add","edit","delete","export"]' },
      { name: '系统管理', path: null, icon: 'Settings', parent_id: null, sort_order: 5, is_visible: true, supported_actions: '[]' },
      { name: '用户管理', path: '/system/users', icon: null, parent_id: null, sort_order: 1, is_visible: true, supported_actions: '["view","add","edit","delete","reset_password"]' },
      { name: '菜单管理', path: '/system/menus', icon: null, parent_id: null, sort_order: 2, is_visible: true, supported_actions: '["view","add","edit","delete"]' },
    ];

    const { data: insertedMenus, error: menuError } = await client
      .from('sys_menus')
      .insert(defaultMenus)
      .select();
    if (menuError) throw new Error(`创建默认菜单失败: ${menuError.message}`);

    // Update parent_id for sub-menus
    if (insertedMenus) {
      const menuMap: Record<string, number> = {};
      insertedMenus.forEach((m: SysMenu) => { menuMap[m.name] = m.id; });

      const updates = [
        { name: '流程架构', parent_id: menuMap['职能流程'] },
        { name: '流程清单', parent_id: menuMap['职能流程'] },
        { name: '修订记录', parent_id: menuMap['职能流程'] },
        { name: '修订计划', parent_id: menuMap['职能流程'] },
        { name: '流程概览', parent_id: menuMap['端到端流程'] },
        { name: '流程管理', parent_id: menuMap['端到端流程'] },
        { name: '梳理计划', parent_id: menuMap['端到端流程'] },
        { name: '成熟度自评', parent_id: menuMap['评价体系'] },
        { name: '用户管理', parent_id: menuMap['系统管理'] },
        { name: '菜单管理', parent_id: menuMap['系统管理'] },
      ];

      for (const update of updates) {
        const { error } = await client
          .from('sys_menus')
          .update({ parent_id: update.parent_id })
          .eq('name', update.name)
          .is('parent_id', null);
        if (error) throw new Error(`更新菜单父级失败: ${error.message}`);
      }
    }
  }
}

// Login
export async function loginUser(username: string, password: string): Promise<{ payload: SessionPayload } | null> {
  const client = getSupabaseClient();

  const { data: user, error } = await client
    .from('sys_users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .maybeSingle();

  if (error) throw new Error(`查询用户失败: ${error.message}`);
  if (!user) return null;

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return null;

  const payload: SessionPayload = {
    userId: user.id,
    username: user.username,
    displayName: user.display_name || user.username,
    isSuperAdmin: user.is_super_admin,
  };

  return { payload };
}

// Change password
export async function verifyUserPassword(userId: number, password: string): Promise<boolean> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_users')
    .select('password_hash')
    .eq('id', userId)
    .single();
  if (error || !data) return false;
  return bcrypt.compare(password, data.password_hash);
}

export async function changePassword(userId: number, newPassword: string): Promise<void> {
  const client = getSupabaseClient();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  const { error } = await client
    .from('sys_users')
    .update({ password_hash: passwordHash, must_change_password: false, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(`修改密码失败: ${error.message}`);
}

// Reset user password (super admin only)
export async function resetUserPassword(userId: number): Promise<void> {
  const client = getSupabaseClient();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const { error } = await client
    .from('sys_users')
    .update({ password_hash: passwordHash, must_change_password: true, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(`重置密码失败: ${error.message}`);
}

// Get all users
export async function getAllUsers(): Promise<Omit<SysUser, 'password_hash'>[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_users')
    .select('id, username, display_name, is_super_admin, must_change_password, is_active, created_at, updated_at')
    .order('id');
  if (error) throw new Error(`查询用户列表失败: ${error.message}`);
  return (data || []) as Omit<SysUser, 'password_hash'>[];
}

// Get user by ID
export async function getUserById(userId: number): Promise<Omit<SysUser, 'password_hash'> | null> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_users')
    .select('id, username, display_name, is_super_admin, must_change_password, is_active, created_at, updated_at')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new Error(`查询用户失败: ${error.message}`);
  return data as Omit<SysUser, 'password_hash'> | null;
}

// Create user
export async function createUser(username: string, displayName: string, isActive: boolean): Promise<Omit<SysUser, 'password_hash'>> {
  const client = getSupabaseClient();
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const { data, error } = await client
    .from('sys_users')
    .insert({
      username,
      password_hash: passwordHash,
      display_name: displayName,
      is_super_admin: false,
      must_change_password: true,
      is_active: isActive,
    })
    .select('id, username, display_name, is_super_admin, must_change_password, is_active, created_at, updated_at')
    .single();
  if (error) throw new Error(`创建用户失败: ${error.message}`);
  return data as Omit<SysUser, 'password_hash'>;
}

// Update user
export async function updateUser(userId: number, updates: { display_name?: string; is_active?: boolean }): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('sys_users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw new Error(`更新用户失败: ${error.message}`);
}

// Delete user
export async function deleteUser(userId: number): Promise<void> {
  const client = getSupabaseClient();

  // Check if the user is super admin
  const { data: user, error: queryError } = await client
    .from('sys_users')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();
  if (queryError) throw new Error(`查询用户失败: ${queryError.message}`);
  if (!user) throw new Error('用户不存在');
  if (user.is_super_admin) throw new Error('超级管理员不允许被删除');

  // Delete user menus first
  const { error: menuError } = await client
    .from('sys_user_menus')
    .delete()
    .eq('user_id', userId);
  if (menuError) throw new Error(`删除用户菜单权限失败: ${menuError.message}`);

  // Delete user
  const { error } = await client
    .from('sys_users')
    .delete()
    .eq('id', userId);
  if (error) throw new Error(`删除用户失败: ${error.message}`);
}

// Get all menus as tree
export async function getAllMenus(): Promise<SysMenu[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_menus')
    .select('*')
    .order('sort_order');
  if (error) throw new Error(`查询菜单列表失败: ${error.message}`);
  return (data || []) as SysMenu[];
}

// Create menu
export async function createMenu(menu: Omit<SysMenu, 'id' | 'created_at' | 'updated_at'>): Promise<SysMenu> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_menus')
    .insert(menu)
    .select()
    .single();
  if (error) throw new Error(`创建菜单失败: ${error.message}`);
  return data as SysMenu;
}

// Update menu
export async function updateMenu(menuId: number, updates: Partial<Omit<SysMenu, 'id' | 'created_at' | 'updated_at'>>): Promise<void> {
  const client = getSupabaseClient();
  const { error } = await client
    .from('sys_menus')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', menuId);
  if (error) throw new Error(`更新菜单失败: ${error.message}`);
}

// Delete menu
export async function deleteMenu(menuId: number): Promise<void> {
  const client = getSupabaseClient();

  // Delete child menus first
  const { error: childError } = await client
    .from('sys_user_menus')
    .delete()
    .eq('menu_id', menuId);
  if (childError) throw new Error(`删除菜单权限关联失败: ${childError.message}`);

  // Delete child menu user associations
  const { data: childMenus } = await client
    .from('sys_menus')
    .select('id')
    .eq('parent_id', menuId);

  if (childMenus && childMenus.length > 0) {
    const childIds = childMenus.map((m: { id: number }) => m.id);
    // Delete user_menu associations for child menus
    for (const cid of childIds) {
      await client.from('sys_user_menus').delete().eq('menu_id', cid);
    }
    // Delete child menus
    await client.from('sys_menus').delete().in('id', childIds);
  }

  // Delete menu itself
  const { error } = await client
    .from('sys_menus')
    .delete()
    .eq('id', menuId);
  if (error) throw new Error(`删除菜单失败: ${error.message}`);
}

// Get user menu IDs with permissions
export async function getUserMenuIds(userId: number): Promise<number[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_user_menus')
    .select('menu_id')
    .eq('user_id', userId);
  if (error) throw new Error(`查询用户菜单权限失败: ${error.message}`);
  return (data || []).map((d: { menu_id: number }) => d.menu_id);
}

// Get user menu permissions (full details)
export async function getUserMenuPermissions(userId: number): Promise<SysUserMenu[]> {
  const client = getSupabaseClient();
  const { data, error } = await client
    .from('sys_user_menus')
    .select('*')
    .eq('user_id', userId);
  if (error) throw new Error(`查询用户菜单权限失败: ${error.message}`);
  return (data || []) as SysUserMenu[];
}

// Permission input type for updating user menus
export interface MenuPermissionInput {
  menu_id: number;
  permissions: Record<string, boolean>; // 具体操作权限 {"view": true, "add": false, ...}
}

// Update user menu permissions with detailed permissions
export async function updateUserMenus(userId: number, permissions: MenuPermissionInput[]): Promise<void> {
  const client = getSupabaseClient();

  // Delete existing permissions
  const { error: deleteError } = await client
    .from('sys_user_menus')
    .delete()
    .eq('user_id', userId);
  if (deleteError) throw new Error(`清除用户菜单权限失败: ${deleteError.message}`);

  // Insert new permissions
  if (permissions.length > 0) {
    const inserts = permissions.map(p => ({
      user_id: userId,
      menu_id: p.menu_id,
      permissions: p.permissions,
    }));
    const { error: insertError } = await client
      .from('sys_user_menus')
      .insert(inserts);
    if (insertError) throw new Error(`设置用户菜单权限失败: ${insertError.message}`);
  }
}

// Get user permissions for a specific menu path (for frontend permission check)
export async function getUserPermissionForPath(userId: number, isSuperAdmin: boolean, menuPath: string): Promise<{
  permissions: Record<string, boolean>;
  supported_actions: string[];
} | null> {
  if (isSuperAdmin) {
    // Super admin has all permissions
    const allMenus = await getAllMenus();
    const menu = allMenus.find(m => m.path === menuPath);
    if (!menu) return null;
    const supported = menu.supported_actions ? JSON.parse(menu.supported_actions) : ['view'];
    // Super admin has all supported actions enabled
    const fullPermissions: Record<string, boolean> = {};
    supported.forEach((action: string) => {
      fullPermissions[action] = true;
    });
    return {
      permissions: fullPermissions,
      supported_actions: supported,
    };
  }

  const client = getSupabaseClient();
  
  // Find menu by path
  const { data: menu, error: menuError } = await client
    .from('sys_menus')
    .select('*')
    .eq('path', menuPath)
    .maybeSingle();
  
  if (menuError || !menu) return null;
  
  // Get user permission for this menu
  const { data: userMenu, error: permError } = await client
    .from('sys_user_menus')
    .select('*')
    .eq('user_id', userId)
    .eq('menu_id', menu.id)
    .maybeSingle();
  
  if (permError || !userMenu) return null;
  
  const supported = menu.supported_actions ? JSON.parse(menu.supported_actions) : ['view'];
  const perms = (userMenu as SysUserMenu).permissions || {};
  
  return {
    permissions: perms,
    supported_actions: supported,
  };
}

// Get menus accessible by a user (super admin gets all, others get assigned)
export async function getUserAccessibleMenus(userId: number, isSuperAdmin: boolean): Promise<SysMenu[]> {
  const allMenus = await getAllMenus();

  if (isSuperAdmin) return allMenus;

  const assignedMenuIds = await getUserMenuIds(userId);
  const assignedSet = new Set(assignedMenuIds);

  // Include parent menus of assigned sub-menus
  const result: SysMenu[] = [];
  const includedIds = new Set<number>();

  for (const menu of allMenus) {
    if (assignedSet.has(menu.id)) {
      includedIds.add(menu.id);
    }
  }

  // Add parent menus for assigned menus
  for (const menu of allMenus) {
    if (includedIds.has(menu.id)) {
      // Add all ancestors
      let parentId = menu.parent_id;
      while (parentId !== null) {
        if (!includedIds.has(parentId)) {
          includedIds.add(parentId);
        }
        const parent = allMenus.find(m => m.id === parentId);
        parentId = parent?.parent_id ?? null;
      }
    }
  }

  return allMenus.filter(m => includedIds.has(m.id));
}

// Get all user menu permissions for frontend context (path -> permissions mapping)
export async function getUserAllPermissions(userId: number, isSuperAdmin: boolean): Promise<Record<string, {
  permissions: Record<string, boolean>;
  supported_actions: string[];
}>> {
  const allMenus = await getAllMenus();
  const result: Record<string, {
    permissions: Record<string, boolean>;
    supported_actions: string[];
  }> = {};

  if (isSuperAdmin) {
    // Super admin has all permissions for supported actions
    for (const menu of allMenus) {
      if (menu.path) {
        const supported = menu.supported_actions ? JSON.parse(menu.supported_actions as string) : ['view'];
        const fullPermissions: Record<string, boolean> = {};
        supported.forEach((action: string) => {
          fullPermissions[action] = true;
        });
        result[menu.path] = {
          permissions: fullPermissions,
          supported_actions: supported,
        };
      }
    }
    return result;
  }

  // Get user's assigned menus (from sys_user_menus)
  const userMenus = await getUserMenuPermissions(userId);
  const assignedMenuIds = new Set(userMenus.map(m => m.menu_id));

  // Get user's function permissions (from sys_user_menu_functions)
  const userFunctionPerms = await getUserMenuFunctionPermissions(userId);
  const funcPermMap = new Map<number, Map<string, boolean>>();
  for (const perm of userFunctionPerms) {
    if (!funcPermMap.has(perm.menu_id)) {
      funcPermMap.set(perm.menu_id, new Map());
    }
    funcPermMap.get(perm.menu_id)!.set(perm.function_code, perm.is_enabled);
  }

  for (const menu of allMenus) {
    if (menu.path && assignedMenuIds.has(menu.id)) {
      const supported = menu.supported_actions ? JSON.parse(menu.supported_actions as string) : ['view'];
      // Merge permissions from sys_user_menu_functions
      const menuFuncPerms = funcPermMap.get(menu.id);
      const permissions: Record<string, boolean> = {};
      for (const action of supported) {
        // Use function-level permission if available, otherwise default to false
        permissions[action] = menuFuncPerms?.get(action) ?? false;
      }
      result[menu.path] = {
        permissions,
        supported_actions: supported,
      };
    }
  }

  return result;
}

// ========== 菜单功能配置相关 ==========

/**
 * 获取菜单的功能配置列表
 */
export async function getMenuFunctions(menuId: number): Promise<SysMenuFunction[]> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_menu_functions')
    .select('*')
    .eq('menu_id', menuId)
    .order('sort_order', { ascending: true });
  return result.data || [];
}

/**
 * 获取所有菜单功能配置
 */
export async function getAllMenuFunctions(): Promise<SysMenuFunction[]> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_menu_functions')
    .select('*')
    .order('menu_id', { ascending: true })
    .order('sort_order', { ascending: true });
  return result.data || [];
}

/**
 * 创建菜单功能
 */
export async function createMenuFunction(data: Omit<SysMenuFunction, 'id' | 'created_at'>): Promise<SysMenuFunction | null> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_menu_functions')
    .insert({
      menu_id: data.menu_id,
      function_code: data.function_code,
      function_name: data.function_name,
      sort_order: data.sort_order || 0,
    })
    .select()
    .single();
  return result.data;
}

/**
 * 更新菜单功能
 */
export async function updateMenuFunction(id: number, data: Partial<SysMenuFunction>): Promise<SysMenuFunction | null> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_menu_functions')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  return result.data;
}

/**
 * 删除菜单功能
 */
export async function deleteMenuFunction(id: number): Promise<boolean> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_menu_functions')
    .delete()
    .eq('id', id);
  return !result.error;
}

/**
 * 批量更新菜单功能配置
 */
export async function updateMenuFunctions(menuId: number, functions: Array<{ function_code: string; function_name: string; sort_order: number }>): Promise<SysMenuFunction[]> {
  const sb = getSupabaseClient();
  // 先删除现有功能
  await sb
    .from('sys_menu_functions')
    .delete()
    .eq('menu_id', menuId);

  // 再插入新功能
  if (functions.length === 0) {
    return [];
  }

  const insertData = functions.map(f => ({
    menu_id: menuId,
    function_code: f.function_code,
    function_name: f.function_name,
    sort_order: f.sort_order,
  }));

  const result = await sb
    .from('sys_menu_functions')
    .insert(insertData)
    .select();

  return result.data || [];
}

// ========== 用户菜单功能权限相关 ==========

/**
 * 获取用户的菜单功能权限
 */
export async function getUserMenuFunctionPermissions(userId: number): Promise<SysUserMenuFunction[]> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_user_menu_functions')
    .select('*')
    .eq('user_id', userId);
  return result.data || [];
}

/**
 * 获取用户在某个菜单的功能权限
 */
export async function getUserMenuFunctions(userId: number, menuId: number): Promise<SysUserMenuFunction[]> {
  const sb = getSupabaseClient();
  const result = await sb
    .from('sys_user_menu_functions')
    .select('*')
    .eq('user_id', userId)
    .eq('menu_id', menuId);
  return result.data || [];
}

/**
 * 更新用户的菜单功能权限
 */
export async function updateUserMenuFunctions(userId: number, menuId: number, functions: Array<{ function_code: string; is_enabled: boolean }>): Promise<void> {
  const sb = getSupabaseClient();
  // 先删除现有权限
  await sb
    .from('sys_user_menu_functions')
    .delete()
    .eq('user_id', userId)
    .eq('menu_id', menuId);

  // 再插入新权限
  if (functions.length === 0) {
    return;
  }

  const insertData = functions.map(f => ({
    user_id: userId,
    menu_id: menuId,
    function_code: f.function_code,
    is_enabled: f.is_enabled,
  }));

  await sb
    .from('sys_user_menu_functions')
    .insert(insertData);
}

/**
 * 批量更新用户的所有菜单功能权限
 */
export async function updateUserAllMenuFunctions(userId: number, permissions: Array<{ menu_id: number; functions: Array<{ function_code: string; is_enabled: boolean }> }>): Promise<void> {
  const sb = getSupabaseClient();
  
  // 先删除所有现有功能权限
  await sb
    .from('sys_user_menu_functions')
    .delete()
    .eq('user_id', userId);

  // 批量插入新功能权限
  const allInserts: Array<{ user_id: number; menu_id: number; function_code: string; is_enabled: boolean }> = [];
  
  // 计算应该分配的菜单（有任何一个 is_enabled: true 的功能权限）
  const assignedMenuIds = new Set<number>();
  
  for (const perm of permissions) {
    const hasAnyEnabled = perm.functions.some(f => f.is_enabled);
    if (hasAnyEnabled) {
      assignedMenuIds.add(perm.menu_id);
    }
    
    for (const func of perm.functions) {
      allInserts.push({
        user_id: userId,
        menu_id: perm.menu_id,
        function_code: func.function_code,
        is_enabled: func.is_enabled,
      });
    }
  }

  if (allInserts.length > 0) {
    await sb
      .from('sys_user_menu_functions')
      .insert(allInserts);
  }
  
  // 同步更新 sys_user_menus 表（菜单分配）
  // 先删除所有现有菜单分配
  await sb
    .from('sys_user_menus')
    .delete()
    .eq('user_id', userId);
  
  // 插入新的菜单分配（只有有权限的菜单）
  if (assignedMenuIds.size > 0) {
    const menuInserts = Array.from(assignedMenuIds).map(menuId => ({
      user_id: userId,
      menu_id: menuId,
    }));
    await sb
      .from('sys_user_menus')
      .insert(menuInserts);
  }
}

/**
 * 获取用户的所有菜单功能权限（按路径组织）
 */
export async function getUserAllMenuFunctionPermissions(userId: number): Promise<Record<string, Record<string, boolean>>> {
  // 获取所有菜单及其功能配置
  const menus = await getAllMenus();
  const allFunctions = await getAllMenuFunctions();

  // 获取用户的权限
  const userPerms = await getUserMenuFunctionPermissions(userId);
  const permMap = new Map<string, Map<string, boolean>>();

  for (const perm of userPerms) {
    const key = `${perm.menu_id}`;
    if (!permMap.has(key)) {
      permMap.set(key, new Map());
    }
    permMap.get(key)!.set(perm.function_code, perm.is_enabled);
  }

  // 组织结果
  const result: Record<string, Record<string, boolean>> = {};
  
  for (const menu of menus) {
    if (!menu.path) continue;

    const menuFunctions = allFunctions.filter(f => f.menu_id === menu.id);
    if (menuFunctions.length === 0) continue;

    const userMenuPerms = permMap.get(`${menu.id}`) || new Map();
    
    result[menu.path] = {};
    for (const func of menuFunctions) {
      result[menu.path][func.function_code] = userMenuPerms.get(func.function_code) || false;
    }
  }

  return result;
}
