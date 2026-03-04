import Link from 'next/link'

interface Props {
  isAuthenticated: boolean
}

export default function Hero({ isAuthenticated }: Props) {
  return (
    <div className="relative overflow-hidden bg-green-900 px-6 py-8 text-center">
      {/* Decorative rings — purely CSS, no image dependency */}
      <div className="pointer-events-none absolute -top-16 -right-16 w-64 h-64 rounded-full bg-green-800 opacity-50" />
      <div className="pointer-events-none absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-green-700 opacity-40" />

      <div className="relative">
        <p className="text-xs font-semibold tracking-widest text-green-400 uppercase mb-2">
          BSA Merit Badge Tracker
        </p>
        <h1 className="text-2xl font-bold text-white tracking-tight leading-tight">
          Discover. Track. Achieve.
        </h1>
        <p className="mt-2.5 text-sm text-green-100 max-w-xs mx-auto leading-relaxed">
          Find merit badges, build your wishlist, and track your path to Eagle Scout — all in one place.
        </p>

        {!isAuthenticated && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <Link
              href="/signup"
              className="px-5 py-2.5 bg-white text-green-900 font-semibold text-sm rounded-xl hover:bg-green-50 transition-colors"
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 border border-green-600 text-white font-medium text-sm rounded-xl hover:bg-green-800 transition-colors"
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
