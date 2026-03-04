'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { RegistrationStatus } from '@/types/database'

export async function enrollInClass(
  classId: string
): Promise<{ status: RegistrationStatus }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Fetch class status + capacity, and current enrolled count in parallel
  const [{ data: cls }, { count: enrolledCount }] = await Promise.all([
    supabase.from('classes').select('status, capacity').eq('id', classId).single(),
    supabase
      .from('registrations')
      .select('id', { count: 'exact', head: true })
      .eq('class_id', classId)
      .eq('status', 'registered'),
  ])

  // Waitlist if class is explicitly full OR capacity is reached
  const isAtCapacity = cls?.capacity != null && (enrolledCount ?? 0) >= cls.capacity
  const regStatus: RegistrationStatus =
    cls?.status === 'full' || isAtCapacity ? 'waitlisted' : 'registered'

  const { error } = await supabase.from('registrations').insert({
    scout_id: user.id,
    class_id: classId,
    status: regStatus,
  })

  if (error) {
    // Unique constraint — already enrolled
    if (error.code === '23505') throw new Error('Already enrolled in this class')
    throw new Error('Failed to enroll')
  }

  revalidatePath('/classes')
  return { status: regStatus }
}

export async function createClass(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, troop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.troop_id) redirect('/onboarding')
  if (!['counselor', 'leader', 'admin'].includes(profile.role)) redirect('/')

  const capacityRaw = (formData.get('capacity') as string).trim()
  const durationRaw = (formData.get('duration_hours') as string).trim()
  const timeRaw = (formData.get('session_time') as string).trim()
  const endDateRaw = (formData.get('end_date') as string).trim()
  const sessionsCountRaw = (formData.get('sessions_count') as string).trim()

  const { data: cls, error } = await supabase
    .from('classes')
    .insert({
      troop_id: profile.troop_id,
      counselor_id: user.id,
      merit_badge_id: formData.get('merit_badge_id') as string,
      session_date: formData.get('session_date') as string,
      end_date: endDateRaw || null,
      sessions_count: sessionsCountRaw ? parseInt(sessionsCountRaw) : null,
      location_type: formData.get('location_type') as string,
      capacity: capacityRaw ? parseInt(capacityRaw) : null,
      session_time: timeRaw || null,
      location: (formData.get('location') as string).trim() || null,
      duration_hours: durationRaw ? parseFloat(durationRaw) : null,
      description: (formData.get('description') as string).trim() || null,
      prerequisites: (formData.get('prerequisites') as string).trim() || null,
      materials: (formData.get('materials') as string).trim() || null,
      status: 'open',
    })
    .select('id')
    .single()

  if (error || !cls) throw new Error('Failed to create class')

  revalidatePath('/classes')
  redirect(`/classes/${cls.id}`)
}

export async function updateClass(classId: string, formData: FormData): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: existingClass } = await supabase.from('classes').select('counselor_id').eq('id', classId).single()
  const isOwner = existingClass?.counselor_id === user.id
  if (!isOwner && !['leader', 'admin'].includes(profile?.role ?? '')) redirect(`/classes/${classId}`)

  const capacityRaw = (formData.get('capacity') as string).trim()
  const durationRaw = (formData.get('duration_hours') as string).trim()
  const timeRaw = (formData.get('session_time') as string).trim()
  const endDateRaw = (formData.get('end_date') as string).trim()
  const sessionsCountRaw = (formData.get('sessions_count') as string).trim()

  await supabase
    .from('classes')
    .update({
      merit_badge_id: formData.get('merit_badge_id') as string,
      session_date: formData.get('session_date') as string,
      end_date: endDateRaw || null,
      sessions_count: sessionsCountRaw ? parseInt(sessionsCountRaw) : null,
      location_type: formData.get('location_type') as string,
      capacity: capacityRaw ? parseInt(capacityRaw) : null,
      session_time: timeRaw || null,
      location: (formData.get('location') as string).trim() || null,
      duration_hours: durationRaw ? parseFloat(durationRaw) : null,
      description: (formData.get('description') as string).trim() || null,
      prerequisites: (formData.get('prerequisites') as string).trim() || null,
      materials: (formData.get('materials') as string).trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', classId)

  revalidatePath('/classes')
  revalidatePath(`/classes/${classId}`)
  redirect(`/classes/${classId}`)
}

export async function closeClass(classId: string, newStatus: 'closed' | 'cancelled'): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const { data: existingClass } = await supabase.from('classes').select('counselor_id').eq('id', classId).single()
  const isOwner = existingClass?.counselor_id === user.id
  if (!isOwner && !['leader', 'admin'].includes(profile?.role ?? '')) redirect('/classes')

  await supabase
    .from('classes')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', classId)

  revalidatePath('/classes')
  revalidatePath(`/classes/${classId}`)
  redirect('/classes')
}

export async function dropClass(classId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  await supabase
    .from('registrations')
    .delete()
    .eq('scout_id', user.id)
    .eq('class_id', classId)

  revalidatePath('/classes')
}
