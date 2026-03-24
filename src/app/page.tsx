import { createClient } from '@/lib/supabase/server'
import CatalogHeader from './CatalogHeader'
import Hero from './Hero'
import CatalogClient from './CatalogClient'
import UpcomingClassesPreview from './UpcomingClassesPreview'
import BottomNav from './(app)/BottomNav'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all merit badges, active-class badge IDs, and upcoming classes — all public
  const [{ data: badges }, { data: activeBadges }, { data: upcomingClassRows }] = await Promise.all([
    supabase.from('merit_badges').select('id, name, eagle_required, category').order('name'),
    supabase.rpc('get_active_class_badge_ids'),
    supabase.rpc('get_upcoming_classes').limit(20),
  ])

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

  // Build preview: for scouts exclude completed badges, then take 2
  const completionSet = new Set(completions)
  const allUpcoming = (upcomingClassRows ?? []) as {
    id: string; badge_name: string; category: string; session_date: string;
    merit_badge_id: string; capacity: number | null; status: string; enrolled_count: number
  }[]
  const previewClasses = (
    profile?.role === 'scout'
      ? allUpcoming.filter(c => !completionSet.has(c.merit_badge_id))
      : allUpcoming
  ).slice(0, 2)

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <CatalogHeader isAuthenticated={!!user} firstName={profile?.first_name} />
      <Hero isAuthenticated={!!user} />
      <UpcomingClassesPreview classes={previewClasses} />
      <main className={profile ? 'flex-1 pb-20' : 'flex-1'}>
        <CatalogClient
          badges={badges ?? []}
          isAuthenticated={!!user}
          initialInterests={interests}
          initialCompletions={completions}
          badgesWithClasses={(activeBadges ?? []).map((r: { merit_badge_id: string }) => r.merit_badge_id)}
        />
      </main>
      {profile && <BottomNav role={profile.role} />}
    </div>
  )
}
