/**
 * One-time script to fix all existing magasin leads that have "moyenne" priority
 * This sets them to "haute" priority as per business requirements
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function fixMagasinPriority() {
  console.log('🔧 Starting fix for magasin leads priority...\n')

  try {
    // Find all magasin leads with "moyenne" priority
    const leadsToFix = await prisma.lead.findMany({
      where: {
        source: 'magasin',
        priorite: 'moyenne'
      },
      select: {
        id: true,
        nom: true,
        telephone: true,
        priorite: true
      }
    })

    console.log(`📊 Found ${leadsToFix.length} magasin leads with "moyenne" priority\n`)

    if (leadsToFix.length === 0) {
      console.log('✅ No leads to fix. All magasin leads already have correct priority!')
      return
    }

    // Update all of them to "haute" priority
    const result = await prisma.lead.updateMany({
      where: {
        source: 'magasin',
        priorite: 'moyenne'
      },
      data: {
        priorite: 'haute'
      }
    })

    console.log(`✅ Successfully updated ${result.count} leads from "moyenne" to "haute" priority\n`)

    // Verify the fix
    const remaining = await prisma.lead.count({
      where: {
        source: 'magasin',
        priorite: 'moyenne'
      }
    })

    if (remaining === 0) {
      console.log('✅ Verification passed: All magasin leads now have "haute" priority!')
    } else {
      console.log(`⚠️  Warning: ${remaining} magasin leads still have "moyenne" priority`)
    }

  } catch (error) {
    console.error('❌ Error fixing magasin leads priority:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
fixMagasinPriority()
  .then(() => {
    console.log('\n✨ Script completed successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

