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

    if (!user && request.nextUrl.pathname !== '/login') {
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_superadmin, is_matrix_admin')
            .eq('email', user.email)
            .single()

        if (!profile?.is_superadmin && !profile?.is_matrix_admin) {
            if (request.nextUrl.pathname !== '/login' && request.nextUrl.pathname !== '/unauthorized') {
                return NextResponse.redirect(new URL('/unauthorized', request.url))
            }
        }
    }

    return response
}

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|auth/callback|unauthorized).*)'],
}