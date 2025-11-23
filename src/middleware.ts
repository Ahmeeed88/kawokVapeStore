import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  
  console.log('Middleware:', { 
    path: request.nextUrl.pathname, 
    hasToken: !!token,
    userAgent: request.headers.get('user-agent')
  });

  // Public routes that don't require authentication
  const publicRoutes = ['/login'];
  const isPublicRoute = publicRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  // API routes that don't require authentication
  const publicApiRoutes = ['/api/auth/login'];
  const isPublicApiRoute = publicApiRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  );

  if (isPublicRoute || isPublicApiRoute) {
    console.log('Middleware: Public route, allowing access');
    return NextResponse.next();
  }

  // Check for token in protected routes
  if (!token) {
    console.log('Middleware: No token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const payload = verifyToken(token);
  if (!payload) {
    console.log('Middleware: Invalid token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  console.log('Middleware: Valid token, allowing access');

  // Add user info to request headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', payload.userId);
    requestHeaders.set('x-user-email', payload.email);
    requestHeaders.set('x-user-name', payload.name);
    requestHeaders.set('x-user-is-admin', payload.isAdmin.toString());

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};