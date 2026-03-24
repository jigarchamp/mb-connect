import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

type DemandRow = {
  merit_badge_id: string
  merit_badge_name: string
  eagle_required: boolean
  category: string
  unmet_count: number
  has_open_class: boolean
}

export default async function DemandPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role === 'scout') redirect('/')

  const { data: rows } = await supabase
    .from('troop_mb_demand')
    .select('merit_badge_id, merit_badge_name, eagle_required, category, unmet_count, has_open_class')
    .gt('unmet_count', 0)
    .order('unmet_count', { ascending: false })

  const demand = (rows ?? []) as DemandRow[]

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Demand</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Badges scouts want · sorted by unmet interest
        </p>
      </div>

      {demand.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-12">
          No scouts have wishlisted any badges yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {demand.map((row) => (
            <li key={row.merit_badge_id} className="relative bg-white rounded-xl border border-gray-100 px-4 py-3">
              {/* Stretched link covers the card for MB detail navigation */}
              <Link
                href={`/merit-badges/${row.merit_badge_id}`}
                className="absolute inset-0 rounded-xl"
                aria-label={`View ${row.merit_badge_name}`}
              />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  {/* Name + chips */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium text-gray-900">
                      {row.merit_badge_name}
                    </span>
                    {row.eagle_required && (
                      <span className="shrink-0 text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full">
                        Eagle
                      </span>
                    )}
                    {row.has_open_class && (
                      <span className="shrink-0 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">
                        Class scheduled
                      </span>
                    )}
                  </div>

                  {/* Category + scout count */}
                  <p className="text-xs text-gray-400 mt-0.5">
                    {row.category}
                    {' · '}
                    <span className="font-medium text-gray-600">
                      {row.unmet_count} scout{row.unmet_count !== 1 ? 's' : ''}
                    </span>
                  </p>
                </div>

                {/* Offer a Class button — z-10 so it sits above the stretched link */}
                <Link
                  href={`/classes/new?badge_id=${row.merit_badge_id}`}
                  className="relative z-10 shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg border border-green-700 text-green-700 hover:bg-green-50 transition-colors"
                >
                  Offer a Class
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
