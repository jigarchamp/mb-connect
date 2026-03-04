'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { removeCompletion } from '@/app/actions/badges'

// BSA requires 21 Eagle-required merit badges for the Eagle Scout rank
const EAGLE_REQUIRED_TOTAL = 21

interface BadgeCompletion {
  completionId: string
  badge: {
    id: string
    name: string
    eagle_required: boolean
    category: string
  }
  completedDate: string | null
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function Completions({ initialItems }: { initialItems: BadgeCompletion[] }) {
  const [items, setItems] = useState(initialItems)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const eagleCompleted = items.filter(i => i.badge.eagle_required).length

  const handleConfirm = (badgeId: string) => {
    setItems(prev => prev.filter(i => i.badge.id !== badgeId))
    setConfirmingId(null)
    startTransition(async () => {
      await removeCompletion(badgeId)
    })
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 text-center py-12">
        <p className="text-3xl mb-3">🏅</p>
        <p className="text-sm font-medium text-gray-700 mb-1">No completed badges yet</p>
        <p className="text-sm text-gray-400">When you earn a badge, mark it complete on its detail page.</p>
      </div>
    )
  }

  return (
    <div>
      {/* Eagle progress stat */}
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-3 flex items-center justify-between">
        <span className="text-sm text-amber-800">Eagle-required completed</span>
        <span className="text-sm font-semibold text-amber-700">
          {eagleCompleted} / {EAGLE_REQUIRED_TOTAL}
        </span>
      </div>

      <ul className="space-y-2">
        {items.map(({ completionId, badge, completedDate }) => (
          <li
            key={completionId}
            className="relative bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center gap-3"
          >
            {/* Stretched link to detail page */}
            <Link
              href={`/merit-badges/${badge.id}`}
              className="absolute inset-0 rounded-xl"
              aria-label={badge.name}
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-green-600">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="font-medium text-sm text-gray-900">{badge.name}</span>
                {badge.eagle_required && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">Eagle</span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                {badge.category}
                {completedDate && (
                  <span className="ml-2">· {formatDate(completedDate)}</span>
                )}
              </p>
            </div>

            {/* Inline confirm-before-remove */}
            {confirmingId === badge.id ? (
              <div className="relative z-10 flex items-center gap-2 shrink-0">
                <span className="text-xs text-gray-500">Remove?</span>
                <button
                  onClick={() => handleConfirm(badge.id)}
                  disabled={isPending}
                  className="text-xs font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                >
                  Yes
                </button>
                <button
                  onClick={() => setConfirmingId(null)}
                  className="text-xs font-medium text-gray-400 hover:text-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmingId(badge.id)}
                disabled={isPending}
                aria-label="Mark as not completed"
                className="relative z-10 shrink-0 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
