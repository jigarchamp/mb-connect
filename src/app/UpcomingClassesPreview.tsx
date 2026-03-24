import Link from 'next/link'

type ClassPreview = {
  id: string
  badge_name: string
  category: string
  session_date: string
  capacity: number | null
  status: string
  enrolled_count: number
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  })
}

function spotsInfo(
  capacity: number | null,
  enrolled: number,
  status: string,
): { label: string; color: string } {
  if (status === 'full') return { label: 'Full', color: 'text-red-500' }
  if (capacity === null) return { label: 'Open', color: 'text-green-700' }
  const spots = capacity - enrolled
  if (spots <= 0) return { label: 'Full', color: 'text-red-500' }
  if (spots <= 3) return { label: `${spots} spot${spots !== 1 ? 's' : ''} left`, color: 'text-amber-600' }
  return { label: `${spots} spots left`, color: 'text-green-700' }
}

export default function UpcomingClassesPreview({ classes }: { classes: ClassPreview[] }) {
  if (classes.length === 0) return null

  return (
    <div className="max-w-lg mx-auto px-4 pt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-900">Upcoming Classes</h2>
        <Link
          href="/classes"
          className="text-xs font-medium text-green-700 hover:text-green-800 transition-colors"
        >
          See all →
        </Link>
      </div>
      <ul className="space-y-2">
        {classes.map((cls) => {
          const { label, color } = spotsInfo(cls.capacity, cls.enrolled_count, cls.status)
          return (
            <li key={cls.id}>
              <Link
                href={`/classes/${cls.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 hover:bg-gray-50 transition-colors group"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-green-700 transition-colors truncate">
                    {cls.badge_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {cls.category} · {formatDate(cls.session_date)}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-medium ${color}`}>{label}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                  </svg>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
