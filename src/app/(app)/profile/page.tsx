import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { signout } from '@/app/actions/auth'
import { RANK_LABELS, type Rank } from '@/types/database'
import InviteLinks from './InviteLinks'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, troop:troops(name, unit_number)')
    .eq('id', user.id)
    .single()

  const troop = profile?.troop as { name: string; unit_number: string } | null

  // Fetch invite tokens for admins — latest per role, ordered newest first
  let invites: { role: string; token: string; accepted: boolean }[] = []
  if (profile?.role === 'admin' && profile.troop_id) {
    const { data: rawInvites } = await supabase
      .from('invitations')
      .select('role, token, accepted_at')
      .eq('troop_id', profile.troop_id)
      .in('role', ['scout', 'counselor', 'leader'])
      .order('invited_at', { ascending: false })

    // Keep only the most recent token per role
    const seen = new Set<string>()
    for (const inv of rawInvites ?? []) {
      if (!seen.has(inv.role)) {
        seen.add(inv.role)
        invites.push({ role: inv.role, token: inv.token, accepted: !!inv.accepted_at })
      }
    }
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-6">Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-100">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-green-700 font-semibold text-lg">
                {profile?.first_name?.[0]}{profile?.last_name?.[0]}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900">{profile?.first_name} {profile?.last_name}</p>
              <p className="text-sm text-gray-500 capitalize">{profile?.role}</p>
            </div>
          </div>
        </div>

        {troop && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Troop</p>
            <p className="text-sm text-gray-900">{troop.name} · #{troop.unit_number}</p>
          </div>
        )}

        {profile?.rank && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Rank</p>
            <p className="text-sm text-gray-900">{RANK_LABELS[profile.rank as Rank]}</p>
          </div>
        )}

        {profile?.patrol && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Patrol</p>
            <p className="text-sm text-gray-900">{profile.patrol}</p>
          </div>
        )}

        {profile?.bsa_member_id && (
          <div className="px-4 py-3">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">BSA Member ID</p>
            <p className="text-sm text-gray-900 font-mono">{profile.bsa_member_id}</p>
          </div>
        )}

        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Email</p>
          <p className="text-sm text-gray-900">{user.email}</p>
        </div>
      </div>

      {profile?.role === 'admin' && <InviteLinks invites={invites} />}

      {profile?.role === 'scout' && (
        profile.rank && profile.date_of_birth ? (
          <Link
            href="/onboarding?returnTo=/profile"
            className="mt-4 block w-full text-center btn-secondary border border-gray-200"
          >
            Edit profile
          </Link>
        ) : (
          <Link
            href="/onboarding?returnTo=/profile"
            className="mt-4 block w-full text-center px-4 py-2.5 rounded-xl text-sm font-medium bg-amber-50 border border-amber-200 text-amber-800 hover:bg-amber-100 transition-colors"
          >
            Complete your setup →
          </Link>
        )
      )}

      <form action={signout} className="mt-6">
        <button type="submit" className="w-full btn-secondary border border-gray-200">
          Sign out
        </button>
      </form>
    </div>
  )
}
