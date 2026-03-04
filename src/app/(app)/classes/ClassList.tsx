'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { enrollInClass, dropClass } from '@/app/actions/classes'
import type { RegistrationStatus } from '@/types/database'

interface Registration {
  id: string
  status: string
  scout_id: string
}

interface ClassItem {
  id: string
  status: string
  session_date: string
  end_date: string | null
  sessions_count: number | null
  session_time: string | null
  location: string | null
  location_type: string
  capacity: number | null
  merit_badge: { id: string; name: string; category: string }
  counselor: { id: string; first_name: string; last_name: string }
  registrations: Registration[]
}

interface Props {
  classes: ClassItem[]
  userId: string
  role: string
}

function formatShortDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatDateRange(startDate: string, endDate: string | null, sessionsCount: number | null): string {
  const start = formatShortDate(startDate)
  if (!endDate) return start
  const end = formatShortDate(endDate)
  const suffix = sessionsCount ? ` · ${sessionsCount} sessions` : ''
  return `${start} – ${end}${suffix}`
}

function locationLabel(type: string): string {
  if (type === 'virtual') return 'Virtual'
  if (type === 'hybrid') return 'Hybrid'
  return 'In person'
}

function spotsLabel(capacity: number | null, enrolledCount: number): string {
  if (capacity === null) return 'Unlimited spots'
  const left = capacity - enrolledCount
  if (left <= 0) return 'No spots left'
  if (left === 1) return '1 spot left'
  if (left <= 3) return `Only ${left} spots left`
  return `${left} spots left`
}

function ChevronRightIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  )
}

interface CardProps {
  cls: ClassItem
  userId: string
  isScout: boolean
  myStatus: RegistrationStatus | null
  isPending: boolean
  onEnroll: (classId: string) => void
  onDrop: (classId: string) => void
  showActions: boolean
}

function ClassCard({ cls, isScout, myStatus, isPending, onEnroll, onDrop, showActions }: CardProps) {
  const enrolledCount = cls.registrations.filter(r => r.status === 'registered').length
  const isFull = cls.status === 'full' || (cls.capacity !== null && enrolledCount >= cls.capacity)

  return (
    <div className="relative bg-white rounded-xl border border-gray-100 px-4 py-3 space-y-2">
      {/* Stretched link covers the whole card */}
      <Link href={`/classes/${cls.id}`} className="absolute inset-0 rounded-xl" aria-label={cls.merit_badge.name} />

      {/* Badge name + category */}
      <div>
        <p className="font-medium text-sm text-gray-900">{cls.merit_badge.name}</p>
        <p className="text-xs text-gray-400">{cls.merit_badge.category}</p>
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
        <span>{formatDateRange(cls.session_date, cls.end_date, cls.sessions_count)}</span>
        <span className="text-gray-300">·</span>
        <span>{locationLabel(cls.location_type)}</span>
        <span className="text-gray-300">·</span>
        <span>with {cls.counselor.first_name} {cls.counselor.last_name}</span>
      </div>

      {/* Spots + action row */}
      {(showActions || cls.capacity !== null) && (
        <div className="flex items-center justify-between pt-0.5">
          <span className={`text-xs ${isFull ? 'text-red-500' : 'text-gray-400'}`}>
            {spotsLabel(cls.capacity, enrolledCount)}
          </span>

          {showActions && isScout && (
            <div className="relative z-10">
              {myStatus === 'registered' && (
                <button
                  onClick={() => onDrop(cls.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-green-700 text-white hover:bg-green-800 transition-colors disabled:opacity-50"
                >
                  Enrolled ✓
                </button>
              )}
              {myStatus === 'waitlisted' && (
                <button
                  onClick={() => onDrop(cls.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  Waitlisted
                </button>
              )}
              {myStatus === null && !isFull && cls.status === 'open' && (
                <button
                  onClick={() => onEnroll(cls.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-green-700 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50"
                >
                  Enroll
                </button>
              )}
              {myStatus === null && (isFull || cls.status === 'full') && (
                <button
                  onClick={() => onEnroll(cls.id)}
                  disabled={isPending}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50"
                >
                  Join Waitlist
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ClassList({ classes, userId, role }: Props) {
  const today = new Date().toISOString().split('T')[0]

  const ENDED_STATUSES = ['closed', 'cancelled']
  const active = classes.filter(c => !ENDED_STATUSES.includes(c.status))
  const ended = [...classes.filter(c => ENDED_STATUSES.includes(c.status))].reverse()

  // Within active classes, split upcoming vs past by date
  const upcoming = active.filter(c => (c.end_date ?? c.session_date) >= today)
  const past = [...active.filter(c => (c.end_date ?? c.session_date) < today)].reverse()

  const isScout = role === 'scout'

  // Track each class's enrollment status locally for optimistic updates
  const [enrollmentMap, setEnrollmentMap] = useState<Map<string, RegistrationStatus | null>>(() => {
    const map = new Map<string, RegistrationStatus | null>()
    classes.forEach(c => {
      const mine = c.registrations.find(r => r.scout_id === userId)
      map.set(c.id, (mine?.status as RegistrationStatus) ?? null)
    })
    return map
  })

  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleEnroll = (classId: string) => {
    setPendingId(classId)
    startTransition(async () => {
      const result = await enrollInClass(classId)
      setEnrollmentMap(prev => new Map(prev).set(classId, result.status))
      setPendingId(null)
    })
  }

  const handleDrop = (classId: string) => {
    setPendingId(classId)
    startTransition(async () => {
      await dropClass(classId)
      setEnrollmentMap(prev => new Map(prev).set(classId, null))
      setPendingId(null)
    })
  }

  if (upcoming.length === 0 && past.length === 0 && ended.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-12">
        No classes are scheduled yet. Check back soon!
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upcoming classes */}
      {upcoming.length > 0 ? (
        <section>
          <ul className="space-y-2">
            {upcoming.map(cls => (
              <li key={cls.id}>
                <ClassCard
                  cls={cls}
                  userId={userId}
                  isScout={isScout}
                  myStatus={enrollmentMap.get(cls.id) ?? null}
                  isPending={pendingId === cls.id && isPending}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  showActions
                />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="text-center text-sm text-gray-400 py-8">
          No upcoming classes. Check back soon!
        </p>
      )}

      {/* Past classes — collapsed by default */}
      {past.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer list-none text-sm text-gray-400 hover:text-gray-600 select-none">
            <span className="transition-transform group-open:rotate-90">
              <ChevronRightIcon />
            </span>
            Past classes ({past.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {past.map(cls => (
              <li key={cls.id}>
                <ClassCard
                  cls={cls}
                  userId={userId}
                  isScout={isScout}
                  myStatus={enrollmentMap.get(cls.id) ?? null}
                  isPending={false}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  showActions={false}
                />
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Ended classes (closed / cancelled) — collapsed by default */}
      {ended.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-1.5 cursor-pointer list-none text-sm text-gray-400 hover:text-gray-600 select-none">
            <span className="transition-transform group-open:rotate-90">
              <ChevronRightIcon />
            </span>
            Ended ({ended.length})
          </summary>
          <ul className="mt-3 space-y-2">
            {ended.map(cls => (
              <li key={cls.id}>
                <ClassCard
                  cls={cls}
                  userId={userId}
                  isScout={isScout}
                  myStatus={enrollmentMap.get(cls.id) ?? null}
                  isPending={false}
                  onEnroll={handleEnroll}
                  onDrop={handleDrop}
                  showActions={false}
                />
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}
