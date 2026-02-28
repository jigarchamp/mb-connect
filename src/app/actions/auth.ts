'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

type ActionResult = { error: string } | null

export async function login(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  })

  if (error) return { error: error.message }

  redirect('/discover')
}

export async function signup(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const supabase = await createClient()
  const token = formData.get('token') as string | null

  const { error } = await supabase.auth.signUp({
    email: formData.get('email') as string,
    password: formData.get('password') as string,
    options: {
      data: {
        first_name: formData.get('firstName') as string,
        last_name: formData.get('lastName') as string,
        role: 'scout',
      },
    },
  })

  if (error) return { error: error.message }

  // If joining via invite, process the token immediately
  if (token) {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await processInviteToken(supabase, token, user.id)
  }

  redirect('/onboarding')
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

async function processInviteToken(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  token: string,
  userId: string
) {
  const { data: invite } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (!invite) return

  await supabase
    .from('profiles')
    .update({ troop_id: invite.troop_id, role: invite.role })
    .eq('id', userId)

  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)
}
