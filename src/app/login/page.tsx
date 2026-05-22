'use client'

import { Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function LoginContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')

    const handleGoogleLogin = async () => {
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                },
            },
        })
    }

    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 p-10 rounded-2xl shadow-xl flex flex-col items-center gap-6 w-full max-w-sm">
                <h1 className="text-2xl font-bold text-white">Flavor Manager</h1>
                <p className="text-gray-400 text-sm text-center">
                    Sign in with your Google account to access the tool.
                </p>
                {error === 'unauthorized' && (
                    <div className="w-full bg-red-900/40 border border-red-500 text-red-300 text-sm rounded-lg px-4 py-3 text-center">
                        Your account doesn't have access. You need superadmin or matrix admin privileges.
                    </div>
                )}
                <button
                    onClick={handleGoogleLogin}
                    className="w-auto bg-white text-gray-900 font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-3 hover:bg-gray-100 transition"
                >
                    <svg width="20" height="20" viewBox="0 0 48 48">
                        <path fill="#FFC107" d="M43.6 20H24v8h11.3C33.6 33.1 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 2.9l6-6C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 19.7-8 19.7-20 0-1.3-.1-2.7-.1-4z"/>
                        <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 15.1 18.9 12 24 12c3 0 5.8 1.1 7.9 2.9l6-6C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                        <path fill="#4CAF50" d="M24 44c5.2 0 10-1.9 13.6-5l-6.3-5.2C29.5 35.3 26.9 36 24 36c-5.2 0-9.6-3-11.3-7.3l-6.6 4.9C9.8 39.7 16.4 44 24 44z"/>
                        <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.9 2.4-2.5 4.5-4.7 5.9l6.3 5.2C41 35.3 44 30 44 24c0-1.3-.1-2.7-.4-4z"/>
                    </svg>
                    Sign in with Google
                </button>
                <p className="text-gray-600 text-xs text-center">
                    Only superadmin and matrix admin accounts have access.
                </p>
            </div>
        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    )
}