import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import BottomNav from '@/app/(app)/BottomNav'

export default async function ClassAuthLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, role, troop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.troop_id) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">MB</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">MB Connect</span>
        </div>
        <Link
          href="/profile"
          className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors"
          aria-label="Profile"
        >
          <span className="text-green-800 text-sm font-semibold">
            {profile.first_name[0].toUpperCase()}
          </span>
        </Link>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav role={profile.role} />
    </div>
  )
}
