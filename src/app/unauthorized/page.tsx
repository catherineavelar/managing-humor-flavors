'use client'

export default function UnauthorizedPage() {
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="bg-gray-900 p-10 rounded-2xl border border-gray-800 flex flex-col items-center gap-6 w-full max-w-md text-center">
                <div className="text-5xl">🚫</div>
                <h1 className="text-2xl font-bold text-white">Unauthorized Access</h1>
                <p className="text-gray-400">
                    Your account does not have the required privileges to access the Flavor Manager. You need superadmin or matrix admin access.
                </p>
                <button
                    onClick={() => window.location.href = '/login'}
                    className="bg-white text-gray-900 font-semibold py-3 px-6 rounded-lg hover:bg-gray-100 transition"
                >
                    Back to Login
                </button>
            </div>
        </div>
    )
}