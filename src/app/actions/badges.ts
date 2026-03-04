'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function toggleCompletion(badgeId: string): Promise<{ completed: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: existing } = await supabase
    .from('completions')
    .select('id')
    .eq('scout_id', user.id)
    .eq('merit_badge_id', badgeId)
    .maybeSingle()

  if (existing) {
    await supabase.from('completions').delete().eq('id', existing.id)
    revalidatePath('/')
    return { completed: false }
  } else {
    await supabase.from('completions').insert({
      scout_id: user.id,
      merit_badge_id: badgeId,
      completed_date: new Date().toISOString().split('T')[0],
    })
    revalidatePath('/')
    return { completed: true }
  }
}

export async function removeCompletion(badgeId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('completions')
    .delete()
    .eq('scout_id', user.id)
    .eq('merit_badge_id', badgeId)
}

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
