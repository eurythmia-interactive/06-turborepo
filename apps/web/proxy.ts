import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/', '/login', '/register', '/admin/login'];
const PROTECTED_PATHS = ['/dashboard'];
const ADMIN_PATHS = ['/admin'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATHS.some((path) => pathname.startsWith(path));
}

function isAdminPath(pathname: string): boolean {
  return ADMIN_PATHS.some((path) => pathname.startsWith(path));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const response = NextResponse.next();

  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');

  if (pathname.startsWith('/api/') || pathname.startsWith('/_next/')) {
    return response;
  }

  if (isAdminPath(pathname)) {
    if (pathname === '/admin/login') {
      response.headers.set(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:3001;",
      );

      if (process.env.NODE_ENV === 'production') {
        response.headers.set(
          'Strict-Transport-Security',
          'max-age=31536000; includeSubDomains; preload',
        );
      }

      response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
      response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

      return response;
    }

    const accessToken = request.cookies.get('access_token');
    const userRole = request.cookies.get('user_role');

    if (!accessToken?.value) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (userRole?.value !== 'SUPER_ADMIN' && userRole?.value !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http://localhost:3001;",
    );

    if (process.env.NODE_ENV === 'production') {
      response.headers.set(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload',
      );
    }

    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    response.headers.set('Pragma', 'no-cache');
    response.headers.set('Expires', '0');

    return response;
  }

  if (isProtectedPath(pathname)) {
    const accessToken = request.cookies.get('access_token');

    if (!accessToken?.value) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (isPublicPath(pathname) && pathname !== '/') {
    const accessToken = request.cookies.get('access_token');

    if (accessToken?.value && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
