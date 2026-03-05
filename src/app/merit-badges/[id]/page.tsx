import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RANK_LABELS, type Rank } from '@/types/database'
import BadgeActions from './BadgeActions'
import BottomNav from '@/app/(app)/BottomNav'

type ClassListing = {
  id: string
  session_date: string
  sessions_count: number | null
  capacity: number | null
  status: string
  counselor: { first_name: string; last_name: string }
}

function DifficultyDots({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1" aria-label={`Difficulty ${value} of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`w-2.5 h-2.5 rounded-full ${i < value ? 'bg-green-700' : 'bg-gray-200'}`}
        />
      ))}
    </div>
  )
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}


export default async function MeritBadgeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: badge } = await supabase
    .from('merit_badges')
    .select('*')
    .eq('id', id)
    .single()

  if (!badge) notFound()

  const { data: { user } } = await supabase.auth.getUser()

  let role: string | null = null
  let firstName: string | null = null
  let isInterested = false
  let isCompleted = false
  let openClassId: string | null = null
  let openClassDate: string | null = null
  let availableClasses: ClassListing[] = []
  let enrollmentCounts: Record<string, number> = {}
  let myRegistrations: Record<string, string> = {} // classId → 'registered' | 'waitlisted'

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, first_name')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null
    firstName = profile?.first_name ?? null

    // Fetch all open/full classes for this badge visible to this user
    const { data: rawClasses } = await supabase
      .from('classes')
      .select('id, session_date, sessions_count, capacity, status, counselor:profiles!counselor_id(first_name, last_name)')
      .eq('merit_badge_id', id)
      .in('status', ['open', 'full'])
      .order('session_date', { ascending: true })

    availableClasses = (rawClasses ?? []) as unknown as ClassListing[]

    // Fetch enrollment counts for all those classes in one query
    if (availableClasses.length > 0) {
      const classIds = availableClasses.map(c => c.id)
      const { data: regs } = await supabase
        .from('registrations')
        .select('class_id')
        .in('class_id', classIds)
        .eq('status', 'registered')
      for (const reg of regs ?? []) {
        enrollmentCounts[reg.class_id] = (enrollmentCounts[reg.class_id] ?? 0) + 1
      }
    }

    if (role === 'scout') {
      const firstOpen = availableClasses.find(c => c.status === 'open')
      openClassId = firstOpen?.id ?? null
      openClassDate = firstOpen?.session_date ?? null

      const [{ data: interest }, { data: completion }] = await Promise.all([
        supabase.from('interests').select('id').eq('scout_id', user.id).eq('merit_badge_id', id).maybeSingle(),
        supabase.from('completions').select('id').eq('scout_id', user.id).eq('merit_badge_id', id).maybeSingle(),
      ])
      isInterested = !!interest
      isCompleted = !!completion

      if (availableClasses.length > 0) {
        const { data: myRegs } = await supabase
          .from('registrations')
          .select('class_id, status')
          .eq('scout_id', user.id)
          .in('class_id', availableClasses.map(c => c.id))
        for (const reg of myRegs ?? []) {
          myRegistrations[reg.class_id] = reg.status
        }
      }
    }
  }

  const hasRequirements = badge.requirements && (badge.requirements as { number: string; text: string }[]).length > 0
  const hasMetadata = badge.difficulty || badge.min_age || badge.min_rank || badge.typical_weeks
  const hasLinks = badge.bsa_url || badge.worksheet_url

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between pr-4">
        <Link
          href="/"
          className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
          aria-label="Back to catalog"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-400 shrink-0">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">MB</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">MB Connect</span>
          </div>
        </Link>
        {firstName && (
          <Link
            href="/profile"
            className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center hover:bg-green-200 transition-colors shrink-0"
            aria-label="Profile"
          >
            <span className="text-green-800 text-sm font-semibold">{firstName[0].toUpperCase()}</span>
          </Link>
        )}
      </header>

      <main className={`max-w-lg mx-auto px-4 py-6 space-y-4${role ? ' pb-24' : ''}`}>
        {/* Badge name + eagle */}
        <div>
          <div className="flex items-start gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-gray-900 leading-tight">{badge.name}</h1>
            {badge.eagle_required && (
              <span className="mt-1 shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                Eagle Required
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-1">{badge.category}</p>
        </div>

        {/* CTAs */}
        <BadgeActions
          badgeId={badge.id}
          isAuthenticated={!!user}
          role={role}
          isInterested={isInterested}
          isCompleted={isCompleted}
          openClassId={openClassId}
          openClassDate={openClassDate}
          isSignedUpForOpenClass={openClassId ? myRegistrations[openClassId] === 'registered' : false}
        />

        {/* Metadata */}
        {hasMetadata && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {badge.difficulty && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Difficulty</span>
                <DifficultyDots value={badge.difficulty} />
              </div>
            )}
            {badge.min_rank && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Minimum rank</span>
                <span className="text-sm font-medium text-gray-900">
                  {RANK_LABELS[badge.min_rank as Rank]}
                </span>
              </div>
            )}
            {badge.min_age && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Minimum age</span>
                <span className="text-sm font-medium text-gray-900">{badge.min_age}+</span>
              </div>
            )}
            {badge.typical_weeks && (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Typical duration</span>
                <span className="text-sm font-medium text-gray-900">
                  {badge.typical_weeks < 5
                    ? `~${badge.typical_weeks} week${badge.typical_weeks !== 1 ? 's' : ''}`
                    : `~${Math.round(badge.typical_weeks / 4)} month${Math.round(badge.typical_weeks / 4) !== 1 ? 's' : ''}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {badge.description && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">About this badge</h2>
            <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
              {badge.description}
            </p>
          </div>
        )}

        {/* Requirements */}
        {hasRequirements && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">Requirements</h2>
            <ol className="space-y-2">
              {(badge.requirements as { number: string; text: string }[]).map((req) => (
                <li key={req.number} className="flex gap-3 text-sm text-gray-600 leading-relaxed">
                  <span className="shrink-0 font-medium text-gray-400 w-6 text-right">{req.number}.</span>
                  <span>{req.text}</span>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Available classes */}
        {availableClasses.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 px-4 py-4">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">
              Available classes ({availableClasses.length})
            </h2>
            <div className="space-y-2">
              {availableClasses.map((cls) => {
                const myReg = myRegistrations[cls.id] // 'registered' | 'waitlisted' | undefined
                const enrolled = enrollmentCounts[cls.id] ?? 0
                const spots = cls.capacity != null ? cls.capacity - enrolled : null
                const sessions = cls.sessions_count && cls.sessions_count > 1
                  ? `${cls.sessions_count} sessions`
                  : 'Single session'

                // Right-side label: my enrollment status takes priority over spots
                const { rightLabel, rightColor } = myReg === 'registered'
                  ? { rightLabel: 'Already enrolled', rightColor: 'text-green-700' }
                  : myReg === 'waitlisted'
                    ? { rightLabel: 'Waitlisted', rightColor: 'text-amber-600' }
                    : cls.status === 'full'
                      ? { rightLabel: 'Full', rightColor: 'text-red-500' }
                      : spots == null
                        ? { rightLabel: 'Open', rightColor: 'text-green-700' }
                        : spots <= 3
                          ? { rightLabel: `${spots} spot${spots !== 1 ? 's' : ''} left`, rightColor: 'text-amber-600' }
                          : { rightLabel: `${spots} spots left`, rightColor: 'text-green-700' }

                return (
                  <Link
                    key={cls.id}
                    href={`/classes/${cls.id}`}
                    className="flex items-center justify-between rounded-xl border border-gray-100 px-3 py-3 hover:bg-gray-50 transition-colors group"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors">
                        {formatDate(cls.session_date)}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {sessions} · {cls.counselor.first_name} {cls.counselor.last_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className={`text-xs font-medium ${rightColor}`}>{rightLabel}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300 group-hover:text-gray-400">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}

        {/* External links */}
        {hasLinks && (
          <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
            {badge.bsa_url && (
              <a
                href={badge.bsa_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-sm text-green-700 hover:text-green-800 transition-colors"
              >
                <span>Official BSA page</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
            {badge.worksheet_url && (
              <a
                href={badge.worksheet_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-3 text-sm text-green-700 hover:text-green-800 transition-colors"
              >
                <span>Scout worksheet</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </a>
            )}
          </div>
        )}
      </main>
      {role && <BottomNav role={role} />}
    </div>
  )
}
