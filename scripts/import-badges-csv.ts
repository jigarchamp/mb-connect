#!/usr/bin/env tsx
/**
 * Imports the manually-edited merit badge CSV back into Supabase.
 *
 * Usage:
 *   npm run import-csv               # upsert all rows
 *   npm run import-csv -- --dry-run  # preview changes without writing
 *
 * Reads: data/merit_badges.csv
 * Skips rows with status NOT_IN_DB that still have no description or requirements
 * (they must be filled in before import is meaningful).
 *
 * Upserts on: name (unique key)
 */

import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// ── CSV parser (handles quoted fields with embedded commas/newlines) ───────────

function parseCsv(content: string): Record<string, string>[] {
  // Split into logical lines, preserving all characters (including quotes) so
  // splitCsvLine can handle field unescaping. Only use inQuote to determine
  // whether a newline is a row boundary or embedded field content.
  const rawLines: string[] = []
  let current = ''
  let inQuote = false

  for (let i = 0; i < content.length; i++) {
    const ch = content[i]
    if (ch === '"') {
      current += ch
      if (!inQuote) {
        inQuote = true
      } else if (content[i + 1] === '"') {
        current += '"' // escaped quote — consume both
        i++
      } else {
        inQuote = false
      }
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && content[i + 1] === '\n') i++
      rawLines.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current) rawLines.push(current)

  if (rawLines.length < 2) return []

  const headers = splitCsvLine(rawLines[0])
  return rawLines.slice(1)
    .filter(l => l.trim())
    .map(line => {
      const values = splitCsvLine(line)
      const row: Record<string, string> = {}
      headers.forEach((h, i) => { row[h] = values[i] ?? '' })
      return row
    })
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = []
  let field = ''
  let inQuote = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { field += '"'; i++ }
      else inQuote = !inQuote
    } else if (ch === ',' && !inQuote) {
      fields.push(field)
      field = ''
    } else {
      field += ch
    }
  }
  fields.push(field)
  return fields
}

// ── Row → DB object ───────────────────────────────────────────────────────────

interface BadgeUpsert {
  name: string
  eagle_required: boolean
  category: string
  description: string | null
  requirements: unknown | null
  difficulty: number | null
  min_age: number | null
  min_rank: string | null
  typical_weeks: number | null
  bsa_url: string | null
  worksheet_url: string | null
  bsa_badge_id: string | null
  image_url: string | null
}

function rowToUpsert(row: Record<string, string>): BadgeUpsert | null {
  const name = row['name']?.trim()
  if (!name) return null

  let requirements: unknown | null = null
  const reqStr = row['requirements']?.trim()
  if (reqStr) {
    try { requirements = JSON.parse(reqStr) }
    catch { console.warn(`  [${name}] invalid requirements JSON — skipping field`) }
  }

  return {
    name,
    eagle_required: row['eagle_required']?.trim().toUpperCase() === 'TRUE',
    category: row['category']?.trim() || 'Uncategorized',
    description:    row['description']?.trim()    || null,
    requirements,
    difficulty:     parseInt(row['difficulty'])   || null,
    min_age:        parseInt(row['min_age'])       || null,
    min_rank:       row['min_rank']?.trim()        || null,
    typical_weeks:  parseInt(row['typical_weeks']) || null,
    bsa_url:        row['bsa_url']?.trim()         || null,
    worksheet_url:  row['worksheet_url']?.trim()   || null,
    bsa_badge_id:   row['bsa_badge_id']?.trim()    || null,
    image_url:      row['image_url']?.trim()       || null,
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')

  const csvPath = path.join(process.cwd(), 'data', 'merit_badges.csv')
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV not found: ${csvPath}\nRun 'npm run export-csv' first.`)
    process.exit(1)
  }

  const content = fs.readFileSync(csvPath, 'utf-8')
  const rows = parseCsv(content)
  console.log(`\nParsed ${rows.length} rows from ${csvPath}`)

  const upserts: BadgeUpsert[] = []
  const skipped: string[] = []

  for (const row of rows) {
    const status = row['status']?.trim()

    // Skip NOT_IN_DB rows that have no data filled in yet
    if (status === 'NOT_IN_DB' && !row['description']?.trim() && !row['requirements']?.trim()) {
      skipped.push(`${row['name']} (NOT_IN_DB, no data filled in)`)
      continue
    }

    const upsert = rowToUpsert(row)
    if (upsert) upserts.push(upsert)
  }

  console.log(`  Will upsert : ${upserts.length}`)
  console.log(`  Skipped     : ${skipped.length}`)
  if (skipped.length > 0 && dryRun) {
    console.log('\nSkipped rows:')
    skipped.forEach(s => console.log(`  - ${s}`))
  }

  if (dryRun) {
    console.log('\nDRY RUN — no changes written. Sample of first 3 upserts:')
    upserts.slice(0, 3).forEach(u => {
      console.log(`  ${u.name} | eagle=${u.eagle_required} | desc=${u.description?.length ?? 0}ch | reqs=${Array.isArray(u.requirements) ? (u.requirements as unknown[]).length : 0} | diff=${u.difficulty}`)
    })
    return
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

  // Upsert in batches of 50
  const BATCH = 50
  let successCount = 0
  for (let i = 0; i < upserts.length; i += BATCH) {
    const batch = upserts.slice(i, i + BATCH)
    const { error } = await supabase
      .from('merit_badges')
      .upsert(batch, { onConflict: 'name' })
    if (error) {
      console.error(`Batch ${i / BATCH + 1} error:`, error.message)
    } else {
      successCount += batch.length
      process.stdout.write(`\r  Upserted ${successCount}/${upserts.length}...`)
    }
  }

  console.log(`\n\nDone! ${successCount} rows upserted.`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
