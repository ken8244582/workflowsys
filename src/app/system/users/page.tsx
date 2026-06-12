'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';

// 操作名称映射
const ACTION_LABELS: Record<string, string> = {
  view: '查看',
  add: '新增',
  edit: '编辑',
  delete: '删除',
  export: '导出',
  init: '初始化',
  publish: '下发',
  reset_password: '重置密码',
  config_permission: '配置权限',
};

interface MenuPermission {
  menu_id: number;
  menu_name: string;
  path: string | null;
  supported_actions: string[];
  permissions: Record<string, boolean>;
}

interface UserItem {
  id: number;
  username: string;
  display_name: string | null;
  is_super_admin: boolean;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menuPermissions: MenuPermission[];
}

interface MenuOption {
  id: number;
  name: string;
  parent_id: number | null;
  path: string | null;
  supported_actions: string | null;
}

// 权限编辑状态 - 使用 Record<string, boolean> 存储各操作的权限
interface PermissionEdit {
  menu_id: number;
  menu_name: string;
  path: string | null;
  supported_actions: string[];
  permissions: Record<string, boolean>;
}

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [menus, setMenus] = useState<MenuOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<PermissionEdit[]>([]);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/sys/users');
      const data = await res.json();
      if (data.users) setUsers(data.users);
      if (data.menus) setMenus(data.menus);
    } catch (e) {
      console.error('获取用户列表失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter(u =>
    u.username.includes(searchTerm) || (u.display_name && u.display_name.includes(searchTerm))
  );

  // Add user
  const handleAddUser = async () => {
    setError('');
    if (!formUsername.trim()) { setError('用户名不能为空'); return; }
    setSubmitting(true);
    try {
      const res = await fetch('/api/sys/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formUsername.trim(), display_name: formDisplayName.trim(), is_active: formIsActive }),
      });
      const data = await res.json();
      if (data.user) {
        setShowAddDialog(false);
        setFormUsername('');
        setFormDisplayName('');
        setFormIsActive(true);
        fetchUsers();
      } else {
        setError(data.error || '添加失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit user
  const handleEditUser = async () => {
    setError('');
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sys/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: formDisplayName.trim(), is_active: formIsActive }),
      });
      const data = await res.json();
      if (data.user) {
        setShowEditDialog(false);
        fetchUsers();
      } else {
        setError(data.error || '更新失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: number, username: string) => {
    if (username === currentUser?.username) {
      alert('不能删除当前登录的账号');
      return;
    }
    if (username === '10020580') {
      alert('不能删除超级管理员账号');
      return;
    }
    if (!confirm(`确定要删除用户 ${username} 吗？`)) return;
    try {
      const res = await fetch(`/api/sys/users/${userId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchUsers();
      } else {
        alert(data.error || '删除失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  // Reset password
  const handleResetPassword = async (userId: number) => {
    if (!confirm('确定要重置该用户的密码吗？用户下次登录时需要设置新密码。')) return;
    try {
      const res = await fetch(`/api/sys/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('密码已重置，用户下次登录时需要设置新密码');
      } else {
        alert(data.error || '重置失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  // Open permission dialog
  const openPermissionDialog = (user: UserItem) => {
    setSelectedUser(user);
    // 初始化权限编辑状态
    const perms: PermissionEdit[] = menus.map(menu => {
      const supported = menu.supported_actions ? JSON.parse(menu.supported_actions) : [];
      const existing = user.menuPermissions.find(p => p.menu_id === menu.id);
      // 默认 permissions: view=true, 其他=false
      const defaultPerms: Record<string, boolean> = {};
      supported.forEach((action: string) => {
        defaultPerms[action] = action === 'view';
      });
      return {
        menu_id: menu.id,
        menu_name: menu.name,
        path: menu.path,
        supported_actions: supported,
        permissions: existing?.permissions || defaultPerms,
      };
    });
    setEditingPermissions(perms);
    setShowPermissionDialog(true);
  };

  // Update single permission
  const updatePermission = (menuId: number, action: string, checked: boolean) => {
    setEditingPermissions(prev => prev.map(p => {
      if (p.menu_id === menuId) {
        return {
          ...p,
          permissions: { ...p.permissions, [action]: checked },
        };
      }
      return p;
    }));
  };

  // Toggle all permissions for a menu (access toggle)
  const toggleMenuAccess = (menuId: number, checked: boolean) => {
    setEditingPermissions(prev => prev.map(p => {
      if (p.menu_id === menuId) {
        const newPerms: Record<string, boolean> = {};
        p.supported_actions.forEach(action => {
          // 勾选菜单时默认只开启查看，取消勾选时关闭所有
          newPerms[action] = checked ? (action === 'view') : false;
        });
        return { ...p, permissions: newPerms };
      }
      return p;
    }));
  };

  // Save permissions
  const savePermissions = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sys/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: editingPermissions }),
      });
      const data = await res.json();
      if (data.user) {
        setShowPermissionDialog(false);
        fetchUsers();
      } else {
        setError(data.error || '保存失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Build menu tree for display
  const buildMenuTree = (menuList: MenuOption[]): (MenuOption & { children: MenuOption[] })[] => {
    const roots = menuList.filter(m => m.parent_id === null);
    return roots.map(root => ({
      ...root,
      children: menuList.filter(m => m.parent_id === root.id),
    }));
  };

  const menuTree = buildMenuTree(menus);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">加载中...</div>;
  }

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">用户管理</h1>
        <button
          onClick={() => { setShowAddDialog(true); setError(''); }}
          className="px-4 py-2 bg-[#1e3a5f] text-white rounded hover:opacity-90"
        >
          新增用户
        </button>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="搜索用户名或显示名..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
        />
      </div>

      {/* User table */}
      <div className="bg-white rounded shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">用户名</th>
              <th className="px-4 py-3 text-left">显示名</th>
              <th className="px-4 py-3 text-left">类型</th>
              <th className="px-4 py-3 text-left">状态</th>
              <th className="px-4 py-3 text-left">密码</th>
              <th className="px-4 py-3 text-left">操作</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map(user => (
              <tr key={user.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{user.username}</td>
                <td className="px-4 py-3">{user.display_name || '-'}</td>
                <td className="px-4 py-3">
                  {user.is_super_admin ? (
                    <span className="text-[#1e3a5f] font-medium">超级管理员</span>
                  ) : '普通用户'}
                </td>
                <td className="px-4 py-3">
                  <span className={user.is_active ? 'text-green-600' : 'text-red-600'}>
                    {user.is_active ? '启用' : '禁用'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {user.must_change_password ? (
                    <span className="text-orange-600">待修改</span>
                  ) : '正常'}
                </td>
                <td className="px-4 py-3 space-x-2">
                  <button
                    onClick={() => {
                      setSelectedUser(user);
                      setFormDisplayName(user.display_name || '');
                      setFormIsActive(user.is_active);
                      setError('');
                      setShowEditDialog(true);
                    }}
                    className="text-[#1e3a5f] hover:underline"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => openPermissionDialog(user)}
                    className="text-[#1e3a5f] hover:underline"
                  >
                    权限
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.id)}
                    className="text-[#1e3a5f] hover:underline"
                  >
                    重置密码
                  </button>
                  <button
                    onClick={() => handleDeleteUser(user.id, user.username)}
                    disabled={user.username === '10020580' || user.username === currentUser?.username}
                    className={`hover:underline ${
                      user.username === '10020580' || user.username === currentUser?.username
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-red-600'
                    }`}
                  >
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredUsers.length === 0 && (
          <div className="p-8 text-center text-gray-500">暂无用户</div>
        )}
      </div>

      {/* Add User Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">新增用户</h2>
            {error && <div className="mb-3 p-2 bg-red-100 text-red-600 rounded text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">用户名</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={e => setFormUsername(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">显示名</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={e => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                />
                <label className="text-sm">启用账户</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                disabled={submitting}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '添加中...' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-bold mb-4">编辑用户</h2>
            <p className="text-sm text-gray-500 mb-4">用户名：{selectedUser.username}</p>
            {error && <div className="mb-3 p-2 bg-red-100 text-red-600 rounded text-sm">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">显示名</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={e => setFormDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formIsActive}
                  onChange={e => setFormIsActive(e.target.checked)}
                />
                <label className="text-sm">启用账户</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleEditUser}
                disabled={submitting}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      {showPermissionDialog && selectedUser && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded shadow-lg p-6 w-full max-w-3xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-2">配置权限</h2>
            <p className="text-sm text-gray-500 mb-4">
              用户：{selectedUser.username} ({selectedUser.display_name || '普通用户'})
            </p>
            <p className="text-xs text-gray-400 mb-4 border-b pb-3">
              勾选菜单表示可访问，勾选操作权限表示可执行对应操作。默认只开启查看权限。
            </p>
            {error && <div className="mb-3 p-2 bg-red-100 text-red-600 rounded text-sm">{error}</div>}
            
            {/* Permission table */}
            <table className="w-full text-sm border">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left border-b w-32">可访问</th>
                  <th className="px-3 py-2 text-left border-b">菜单名称</th>
                  <th className="px-3 py-2 text-left border-b w-20">路径</th>
                  {['新增', '修改', '删除', '导出', '初始化', '下发', '重置密码', '配置权限'].map(label => (
                    <th key={label} className="px-2 py-2 text-center border-b w-16">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {menuTree.map(parent => {
                  const parentPerm = editingPermissions.find(p => p.menu_id === parent.id);
                  if (!parentPerm) return null;
                  const parentHasAccess = parentPerm.permissions['view'] === true || 
                    Object.values(parentPerm.permissions).some(v => v === true);
                  
                  return (
                    <>
                      {/* 父菜单行 */}
                      <tr key={parent.id} className="bg-gray-50/50">
                        <td className="px-3 py-2 border-b">
                          {parentPerm.supported_actions.length > 0 ? (
                            <input
                              type="checkbox"
                              checked={parentHasAccess}
                              onChange={e => toggleMenuAccess(parent.id, e.target.checked)}
                            />
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-3 py-2 border-b font-medium">{parent.name}</td>
                        <td className="px-3 py-2 border-b text-gray-400">{parent.path || '-'}</td>
                        {['add', 'edit', 'delete', 'export', 'init', 'publish', 'reset_password', 'config_permission'].map(action => (
                          <td key={action} className="px-2 py-2 text-center border-b">
                            {parentPerm.supported_actions.includes(action) ? (
                              <input
                                type="checkbox"
                                checked={parentPerm.permissions[action] === true}
                                onChange={e => updatePermission(parent.id, action, e.target.checked)}
                              />
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                      {/* 子菜单行 */}
                      {parent.children.map(child => {
                        const childPerm = editingPermissions.find(p => p.menu_id === child.id);
                        if (!childPerm) return null;
                        const childHasAccess = childPerm.permissions['view'] === true || 
                          Object.values(childPerm.permissions).some(v => v === true);
                        
                        return (
                          <tr key={child.id} className="border-b hover:bg-gray-50">
                            <td className="px-3 py-2 pl-6">
                              {childPerm.supported_actions.length > 0 ? (
                                <input
                                  type="checkbox"
                                  checked={childHasAccess}
                                  onChange={e => toggleMenuAccess(child.id, e.target.checked)}
                                />
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-2 pl-6">{child.name}</td>
                            <td className="px-3 py-2 text-gray-500">{child.path || '-'}</td>
                            {['add', 'edit', 'delete', 'export', 'init', 'publish', 'reset_password', 'config_permission'].map(action => (
                              <td key={action} className="px-2 py-2 text-center">
                                {childPerm.supported_actions.includes(action) ? (
                                  <input
                                    type="checkbox"
                                    checked={childPerm.permissions[action] === true}
                                    onChange={e => updatePermission(child.id, action, e.target.checked)}
                                  />
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </>
                  );
                })}
              </tbody>
            </table>
            
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowPermissionDialog(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={savePermissions}
                disabled={submitting}
                className="px-4 py-2 bg-[#1e3a5f] text-white rounded hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}