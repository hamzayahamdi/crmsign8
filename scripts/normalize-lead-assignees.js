/**
 * Normalize Lead.assignePar to match exact architect user names.
 *
 * - Finds all users with role 'architect' (case-insensitive)
 * - For each architect, updates leads whose assignePar roughly matches the architect name
 *   to the architect's exact user.name
 * - Matching is case-insensitive and trims whitespace; also matches if assignePar contains the full name
 * - Supports a dry-run mode (default) that prints changes without writing.
 *
 * Usage:
 *   node scripts/normalize-lead-assignees.js --dry-run   # default
 *   node scripts/normalize-lead-assignees.js --apply
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function parseArgs() {
  const args = new Set(process.argv.slice(2))
  return {
    apply: args.has('--apply'),
    dryRun: !args.has('--apply'),
  }
}

function norm(s) {
  return (s || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function tokens(s) {
  return norm(s).split(/\s+/).filter(Boolean)
}

function likelyMatch(assignePar, userName) {
  const a = norm(assignePar)
  const u = norm(userName)
  if (!a || !u) return false
  if (a === u) return true
  if (a.includes(u)) return true
  // token-level containment: either first or last name must appear
  const ut = tokens(userName)
  return ut.length >= 2 && (a.includes(ut[0]) || a.includes(ut[ut.length - 1]))
}

async function main() {
  const { apply, dryRun } = parseArgs()
  console.log(`\n➡️  Normalize Lead.assignePar ${dryRun ? '(dry-run)' : '(apply)'}\n`)

  // Load architects
  const architects = await prisma.user.findMany({
    where: { role: { equals: 'architect', mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true }
  })

  if (architects.length === 0) {
    console.log('No architect users found. Nothing to do.')
    return
  }

  console.log(`Found ${architects.length} architect users.`)

  // Load all leads which have a non-empty assignePar
  const leads = await prisma.lead.findMany({
    where: { assignePar: { not: '' } },
    select: { id: true, assignePar: true, createdAt: true }
  })

  console.log(`Scanning ${leads.length} leads...`)

  let totalCandidates = 0
  let totalUpdated = 0

  for (const lead of leads) {
    const current = lead.assignePar || ''
    const match = architects.find(a => likelyMatch(current, a.name))
    if (!match) continue

    totalCandidates++

    // Already exact? Skip
    if (current === match.name) continue

    console.log(`- Lead ${lead.id}: "${current}" -> "${match.name}"`)

    if (!dryRun) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { assignePar: match.name }
      })
      totalUpdated++
    }
  }

  console.log(`\nSummary:`)
  console.log(`- Candidates: ${totalCandidates}`)
  console.log(`- ${dryRun ? 'Would update' : 'Updated'}: ${dryRun ? totalCandidates : totalUpdated}`)
  if (dryRun) {
    console.log('\nRun with --apply to perform the updates.')
  }
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
