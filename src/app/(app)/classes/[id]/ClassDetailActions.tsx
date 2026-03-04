'use client'

import { useState, useTransition } from 'react'
import { enrollInClass, dropClass } from '@/app/actions/classes'
import type { RegistrationStatus } from '@/types/database'

interface Props {
  classId: string
  classStatus: string
  myRegistration: { status: RegistrationStatus } | null
}

export default function ClassDetailActions({ classId, classStatus, myRegistration }: Props) {
  const [regStatus, setRegStatus] = useState<RegistrationStatus | null>(
    myRegistration?.status ?? null
  )
  const [isPending, startTransition] = useTransition()
  const isFull = classStatus === 'full'

  const handleEnroll = () => {
    startTransition(async () => {
      const result = await enrollInClass(classId)
      setRegStatus(result.status)
    })
  }

  const handleDrop = () => {
    startTransition(async () => {
      await dropClass(classId)
      setRegStatus(null)
    })
  }

  if (regStatus === 'registered') {
    return (
      <button
        onClick={handleDrop}
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-green-700 hover:bg-green-800 text-white transition-colors disabled:opacity-50 mb-5"
      >
        Enrolled ✓ — tap to drop
      </button>
    )
  }

  if (regStatus === 'waitlisted') {
    return (
      <button
        onClick={handleDrop}
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-50 border border-amber-300 text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50 mb-5"
      >
        Waitlisted — tap to remove
      </button>
    )
  }

  if (isFull) {
    return (
      <button
        onClick={handleEnroll}
        disabled={isPending}
        className="w-full py-3 rounded-xl text-sm font-semibold border border-amber-400 text-amber-700 hover:bg-amber-50 transition-colors disabled:opacity-50 mb-5"
      >
        Join Waitlist
      </button>
    )
  }

  return (
    <button
      onClick={handleEnroll}
      disabled={isPending}
      className="w-full py-3 rounded-xl text-sm font-semibold border border-green-700 text-green-700 hover:bg-green-50 transition-colors disabled:opacity-50 mb-5"
    >
      Enroll in Class
    </button>
  )
}
