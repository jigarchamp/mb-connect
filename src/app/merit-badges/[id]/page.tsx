import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { RANK_LABELS, type Rank } from '@/types/database'
import BadgeActions from './BadgeActions'

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
  let isInterested = false
  let isCompleted = false
  let openClassId: string | null = null

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    role = profile?.role ?? null

    if (role === 'scout') {
      const [{ data: interest }, { data: completion }, { data: openClass }] = await Promise.all([
        supabase.from('interests').select('id').eq('scout_id', user.id).eq('merit_badge_id', id).maybeSingle(),
        supabase.from('completions').select('id').eq('scout_id', user.id).eq('merit_badge_id', id).maybeSingle(),
        supabase.from('classes').select('id').eq('merit_badge_id', id).eq('status', 'open').limit(1).maybeSingle(),
      ])
      isInterested = !!interest
      isCompleted = !!completion
      openClassId = openClass?.id ?? null
    }
  }

  const hasRequirements = badge.requirements && (badge.requirements as { number: string; text: string }[]).length > 0
  const hasMetadata = badge.difficulty || badge.min_age || badge.min_rank || badge.typical_weeks
  const hasLinks = badge.bsa_url || badge.worksheet_url

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <Link
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Back to catalog"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-green-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">MB</span>
          </div>
          <span className="font-semibold text-gray-900 text-sm">MB Connect</span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-4">
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
    </div>
  )
}
