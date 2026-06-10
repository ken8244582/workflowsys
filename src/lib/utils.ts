import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 获取北京时间 (UTC+8) 格式: YYYY-MM-DD HH:mm:ss */
export function beijingNow(): string {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false });
}

/**
 * Escape special characters in search terms for Supabase ilike queries.
 * Prevents wildcard injection by escaping % and _ characters.
 */
export function escapeIlike(str: string): string {
  return str.replace(/%/g, '\\%').replace(/_/g, '\\_');
}
