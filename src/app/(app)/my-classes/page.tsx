import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ClassList from '../../classes/ClassList'

export default async function MyClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, troop_id')
    .eq('id', user.id)
    .single()

  if (!profile?.troop_id) redirect('/onboarding')

  const isManager = ['counselor', 'leader', 'admin'].includes(profile.role)

  // Counselors see only their own classes (including all statuses).
  // Scouts/leaders/admins see all non-draft, non-cancelled troop classes.
  let query = supabase
    .from('classes')
    .select(`
      id, status, session_date, end_date, sessions_count, session_time,
      location, location_type, capacity,
      merit_badge:merit_badges(id, name, category),
      counselor:profiles!classes_counselor_id_fkey(id, first_name, last_name),
      registrations(id, status, scout_id)
    `)
    .order('session_date', { ascending: true })

  if (profile.role === 'counselor') {
    query = query.eq('counselor_id', user.id)
  } else if (profile.role === 'scout') {
    query = query.in('status', ['open', 'full'])
  } else {
    query = query.neq('status', 'draft').neq('status', 'cancelled')
  }

  const { data: classes } = await query

  const title = profile.role === 'counselor' ? 'My Classes' : 'My Classes'
  const subtitle = profile.role === 'counselor'
    ? 'Classes you are teaching'
    : 'Merit badge classes for your troop'

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        {isManager && (
          <Link
            href="/classes/new"
            className="flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-800 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Create class
          </Link>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-5">{subtitle}</p>
      <ClassList
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        classes={(classes ?? []) as any}
        userId={user.id}
        role={profile.role}
      />
    </div>
  )
}
