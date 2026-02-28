export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-700 mb-4">
            <span className="text-white text-2xl font-bold">MB</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MB Connect</h1>
          <p className="text-sm text-gray-500 mt-1">Scouts BSA Merit Badge Platform</p>
        </div>
        {children}
      </div>
    </div>
  )
}
