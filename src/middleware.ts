import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect dashboard routes
  if (pathname.startsWith('/dashboard')) {
    const token = request.cookies.get('__Secure-session')?.value;

    // Redirect unauthenticated users
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const payload = await verifyToken(token);

    // Redirect users with invalid/expired tokens and clear their cookie
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('__Secure-session');
      return response;
    }

    // Role protection for Owner Dashboard
    if (pathname.startsWith('/dashboard/owner') && payload.role !== 'OWNER') {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Role protection for Tenant Dashboard
    if (pathname.startsWith('/dashboard/tenant') && payload.role !== 'TENANT') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

// Intercept requests directed to dashboard endpoints
export const config = {
  matcher: ['/dashboard/:path*'],
};
