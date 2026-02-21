#!/usr/bin/env node
/**
 * Bulk import/upsert devotions from a JSON file.
 *
 * Usage:
 *   node scripts/import-devotions.mjs data/january.json
 *
 * Requires in .env.local:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')

// ── Load .env.local ──────────────────────────────────────────────────────────

function loadEnvFile(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      const key = trimmed.slice(0, eqIdx).trim()
      const val = trimmed.slice(eqIdx + 1).trim()
      if (!(key in process.env)) process.env[key] = val
    }
  } catch {
    // .env.local not present — rely on existing process environment
  }
}

loadEnvFile(path.join(ROOT, '.env.local'))

// ── Validate environment ─────────────────────────────────────────────────────

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL is not set.')
  console.error('Add it to .env.local and try again.')
  process.exit(1)
}

if (!serviceRoleKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY is not set.')
  console.error('Find it in Supabase → Project Settings → API → service_role secret.')
  console.error('Add it to .env.local and try again.')
  process.exit(1)
}

// ── Parse CLI argument ───────────────────────────────────────────────────────

const [, , jsonArg] = process.argv

if (!jsonArg) {
  console.error('Usage: node scripts/import-devotions.mjs <path-to-json>')
  console.error('  e.g. node scripts/import-devotions.mjs data/january.json')
  process.exit(1)
}

const resolvedPath = path.resolve(jsonArg)

if (!fs.existsSync(resolvedPath)) {
  console.error(`Error: File not found: ${resolvedPath}`)
  process.exit(1)
}

// ── Load and parse JSON ──────────────────────────────────────────────────────

let raw
try {
  raw = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
} catch (err) {
  console.error(`Error: Could not parse JSON — ${err.message}`)
  process.exit(1)
}

if (!Array.isArray(raw)) {
  console.error('Error: JSON file must contain an array of devotion objects.')
  process.exit(1)
}

// ── Validate rows ────────────────────────────────────────────────────────────

const REQUIRED = ['month', 'day', 'title', 'verse_reference', 'body', 'prayer']

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const validRows = []
const validationErrors = []

for (let i = 0; i < raw.length; i++) {
  const row = raw[i]
  const rowLabel = `Row ${i + 1}`

  const missing = REQUIRED.filter(
    (f) => row[f] === undefined || row[f] === null || String(row[f]).trim() === ''
  )
  if (missing.length > 0) {
    validationErrors.push(`${rowLabel}: missing required fields: ${missing.join(', ')}`)
    continue
  }

  const month = Number(row.month)
  const day = Number(row.day)

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    validationErrors.push(`${rowLabel}: "month" must be an integer 1–12 (got ${row.month})`)
    continue
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    validationErrors.push(`${rowLabel}: "day" must be an integer 1–31 (got ${row.day})`)
    continue
  }

  validRows.push({
    month,
    day,
    title: String(row.title).trim(),
    verse_reference: String(row.verse_reference).trim(),
    verse_text: row.verse_text ? String(row.verse_text).trim() : null,
    body: String(row.body).trim(),
    prayer: String(row.prayer).trim(),
    published: row.published !== undefined ? Boolean(row.published) : true,
  })
}

// Report validation errors up front
if (validationErrors.length > 0) {
  console.error(`\nValidation errors (${validationErrors.length}):`)
  for (const e of validationErrors) console.error(`  ${e}`)
}

if (validRows.length === 0) {
  console.error('\nNo valid rows to import. Exiting.')
  process.exit(1)
}

console.log(`\nImporting ${validRows.length} devotion(s) from ${path.basename(resolvedPath)}…`)
if (validationErrors.length > 0) {
  console.log(`Skipping ${validationErrors.length} invalid row(s).\n`)
} else {
  console.log()
}

// ── Connect with service role (bypasses RLS) ─────────────────────────────────

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
})

// ── Fetch existing (month, day) to classify inserts vs updates ───────────────

const { data: existing, error: fetchError } = await supabase
  .from('devotions')
  .select('month, day')

if (fetchError) {
  console.error(`Error fetching existing devotions: ${fetchError.message}`)
  process.exit(1)
}

const existingSet = new Set((existing ?? []).map((r) => `${r.month}-${r.day}`))

// ── Upsert each row individually for per-row error reporting ─────────────────

let inserted = 0
let updated = 0
let failed = 0

for (const row of validRows) {
  const label = `${MONTH_NAMES[row.month - 1]} ${row.day}`
  const isUpdate = existingSet.has(`${row.month}-${row.day}`)

  const { error } = await supabase
    .from('devotions')
    .upsert(row, { onConflict: 'month,day' })

  if (error) {
    failed++
    console.error(`  ✗ FAILED:   ${label} — ${error.message}`)
  } else if (isUpdate) {
    updated++
    console.log(`  ↺ Updated:  ${label} — "${row.title}"`)
  } else {
    inserted++
    console.log(`  ✓ Inserted: ${label} — "${row.title}"`)
  }
}

// ── Summary ──────────────────────────────────────────────────────────────────

console.log('\n──────────────────────────────────────')
console.log(`  Inserted:          ${inserted}`)
console.log(`  Updated:           ${updated}`)
console.log(`  Failed:            ${failed}`)
if (validationErrors.length > 0) {
  console.log(`  Skipped (invalid): ${validationErrors.length}`)
}
console.log('──────────────────────────────────────')

if (failed > 0 || validationErrors.length > 0) process.exit(1)
