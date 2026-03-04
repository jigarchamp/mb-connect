'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleInterest } from '@/app/actions/badges'

interface BadgeInterest {
  interestId: string
  badge: {
    id: string
    name: string
    eagle_required: boolean
    category: string
    difficulty: number | null
  }
  hasOpenClass: boolean
}

export default function Wishlist({ initialItems }: { initialItems: BadgeInterest[] }) {
  const [items, setItems] = useState(initialItems)
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemove = (badgeId: string) => {
    setRemovingId(badgeId)
    // Optimistic removal
    setItems(prev => prev.filter(i => i.badge.id !== badgeId))
    startTransition(async () => {
      await toggleInterest(badgeId)
      setRemovingId(null)
    })
  }

  if (items.length === 0) {
    return (
      <div className="mt-8 text-center py-12">
        <p className="text-3xl mb-3">⭐</p>
        <p className="text-sm font-medium text-gray-700 mb-1">Your wishlist is empty</p>
        <p className="text-sm text-gray-400 mb-4">Browse the catalog and star badges you want to earn.</p>
        <Link
          href="/"
          className="inline-block text-sm font-medium text-green-700 hover:text-green-800 underline underline-offset-2"
        >
          Browse merit badges
        </Link>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {items.map(({ interestId, badge, hasOpenClass }) => (
        <li
          key={interestId}
          className={`relative bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3 transition-opacity ${
            removingId === badge.id && isPending ? 'opacity-40' : ''
          }`}
        >
          {/* Stretched link to detail page */}
          <Link
            href={`/merit-badges/${badge.id}`}
            className="absolute inset-0 rounded-xl"
            aria-label={badge.name}
          />

          <div className="relative flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-medium text-sm text-gray-900">{badge.name}</span>
              {badge.eagle_required && (
                <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Eagle</span>
              )}
              {hasOpenClass && (
                <span className="text-xs font-medium text-green-700 bg-green-50 px-1.5 py-0.5 rounded-full">
                  Class open
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{badge.category}</p>
          </div>

          <button
            onClick={() => handleRemove(badge.id)}
            disabled={isPending}
            aria-label="Remove from wishlist"
            className="relative z-10 shrink-0 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  )
}
