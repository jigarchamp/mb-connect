#!/usr/bin/env tsx
/**
 * Exports the full merit badge dataset to a CSV for manual review and editing.
 *
 * Usage:
 *   npm run export-csv
 *
 * Output: data/merit_badges.csv
 *
 * Includes:
 *   - All 137 badges currently in the DB (with whatever data exists)
 *   - 20 BSA catalog badges not yet in our DB (name/category/eagle_required pre-filled)
 *   - A `status` column so editors know what needs attention
 *   - A `notes` column for editorial comments
 *
 * The CSV can be re-imported with: npm run import-csv
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment')
  process.exit(1)
}

// ── Badges in BSA catalog NOT yet in our DB ───────────────────────────────────
// Category and eagle_required are best-guess; verify during manual review.
const MISSING_FROM_DB = [
  { name: 'American Indian Cultures',  category: 'Personal Development',    eagle_required: false, notes: 'Renamed from "Indian Lore" — confirm whether to replace that row' },
  { name: 'Artificial Intelligence',   category: 'Science & Technology',    eagle_required: false, notes: 'New badge ~2023' },
  { name: 'Auctioneering',             category: 'Skills & Crafts',         eagle_required: false, notes: '' },
  { name: 'Basketry',                  category: 'Arts & Hobbies',          eagle_required: false, notes: 'Distinct from "Basketball" — both may be valid' },
  { name: 'Composite Materials',       category: 'Science & Technology',    eagle_required: false, notes: '' },
  { name: 'Cybersecurity',             category: 'Science & Technology',    eagle_required: false, notes: 'New badge ~2022' },
  { name: 'Dance',                     category: 'Arts & Hobbies',          eagle_required: false, notes: '' },
  { name: 'Drafting',                  category: 'Arts & Hobbies',          eagle_required: false, notes: '' },
  { name: 'Genealogy',                 category: 'Personal Development',    eagle_required: false, notes: '' },
  { name: 'Geocaching',                category: 'Outdoors',                eagle_required: false, notes: '' },
  { name: 'Health Care Professions',   category: 'Skills & Crafts',         eagle_required: false, notes: '' },
  { name: 'Home Repairs',              category: 'Skills & Crafts',         eagle_required: false, notes: '' },
  { name: 'Life Skills',               category: 'Personal Development',    eagle_required: false, notes: '' },
  { name: 'Multisport',                category: 'Health & Fitness',        eagle_required: false, notes: '' },
  { name: 'Physics',                   category: 'Science & Technology',    eagle_required: false, notes: '' },
  { name: 'Pioneering',                category: 'Outdoors',                eagle_required: false, notes: '' },
  { name: 'Psychology',                category: 'Personal Development',    eagle_required: false, notes: '' },
  { name: 'Scuba Diving',              category: 'Outdoors',                eagle_required: false, notes: '' },
  { name: 'Sewing',                    category: 'Arts & Hobbies',          eagle_required: false, notes: 'Archive name: "Sewing & Needlework"' },
  { name: 'Wildland Fire Management',  category: 'Emergency Preparedness',  eagle_required: false, notes: '' },
]

// Badges in our DB that may be retired from current BSA catalog
const POSSIBLY_RETIRED = new Set([
  'Indian Lore',
  'Cinematography',
  'Chemical Engineering',
  'Basketball',
  'Geography',
  'Medicine',
])

// ── CSV helpers ───────────────────────────────────────────────────────────────

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return ''
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Wrap in quotes if it contains comma, quote, or newline
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(',')
}

function statusFor(row: Record<string, unknown>): string {
  if (POSSIBLY_RETIRED.has(row.name as string)) return 'POSSIBLY_RETIRED'
  const hasData = row.description && row.requirements
  return hasData ? 'COMPLETE' : 'MISSING_DATA'
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  console.log('Fetching merit badges from DB...')
  const { data: badges, error } = await supabase
    .from('merit_badges')
    .select('name, eagle_required, category, description, requirements, difficulty, min_age, min_rank, typical_weeks, bsa_url, worksheet_url, bsa_badge_id, image_url')
    .order('category')
    .order('name')

  if (error) {
    console.error('Supabase error:', error.message)
    process.exit(1)
  }

  console.log(`  ${badges.length} badges in DB`)

  // ── Build rows ──

  const HEADERS = [
    'name',
    'eagle_required',
    'category',
    'status',
    'description',
    'requirements',        // JSON: [{"number":"1","text":"..."}]
    'difficulty',          // 1–5 (currently heuristic; update with real data)
    'min_age',
    'min_rank',            // scout | tenderfoot | second_class | first_class | star | life | eagle
    'typical_weeks',
    'bsa_url',
    'worksheet_url',
    'bsa_badge_id',
    'image_url',
    'notes',
  ]

  const rows: string[] = [csvRow(HEADERS)]

  // Existing DB rows
  for (const b of badges) {
    rows.push(csvRow([
      b.name,
      b.eagle_required,
      b.category,
      statusFor(b as Record<string, unknown>),
      b.description ?? '',
      b.requirements ? JSON.stringify(b.requirements) : '',
      b.difficulty ?? '',
      b.min_age ?? '',
      b.min_rank ?? '',
      b.typical_weeks ?? '',
      b.bsa_url ?? '',
      b.worksheet_url ?? '',
      b.bsa_badge_id ?? '',
      b.image_url ?? '',
      POSSIBLY_RETIRED.has(b.name) ? 'Verify: may be retired from current BSA catalog' : '',
    ]))
  }

  // Missing-from-DB rows
  for (const m of MISSING_FROM_DB) {
    rows.push(csvRow([
      m.name,
      m.eagle_required,
      m.category,
      'NOT_IN_DB',
      '', // description
      '', // requirements
      '', // difficulty
      '', // min_age
      '', // min_rank
      '', // typical_weeks
      `https://www.scouting.org/merit-badges/${m.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}/`,
      '', // worksheet_url
      '', // bsa_badge_id
      '', // image_url
      m.notes,
    ]))
  }

  // ── Write file ──

  const outDir = path.join(process.cwd(), 'data')
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir)

  const outPath = path.join(outDir, 'merit_badges.csv')
  fs.writeFileSync(outPath, rows.join('\n'), 'utf-8')

  const complete  = badges.filter(b => b.description && b.requirements).length
  const noData    = badges.filter(b => !b.description || !b.requirements).length
  const retired   = badges.filter(b => POSSIBLY_RETIRED.has(b.name)).length
  const notInDb   = MISSING_FROM_DB.length

  console.log('\nSummary:')
  console.log(`  COMPLETE         : ${complete}`)
  console.log(`  MISSING_DATA     : ${noData - retired}`)
  console.log(`  POSSIBLY_RETIRED : ${retired}`)
  console.log(`  NOT_IN_DB        : ${notInDb}`)
  console.log(`  Total rows       : ${rows.length - 1}`)
  console.log(`\nOutput: ${outPath}`)
  console.log('\nStatus guide:')
  console.log('  COMPLETE         — all data present, no action required')
  console.log('  MISSING_DATA     — in DB but description/requirements blank; fill in manually')
  console.log('  POSSIBLY_RETIRED — in our DB but may no longer be in BSA catalog; verify')
  console.log('  NOT_IN_DB        — in BSA catalog but not yet in our DB; fill in and re-import')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
