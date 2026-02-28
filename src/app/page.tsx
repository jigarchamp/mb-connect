import { createClient } from '@/lib/supabase/server'
import CatalogHeader from './CatalogHeader'
import CatalogClient from './CatalogClient'
import BottomNav from './(app)/BottomNav'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all merit badges — public data, no auth required
  const { data: badges } = await supabase
    .from('merit_badges')
    .select('id, name, eagle_required, category')
    .order('name')

  let interests: string[] = []
  let completions: string[] = []
  let profile: { first_name: string; role: string } | null = null

  if (user) {
    const [{ data: interestData }, { data: completionData }, { data: profileData }] =
      await Promise.all([
        supabase.from('interests').select('merit_badge_id').eq('scout_id', user.id),
        supabase.from('completions').select('merit_badge_id').eq('scout_id', user.id),
        supabase.from('profiles').select('first_name, role').eq('id', user.id).single(),
      ])

    interests = interestData?.map(i => i.merit_badge_id) ?? []
    completions = completionData?.map(c => c.merit_badge_id) ?? []
    profile = profileData
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CatalogHeader isAuthenticated={!!user} firstName={profile?.first_name} />
      <main className={profile ? 'flex-1 pb-20' : 'flex-1'}>
        <CatalogClient
          badges={badges ?? []}
          isAuthenticated={!!user}
          initialInterests={interests}
          initialCompletions={completions}
        />
      </main>
      {profile && <BottomNav role={profile.role} />}
    </div>
  )
}
