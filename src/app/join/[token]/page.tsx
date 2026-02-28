import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const ROLE_LABELS: Record<string, string> = {
  scout: 'Scout',
  counselor: 'Merit Badge Counselor',
  leader: 'Troop Leader',
}

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supabase = await createClient()

  const { data: invite } = await supabase
    .from('invitations')
    .select('*, troop:troops(name, unit_number)')
    .eq('token', token)
    .single()

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">🔍</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Invite not found</h1>
          <p className="text-sm text-gray-500">This invite link is invalid or has already been used.</p>
        </div>
      </div>
    )
  }

  if (invite.accepted_at) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm w-full text-center">
          <p className="text-4xl mb-4">✅</p>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">Already used</h1>
          <p className="text-sm text-gray-500 mb-6">This invite link has already been accepted.</p>
          <Link href="/login" className="btn-primary inline-block px-6">Sign in</Link>
        </div>
      </div>
    )
  }

  const troop = invite.troop as { name: string; unit_number: string }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-green-700 mb-4">
            <span className="text-white text-2xl font-bold">MB</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">MB Connect</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <div className="text-center mb-6">
            <p className="text-4xl mb-3">🎖️</p>
            <h2 className="text-xl font-semibold text-gray-900">You&apos;re invited!</h2>
          </div>

          <div className="bg-green-50 rounded-xl p-4 mb-6 text-center">
            <p className="text-sm text-gray-500">Joining as</p>
            <p className="text-lg font-semibold text-green-700">{ROLE_LABELS[invite.role] ?? invite.role}</p>
            <p className="text-sm text-gray-600 mt-1">{troop.name} · Troop {troop.unit_number}</p>
          </div>

          <Link
            href={`/signup?token=${token}`}
            className="btn-primary w-full text-center block"
          >
            Create account
          </Link>
          <p className="text-center text-sm text-gray-500 mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-green-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
