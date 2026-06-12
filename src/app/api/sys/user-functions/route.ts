import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getAllMenus,
  getAllMenuFunctions,
  getUserMenuFunctionPermissions,
  updateUserAllMenuFunctions
} from '@/lib/sys-data';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');

    // Get all menus
    const menus = await getAllMenus();

    // Get all menu functions config
    const allFunctions = await getAllMenuFunctions();

    // Get user's current permissions
    const userPerms = userId
      ? await getUserMenuFunctionPermissions(parseInt(userId))
      : await getUserMenuFunctionPermissions(session.userId);

    // Build permission map: menu_id -> function_code -> is_enabled
    const permMap: Record<number, Record<string, boolean>> = {};
    for (const perm of userPerms) {
      if (!permMap[perm.menu_id]) {
        permMap[perm.menu_id] = {};
      }
      permMap[perm.menu_id][perm.function_code] = perm.is_enabled;
    }

    // Build tree structure data
    const menuFunctionTree = menus.map(menu => {
      const menuFunctions = allFunctions.filter(f => f.menu_id === menu.id);
      return {
        menu_id: menu.id,
        menu_name: menu.name,
        menu_path: menu.path,
        parent_id: menu.parent_id,
        functions: menuFunctions,
        checkedFunctions: permMap[menu.id] || {}
      };
    });

    return NextResponse.json({
      menuFunctionTree,
      menus,
      userPermissions: userPerms
    });
  } catch (error) {
    console.error('获取用户功能权限失败:', error);
    return NextResponse.json({ error: '获取用户功能权限失败' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录或会话已过期' }, { status: 401 });
    }

    // Only super admin can configure user permissions
    if (!session.isSuperAdmin) {
      return NextResponse.json({ error: '无权限操作' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, permissions } = body;

    if (!user_id || !permissions) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // permissions format: { menuId: { functionCode: boolean } }
    // Convert to array format for updateUserAllMenuFunctions
    const permArray: Array<{ menu_id: number; functions: Array<{ function_code: string; is_enabled: boolean }> }> = [];

    for (const [menuId, funcs] of Object.entries(permissions)) {
      const functions: Array<{ function_code: string; is_enabled: boolean }> = [];
      for (const [funcCode, isEnabled] of Object.entries(funcs as Record<string, boolean>)) {
        if (isEnabled) {
          functions.push({ function_code: funcCode, is_enabled: true });
        }
      }
      if (functions.length > 0) {
        permArray.push({ menu_id: parseInt(menuId), functions });
      }
    }

    await updateUserAllMenuFunctions(user_id, permArray);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('更新用户功能权限失败:', error);
    return NextResponse.json({ error: '更新用户功能权限失败' }, { status: 500 });
  }
}