'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';

interface UserItem {
  id: number;
  username: string;
  display_name: string | null;
  is_super_admin: boolean;
  must_change_password: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  menuIds: number[];
}

interface MenuOption {
  id: number;
  name: string;
  parent_id: number | null;
  path: string | null;
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
  const [selectedMenuIds, setSelectedMenuIds] = useState<number[]>([]);

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
    } catch (e) {
      console.error('获取用户列表失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch('/api/sys/menus');
      const data = await res.json();
      if (data.menus) setMenus(data.menus);
    } catch (e) {
      console.error('获取菜单列表失败', e);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchMenus();
  }, [fetchUsers, fetchMenus]);

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
    // B008: Prevent super admin from deleting themselves
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

  // Update permissions
  const handleSavePermissions = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch(`/api/sys/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuIds: selectedMenuIds }),
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

  const toggleMenuId = (menuId: number) => {
    setSelectedMenuIds(prev =>
      prev.includes(menuId) ? prev.filter(id => id !== menuId) : [...prev, menuId]
    );
  };

  // Build menu tree for display
  const topMenus = menus.filter(m => m.parent_id === null);
  const getSubMenus = (parentId: number) => menus.filter(m => m.parent_id === parentId);

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
                            onClick={() => {
                              setSelectedUser(u);
                              setSelectedMenuIds(u.menuIds || []);
                              setError('');
                              setShowPermissionDialog(true);
                            }}
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
          <div className="w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-1">菜单权限设置</h2>
            <p className="text-sm text-muted-foreground mb-4">用户: {selectedUser.username} ({selectedUser.display_name || '-'})</p>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

            <div className="space-y-3">
              {topMenus.map(top => {
                const subMenus = getSubMenus(top.id);
                const allSubIds = subMenus.map(s => s.id);
                const checkedSubIds = selectedMenuIds.filter(id => allSubIds.includes(id));
                const allChecked = subMenus.length > 0 && checkedSubIds.length === subMenus.length;

                return (
                  <div key={top.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center gap-2 mb-2">
                      {subMenus.length > 0 ? (
                        <input
                          type="checkbox"
                          checked={allChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMenuIds(prev => [...new Set([...prev, ...allSubIds])]);
                            } else {
                              setSelectedMenuIds(prev => prev.filter(id => !allSubIds.includes(id)));
                            }
                          }}
                          className="h-4 w-4 rounded border-border"
                        />
                      ) : (
                        <input
                          type="checkbox"
                          checked={selectedMenuIds.includes(top.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMenuIds(prev => [...prev, top.id]);
                            } else {
                              setSelectedMenuIds(prev => prev.filter(id => id !== top.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-border"
                        />
                      )}
                      <span className="text-sm font-medium">{top.name}</span>
                    </div>
                    {subMenus.length > 0 && (
                      <div className="ml-6 space-y-1.5">
                        {subMenus.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedMenuIds.includes(sub.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMenuIds(prev => [...prev, sub.id]);
                                } else {
                                  setSelectedMenuIds(prev => prev.filter(id => id !== sub.id));
                                }
                              }}
                              className="h-4 w-4 rounded border-border"
                            />
                            <span className="text-sm text-muted-foreground">{sub.name}</span>
                          </div>
                        ))}
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
