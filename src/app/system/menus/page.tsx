'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ChevronRight, ChevronDown, Plus, Pencil, Trash2, Settings, Check, X } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

interface SysMenu {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  sort_order: number;
  is_visible: boolean;
}

interface MenuFunction {
  id: number;
  menu_id: number;
  function_code: string;
  function_name: string;
  sort_order: number;
}

// Default function templates
const DEFAULT_FUNCTIONS = [
  { code: 'view', name: '查看', order: 1 },
  { code: 'add', name: '新增', order: 2 },
  { code: 'edit', name: '编辑', order: 3 },
  { code: 'delete', name: '删除', order: 4 },
  { code: 'export', name: '导出', order: 5 },
  { code: 'import', name: '导入', order: 6 },
  { code: 'init', name: '初始化', order: 7 },
  { code: 'publish', name: '发布', order: 8 },
  { code: 'reset_password', name: '重置密码', order: 9 },
  { code: 'config_permission', name: '权限配置', order: 10 },
  { code: 'config_function', name: '功能配置', order: 11 },
];

export default function MenusPage() {
  const { user } = useAuth();
  const [menus, setMenus] = useState<SysMenu[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Add/Edit dialog state
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<SysMenu | null>(null);
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsVisible, setFormIsVisible] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Function config dialog state
  const [showFuncDialog, setShowFuncDialog] = useState(false);
  const [funcMenuId, setFuncMenuId] = useState<number | null>(null);
  const [funcMenuName, setFuncMenuName] = useState('');
  const [menuFunctions, setMenuFunctions] = useState<MenuFunction[]>([]);
  const [funcLoading, setFuncLoading] = useState(false);

  const topMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);
  const getSubMenus = (parentId: number) => menus.filter(m => m.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  const toggleExpand = (id: number) => {
    const newSet = new Set(expandedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedIds(newSet);
  };

  const fetchMenus = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sys/menus');
      const data = await res.json();
      if (data.menus) {
        setMenus(data.menus);
      } else if (data.error) {
        console.error('获取菜单失败:', data.error);
      }
    } catch {
      console.error('获取菜单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  // Fetch menu functions
  const fetchMenuFunctions = async (menuId: number) => {
    setFuncLoading(true);
    try {
      const res = await fetch(`/api/sys/menu-functions?menu_id=${menuId}`);
      const data = await res.json();
      setMenuFunctions(data.functions || []);
    } catch {
      console.error('获取菜单功能失败');
      setMenuFunctions([]);
    } finally {
      setFuncLoading(false);
    }
  };

  // Open function config dialog
  const openFuncDialog = (menu: SysMenu) => {
    setFuncMenuId(menu.id);
    setFuncMenuName(menu.name);
    fetchMenuFunctions(menu.id);
    setShowFuncDialog(true);
  };

  // Add function to menu
  const handleAddFunction = async (template: { code: string; name: string; order: number }) => {
    if (!funcMenuId) return;
    // Check if already exists
    if (menuFunctions.some(f => f.function_code === template.code)) {
      return;
    }
    try {
      const res = await fetch('/api/sys/menu-functions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          menu_id: funcMenuId,
          function_code: template.code,
          function_name: template.name,
          sort_order: template.order
        })
      });
      const data = await res.json();
      if (data.function) {
        setMenuFunctions([...menuFunctions, data.function].sort((a, b) => a.sort_order - b.sort_order));
      }
    } catch {
      console.error('添加功能失败');
    }
  };

  // Remove function from menu
  const handleRemoveFunction = async (funcId: number) => {
    try {
      const res = await fetch(`/api/sys/menu-functions/${funcId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setMenuFunctions(menuFunctions.filter(f => f.id !== funcId));
      }
    } catch {
      console.error('删除功能失败');
    }
  };

  // Add menu
  const handleAddMenu = async () => {
    if (!formName.trim()) {
      setError('菜单名称不能为空');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/sys/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          path: formPath.trim() || null,
          icon: formIcon.trim() || null,
          parent_id: formParentId,
          sort_order: formSortOrder,
          is_visible: formIsVisible,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowAddDialog(false);
        resetForm();
        fetchMenus();
      } else {
        setError(data.error || '创建失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Edit menu
  const handleEditMenu = async () => {
    if (!selectedMenu) return;
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sys/menus/${selectedMenu.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          path: formPath.trim() || null,
          icon: formIcon.trim() || null,
          parent_id: formParentId,
          sort_order: formSortOrder,
          is_visible: formIsVisible,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowEditDialog(false);
        setSelectedMenu(null);
        resetForm();
        fetchMenus();
      } else {
        setError(data.error || '更新失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete menu
  const handleDeleteMenu = async (menuId: number, hasChildren: boolean) => {
    const msg = hasChildren
      ? '该菜单下有子菜单，删除后会一并删除所有子菜单。确定要删除吗？'
      : '确定要删除该菜单吗？';
    if (!confirm(msg)) return;
    try {
      const res = await fetch(`/api/sys/menus/${menuId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchMenus();
      } else {
        alert(data.error || '删除失败');
      }
    } catch {
      alert('网络错误');
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormPath('');
    setFormIcon('');
    setFormParentId(null);
    setFormSortOrder(0);
    setFormIsVisible(true);
    setError('');
  };

  if (!user?.isSuperAdmin) {
    return <div className="text-center py-20 text-muted-foreground">无权限访问此页面</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-[#1e3a5f]">菜单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理系统的菜单结构和功能配置</p>
      </div>

      {/* Menu List Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">菜单列表</CardTitle>
            <Button
              onClick={() => {
                resetForm();
                setShowAddDialog(true);
              }}
              className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              添加菜单
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">加载中...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-[25%]">菜单名称</TableHead>
                  <TableHead className="w-[20%]">路径</TableHead>
                  <TableHead className="w-[12%]">图标</TableHead>
                  <TableHead className="w-[8%]">排序</TableHead>
                  <TableHead className="w-[8%]">可见</TableHead>
                  <TableHead className="w-[25%]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topMenus.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                      暂无数据
                    </TableCell>
                  </TableRow>
                ) : (
                  topMenus.map(top => {
                    const subMenus = getSubMenus(top.id);
                    const isExpanded = expandedIds.has(top.id);

                    return (
                      <>
                        <TableRow key={top.id} className="hover:bg-muted/10">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {subMenus.length > 0 ? (
                                <button onClick={() => toggleExpand(top.id)} className="text-muted-foreground hover:text-foreground">
                                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                </button>
                              ) : (
                                <span className="w-4 inline-block" />
                              )}
                              <span className="font-medium">{top.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{top.path || '-'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{top.icon || '-'}</TableCell>
                          <TableCell className="text-muted-foreground">{top.sort_order}</TableCell>
                          <TableCell>
                            {top.is_visible ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">是</Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-500 border-red-500">否</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                                onClick={() => {
                                  setSelectedMenu(top);
                                  setFormName(top.name);
                                  setFormPath(top.path || '');
                                  setFormIcon(top.icon || '');
                                  setFormParentId(top.parent_id);
                                  setFormSortOrder(top.sort_order);
                                  setFormIsVisible(top.is_visible);
                                  setError('');
                                  setShowEditDialog(true);
                                }}
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-green-600 hover:text-green-600 hover:bg-green-600/10"
                                onClick={() => {
                                  resetForm();
                                  setFormParentId(top.id);
                                  setShowAddDialog(true);
                                }}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                添加子菜单
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                                onClick={() => handleDeleteMenu(top.id, subMenus.length > 0)}
                              >
                                <Trash2 className="h-3 w-3 mr-1" />
                                删除
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>

                        {isExpanded && subMenus.map(sub => (
                          <TableRow key={sub.id} className="bg-muted/5 hover:bg-muted/10">
                            <TableCell>
                              <div className="flex items-center gap-2 pl-6">
                                <span className="w-4 inline-block" />
                                <span>{sub.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">{sub.path || '-'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{sub.icon || '-'}</TableCell>
                            <TableCell className="text-muted-foreground">{sub.sort_order}</TableCell>
                            <TableCell>
                              {sub.is_visible ? (
                                <Badge variant="outline" className="text-green-600 border-green-600">是</Badge>
                              ) : (
                                <Badge variant="outline" className="text-red-500 border-red-500">否</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[#1e3a5f] hover:text-[#1e3a5f] hover:bg-[#1e3a5f]/10"
                                  onClick={() => {
                                    setSelectedMenu(sub);
                                    setFormName(sub.name);
                                    setFormPath(sub.path || '');
                                    setFormIcon(sub.icon || '');
                                    setFormParentId(sub.parent_id);
                                    setFormSortOrder(sub.sort_order);
                                    setFormIsVisible(sub.is_visible);
                                    setError('');
                                    setShowEditDialog(true);
                                  }}
                                >
                                  <Pencil className="h-3 w-3 mr-1" />
                                  编辑
                                </Button>
                                {sub.path && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-amber-600 hover:text-amber-600 hover:bg-amber-600/10"
                                    onClick={() => openFuncDialog(sub)}
                                  >
                                    <Settings className="h-3 w-3 mr-1" />
                                    功能配置
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-red-500 hover:text-red-500 hover:bg-red-500/10"
                                  onClick={() => handleDeleteMenu(sub.id, false)}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  删除
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Menu Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>添加菜单</DialogTitle>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>菜单名称 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="如：系统管理"
              />
            </div>
            <div className="space-y-2">
              <Label>路径</Label>
              <Input
                value={formPath}
                onChange={(e) => setFormPath(e.target.value)}
                placeholder="如：/system/users (一级菜单留空)"
              />
            </div>
            <div className="space-y-2">
              <Label>图标名称</Label>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
                placeholder="如：Settings (Lucide图标名)"
              />
            </div>
            <div className="space-y-2">
              <Label>上级菜单</Label>
              <Select
                value={formParentId?.toString() || ''}
                onValueChange={(v) => setFormParentId(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="无 (一级菜单)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无 (一级菜单)</SelectItem>
                  {topMenus.map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="addMenuVisible"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="addMenuVisible" className="cursor-pointer">显示在导航中</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleAddMenu} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {submitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Menu Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(open) => { setShowEditDialog(open); if (!open) { setSelectedMenu(null); resetForm(); }}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>编辑菜单</DialogTitle>
          </DialogHeader>
          {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>菜单名称 *</Label>
              <Input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>路径</Label>
              <Input
                value={formPath}
                onChange={(e) => setFormPath(e.target.value)}
                placeholder="如：/system/users"
              />
            </div>
            <div className="space-y-2">
              <Label>图标名称</Label>
              <Input
                value={formIcon}
                onChange={(e) => setFormIcon(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>上级菜单</Label>
              <Select
                value={formParentId?.toString() || ''}
                onValueChange={(v) => setFormParentId(v ? parseInt(v) : null)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="无 (一级菜单)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">无 (一级菜单)</SelectItem>
                  {topMenus.filter(m => m.id !== selectedMenu?.id).map(m => (
                    <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>排序号</Label>
              <Input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editMenuVisible"
                checked={formIsVisible}
                onChange={(e) => setFormIsVisible(e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="editMenuVisible" className="cursor-pointer">显示在导航中</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditDialog(false); setSelectedMenu(null); resetForm(); }}>
              取消
            </Button>
            <Button onClick={handleEditMenu} disabled={submitting} className="bg-[#1e3a5f] hover:bg-[#1e3a5f]/90">
              {submitting ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Function Config Dialog */}
      <Dialog open={showFuncDialog} onOpenChange={setShowFuncDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>功能配置 - {funcMenuName}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">配置该菜单支持的功能操作，用户权限配置时可勾选开通。</p>

            {funcLoading ? (
              <div className="text-center py-6 text-muted-foreground">加载中...</div>
            ) : (
              <>
                {/* Current Functions */}
                <div className="mb-4">
                  <Label className="mb-2 block">已配置功能</Label>
                  <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg min-h-[60px]">
                    {menuFunctions.length === 0 ? (
                      <span className="text-sm text-muted-foreground">暂无配置功能</span>
                    ) : (
                      menuFunctions.map(func => (
                        <Badge
                          key={func.id}
                          variant="secondary"
                          className="px-3 py-1 gap-1 cursor-pointer hover:bg-destructive/20"
                          onClick={() => handleRemoveFunction(func.id)}
                        >
                          {func.function_name}
                          <X className="h-3 w-3" />
                        </Badge>
                      ))
                    )}
                  </div>
                </div>

                {/* Available Functions */}
                <div>
                  <Label className="mb-2 block">可选功能模板</Label>
                  <div className="flex flex-wrap gap-2 p-3 border rounded-lg">
                    {DEFAULT_FUNCTIONS.filter(t => !menuFunctions.some(f => f.function_code === t.code)).map(template => (
                      <Badge
                        key={template.code}
                        variant="outline"
                        className="px-3 py-1 gap-1 cursor-pointer hover:bg-[#1e3a5f]/10 hover:border-[#1e3a5f]"
                        onClick={() => handleAddFunction(template)}
                      >
                        <Plus className="h-3 w-3" />
                        {template.name}
                      </Badge>
                    ))}
                    {DEFAULT_FUNCTIONS.every(t => menuFunctions.some(f => f.function_code === t.code)) && (
                      <span className="text-sm text-muted-foreground">全部已添加</span>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFuncDialog(false)}>
              完成
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}