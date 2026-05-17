import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/login',
  '/register',
  '/manifest.json',
  '/sw.js',
  '/favicon.ico',
  '/icon-192.png',
  '/icon-512.png',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes — bypass auth
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)'],
}