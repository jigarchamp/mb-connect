#!/usr/bin/env tsx
/**
 * Fetches merit badge metadata from the dasevilla/scout-archive GitHub repo
 * (structured JSON — no Cloudflare blocking) and generates a SQL migration.
 *
 * Usage:
 *   npm run scrape               # fetch all 137 badges
 *   npm run scrape -- --dry-run  # print slugs without fetching
 *   npm run scrape -- --badge "Cooking"  # fetch a single badge
 *
 * Output: supabase/migrations/<timestamp>_seed_mb_metadata.sql
 *
 * Source: https://github.com/dasevilla/scout-archive/tree/main/build/merit-badges
 */

import * as fs from 'fs'
import * as path from 'path'

// ---- Types from scout-archive JSON ----

interface ContentNode {
  type: 'text' | 'element'
  value?: string
  tag?: string
  attrs?: Record<string, string>
  children?: ContentNode[]
}

interface Requirement {
  id: string
  label: string | null
  content: ContentNode[]
  resources: unknown[]
  sub_requirements: Requirement[]
}

interface ArchiveBadge {
  name: string
  overview: string
  is_eagle_required: boolean
  url: string
  pdf_url: string | null
  workbook_pdf_url: string | null
  requirements: Requirement[]
}

// ---- Our output type ----

interface BadgeData {
  name: string
  description: string | null
  requirements: { number: string; text: string }[] | null
  bsa_url: string | null
  worksheet_url: string | null
  difficulty: number | null
}

// ---- All 137 badges (matches seed migration) ----

const ALL_BADGES: string[] = [
  // Arts & Hobbies
  'Animation', 'Architecture and Construction', 'Art', 'Astronomy', 'Chess',
  'Cinematography', 'Coin Collecting', 'Collections', 'Game Design', 'Graphic Arts',
  'Indian Lore', 'Inventing', 'Leatherwork', 'Model Design and Building', 'Moviemaking',
  'Music', 'Painting', 'Photography', 'Pottery', 'Reading', 'Sculpture',
  'Stamp Collecting', 'Theater', 'Wood Carving', 'Woodwork',
  // Citizenship
  'Citizenship in the Community', 'Citizenship in the Nation', 'Citizenship in Society',
  'Citizenship in the World', 'Public Speaking',
  // Communication
  'Communication', 'Digital Technology', 'Journalism', 'Signs, Signals, and Codes',
  // Emergency Preparedness
  'Emergency Preparedness', 'Fire Safety', 'First Aid', 'Lifesaving', 'Safety',
  'Search and Rescue',
  // Environment
  'Bird Study', 'Environmental Science', 'Fish and Wildlife Management', 'Fishing',
  'Fly Fishing', 'Forestry', 'Geology', 'Insect Study', 'Mammal Study', 'Nature',
  'Oceanography', 'Plant Science', 'Reptile and Amphibian Study',
  'Soil and Water Conservation', 'Sustainability', 'Weather',
  // Family Life
  'Cooking', 'Family Life', 'Pets',
  // Health & Fitness
  'Athletics', 'Cycling', 'Hiking', 'Personal Fitness', 'Sports', 'Swimming',
  'Water Sports',
  // Outdoors
  'Backpacking', 'Camping', 'Canoeing', 'Climbing', 'Horsemanship', 'Kayaking',
  'Motorboating', 'Orienteering', 'Rowing', 'Small-Boat Sailing', 'Snow Sports',
  'Whitewater', 'Wilderness Survival',
  // Personal Development
  'American Cultures', 'American Heritage', 'American Labor', 'Entrepreneurship', 'Law',
  'Personal Management', 'Salesmanship', 'Scholarship', 'Scouting Heritage',
  // Science & Technology
  'Aviation', 'Chemical Engineering', 'Chemistry', 'Electricity', 'Electronics',
  'Energy', 'Engineering', 'Exploration', 'Nuclear Science', 'Programming', 'Radio',
  'Robotics', 'Space Exploration',
  // Skills & Crafts
  'American Business', 'Animal Science', 'Archaeology', 'Archery',
  'Automotive Maintenance', 'Basketball', 'Bugling', 'Crime Prevention', 'Dentistry',
  'Disabilities Awareness', 'Dog Care', 'Farm Mechanics', 'Fingerprinting', 'Gardening',
  'Geography', 'Golf', 'Landscape Architecture', 'Medicine', 'Metalwork',
  'Mining in Society', 'Plumbing', 'Public Health', 'Pulp and Paper', 'Railroading',
  'Rifle Shooting', 'Shotgun Shooting', 'Skating', 'Surveying', 'Textile',
  'Traffic Safety', 'Truck Transportation', 'Veterinary Medicine', 'Welding',
]

// Slug overrides: maps badge name → archive filename stem (or null to skip)
// The archive uses {slug}-merit-badge.json; most names auto-convert correctly.
const ARCHIVE_SLUG: Record<string, string | null> = {
  // Archive file is "architecture", not "architecture-and-construction"
  'Architecture and Construction': 'architecture',
  // Archive file omits "and" in "Fish & Wildlife Management"
  'Fish and Wildlife Management': 'fish-wildlife-management',
  // These badges are not in the archive — skip with null
  'Cinematography': null,
  'Indian Lore': null,
  'Chemical Engineering': null,
  'Basketball': null,
  'Geography': null,
  'Medicine': null,
}

// ---- Helpers ----

function toArchiveSlug(name: string): string | null {
  if (name in ARCHIVE_SLUG) return ARCHIVE_SLUG[name]
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

const BASE_URL =
  'https://raw.githubusercontent.com/dasevilla/scout-archive/main/build/merit-badges'

function archiveUrl(slug: string): string {
  return `${BASE_URL}/${slug}-merit-badge.json`
}

/** Recursively extract plain text from a content node tree */
function extractText(nodes: ContentNode[]): string {
  return nodes
    .map(node => {
      if (node.type === 'text') return node.value ?? ''
      if (node.children) return extractText(node.children)
      return ''
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function difficultyFromCount(count: number): number {
  if (count <= 4) return 1
  if (count <= 7) return 2
  if (count <= 10) return 3
  if (count <= 14) return 4
  return 5
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''")
}

// ---- Fetcher ----

async function fetchBadge(name: string): Promise<BadgeData> {
  const slug = toArchiveSlug(name)

  if (slug === null) {
    return { name, description: null, requirements: null, bsa_url: null, worksheet_url: null, difficulty: null }
  }

  const url = archiveUrl(slug)
  let archive: ArchiveBadge

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) {
      console.warn(`  HTTP ${res.status} for ${url}`)
      return { name, description: null, requirements: null, bsa_url: null, worksheet_url: null, difficulty: null }
    }
    archive = (await res.json()) as ArchiveBadge
  } catch (err) {
    console.warn(`  network error: ${err}`)
    return { name, description: null, requirements: null, bsa_url: null, worksheet_url: null, difficulty: null }
  }

  // --- Description ---
  const description = archive.overview?.trim() || null

  // --- Requirements: only labeled (numbered) top-level requirements ---
  const labeledReqs = archive.requirements.filter(r => r.label !== null)
  const requirements =
    labeledReqs.length > 0
      ? labeledReqs.map(r => ({ number: r.label!, text: extractText(r.content) }))
      : null

  const difficulty = requirements ? difficultyFromCount(requirements.length) : null

  return {
    name,
    description,
    requirements,
    bsa_url: archive.url ?? null,
    worksheet_url: archive.workbook_pdf_url ?? null,
    difficulty,
  }
}

// ---- SQL output ----

function toSqlUpdate(data: BadgeData): string {
  const desc = data.description ? `'${escapeSql(data.description)}'` : 'NULL'
  const reqs = data.requirements
    ? `'${escapeSql(JSON.stringify(data.requirements))}'::jsonb`
    : 'NULL'
  const bsaUrl = data.bsa_url ? `'${escapeSql(data.bsa_url)}'` : 'NULL'
  const wsUrl = data.worksheet_url ? `'${escapeSql(data.worksheet_url)}'` : 'NULL'
  const diff = data.difficulty !== null ? String(data.difficulty) : 'NULL'

  return [
    `update merit_badges set`,
    `  description    = ${desc},`,
    `  requirements   = ${reqs},`,
    `  bsa_url        = ${bsaUrl},`,
    `  worksheet_url  = ${wsUrl},`,
    `  difficulty     = ${diff}`,
    `where name = '${escapeSql(data.name)}';`,
  ].join('\n')
}

// ---- Main ----

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const badgeIdx = args.indexOf('--badge')
  const singleBadge = badgeIdx >= 0 ? args[badgeIdx + 1] : null

  const badges = singleBadge
    ? ALL_BADGES.filter(b => b.toLowerCase() === singleBadge.toLowerCase())
    : ALL_BADGES

  if (singleBadge && badges.length === 0) {
    console.error(`Badge not found: "${singleBadge}"`)
    process.exit(1)
  }

  if (dryRun) {
    console.log('DRY RUN — archive slugs:\n')
    for (const name of badges) {
      const slug = toArchiveSlug(name)
      const status = slug === null ? '(SKIP — not in archive)' : `→ ${slug}-merit-badge.json`
      console.log(`  ${name.padEnd(45)} ${status}`)
    }
    const skipped = badges.filter(n => toArchiveSlug(n) === null).length
    console.log(`\n${badges.length - skipped} fetchable, ${skipped} will be skipped`)
    return
  }

  console.log(`\nFetching ${badges.length} badge(s) from scout-archive...\n`)

  const results: BadgeData[] = []

  for (let i = 0; i < badges.length; i++) {
    const name = badges[i]
    process.stdout.write(`[${String(i + 1).padStart(3)}/${badges.length}] ${name.padEnd(40)}`)
    const data = await fetchBadge(name)
    const descLen = data.description?.length ?? 0
    const reqCount = data.requirements?.length ?? 0
    const status = toArchiveSlug(name) === null ? 'SKIPPED' : `desc=${String(descLen).padStart(4)}ch  reqs=${reqCount}`
    console.log(status)
    results.push(data)
    if (i < badges.length - 1) await sleep(300) // gentle rate limit — GitHub CDN
  }

  // Write migration file
  const ts = new Date()
    .toISOString()
    .replace(/[-T:.Z]/g, '')
    .slice(0, 14)
  const outPath = path.join(
    process.cwd(),
    'supabase',
    'migrations',
    `${ts}_seed_mb_metadata.sql`,
  )

  const lines = [
    '-- Auto-generated by scripts/scrape-badges.ts',
    `-- Source: https://github.com/dasevilla/scout-archive`,
    `-- Generated: ${new Date().toISOString()}`,
    '',
    ...results.map(d => toSqlUpdate(d) + '\n'),
  ]

  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8')

  const withDesc = results.filter(r => r.description).length
  const withReqs = results.filter(r => r.requirements).length
  const skipped = results.filter(r => toArchiveSlug(r.name) === null).length

  console.log(`\nDone!`)
  console.log(`  fetched      : ${results.length - skipped}/${results.length}`)
  console.log(`  skipped      : ${skipped} (not in archive)`)
  console.log(`  descriptions : ${withDesc}/${results.length}`)
  console.log(`  requirements : ${withReqs}/${results.length}`)
  console.log(`\nOutput: ${outPath}`)
  console.log('\nNext: review the SQL then run `supabase db push`')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
