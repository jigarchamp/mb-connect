import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import CatalogHeader from '@/app/CatalogHeader'
import BottomNav from '@/app/(app)/BottomNav'

type UpcomingClass = {
  id: string
  merit_badge_id: string
  badge_name: string
  category: string
  session_date: string
  sessions_count: number | null
  capacity: number | null
  status: string
  counselor_first_name: string
  counselor_last_name: string
  enrolled_count: number
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function spotsInfo(
  capacity: number | null,
  enrolled: number,
  status: string,
): { label: string; color: string } {
  if (status === 'full') return { label: 'Full', color: 'text-red-500' }
  if (capacity === null) return { label: 'Open', color: 'text-green-700' }
  const spots = capacity - enrolled
  if (spots <= 0) return { label: 'Full', color: 'text-red-500' }
  if (spots <= 3) return { label: `${spots} spot${spots !== 1 ? 's' : ''} left`, color: 'text-amber-600' }
  return { label: `${spots} spots left`, color: 'text-green-700' }
}

export default async function PublicClassesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: rows } = await supabase.rpc('get_upcoming_classes')
  const classes = (rows ?? []) as UpcomingClass[]

  let profile: { first_name: string; role: string } | null = null
  let myRegistrations: Record<string, string> = {}

  if (user) {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('first_name, role')
      .eq('id', user.id)
      .single()
    profile = profileData

    if (profile?.role === 'scout' && classes.length > 0) {
      const { data: regs } = await supabase
        .from('registrations')
        .select('class_id, status')
        .eq('scout_id', user.id)
        .in('class_id', classes.map(c => c.id))
      for (const reg of regs ?? []) {
        myRegistrations[reg.class_id] = reg.status
      }
    }
  }

  const isScout = profile?.role === 'scout'

  return (
    <div className="min-h-screen bg-gray-50">
      <CatalogHeader isAuthenticated={!!user} firstName={profile?.first_name} />

      <main className={`max-w-lg mx-auto px-4 py-6 space-y-4${profile ? ' pb-24' : ''}`}>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Upcoming Classes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Open merit badge classes</p>
        </div>

        {/* Sign-in banner for unauthenticated users */}
        {!user && (
          <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-3">
            <p className="text-sm font-medium text-green-900">Sign in to enroll</p>
            <p className="text-xs text-green-700 mt-0.5">
              <Link href="/login" className="underline underline-offset-2">Sign in</Link>
              {' '}or{' '}
              <Link href="/signup" className="underline underline-offset-2">create an account</Link>
              {' '}to enroll in classes and track your progress.
            </p>
          </div>
        )}

        {classes.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-12">
            No upcoming classes right now. Check back soon!
          </p>
        ) : (
          <ul className="space-y-2">
            {classes.map((cls) => {
              const myReg = myRegistrations[cls.id]
              const { label: spotsLabel, color: spotsColor } = spotsInfo(
                cls.capacity, cls.enrolled_count, cls.status
              )

              // Scouts see their enrollment status; everyone else sees spots
              const displayLabel = isScout && myReg === 'registered'
                ? { text: 'Enrolled', color: 'text-green-700' }
                : isScout && myReg === 'waitlisted'
                  ? { text: 'Waitlisted', color: 'text-amber-600' }
                  : { text: spotsLabel, color: spotsColor }

              return (
                <li key={cls.id}>
                  <Link
                    href={`/classes/${cls.id}`}
                    className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                        {cls.badge_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {cls.category}
                        {' · '}
                        {formatDate(cls.session_date)}
                        {cls.sessions_count && cls.sessions_count > 1
                          ? ` · ${cls.sessions_count} sessions`
                          : ''}
                        {' · '}
                        {cls.counselor_first_name} {cls.counselor_last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs font-medium ${displayLabel.color}`}>
                        {displayLabel.text}
                      </span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </main>

      {profile && <BottomNav role={profile.role} />}
    </div>
  )
}
