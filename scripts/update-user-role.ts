/**
 * Script to update user role to "magasiner" (responsable magasin)
 * Updates user: Issam sketch
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updateUserRole() {
  console.log('🔧 Starting user role update...\n')
  console.log('📋 Target user: Issam Aboulfadl')
  console.log('🎯 New role: magasiner (responsable magasin)\n')

  try {
    // Find user by name (case-insensitive, partial match)
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { name: { contains: 'Issam Aboulfadl', mode: 'insensitive' } },
          { name: { contains: 'Aboulfadl', mode: 'insensitive' } },
          { email: { contains: 'aboulfadl', mode: 'insensitive' } },
        ],
      },
    })

    if (users.length === 0) {
      console.log('❌ No user found with name containing "Issam" or "sketch"')
      console.log('\n💡 Available users:')
      const allUsers = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true },
        orderBy: { name: 'asc' },
      })
      allUsers.forEach((u) => {
        console.log(`   - ${u.name} (${u.email}) - Role: ${u.role}`)
      })
      return
    }

    // Filter to find the exact match or best match
    let targetUser = users.find((u) => 
      u.name.toLowerCase().includes('issam') && u.name.toLowerCase().includes('aboulfadl')
    )
    
    // Also try email match
    if (!targetUser) {
      targetUser = users.find((u) => 
        u.email.toLowerCase().includes('aboulfadl')
      )
    }

    // If no exact match, use the first one
    if (!targetUser && users.length > 0) {
      targetUser = users[0]
    }

    if (!targetUser) {
      console.log('❌ Could not determine target user')
      return
    }

    console.log(`✅ Found user: ${targetUser.name} (${targetUser.email})`)
    console.log(`   Current role: ${targetUser.role}`)
    console.log(`   Current magasin: ${targetUser.magasin || 'None'}\n`)

    // Check if user needs a magasin assigned
    // For magasiner role, a magasin is required
    const MAGASINS = ["Casa - Ain Diab", "Rabat", "Tanger", "Marrakech", "Bouskoura"]
    
    let magasinToSet = targetUser.magasin
    
    // If user doesn't have a magasin, we need to set one
    if (!magasinToSet) {
      console.log('⚠️  User does not have a magasin assigned.')
      console.log('   Available magasins:', MAGASINS.join(', '))
      console.log('   ⚠️  Setting default: Casa - Ain Diab')
      magasinToSet = "Casa - Ain Diab"
    }

    // Update user role to magasiner
    const updatedUser = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        role: 'magasiner',
        magasin: magasinToSet,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        magasin: true,
        ville: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ USER UPDATED SUCCESSFULLY')
    console.log('='.repeat(60))
    console.log(`Name: ${updatedUser.name}`)
    console.log(`Email: ${updatedUser.email}`)
    console.log(`Role: ${updatedUser.role} (responsable magasin)`)
    console.log(`Magasin: ${updatedUser.magasin}`)
    console.log(`Updated at: ${updatedUser.updatedAt}`)
    console.log('\n✨ Update completed!')

  } catch (error) {
    console.error('❌ Fatal error:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
updateUserRole()
  .then(() => {
    console.log('\n🎉 Script finished successfully!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error)
    process.exit(1)
  })

