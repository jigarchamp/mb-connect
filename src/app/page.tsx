import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('troop_id, role, rank, date_of_birth')
    .eq('id', user.id)
    .single()

  if (!profile?.troop_id) redirect('/onboarding')
  if (profile.role === 'scout' && (!profile.rank || !profile.date_of_birth)) redirect('/onboarding')

  redirect('/discover')
}
