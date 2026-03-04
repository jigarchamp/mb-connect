import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { updateClass } from '@/app/actions/classes'

export default async function EditClassPage({
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

  if (!['counselor', 'leader', 'admin'].includes(profile?.role ?? '')) redirect('/classes')

  const [{ data: cls }, { data: badges }] = await Promise.all([
    supabase
      .from('classes')
      .select('*, counselor:profiles!classes_counselor_id_fkey(id)')
      .eq('id', id)
      .single(),
    supabase.from('merit_badges').select('id, name').order('name'),
  ])

  if (!cls) notFound()

  // Only the counselor who created it, or leaders/admins, can edit
  const isOwner = (cls.counselor as { id: string }).id === user.id
  if (!isOwner && !['leader', 'admin'].includes(profile?.role ?? '')) redirect(`/classes/${id}`)

  const updateWithId = updateClass.bind(null, id)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/classes/${id}`} className="text-gray-400 hover:text-gray-600 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-xl font-semibold text-gray-900">Edit Class</h1>
      </div>

      <form action={updateWithId} className="space-y-5">
        {/* Badge */}
        <div>
          <label htmlFor="merit_badge_id" className="block text-sm font-medium text-gray-700 mb-1">
            Merit Badge <span className="text-red-500">*</span>
          </label>
          <select
            id="merit_badge_id"
            name="merit_badge_id"
            required
            defaultValue={cls.merit_badge_id}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          >
            {badges?.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Session dates */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="session_date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              id="session_date"
              name="session_date"
              type="date"
              required
              defaultValue={cls.session_date}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
          <div>
            <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date <span className="text-xs font-normal text-gray-400">(multi-session)</span>
            </label>
            <input
              id="end_date"
              name="end_date"
              type="date"
              defaultValue={cls.end_date ?? ''}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
            />
          </div>
        </div>

        {/* Sessions count */}
        <div>
          <label htmlFor="sessions_count" className="block text-sm font-medium text-gray-700 mb-1">
            Number of Sessions <span className="text-xs font-normal text-gray-400">(optional)</span>
          </label>
          <input
            id="sessions_count"
            name="sessions_count"
            type="number"
            min="2"
            defaultValue={cls.sessions_count ?? ''}
            placeholder="e.g. 4"
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        {/* Location type */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">
            Location Type <span className="text-red-500">*</span>
          </p>
          <div className="flex gap-3">
            {(['in_person', 'virtual', 'hybrid'] as const).map(type => {
              const label = type === 'in_person' ? 'In person' : type === 'virtual' ? 'Virtual' : 'Hybrid'
              return (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="location_type"
                    value={type}
                    required
                    defaultChecked={cls.location_type === type}
                    className="accent-green-700"
                  />
                  <span className="text-sm text-gray-700">{label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {/* Capacity */}
        <div>
          <label htmlFor="capacity" className="block text-sm font-medium text-gray-700 mb-1">
            Capacity (max scouts) <span className="text-red-500">*</span>
          </label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            required
            defaultValue={cls.capacity ?? ''}
            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
          />
        </div>

        {/* Optional details */}
        <div className="pt-1">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Optional details</p>
          <div className="space-y-4">
            <div>
              <label htmlFor="session_time" className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                id="session_time"
                name="session_time"
                type="time"
                defaultValue={cls.session_time ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                id="location"
                name="location"
                type="text"
                defaultValue={cls.location ?? ''}
                placeholder="e.g. Room 101, Community Center"
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="duration_hours" className="block text-sm font-medium text-gray-700 mb-1">Duration per session (hours)</label>
              <input
                id="duration_hours"
                name="duration_hours"
                type="number"
                min="0.5"
                step="0.5"
                defaultValue={cls.duration_hours ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={cls.description ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label htmlFor="prerequisites" className="block text-sm font-medium text-gray-700 mb-1">Prerequisites</label>
              <textarea
                id="prerequisites"
                name="prerequisites"
                rows={2}
                defaultValue={cls.prerequisites ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
              />
            </div>
            <div>
              <label htmlFor="materials" className="block text-sm font-medium text-gray-700 mb-1">Materials to bring</label>
              <textarea
                id="materials"
                name="materials"
                rows={2}
                defaultValue={cls.materials ?? ''}
                className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent resize-none"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-green-700 hover:bg-green-800 text-white text-sm font-semibold transition-colors"
        >
          Save Changes
        </button>
      </form>
    </div>
  )
}
