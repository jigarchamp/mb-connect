'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createTroop, joinViaToken, completeProfile } from '@/app/actions/onboarding'
import { RANK_LABELS, RANK_ORDER, type Profile, type Invitation } from '@/types/database'

type Step = 'choose' | 'create_troop' | 'show_invites' | 'join_with_code' | 'complete_profile'

interface Props {
  profile: Profile & { troop?: { id: string; name: string; unit_number: string } | null }
}

function getInitialStep(profile: Props['profile']): Step {
  if (!profile.troop_id) return 'choose'
  return 'complete_profile'
}

// ─── Create Troop Step ────────────────────────────────────────────────────────
function CreateTroopStep({ onSuccess }: { onSuccess: (invites: Pick<Invitation, 'token' | 'role'>[]) => void }) {
  const [state, action, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await createTroop(null, formData)
    if ('data' in result) {
      onSuccess(result.data.invites)
      return null
    }
    return result
  }, null)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Create your troop</h2>
      <p className="text-sm text-gray-500 mb-5">You&apos;ll be the admin. Scouts and counselors join via invite links you&apos;ll share.</p>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Troop name <span className="text-red-500">*</span></label>
          <input name="name" type="text" required placeholder="e.g. Troop 42" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Unit number <span className="text-red-500">*</span></label>
          <input name="unitNumber" type="text" required placeholder="e.g. 42" className="input" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Council name</label>
          <input name="councilName" type="text" placeholder="e.g. Silicon Valley Monterey Bay" className="input" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
            <input name="city" type="text" className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
            <input name="state" type="text" maxLength={2} placeholder="CA" className="input" />
          </div>
        </div>

        {state && 'error' in state && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? 'Creating…' : 'Create troop'}
        </button>
      </form>
    </div>
  )
}

// ─── Show Invites Step ────────────────────────────────────────────────────────
function ShowInvitesStep({ invites }: { invites: Pick<Invitation, 'token' | 'role'>[] }) {
  const router = useRouter()
  const [copied, setCopied] = useState<string | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const roleLabel: Record<string, string> = {
    scout: 'Scout invite link',
    counselor: 'Counselor invite link',
    leader: 'Leader invite link',
  }

  const copy = (token: string) => {
    navigator.clipboard.writeText(`${origin}/join/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Your troop is ready!</h2>
      <p className="text-sm text-gray-500 mb-5">Share these links with your troop. Each link sets the right role automatically.</p>

      <div className="space-y-3">
        {invites.map((invite) => (
          <div key={invite.token} className="border border-gray-200 rounded-xl p-3">
            <p className="text-xs font-medium text-gray-500 mb-1.5">{roleLabel[invite.role]}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5 truncate">
                {origin}/join/{invite.token}
              </code>
              <button
                onClick={() => copy(invite.token)}
                className="shrink-0 text-xs font-medium text-green-700 hover:text-green-800 px-2 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
              >
                {copied === invite.token ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-4 mb-5">
        These links are permanent and reusable. Find them again in your admin settings.
      </p>

      <button onClick={() => router.push('/discover')} className="btn-primary w-full">
        Go to app
      </button>
    </div>
  )
}

// ─── Join With Code Step ──────────────────────────────────────────────────────
function JoinWithCodeStep({ onSuccess }: { onSuccess: () => void }) {
  const [state, action, isPending] = useActionState(async (_prev: unknown, formData: FormData) => {
    const result = await joinViaToken(null, formData)
    if ('data' in result) {
      onSuccess()
      return null
    }
    return result
  }, null)

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Join with invite code</h2>
      <p className="text-sm text-gray-500 mb-5">Ask your Scoutmaster for a link or paste the token from your invite URL.</p>

      <form action={action} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Invite token</label>
          <input
            name="token"
            type="text"
            required
            placeholder="Paste token here"
            className="input font-mono text-sm"
          />
        </div>

        {state && 'error' in state && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? 'Joining…' : 'Join troop'}
        </button>
      </form>
    </div>
  )
}

// ─── Complete Scout Profile Step ──────────────────────────────────────────────
function CompleteProfileStep({ role }: { role: string }) {
  const [state, action, isPending] = useActionState(completeProfile, null)
  const isScout = role === 'scout'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-1">Complete your profile</h2>
      <p className="text-sm text-gray-500 mb-5">
        {isScout ? 'Tell us about your scouting journey.' : 'A few more details to get you started.'}
      </p>

      <form action={action} className="space-y-4">
        {isScout && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Current rank <span className="text-red-500">*</span>
              </label>
              <select name="rank" required className="input">
                <option value="">Select rank…</option>
                {RANK_ORDER.map((r) => (
                  <option key={r} value={r}>{RANK_LABELS[r]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Date of birth <span className="text-red-500">*</span>
              </label>
              <input name="dateOfBirth" type="date" required className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Patrol <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input name="patrol" type="text" placeholder="e.g. Eagle Patrol" className="input" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                BSA Member ID <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input name="bsaMemberId" type="text" placeholder="For future ScoutBook sync" className="input" />
            </div>
          </>
        )}

        {state && 'error' in state && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{state.error}</p>
        )}

        <button type="submit" disabled={isPending} className="btn-primary w-full">
          {isPending ? 'Saving…' : 'Continue to app'}
        </button>
      </form>
    </div>
  )
}

// ─── Main Onboarding Component ────────────────────────────────────────────────
export function OnboardingClient({ profile }: Props) {
  const [step, setStep] = useState<Step>(getInitialStep(profile))
  const [invites, setInvites] = useState<Pick<Invitation, 'token' | 'role'>[]>([])
  const router = useRouter()

  if (step === 'choose') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Welcome!</h2>
        <p className="text-sm text-gray-500 mb-6">Are you setting up a new troop or joining an existing one?</p>

        <div className="space-y-3">
          <button
            onClick={() => setStep('create_troop')}
            className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-green-600 hover:bg-green-50 transition-colors group"
          >
            <p className="font-medium text-gray-900 group-hover:text-green-700">Set up a new troop</p>
            <p className="text-sm text-gray-500 mt-0.5">I&apos;m a Scoutmaster creating a troop account</p>
          </button>
          <button
            onClick={() => setStep('join_with_code')}
            className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-green-600 hover:bg-green-50 transition-colors group"
          >
            <p className="font-medium text-gray-900 group-hover:text-green-700">Join with an invite code</p>
            <p className="text-sm text-gray-500 mt-0.5">I have an invite link or token from my Scoutmaster</p>
          </button>
        </div>
      </div>
    )
  }

  if (step === 'create_troop') {
    return (
      <CreateTroopStep
        onSuccess={(newInvites) => {
          setInvites(newInvites)
          setStep('show_invites')
        }}
      />
    )
  }

  if (step === 'show_invites') {
    return <ShowInvitesStep invites={invites} />
  }

  if (step === 'join_with_code') {
    return (
      <JoinWithCodeStep
        onSuccess={() => {
          // Refresh — server component will detect troop_id and show complete_profile
          router.refresh()
          setStep('complete_profile')
        }}
      />
    )
  }

  return <CompleteProfileStep role={profile.role} />
}
