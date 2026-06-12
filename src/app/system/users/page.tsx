'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';

interface MenuPermission {
  menu_id: number;
  menu_name: string;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
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

// 权限编辑状态
interface PermissionEdit {
  menu_id: number;
  can_view: boolean;
  can_add: boolean;
  can_edit: boolean;
  can_delete: boolean;
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
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit user
  const handleEditUser = async () => {
    if (!selectedUser) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sys/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_name: formDisplayName.trim(), is_active: formIsActive }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditDialog(false);
        setSelectedUser(null);
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
  const handleDeleteUser = async (userId: number) => {
    if (currentUser?.userId === userId) {
      alert('不能删除当前登录用户');
      return;
    }
    if (!confirm('确定要删除该用户吗？')) return;
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
    if (!confirm('确定要重置该用户密码吗？重置后用户需要重新设置密码。')) return;
    try {
      const res = await fetch(`/api/sys/users/${userId}/reset-password`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert('密码已重置为默认密码，用户下次登录需要设置新密码');
        fetchUsers();
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
    // Convert user's current permissions to edit state
    const permMap = new Map<number, MenuPermission>();
    user.menuPermissions.forEach(p => permMap.set(p.menu_id, p));
    
    // Build permission edit state for all leaf menus (menus with paths)
    const edits: PermissionEdit[] = menus
      .filter(m => m.path) // Only menus with paths have actions
      .map(m => {
        const existing = permMap.get(m.id);
        const supported = m.supported_actions ? JSON.parse(m.supported_actions) : ['view'];
        return {
          menu_id: m.id,
          can_view: existing?.can_view ?? true, // Default view permission
          can_add: existing?.can_add ?? false,
          can_edit: existing?.can_edit ?? false,
          can_delete: existing?.can_delete ?? false,
        };
      });
    
    setEditingPermissions(edits);
    setError('');
    setShowPermissionDialog(true);
  };

  // Update permission in editing state
  const updatePermission = (menuId: number, action: 'can_view' | 'can_add' | 'can_edit' | 'can_delete', value: boolean) => {
    setEditingPermissions(prev => prev.map(p => 
      p.menu_id === menuId ? { ...p, [action]: value } : p
    ));
  };

  // Toggle all permissions for a menu
  const toggleMenuPermissions = (menuId: number, checked: boolean) => {
    const menu = menus.find(m => m.id === menuId);
    const supported = menu?.supported_actions ? JSON.parse(menu.supported_actions) : ['view'];
    
    setEditingPermissions(prev => prev.map(p => {
      if (p.menu_id === menuId) {
        if (checked) {
          // Enable all supported actions
          return {
            ...p,
            can_view: supported.includes('view'),
            can_add: supported.includes('add'),
            can_edit: supported.includes('edit'),
            can_delete: supported.includes('delete'),
          };
        } else {
          // Disable all but keep view (default minimum)
          return { ...p, can_view: true, can_add: false, can_edit: false, can_delete: false };
        }
      }
      return p;
    }));
  };

  // Save permissions
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');
    try {
      // Filter to only permissions that have at least can_view=true
      const permissionsToSend = editingPermissions
        .filter(p => p.can_view)
        .map(p => ({
          menu_id: p.menu_id,
          can_view: p.can_view,
          can_add: p.can_add,
          can_edit: p.can_edit,
          can_delete: p.can_delete,
        }));

      const res = await fetch(`/api/sys/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuPermissions: permissionsToSend }),
      });
      const data = await res.json();
      if (data.success) {
        setShowPermissionDialog(false);
        setSelectedUser(null);
        fetchUsers();
      } else {
        setError(data.error || '保存权限失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Build menu tree for display
  const topMenus = menus.filter(m => m.parent_id === null);
  const getSubMenus = (parentId: number) => menus.filter(m => m.parent_id === parentId);

  // Get permission edit for a menu
  const getPermissionEdit = (menuId: number): PermissionEdit | undefined => 
    editingPermissions.find(p => p.menu_id === menuId);

  // Check if a menu has any permission enabled (beyond just view)
  const hasActionPermission = (menuId: number): boolean => {
    const p = getPermissionEdit(menuId);
    return p ? (p.can_add || p.can_edit || p.can_delete) : false;
  };

  if (!currentUser?.isSuperAdmin) {
    return <div className="text-center py-20 text-muted-foreground">无权限访问此页面</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理系统用户账号和权限</p>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center gap-3">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="搜索用户名/姓名..."
          className="w-64 rounded-lg border border-border bg-white px-3 py-2 text-sm placeholder:text-muted-foreground/50 focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
        />
        <button
          onClick={() => {
            setFormUsername('');
            setFormDisplayName('');
            setFormIsActive(true);
            setError('');
            setShowAddDialog(true);
          }}
          className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 transition-colors"
        >
          添加用户
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">用户名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">姓名</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">角色</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">密码状态</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">创建时间</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/10">
                  <td className="px-4 py-3 font-medium text-foreground">{u.username}</td>
                  <td className="px-4 py-3 text-foreground">{u.display_name || '-'}</td>
                  <td className="px-4 py-3">
                    {u.is_super_admin ? (
                      <span className="inline-flex items-center rounded-full bg-[#f59e0b]/10 px-2 py-0.5 text-xs font-medium text-[#f59e0b]">超级管理员</span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">普通用户</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="text-green-600">启用</span>
                    ) : (
                      <span className="text-red-500">禁用</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {u.must_change_password ? (
                      <span className="text-[#f59e0b]">待修改</span>
                    ) : (
                      <span className="text-muted-foreground">正常</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!u.is_super_admin && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedUser(u);
                              setFormDisplayName(u.display_name || '');
                              setFormIsActive(u.is_active);
                              setError('');
                              setShowEditDialog(true);
                            }}
                            className="text-[#1e3a5f] hover:underline text-xs"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => openPermissionDialog(u)}
                            className="text-[#1e3a5f] hover:underline text-xs"
                          >
                            权限
                          </button>
                          <button
                            onClick={() => handleResetPassword(u.id)}
                            className="text-[#f59e0b] hover:underline text-xs"
                          >
                            重置密码
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className={`text-xs ${currentUser?.userId === u.id ? 'text-gray-300 cursor-not-allowed' : 'text-red-500 hover:underline'}`}
                            disabled={currentUser?.userId === u.id}
                            title={currentUser?.userId === u.id ? '不能删除当前登录用户' : ''}
                          >
                            删除
                          </button>
                        </>
                      )}
                      {u.is_super_admin && (
                        <span className="text-xs text-muted-foreground">系统账号</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add User Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">添加用户</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">用户名</label>
                <input
                  type="text"
                  value={formUsername}
                  onChange={(e) => setFormUsername(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="请输入用户名"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">姓名</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="请输入姓名"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="addIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="addIsActive" className="text-sm">启用账号</label>
              </div>
              <p className="text-xs text-muted-foreground">默认密码: 123456，用户首次登录需修改密码</p>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleAddUser}
                disabled={submitting}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Dialog */}
      {showEditDialog && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">编辑用户</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">用户名</label>
                <input
                  type="text"
                  value={selectedUser.username}
                  disabled
                  className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">姓名</label>
                <input
                  type="text"
                  value={formDisplayName}
                  onChange={(e) => setFormDisplayName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="请输入姓名"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="editIsActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-border"
                />
                <label htmlFor="editIsActive" className="text-sm">启用账号</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowEditDialog(false); setSelectedUser(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleEditUser}
                disabled={submitting}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors"
              >
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Dialog */}
      {showPermissionDialog && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-3xl rounded-xl border border-border bg-white p-6 shadow-xl max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">菜单权限设置</h2>
            <p className="text-sm text-muted-foreground mb-4">用户: {selectedUser.username} ({selectedUser.display_name || '-'})</p>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            
            <div className="mb-3 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
              提示：勾选菜单表示可访问，勾选操作权限表示可执行对应操作。默认只开启查看权限。
            </div>

            <div className="space-y-3">
              {topMenus.map(top => {
                const subMenus = getSubMenus(top.id).filter(s => s.path); // Only show menus with paths
                
                return (
                  <div key={top.id} className="rounded-lg border border-border">
                    <div className="bg-muted/20 px-4 py-2 border-b border-border">
                      <span className="text-sm font-medium text-[#1e3a5f]">{top.name}</span>
                    </div>
                    {subMenus.length > 0 && (
                      <div className="p-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="w-[30%] text-left pb-2 font-medium">菜单名称</th>
                              <th className="w-[15%] text-center pb-2 font-medium">可访问</th>
                              <th className="w-[15%] text-center pb-2 font-medium">新增</th>
                              <th className="w-[15%] text-center pb-2 font-medium">修改</th>
                              <th className="w-[15%] text-center pb-2 font-medium">删除</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subMenus.map(sub => {
                              const perm = getPermissionEdit(sub.id);
                              const supported = sub.supported_actions ? JSON.parse(sub.supported_actions) : ['view'];
                              const hasAdd = supported.includes('add');
                              const hasEdit = supported.includes('edit');
                              const hasDelete = supported.includes('delete');
                              const hasExport = supported.includes('export');
                              const hasImport = supported.includes('import');
                              const hasResetPwd = supported.includes('reset_password');
                              
                              return (
                                <tr key={sub.id} className="border-t border-border/50">
                                  <td className="py-2.5 text-foreground">{sub.name}</td>
                                  <td className="py-2.5 text-center">
                                    <input
                                      type="checkbox"
                                      checked={perm?.can_view ?? false}
                                      onChange={(e) => updatePermission(sub.id, 'can_view', e.target.checked)}
                                      className="h-4 w-4 rounded border-border"
                                    />
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {hasAdd && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_add ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_add', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                      />
                                    )}
                                    {!hasAdd && hasImport && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_add ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_add', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                        title="导入"
                                      />
                                    )}
                                    {!hasAdd && !hasImport && <span className="text-muted-foreground/40">-</span>}
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {hasEdit && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_edit ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_edit', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                      />
                                    )}
                                    {!hasEdit && <span className="text-muted-foreground/40">-</span>}
                                  </td>
                                  <td className="py-2.5 text-center">
                                    {hasDelete && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_delete ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_delete', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                      />
                                    )}
                                    {!hasDelete && !hasExport && !hasResetPwd && <span className="text-muted-foreground/40">-</span>}
                                    {!hasDelete && hasExport && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_delete ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_delete', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                        title="导出"
                                      />
                                    )}
                                    {!hasDelete && hasResetPwd && (
                                      <input
                                        type="checkbox"
                                        checked={perm?.can_delete ?? false}
                                        onChange={(e) => updatePermission(sub.id, 'can_delete', e.target.checked)}
                                        className="h-4 w-4 rounded border-border"
                                        title="重置密码"
                                      />
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => { setShowPermissionDialog(false); setSelectedUser(null); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSavePermissions}
                disabled={submitting}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors"
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