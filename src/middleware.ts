import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
    const response = NextResponse.next()

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options)
                    })
                },
            },
        }
    )

    const { data: { user } } = await supabase.auth.getUser()

    console.log('Middleware - path:', request.nextUrl.pathname)
    console.log('Middleware - user:', user?.email)

    if (!user && request.nextUrl.pathname !== '/login') {
        console.log('No user, redirecting to login')
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_superadmin, is_matrix_admin')
            .eq('email', user.email)
            .single()

        console.log('Profile:', profile)
        console.log('Profile error:', error)

        if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
            if (request.nextUrl.pathname !== '/login' && request.nextUrl.pathname !== '/unauthorized') {
                console.log('Not authorized, redirecting to unauthorized')
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback|unauthorized).*)'],
}