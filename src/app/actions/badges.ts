'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function toggleInterest(badgeId: string): Promise<{ interested: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/signup')

  const { data: existing } = await supabase
    .from('interests')
    .select('id')
    .eq('scout_id', user.id)
    .eq('merit_badge_id', badgeId)
    .maybeSingle()

  if (existing) {
    await supabase.from('interests').delete().eq('id', existing.id)
    return { interested: false }
  } else {
    await supabase.from('interests').insert({ scout_id: user.id, merit_badge_id: badgeId })
    return { interested: true }
  }
}
