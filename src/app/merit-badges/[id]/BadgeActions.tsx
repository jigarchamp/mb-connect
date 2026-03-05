'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { toggleInterest, toggleCompletion } from '@/app/actions/badges'

interface Props {
  badgeId: string
  isAuthenticated: boolean
  role: string | null
  isInterested: boolean
  isCompleted: boolean
  openClassId: string | null
  openClassDate: string | null
  isSignedUpForOpenClass: boolean
}

function shortDate(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${Number(m)}/${Number(d)}`
}

export default function BadgeActions({
  badgeId,
  isAuthenticated,
  role,
  isInterested: initialInterested,
  isCompleted: initialCompleted,
  openClassId,
  openClassDate,
  isSignedUpForOpenClass,
}: Props) {
  const [interested, setInterested] = useState(initialInterested)
  const [completed, setCompleted] = useState(initialCompleted)
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<'interest' | 'completion' | null>(null)
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false)
  const [wishlistBlocked, setWishlistBlocked] = useState(false)

  if (!isAuthenticated) {
    return (
      <div className="bg-green-50 border border-green-100 rounded-2xl px-4 py-4 text-center">
        <p className="text-sm font-medium text-green-900">Sign up for a class or track your progress</p>
        <p className="text-xs text-green-700 mt-1">
          <Link href="/login" className="underline underline-offset-2">Sign in</Link>
          {' '}or{' '}
          <Link href="/signup" className="underline underline-offset-2">create an account</Link>
          {' '}to enroll in classes, wishlist badges, and mark completions.
        </p>
      </div>
    )
  }

  if (role !== 'scout') return null

  const handleInterest = () => {
    if (completed) {
      setWishlistBlocked(true)
      return
    }
    setWishlistBlocked(false)
    setPendingAction('interest')
    startTransition(async () => {
      const result = await toggleInterest(badgeId)
      setInterested(result.interested)
      setPendingAction(null)
    })
  }

  const handleCompletion = () => {
    if (!completed && interested) {
      setShowCompleteConfirm(true)
      return
    }
    setPendingAction('completion')
    startTransition(async () => {
      const result = await toggleCompletion(badgeId)
      setCompleted(result.completed)
      setPendingAction(null)
    })
  }

  const handleConfirmComplete = () => {
    setShowCompleteConfirm(false)
    setPendingAction('completion')
    startTransition(async () => {
      const [, completionResult] = await Promise.all([
        toggleInterest(badgeId),
        toggleCompletion(badgeId),
      ])
      setInterested(false)
      setCompleted(completionResult.completed)
      setPendingAction(null)
    })
  }

  return (
    <div className="space-y-2">
      {showCompleteConfirm ? (
        <div className="rounded-xl border border-gray-200 px-4 py-3 space-y-3">
          <p className="text-sm text-gray-700">
            Marking complete will remove this badge from your wishlist. Continue?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowCompleteConfirm(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmComplete}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-green-700 hover:bg-green-800 text-white transition-colors disabled:opacity-50"
            >
              Mark Complete
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleCompletion}
            disabled={isPending && pendingAction === 'completion'}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              completed
                ? 'bg-green-700 hover:bg-green-800 text-white'
                : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {completed ? 'Completed ✓' : 'Mark Complete'}
          </button>
          <button
            onClick={handleInterest}
            disabled={isPending && pendingAction === 'interest'}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              interested
                ? 'bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100'
                : 'border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700'
            }`}
          >
            {interested ? 'Wishlisted ✓' : 'Add to Wishlist'}
          </button>
        </div>
      )}
      {wishlistBlocked && !showCompleteConfirm && (
        <p className="text-xs text-center text-gray-500">
          Already completed — remove the completion to add to your wishlist.
        </p>
      )}
      {openClassId && (
        <Link
          href={`/classes/${openClassId}`}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 transition-colors"
        >
          <span>{openClassDate ? `Sign up for class starting ${shortDate(openClassDate)}` : 'Sign up for a class'}</span>
          {isSignedUpForOpenClass && (
            <span className="text-xs bg-green-700 text-white px-1.5 py-0.5 rounded-full font-medium shrink-0">Already enrolled</span>
          )}
        </Link>
      )}
    </div>
  )
}
