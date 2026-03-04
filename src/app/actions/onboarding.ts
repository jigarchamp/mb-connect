'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Invitation, Role } from '@/types/database'

type ActionResult<T = undefined> = { error: string } | { data: T }

export async function createTroop(
  _: ActionResult | null,
  formData: FormData
): Promise<ActionResult<{ invites: Pick<Invitation, 'token' | 'role'>[] }>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const db = createServiceClient()

  const { data: troop, error } = await db
    .from('troops')
    .insert({
      name: formData.get('name') as string,
      unit_number: formData.get('unitNumber') as string,
      council_name: (formData.get('councilName') as string) || null,
      city: (formData.get('city') as string) || null,
      state: (formData.get('state') as string) || null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // Make the creator the admin
  await db
    .from('profiles')
    .update({ troop_id: troop.id, role: 'admin' })
    .eq('id', user.id)

  // Create one open invite token per role
  const roles: Role[] = ['scout', 'counselor', 'leader']
  const invites: Pick<Invitation, 'token' | 'role'>[] = []

  for (const role of roles) {
    const { data: invite } = await db
      .from('invitations')
      .insert({ troop_id: troop.id, role, invited_by: user.id })
      .select('token, role')
      .single()
    if (invite) invites.push(invite)
  }

  return { data: { invites } }
}

export async function joinViaToken(
  _: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const token = (formData.get('token') as string).trim()

  const { data: invite } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .is('accepted_at', null)
    .single()

  if (!invite) return { error: 'Invalid or already used invite code.' }

  await supabase
    .from('profiles')
    .update({ troop_id: invite.troop_id, role: invite.role })
    .eq('id', user.id)

  await supabase
    .from('invitations')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { data: undefined }
}

export async function completeProfile(
  _: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase
    .from('profiles')
    .update({
      rank: formData.get('rank') as string,
      date_of_birth: formData.get('dateOfBirth') as string,
      patrol: (formData.get('patrol') as string) || null,
      bsa_member_id: (formData.get('bsaMemberId') as string) || null,
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  const rawReturnTo = formData.get('returnTo') as string | null
  const returnTo = rawReturnTo?.startsWith('/') ? rawReturnTo : '/discover'
  redirect(returnTo)
}
