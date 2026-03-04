'use client'

import { useState } from 'react'

const ROLE_LABELS: Record<string, string> = {
  scout: 'Scout',
  counselor: 'Counselor',
  leader: 'Leader',
}

interface Invite {
  role: string
  token: string
  accepted: boolean
}

export default function InviteLinks({ invites }: { invites: Invite[] }) {
  const [copied, setCopied] = useState<string | null>(null)

  const handleCopy = async (token: string) => {
    const url = `${window.location.origin}/join/${token}`
    await navigator.clipboard.writeText(url)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-gray-700 mb-2 px-1">Invite Links</h2>
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        {(['scout', 'counselor', 'leader'] as const).map(role => {
          const invite = invites.find(i => i.role === role)
          const isActive = invite && !invite.accepted

          return (
            <div key={role} className="px-4 py-3 flex items-center gap-3 min-w-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{ROLE_LABELS[role]}</p>
                {isActive ? (
                  <p className="text-xs text-gray-400 font-mono truncate mt-0.5">
                    /join/{invite.token}
                  </p>
                ) : (
                  <p className="text-xs text-red-400 mt-0.5">
                    {invite?.accepted ? 'Used — regenerate to create a new link' : 'Not generated'}
                  </p>
                )}
              </div>

              {isActive && (
                <button
                  onClick={() => handleCopy(invite.token)}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-green-700 hover:text-green-800 transition-colors"
                >
                  {copied === invite.token ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                      </svg>
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>
          )
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2 px-1">
        Share these links so scouts, counselors, and leaders can join your troop.
      </p>
    </div>
  )
}
