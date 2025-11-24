import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'kawok-vape-secret-key';

export function middleware(request: NextRequest) {
  // Skip middleware for static files and API routes that don't need auth
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth') ||
    request.nextUrl.pathname === '/login'
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('auth-token')?.value;
  
  console.log('Middleware:', { 
    path: request.nextUrl.pathname, 
    hasToken: !!token,
    userAgent: request.headers.get('user-agent')
  });

  // Check for token in protected routes
  if (!token) {
    console.log('Middleware: No token, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    console.log('Token decoded successfully:', decoded.email);
    
    // Add user info to request headers for API routes
    if (request.nextUrl.pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('x-user-id', decoded.userId);
      requestHeaders.set('x-user-email', decoded.email);
      requestHeaders.set('x-user-name', decoded.name);
      requestHeaders.set('x-user-is-admin', decoded.isAdmin.toString());

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });
    }

    console.log('Middleware: Valid token, allowing access');
    return NextResponse.next();
  } catch (error) {
    console.error('Token verification failed:', error);
    return NextResponse.redirect(new URL('/login', request.url));
  }
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