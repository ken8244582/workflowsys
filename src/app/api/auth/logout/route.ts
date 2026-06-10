import { NextResponse } from 'next/server';
import { COOKIE_NAME, COOKIE_OPTIONS } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({ success: true });
  // Clear cookie by setting it with expired date
  response.headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return response;
}
