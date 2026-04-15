import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getAuthKind, sanitizeNextPath } from '@/lib/auth/auth-state'

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Route handlers perform their own auth checks and should bypass proxy session logic.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authKind = getAuthKind(user)
  const requestedPath = sanitizeNextPath(`${pathname}${request.nextUrl.search}`, '/dashboard')
  const postAuthPath = sanitizeNextPath(request.nextUrl.searchParams.get('next'), '/dashboard')

  const isContinueRoute = pathname === '/continue'
  const isAuthRoute = pathname === '/login'
  const isCreateAccountRoute = pathname === '/create-account'
  const isUpgradeRoute = pathname === '/upgrade'
  const isCallbackRoute = pathname.startsWith('/auth/callback')
  const isPasswordSetupRoute = isUpgradeRoute && request.nextUrl.searchParams.get('step') === 'password'
  const isPublicRoute = pathname === '/' || isContinueRoute || isAuthRoute || isCreateAccountRoute || isCallbackRoute

  if (authKind === 'signed_out' && !isPublicRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/continue'
    url.searchParams.set('next', requestedPath)
    return NextResponse.redirect(url)
  }

  if (authKind === 'anonymous') {
    if (isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/upgrade'
      url.search = ''
      return NextResponse.redirect(url)
    }

    if (isContinueRoute) {
      const url = request.nextUrl.clone()
      const redirectTarget = new URL(postAuthPath, url)
      url.pathname = redirectTarget.pathname
      url.search = redirectTarget.search
      return NextResponse.redirect(url)
    }

    if (isCreateAccountRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/upgrade'
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  if (authKind === 'permanent' && (isContinueRoute || isAuthRoute || isCreateAccountRoute || (isUpgradeRoute && !isPasswordSetupRoute))) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
