import Link from 'next/link'

interface Props {
  isAuthenticated: boolean
  firstName?: string | null
}

export default function CatalogHeader({ isAuthenticated, firstName }: Props) {
  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center shrink-0">
          <span className="text-white text-xs font-bold">MB</span>
        </div>
        <span className="font-semibold text-gray-900 text-sm">MB Connect</span>
      </div>

      {isAuthenticated ? (
        <span className="text-sm text-gray-500">Hi, {firstName}</span>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/signup"
            className="text-sm font-medium bg-green-700 hover:bg-green-800 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            Sign up
          </Link>
        </div>
      )}
    </header>
  )
}
