'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toggleInterest } from '@/app/actions/badges'
import type { MeritBadge } from '@/types/database'

interface Props {
  badges: Pick<MeritBadge, 'id' | 'name' | 'eagle_required' | 'category'>[]
  isAuthenticated: boolean
  initialInterests: string[]
  initialCompletions: string[]
  badgesWithClasses: string[]
}

function StarIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" clipRule="evenodd" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" />
    </svg>
  )
}

export default function CatalogClient({
  badges,
  isAuthenticated,
  initialInterests,
  initialCompletions,
  badgesWithClasses,
}: Props) {
  const classSet = useMemo(() => new Set(badgesWithClasses), [badgesWithClasses])
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [eagleOnly, setEagleOnly] = useState(false)
  const [showCompletedOnly, setShowCompletedOnly] = useState(false)
  const [interests, setInterests] = useState(new Set(initialInterests))
  const completions = useMemo(() => new Set(initialCompletions), [initialCompletions])
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(badges.map(b => b.category))).sort()],
    [badges]
  )

  const filtered = useMemo(() => {
    return badges.filter(b => {
      if (showCompletedOnly && isAuthenticated && !completions.has(b.id)) return false
      if (eagleOnly && !b.eagle_required) return false
      if (categoryFilter !== 'all' && b.category !== categoryFilter) return false
      if (query.trim()) {
        const q = query.toLowerCase()
        if (!b.name.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [badges, query, categoryFilter, eagleOnly, showCompletedOnly, isAuthenticated, completions])

  const handleToggle = (badgeId: string) => {
    if (!isAuthenticated) {
      router.push('/signup')
      return
    }
    setPendingId(badgeId)
    startTransition(async () => {
      const result = await toggleInterest(badgeId)
      setInterests(prev => {
        const next = new Set(prev)
        result.interested ? next.add(badgeId) : next.delete(badgeId)
        return next
      })
      setPendingId(null)
    })
  }

  const eagleCount = filtered.filter(b => b.eagle_required).length
  const totalCount = filtered.length

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-6">
      {/* Search */}
      <div className="relative mb-3">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="search"
          placeholder="Search merit badges…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 no-scrollbar">
        <button
          onClick={() => setEagleOnly(e => !e)}
          className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            eagleOnly
              ? 'bg-amber-500 border-amber-500 text-white'
              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          🦅 Eagle Required
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setShowCompletedOnly(v => !v)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              showCompletedOnly
                ? 'bg-green-700 border-green-700 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            Show completed
          </button>
        )}
        {categories.filter(c => c !== 'all').map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(c => c === cat ? 'all' : cat)}
            className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
              categoryFilter === cat
                ? 'bg-green-700 border-green-700 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-400 mb-3">
        {totalCount} badge{totalCount !== 1 ? 's' : ''}
        {eagleCount > 0 && eagleOnly ? ` · ${eagleCount} Eagle required` : ''}
      </p>

      {/* Badge list */}
      <ul className="space-y-2">
        {filtered.map(badge => {
          const isInterested = interests.has(badge.id)
          const isCompleted = isAuthenticated && completions.has(badge.id)
          const hasClass = classSet.has(badge.id)
          const isLoading = pendingId === badge.id && isPending

          return (
            <li
              key={badge.id}
              className={`relative bg-white rounded-xl border px-4 py-3 flex items-center gap-3 transition-opacity ${
                isCompleted ? 'opacity-60 border-gray-100' : 'border-gray-100'
              }`}
            >
              {/* Stretched link covers the whole card */}
              <Link
                href={`/merit-badges/${badge.id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={badge.name}
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {isCompleted && (
                    <span className="text-green-600">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                      </svg>
                    </span>
                  )}
                  <span className="font-medium text-sm text-gray-900">{badge.name}</span>
                  {badge.eagle_required && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Eagle</span>
                  )}
                  {isInterested && (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Wishlisted</span>
                  )}
                  {hasClass && (
                    <span
                      className="text-xs font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                      title="Class available"
                      aria-label="Class available"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 9v7.5" />
                      </svg>
                      Class available
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{badge.category}</p>
              </div>

              <button
                onClick={() => handleToggle(badge.id)}
                disabled={isLoading}
                aria-label={isInterested ? 'Remove from wishlist' : 'Add to wishlist'}
                className={`relative z-10 shrink-0 transition-colors disabled:opacity-50 ${
                  isInterested ? 'text-amber-500' : 'text-gray-300 hover:text-gray-400'
                }`}
              >
                <StarIcon filled={isInterested} />
              </button>
            </li>
          )
        })}
        {filtered.length === 0 && (
          <li className="text-center text-gray-400 text-sm py-12">
            No badges match your filters.
          </li>
        )}
      </ul>
    </div>
  )
}
