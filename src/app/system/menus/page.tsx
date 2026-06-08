'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';

interface MenuItem {
  id: number;
  name: string;
  path: string | null;
  icon: string | null;
  parent_id: number | null;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

export default function MenusPage() {
  const { user: currentUser } = useAuth();
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedMenu, setSelectedMenu] = useState<MenuItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formPath, setFormPath] = useState('');
  const [formIcon, setFormIcon] = useState('');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [formIsVisible, setFormIsVisible] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchMenus = useCallback(async () => {
    try {
      const res = await fetch('/api/sys/menus');
      const data = await res.json();
      if (data.menus) {
        setMenus(data.menus);
        // Auto-expand all parent menus
        const parentIds = new Set<number>(data.menus.filter((m: MenuItem) => m.parent_id === null).map((m: MenuItem) => m.id));
        setExpandedIds(parentIds);
      }
    } catch (e) {
      console.error('获取菜单列表失败', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMenus();
  }, [fetchMenus]);

  const topMenus = menus.filter(m => m.parent_id === null).sort((a, b) => a.sort_order - b.sort_order);
  const getSubMenus = (parentId: number) => menus.filter(m => m.parent_id === parentId).sort((a, b) => a.sort_order - b.sort_order);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Add menu
  const handleAddMenu = async () => {
    setError('');
    if (!formName.trim()) { setError('菜单名称不能为空'); return; }
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
      if (data.menu) {
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

  if (!currentUser?.isSuperAdmin) {
    return <div className="text-center py-20 text-muted-foreground">无权限访问此页面</div>;
  }

  // Build flat rows for the table (avoids nested tbody)
  const tableRows: React.ReactNode[] = [];
  topMenus.forEach(top => {
    const subMenus = getSubMenus(top.id);
    const isExpanded = expandedIds.has(top.id);

    tableRows.push(
      <tr key={top.id} className="border-b border-border hover:bg-muted/10">
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            {subMenus.length > 0 ? (
              <button onClick={() => toggleExpand(top.id)} className="text-muted-foreground hover:text-foreground shrink-0">
                <svg className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            ) : (
              <span className="w-4 inline-block shrink-0" />
            )}
            <span className="font-medium text-foreground">{top.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{top.path || '-'}</td>
        <td className="px-4 py-3 text-muted-foreground text-xs">{top.icon || '-'}</td>
        <td className="px-4 py-3 text-muted-foreground">{top.sort_order}</td>
        <td className="px-4 py-3">
          {top.is_visible ? <span className="text-green-600">是</span> : <span className="text-red-500">否</span>}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
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
              className="text-[#1e3a5f] hover:underline text-xs"
            >
              编辑
            </button>
            <button
              onClick={() => {
                resetForm();
                setFormParentId(top.id);
                setShowAddDialog(true);
              }}
              className="text-green-600 hover:underline text-xs"
            >
              添加子菜单
            </button>
            <button
              onClick={() => handleDeleteMenu(top.id, subMenus.length > 0)}
              className="text-red-500 hover:underline text-xs"
            >
              删除
            </button>
          </div>
        </td>
      </tr>
    );

    if (isExpanded) {
      subMenus.forEach(sub => {
        tableRows.push(
          <tr key={sub.id} className="border-b border-border last:border-0 hover:bg-muted/10 bg-muted/5">
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="w-4 inline-block shrink-0" />
                <span className="ml-4 text-foreground">{sub.name}</span>
              </div>
            </td>
            <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{sub.path || '-'}</td>
            <td className="px-4 py-3 text-muted-foreground text-xs">{sub.icon || '-'}</td>
            <td className="px-4 py-3 text-muted-foreground">{sub.sort_order}</td>
            <td className="px-4 py-3">
              {sub.is_visible ? <span className="text-green-600">是</span> : <span className="text-red-500">否</span>}
            </td>
            <td className="px-4 py-3">
              <div className="flex items-center gap-2">
                <button
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
                  className="text-[#1e3a5f] hover:underline text-xs"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDeleteMenu(sub.id, false)}
                  className="text-red-500 hover:underline text-xs"
                >
                  删除
                </button>
              </div>
            </td>
          </tr>
        );
      });
    }
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-[#1e3a5f]">菜单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">管理系统的菜单结构和显示</p>
      </div>

      {/* Toolbar */}
      <div className="mb-4">
        <button
          onClick={() => {
            resetForm();
            setShowAddDialog(true);
          }}
          className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 transition-colors"
        >
          添加菜单
        </button>
      </div>

      {/* Menu Tree */}
      {loading ? (
        <div className="text-center py-10 text-muted-foreground">加载中...</div>
      ) : (
        <div className="rounded-lg border border-border bg-white overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[30%]">菜单名称</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[20%]">路径</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[15%]">图标</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[8%]">排序</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[8%]">可见</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground w-[19%]">操作</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    暂无数据
                  </td>
                </tr>
              ) : (
                tableRows
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Menu Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">添加菜单</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">菜单名称 *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="如：系统管理" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">路径</label>
                <input type="text" value={formPath} onChange={(e) => setFormPath(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="如：/system/users (一级菜单留空)" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">图标名称</label>
                <input type="text" value={formIcon} onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="如：Settings (Lucide图标名)" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">上级菜单</label>
                <select
                  value={formParentId ?? ''}
                  onChange={(e) => setFormParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                >
                  <option value="">无 (一级菜单)</option>
                  {topMenus.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">排序号</label>
                <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="addMenuVisible" checked={formIsVisible} onChange={(e) => setFormIsVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="addMenuVisible" className="text-sm">显示在导航中</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowAddDialog(false); resetForm(); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">取消</button>
              <button onClick={handleAddMenu} disabled={submitting}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors">
                {submitting ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Menu Dialog */}
      {showEditDialog && selectedMenu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#1e3a5f] mb-4">编辑菜单</h2>
            {error && <div className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>}
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">菜单名称 *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">路径</label>
                <input type="text" value={formPath} onChange={(e) => setFormPath(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                  placeholder="如：/system/users" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">图标名称</label>
                <input type="text" value={formIcon} onChange={(e) => setFormIcon(e.target.value)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">上级菜单</label>
                <select
                  value={formParentId ?? ''}
                  onChange={(e) => setFormParentId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20"
                >
                  <option value="">无 (一级菜单)</option>
                  {topMenus.filter(m => m.id !== selectedMenu.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">排序号</label>
                <input type="number" value={formSortOrder} onChange={(e) => setFormSortOrder(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-[#1e3a5f] focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="editMenuVisible" checked={formIsVisible} onChange={(e) => setFormIsVisible(e.target.checked)}
                  className="h-4 w-4 rounded border-border" />
                <label htmlFor="editMenuVisible" className="text-sm">显示在导航中</label>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowEditDialog(false); setSelectedMenu(null); resetForm(); }}
                className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-muted transition-colors">取消</button>
              <button onClick={handleEditMenu} disabled={submitting}
                className="rounded-lg bg-[#1e3a5f] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a5f]/90 disabled:opacity-50 transition-colors">
                {submitting ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
