import NextAuth from 'next-auth'
import { authConfig } from './auth.config'

export const PROTECTED_ROUTES = ['/', '/new']

const { auth } = NextAuth(authConfig)

export default auth(req => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isProtectedRoute = PROTECTED_ROUTES.includes(nextUrl.pathname)
  const isAuthPage =
    nextUrl.pathname === '/login' || nextUrl.pathname === '/signup'

  if (!isAuthenticated && isProtectedRoute) {
    return Response.redirect(new URL('/login', nextUrl))
  }

  if (isAuthenticated && isAuthPage)
    return Response.redirect(new URL('/', nextUrl))
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)']
}
