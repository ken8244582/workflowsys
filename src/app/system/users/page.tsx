'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Key, Settings, Check } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

interface MenuFunction {
  id: number;
  menu_id: number;
  function_code: string;
  function_name: string;
  sort_order: number;
}

interface MenuWithFunctions {
  menu_id: number;
  menu_name: string;
  menu_path: string | null;
  parent_id: number | null;
  functions: MenuFunction[];
  checkedFunctions?: Record<string, boolean>;
}

interface UserFunctionPermission {
  id: number;
  user_id: number;
  menu_id: number;
  function_code: string;
  is_enabled: boolean;
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
}

interface MenuOption {
  id: number;
  name: string;
  parent_id: number | null;
  path: string | null;
}

// Permission state for editing - tree structure
interface PermissionNode {
  menu_id: number;
  menu_name: string;
  menu_path: string | null;
  parent_id: number | null;
  functions: MenuFunction[];
  checkedFunctions: Record<string, boolean>; // function_code -> is_enabled
  expanded: boolean;
  children: PermissionNode[];
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
  const [permissionTree, setPermissionTree] = useState<PermissionNode[]>([]);
  const [expandedMenuIds, setExpandedMenuIds] = useState<Set<number>>(new Set());
  const [permLoading, setPermLoading] = useState(false);

  // Form states
  const [formUsername, setFormUsername] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
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

  // Build top menus
  const topMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.id - b.id);
  const getSubMenus = (parentId: number) => menus.filter(m => m.parent_id === parentId);

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
  const handleDeleteUser = async (userId: number, username: string, isSuperAdmin: boolean) => {
    // 只有超级管理员无法删除（无论是什么账号登录）
    if (isSuperAdmin) {
      alert('超级管理员账户不能删除');
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

  // Open permission dialog - fetch menu functions and user permissions
  const openPermissionDialog = async (user: UserItem) => {
    if (user.is_super_admin) {
      alert('超级管理员拥有所有权限，无需配置');
      return;
    }
    setSelectedUser(user);
    setPermLoading(true);
    setShowPermissionDialog(true);
    setError('');

    try {
      // Fetch all menu functions and user's current permissions
      const res = await fetch(`/api/sys/user-functions?user_id=${user.id}`);
      const data = await res.json();

      if (data.menuFunctionTree && data.menus) {
        // Build permission tree directly from API data
        const tree = buildPermissionTreeFromApi(data.menuFunctionTree);
        setPermissionTree(tree);
        // Auto-expand menus that have functions configured
        setExpandedMenuIds(new Set(tree.filter(t => t.functions.length > 0 || t.children.some(c => c.functions.length > 0)).map(t => t.menu_id)));
      }
    } catch (e) {
      console.error('获取权限数据失败', e);
      setError('获取权限数据失败');
    } finally {
      setPermLoading(false);
    }
  };

  // Build permission tree directly from API response
  const buildPermissionTreeFromApi = (menuFunctionTree: MenuWithFunctions[]): PermissionNode[] => {
    // Find root menus (parent_id === null)
    const roots = menuFunctionTree.filter(m => m.parent_id === null);

    return roots.map(root => {
      // Find children of this root
      const children = menuFunctionTree
        .filter(m => m.parent_id === root.menu_id)
        .map(child => ({
          menu_id: child.menu_id,
          menu_name: child.menu_name,
          menu_path: child.menu_path,
          parent_id: child.parent_id,
          functions: child.functions || [],
          checkedFunctions: child.checkedFunctions || {},
          expanded: false,
          children: []
        }));

      return {
        menu_id: root.menu_id,
        menu_name: root.menu_name,
        menu_path: root.menu_path,
        parent_id: root.parent_id,
        functions: root.functions || [],
        checkedFunctions: root.checkedFunctions || {},
        expanded: false,
        children
      };
    });
  };

  // Build permission tree from API data (legacy - kept for reference)
  const buildPermissionTree = (
    menuFunctions: MenuWithFunctions[],
    menuList: MenuOption[]
  ): PermissionNode[] => {
    const roots = menuList.filter(m => m.parent_id === null);

    return roots.map(root => {
      const menuFunc = menuFunctions.find(mf => mf.menu_id === root.id) || {
        menu_id: root.id,
        menu_name: root.name,
        menu_path: root.path,
        parent_id: root.parent_id,
        functions: []
      };

      const children = menuList
        .filter(m => m.parent_id === root.id)
        .map(child => {
          const childFunc = menuFunctions.find(mf => mf.menu_id === child.id) || {
            menu_id: child.id,
            menu_name: child.name,
            menu_path: child.path,
            parent_id: child.parent_id,
            functions: []
          };
          return {
            menu_id: child.id,
            menu_name: child.name,
            menu_path: child.path,
            parent_id: child.parent_id,
            functions: childFunc.functions || [],
            checkedFunctions: {},
            expanded: false,
            children: []
          };
        });

      return {
        menu_id: root.id,
        menu_name: root.name,
        menu_path: root.path,
        parent_id: root.parent_id,
        functions: menuFunc.functions || [],
        checkedFunctions: {},
        expanded: false,
        children
      };
    });
  };

  // Toggle menu expand
  const toggleExpand = (menuId: number) => {
    const newSet = new Set(expandedMenuIds);
    if (newSet.has(menuId)) {
      newSet.delete(menuId);
    } else {
      newSet.add(menuId);
    }
    setExpandedMenuIds(newSet);
  };

  // Toggle function checkbox
  const toggleFunction = (menuId: number, functionCode: string, checked: boolean) => {
    setPermissionTree(prev => {
      const updateNode = (nodes: PermissionNode[]): PermissionNode[] => {
        return nodes.map(node => {
          if (node.menu_id === menuId) {
            return {
              ...node,
              checkedFunctions: { ...node.checkedFunctions, [functionCode]: checked }
            };
          }
          if (node.children.length > 0) {
            return {
              ...node,
              children: updateNode(node.children)
            };
          }
          return node;
        });
      };
      return updateNode(prev);
    });
  };

  // Toggle all functions for a menu
  const toggleAllFunctions = (menuId: number, checked: boolean) => {
    setPermissionTree(prev => {
      const updateNode = (nodes: PermissionNode[]): PermissionNode[] => {
        return nodes.map(node => {
          if (node.menu_id === menuId) {
            const newChecked: Record<string, boolean> = {};
            node.functions.forEach(f => {
              newChecked[f.function_code] = checked;
            });
            return { ...node, checkedFunctions: newChecked };
          }
          if (node.children.length > 0) {
            return { ...node, children: updateNode(node.children) };
          }
          return node;
        });
      };
      return updateNode(prev);
    });
  };

  // Save permissions
  const savePermissions = async () => {
    if (!selectedUser) return;
    setSubmitting(true);
    setError('');

    try {
      // Build permissions object from tree
      const permissions: Record<number, Record<string, boolean>> = {};

      const collectPermissions = (nodes: PermissionNode[]) => {
        nodes.forEach(node => {
          if (node.functions.length > 0) {
            permissions[node.menu_id] = node.checkedFunctions;
          }
          if (node.children.length > 0) {
            collectPermissions(node.children);
          }
        });
      };

      collectPermissions(permissionTree);

      const res = await fetch('/api/sys/user-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: selectedUser.id,
          permissions
        })
      });

      const data = await res.json();
      if (data.success) {
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

  if (loading) {
    return <div className="text-center py-20 text-muted-foreground">加载中...</div>;
  }

  if (!currentUser?.isSuperAdmin) {
    return <div className="text-center py-20 text-muted-foreground">无权限访问此页面</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1e3a5f]">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理系统用户账户和权限配置</p>
      </div>

      {/* Search and Add */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">用户列表</CardTitle>
            <Button
              onClick={() => { setShowAddDialog(true); setError(''); }}
              className="h-7 text-xs bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              新增用户
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Search input */}
          <div className="mb-4">
            <Input
              placeholder="搜索用户名或显示名..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </div>

          {/* User table */}
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="w-[15%]">用户名</TableHead>
                <TableHead className="w-[15%]">显示名</TableHead>
                <TableHead className="w-[12%]">类型</TableHead>
                <TableHead className="w-[8%]">状态</TableHead>
                <TableHead className="w-[8%]">密码</TableHead>
                <TableHead className="w-[32%]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                    暂无用户
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map(user => (
                  <TableRow key={user.id} className="hover:bg-muted/10">
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.display_name || '-'}</TableCell>
                    <TableCell>
                      {user.is_super_admin ? (
                        <Badge variant="outline" className="text-[#1e3a5f] border-[#1e3a5f]">超管</Badge>
                      ) : (
                        <Badge variant="outline">普通</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.is_active ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">启用</Badge>
                      ) : (
                        <Badge variant="outline" className="text-red-500 border-red-500">禁用</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.must_change_password ? (
                        <Badge variant="outline" className="text-orange-600 border-orange-600">待修改</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">正常</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                          onClick={() => {
                            setSelectedUser(user);
                            setFormDisplayName(user.display_name || '');
                            setFormIsActive(user.is_active);
                            setError('');
                            setShowEditDialog(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5 mr-1" />
                          编辑
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-amber-600 hover:text-amber-600 hover:bg-amber-600/10"
                          onClick={() => openPermissionDialog(user)}
                          disabled={user.is_super_admin}
                        >
                          <Settings className="h-3 w-3 mr-1" />
                          权限
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                          onClick={() => handleResetPassword(user.id)}
                        >
                          <Key className="h-3 w-3 mr-1" />
                          重置密码
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDeleteUser(user.id, user.username, user.is_super_admin)}
                          disabled={user.is_super_admin}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1" />
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add User Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>新增用户</DialogTitle>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>用户名 *</Label>
              <Input
                value={formUsername}
                onChange={(e) => setFormUsername(e.target.value)}
                placeholder="输入用户名"
              />
            </div>
            <div className="space-y-2">
              <Label>显示名</Label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="输入显示名"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="addIsActive"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(checked === true)}
              />
              <Label htmlFor="addIsActive" className="cursor-pointer">启用账户</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              取消
            </Button>
            <Button onClick={handleAddUser} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {submitting ? '添加中...' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) setSelectedUser(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>用户名：{selectedUser?.username}</DialogDescription>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>显示名</Label>
              <Input
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                placeholder="输入显示名"
              />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="editIsActive"
                checked={formIsActive}
                onCheckedChange={(checked) => setFormIsActive(checked === true)}
              />
              <Label htmlFor="editIsActive" className="cursor-pointer">启用账户</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button onClick={handleEditUser} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Permission Config Dialog */}
      <Dialog open={showPermissionDialog} onOpenChange={setShowPermissionDialog}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>权限配置</DialogTitle>
            <DialogDescription>
              用户：{selectedUser?.username} ({selectedUser?.display_name || '普通用户'})
              <br />
              <span className="text-xs">勾选菜单下的功能操作，开通对应权限。未勾选的功能将无法使用。</span>
            </DialogDescription>
          </DialogHeader>

          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}

          <div className="flex-1 overflow-y-auto py-4">
            {permLoading ? (
              <div className="text-center py-10 text-muted-foreground">加载权限数据...</div>
            ) : (
              <div className="space-y-2">
                {permissionTree.map(parentNode => {
                  const isExpanded = expandedMenuIds.has(parentNode.menu_id);
                  const hasFunctions = parentNode.functions.length > 0 || parentNode.children.some(c => c.functions.length > 0);

                  if (!hasFunctions) return null;

                  return (
                    <div key={parentNode.menu_id} className="border rounded-lg overflow-hidden">
                      {/* Parent menu header */}
                      <div
                        className="flex items-center justify-between p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => toggleExpand(parentNode.menu_id)}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-shrink-0" style={{ maxWidth: '240px' }}>
                          {parentNode.children.length > 0 ? (
                            isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <span className="font-medium truncate whitespace-nowrap" title={parentNode.menu_name}>{parentNode.menu_name}</span>
                          {parentNode.menu_path && (
                            <span className="text-xs text-muted-foreground font-mono flex-shrink-0 ml-2">{parentNode.menu_path}</span>
                          )}
                        </div>
                        {/* Parent functions */}
                        {parentNode.functions.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap justify-end ml-4">
                            {parentNode.functions.map(func => (
                              <Badge
                                key={func.function_code}
                                variant={parentNode.checkedFunctions[func.function_code] ? "default" : "outline"}
                                className={`cursor-pointer px-2.5 py-1 text-xs transition-all ${
                                  parentNode.checkedFunctions[func.function_code]
                                    ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                                    : 'border-muted-foreground/30 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFunction(parentNode.menu_id, func.function_code, !parentNode.checkedFunctions[func.function_code]);
                                }}
                              >
                                {func.function_name}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Child menus */}
                      {isExpanded && parentNode.children.map(childNode => {
                        if (childNode.functions.length === 0) return null;

                        return (
                          <div key={childNode.menu_id} className="flex items-center justify-between p-3 pl-10 border-t bg-white hover:bg-muted/10 transition-colors">
                            <div className="flex items-center gap-3 min-w-0 flex-shrink-0" style={{ maxWidth: '220px' }}>
                              <span className="text-sm truncate whitespace-nowrap" title={childNode.menu_name}>{childNode.menu_name}</span>
                              {childNode.menu_path && (
                                <span className="text-xs text-muted-foreground font-mono flex-shrink-0">{childNode.menu_path}</span>
                              )}
                            </div>
                            {/* Child functions */}
                            <div className="flex items-center gap-1.5 flex-wrap justify-end ml-4">
                              {childNode.functions.map(func => (
                                <Badge
                                  key={func.function_code}
                                  variant={childNode.checkedFunctions[func.function_code] ? "default" : "outline"}
                                  className={`cursor-pointer px-2.5 py-1 text-xs transition-all ${
                                    childNode.checkedFunctions[func.function_code]
                                      ? 'bg-[#1e3a5f] text-white border-[#1e3a5f]'
                                      : 'border-muted-foreground/30 hover:border-[#1e3a5f] hover:text-[#1e3a5f]'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleFunction(childNode.menu_id, func.function_code, !childNode.checkedFunctions[func.function_code]);
                                  }}
                                >
                                  {func.function_name}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}

                {permissionTree.every(p => p.functions.length === 0 && p.children.every(c => c.functions.length === 0)) && (
                  <div className="text-center py-10 text-muted-foreground">
                    暂无可配置的功能权限，请先在菜单管理中配置各菜单的功能
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPermissionDialog(false)}>
              取消
            </Button>
            <Button onClick={savePermissions} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}