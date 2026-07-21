import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAllMenus,
  getAllMenuFunctions,
  getUserMenuFunctionPermissions,
  updateUserAllMenuFunctions,
} from '@/lib/sys-data';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限访问' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    if (!userId) {
      return NextResponse.json({ error: '缺少 user_id 参数' }, { status: 400 });
    }

    const [menus, allFunctions, userPerms] = await Promise.all([
      getAllMenus(),
      getAllMenuFunctions(),
      getUserMenuFunctionPermissions(parseInt(userId, 10)),
    ]);

    const funcMap = new Map<number, typeof allFunctions[0][]>();
    for (const f of allFunctions) {
      if (!funcMap.has(f.menu_id)) funcMap.set(f.menu_id, []);
      funcMap.get(f.menu_id)!.push(f);
    }

    const checkedMap = new Map<number, Map<string, boolean>>();
    for (const p of userPerms) {
      if (!checkedMap.has(p.menu_id)) checkedMap.set(p.menu_id, new Map());
      checkedMap.get(p.menu_id)!.set(p.function_code, p.is_enabled);
    }

    const menuFunctionTree = menus.map((menu) => {
      const functions = funcMap.get(menu.id) || [];
      const checked = checkedMap.get(menu.id);
      const checkedFunctions: Record<string, boolean> = {};
      for (const f of functions) {
        checkedFunctions[f.function_code] = checked?.get(f.function_code) ?? false;
      }
      return {
        menu_id: menu.id,
        menu_name: menu.name,
        menu_path: menu.path,
        parent_id: menu.parent_id,
        functions: functions.map((f) => ({
          id: f.id,
          menu_id: f.menu_id,
          function_code: f.function_code,
          function_name: f.function_name,
          sort_order: f.sort_order,
        })),
        checkedFunctions,
      };
    });

    return NextResponse.json({ menuFunctionTree, menus });
  } catch (error) {
    const message = error instanceof Error ? error.message : '查询用户权限失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, permissions } = body;
    if (!user_id || !permissions) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    const permissionsArray = Object.entries(permissions as Record<number, Record<string, boolean>>).map(
      ([menuId, funcMap]) => ({
        menu_id: parseInt(menuId, 10),
        functions: Object.entries(funcMap).map(([function_code, is_enabled]) => ({
          function_code,
          is_enabled: !!is_enabled,
        })),
      })
    );

    await updateUserAllMenuFunctions(parseInt(user_id, 10), permissionsArray);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '保存用户权限失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
