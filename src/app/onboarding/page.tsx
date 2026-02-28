import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingClient } from './OnboardingClient'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, troop:troops(id, name, unit_number)')
    .eq('id', user.id)
    .single()

  // If fully onboarded, send to app
  if (profile?.troop_id && (profile.role !== 'scout' || (profile.rank && profile.date_of_birth))) {
    redirect('/discover')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-700 mb-4">
            <span className="text-white text-2xl font-bold">MB</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MB Connect</h1>
          <p className="text-sm text-gray-500 mt-1">Let&apos;s get you set up</p>
        </div>
        <OnboardingClient profile={profile} />
      </div>
    </div>
  )
}
