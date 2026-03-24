import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { closeClass } from '@/app/actions/classes'
import ClassDetailActions from './ClassDetailActions'

type Registrant = { id: string; status: string; registered_at: string; scout: { id: string; first_name: string; last_name: string } }
type ClassDetail = {
  id: string; status: string; session_date: string; end_date: string | null; sessions_count: number | null
  session_time: string | null; location: string | null; location_type: string; capacity: number | null
  duration_hours: number | null; description: string | null; prerequisites: string | null; materials: string | null
  merit_badge: { id: string; name: string; category: string }
  counselor: { id: string; first_name: string; last_name: string }
  registrations: Registrant[]
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function locationLabel(type: string): string {
  if (type === 'virtual') return 'Virtual'
  if (type === 'hybrid') return 'Hybrid'
  return 'In person'
}

function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  full: 'Full',
  closed: 'Closed',
  cancelled: 'Cancelled',
  draft: 'Draft',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-50 text-green-700',
  full: 'bg-amber-50 text-amber-700',
  closed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-50 text-red-600',
  draft: 'bg-gray-100 text-gray-500',
}

export default async function ClassDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const [{ data: cls }, { data: myReg }] = await Promise.all([
    supabase
      .from('classes')
      .select(`
        id, status, session_date, end_date, sessions_count, session_time,
        location, location_type, capacity, duration_hours,
        description, prerequisites, materials,
        merit_badge:merit_badges(id, name, category),
        counselor:profiles!classes_counselor_id_fkey(id, first_name, last_name),
        registrations(
          id, status, registered_at,
          scout:profiles!registrations_scout_id_fkey(id, first_name, last_name)
        )
      `)
      .eq('id', id)
      .single(),
    supabase
      .from('registrations')
      .select('id, status')
      .eq('class_id', id)
      .eq('scout_id', user.id)
      .maybeSingle(),
  ])

  if (!cls) notFound()

  const clsTyped = cls as unknown as ClassDetail

  const role = profile?.role ?? 'scout'
  const isManager = ['counselor', 'leader', 'admin'].includes(role)
  const isMyCounselorClass = isManager && clsTyped.counselor.id === user.id
  const canManage = isMyCounselorClass || ['leader', 'admin'].includes(role)

  const enrolled = clsTyped.registrations.filter(r => r.status === 'registered')
  const waitlisted = clsTyped.registrations.filter(r => r.status === 'waitlisted')
  const enrolledCount = enrolled.length
  const spotsLeft = clsTyped.capacity ? clsTyped.capacity - enrolledCount : null

  const closeWithStatus = closeClass.bind(null, id, 'closed')
  const cancelWithStatus = closeClass.bind(null, id, 'cancelled')

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Back */}
      <Link href="/classes" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-5">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
        </svg>
        Classes
      </Link>

      {/* Header */}
      <div className="mb-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">
              {clsTyped.merit_badge.name}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {clsTyped.merit_badge.category}
            </p>
          </div>
          <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[clsTyped.status] ?? 'bg-gray-100 text-gray-500'}`}>
            {STATUS_LABELS[clsTyped.status] ?? clsTyped.status}
          </span>
        </div>
      </div>

      {/* Class details */}
      <div className="bg-white rounded-xl border border-gray-100 px-4 py-4 space-y-2.5 mb-5">
        <DetailRow
          label="Date"
          value={clsTyped.end_date
            ? `${formatDate(clsTyped.session_date)} – ${formatDate(clsTyped.end_date)}`
            : formatDate(clsTyped.session_date)}
        />
        {clsTyped.sessions_count && (
          <DetailRow label="Sessions" value={`${clsTyped.sessions_count} sessions`} />
        )}
        {clsTyped.session_time && <DetailRow label="Time" value={formatTime(clsTyped.session_time)} />}
        {clsTyped.duration_hours && (
          <DetailRow label="Duration" value={`${clsTyped.duration_hours}h per session`} />
        )}
        <DetailRow label="Format" value={locationLabel(clsTyped.location_type)} />
        {clsTyped.location && <DetailRow label="Location" value={clsTyped.location} />}
        <DetailRow
          label="Counselor"
          value={`${clsTyped.counselor.first_name} ${clsTyped.counselor.last_name}`}
        />
        <DetailRow
          label="Spots"
          value={clsTyped.capacity ? `${spotsLeft} of ${clsTyped.capacity} remaining` : 'Unlimited'}
        />
      </div>

      {/* Description / prereqs / materials */}
      {(clsTyped.description || clsTyped.prerequisites || clsTyped.materials) && (
        <div className="space-y-4 mb-5">
          {clsTyped.description && (
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Description</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clsTyped.description}</p>
            </section>
          )}
          {clsTyped.prerequisites && (
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Prerequisites</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clsTyped.prerequisites}</p>
            </section>
          )}
          {clsTyped.materials && (
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Materials to bring</h2>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{clsTyped.materials}</p>
            </section>
          )}
        </div>
      )}

      {/* Scout enroll/drop */}
      {role === 'scout' && clsTyped.status !== 'closed' && clsTyped.status !== 'cancelled' && (
        <ClassDetailActions
          classId={id}
          classStatus={clsTyped.status}
          myRegistration={myReg ? { status: myReg.status as 'registered' | 'waitlisted' } : null}
        />
      )}

      {/* Counselor / manager: enrolled roster + actions */}
      {canManage && (
        <div className="space-y-4 mt-2">
          {/* Enrolled roster */}
          <section>
            <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
              Enrolled ({enrolledCount}{clsTyped.capacity ? `/${clsTyped.capacity}` : ''})
            </h2>
            {enrolled.length === 0 ? (
              <p className="text-sm text-gray-400">No scouts enrolled yet.</p>
            ) : (
              <ul className="space-y-1">
                {enrolled.map(r => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                    {r.scout.first_name} {r.scout.last_name}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Waitlist */}
          {waitlisted.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
                Waitlist ({waitlisted.length})
              </h2>
              <ul className="space-y-1">
                {waitlisted.map(r => (
                  <li key={r.id} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    {r.scout.first_name} {r.scout.last_name}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Manager actions */}
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Link
                href={`/classes/${id}/edit`}
                className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
              >
                Edit class
              </Link>
              <Link
                href="/classes/new"
                className="flex-1 text-center py-2.5 rounded-xl text-sm font-medium border border-green-700 text-green-700 hover:bg-green-50 transition-colors"
              >
                Create another
              </Link>
            </div>

            {clsTyped.status !== 'closed' && clsTyped.status !== 'cancelled' && (
              <div className="flex gap-2">
                <form action={closeWithStatus} className="flex-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
                  >
                    End class
                    <span className="block text-xs font-normal text-gray-400 leading-tight">Sessions are complete</span>
                  </button>
                </form>
                <form action={cancelWithStatus} className="flex-1">
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Cancel class
                    <span className="block text-xs font-normal text-red-400 leading-tight">Class won&apos;t take place</span>
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-xs text-gray-400 shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-gray-700 text-right">{value}</span>
    </div>
  )
}
