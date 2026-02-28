import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import BottomNav from './BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('troop_id, role, rank, date_of_birth, first_name')
    .eq('id', user.id)
    .single()

  if (!profile?.troop_id) redirect('/onboarding')
  if (profile.role === 'scout' && (!profile.rank || !profile.date_of_birth)) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-green-700 flex items-center justify-center">
            <span className="text-white text-xs font-bold">MB</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">MB Connect</span>
        </div>
        <span className="text-sm text-gray-500">Hi, {profile.first_name}</span>
      </header>

      {/* Main content — pad bottom for nav */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      <BottomNav role={profile.role} />
    </div>
  )
}
