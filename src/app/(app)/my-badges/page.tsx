import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Wishlist from './Wishlist'
import Completions from './Completions'

export default async function MyBadgesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('troop_id')
    .eq('id', user.id)
    .single()

  // Fetch interests, completions, and open classes for the troop in parallel
  const [{ data: rawInterests }, { data: rawCompletions }, { data: openClasses }] = await Promise.all([
    supabase
      .from('interests')
      .select('id, merit_badge_id, merit_badges(id, name, eagle_required, category, difficulty)')
      .eq('scout_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('completions')
      .select('id, merit_badge_id, completed_date, merit_badges(id, name, eagle_required, category)')
      .eq('scout_id', user.id)
      .order('completed_date', { ascending: false }),
    profile?.troop_id
      ? supabase
          .from('classes')
          .select('merit_badge_id')
          .eq('troop_id', profile.troop_id)
          .eq('status', 'open')
      : Promise.resolve({ data: [] }),
  ])

  const openClassBadgeIds = new Set((openClasses ?? []).map(c => c.merit_badge_id))

  const wishlistItems = (rawInterests ?? []).map(row => {
    const badge = row.merit_badges as unknown as {
      id: string
      name: string
      eagle_required: boolean
      category: string
      difficulty: number | null
    }
    return {
      interestId: row.id,
      badge,
      hasOpenClass: openClassBadgeIds.has(badge.id),
    }
  })

  const completionItems = (rawCompletions ?? []).map(row => {
    const badge = row.merit_badges as unknown as {
      id: string
      name: string
      eagle_required: boolean
      category: string
    }
    return {
      completionId: row.id,
      badge,
      completedDate: row.completed_date ?? null,
    }
  })

  return (
    <div className="px-4 py-6">
      <h1 className="text-xl font-semibold text-gray-900 mb-1">My MBs</h1>
      <p className="text-sm text-gray-500 mb-6">Your wishlist and completed badges</p>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">
        Completed
        {completionItems.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            {completionItems.length} badge{completionItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      <Completions initialItems={completionItems} />

      <h2 className="text-sm font-semibold text-gray-700 mt-8 mb-3">
        Wishlist
        {wishlistItems.length > 0 && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            {wishlistItems.length} badge{wishlistItems.length !== 1 ? 's' : ''}
          </span>
        )}
      </h2>

      <Wishlist initialItems={wishlistItems} />
    </div>
  )
}
