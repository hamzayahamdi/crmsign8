/**
 * Normalize assignments across Leads and Clients to canonical architect user names.
 *
 * - For each lead.assignePar and client.architecteAssigne, find best matching architect user
 *   and set the value to the exact users.name (e.g., "Amina Tazi").
 * - Matching is case-insensitive, accent-insensitive, and token-aware.
 * - Dry-run by default; use --apply to write changes.
 * - Scope with --only=leads or --only=clients (default: both).
 *
 * Usage:
 *   node scripts/normalize-assignments.js                 # dry-run, leads + clients
 *   node scripts/normalize-assignments.js --apply         # apply changes
 *   node scripts/normalize-assignments.js --only=leads    # only leads
 *   node scripts/normalize-assignments.js --only=clients  # only clients
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function parseArgs() {
  const args = process.argv.slice(2)
  const flags = new Map()
  for (const a of args) {
    const [k, v] = a.includes('=') ? a.split('=') : [a, true]
    flags.set(k, v)
  }
  const only = flags.get('--only') || 'both'
  return {
    apply: flags.has('--apply'),
    dryRun: !flags.has('--apply'),
    only,
  }
}

const norm = (s = '') => s.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
const tokens = (s = '') => norm(s).split(/\s+/).filter(Boolean)

function bestMatch(raw, users) {
  const nraw = norm(raw)
  if (!nraw) return null
  // 1) exact normalized match
  for (const u of users) {
    const uname = u.name || ''
    if (norm(uname) === nraw) return uname
  }
  // 2) full-name containment
  for (const u of users) {
    const uname = u.name || ''
    if (norm(uname).includes(nraw)) return uname
  }
  // 3) token-level containment (first/last or any)
  const tt = tokens(raw)
  if (tt.length) {
    for (const u of users) {
      const nu = norm(u.name || '')
      if (tt.some(t => nu.includes(t))) return u.name || ''
    }
  }
  return null
}

async function normalizeLeads(architects, apply) {
  const leads = await prisma.lead.findMany({ select: { id: true, assignePar: true } })
  let candidates = 0, updated = 0
  for (const lead of leads) {
    const current = (lead.assignePar || '').trim()
    if (!current || current === 'Non assigné') continue
    const match = bestMatch(current, architects)
    if (match && match !== current) {
      candidates++
      console.log(`[Lead] ${lead.id}: "${current}" -> "${match}"`)
      if (apply) {
        await prisma.lead.update({ where: { id: lead.id }, data: { assignePar: match } })
        updated++
      }
    }
  }
  return { candidates, updated }
}

async function normalizeClients(architects, apply) {
  const clients = await prisma.client.findMany({ select: { id: true, architecteAssigne: true } })
  let candidates = 0, updated = 0
  for (const client of clients) {
    const current = (client.architecteAssigne || '').trim()
    if (!current) continue
    const match = bestMatch(current, architects)
    if (match && match !== current) {
      candidates++
      console.log(`[Client] ${client.id}: "${current}" -> "${match}"`)
      if (apply) {
        await prisma.client.update({ where: { id: client.id }, data: { architecteAssigne: match } })
        updated++
      }
    }
  }
  return { candidates, updated }
}

async function main() {
  const { apply, dryRun, only } = parseArgs()
  console.log(`\n➡️  Normalize assignments ${dryRun ? '(dry-run)' : '(apply)'} | scope: ${only}\n`)

  const architects = await prisma.user.findMany({
    where: { role: { equals: 'architect', mode: 'insensitive' } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true }
  })
  if (!architects.length) {
    console.log('No architect users found. Nothing to do.')
    return
  }

  let leadRes = { candidates: 0, updated: 0 }
  let clientRes = { candidates: 0, updated: 0 }

  if (only === 'leads' || only === 'both') {
    leadRes = await normalizeLeads(architects, apply)
  }
  if (only === 'clients' || only === 'both') {
    clientRes = await normalizeClients(architects, apply)
  }

  console.log(`\nSummary:`)
  if (only !== 'clients') {
    console.log(`- Leads candidates: ${leadRes.candidates}`)
    console.log(`- Leads ${dryRun ? 'would update' : 'updated'}: ${dryRun ? leadRes.candidates : leadRes.updated}`)
  }
  if (only !== 'leads') {
    console.log(`- Clients candidates: ${clientRes.candidates}`)
    console.log(`- Clients ${dryRun ? 'would update' : 'updated'}: ${dryRun ? clientRes.candidates : clientRes.updated}`)
  }
  if (dryRun) console.log('\nRun with --apply to perform the updates.')
}

main()
  .catch((e) => { console.error('Error:', e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
