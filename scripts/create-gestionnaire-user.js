/**
 * Script to create a Gestionnaire user with proper password hashing
 * 
 * Usage:
 * node scripts/create-gestionnaire-user.js
 * 
 * Or with custom values:
 * node scripts/create-gestionnaire-user.js "email@example.com" "password123" "User Name"
 */

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createGestionnaireUser() {
  try {
    // Get values from command line or use defaults
    const email = process.argv[2] || 'gestionnaire@signature8.com'
    const password = process.argv[3] || 'gestionnaire123'
    const name = process.argv[4] || 'Marie Dupont'

    console.log('🔐 Creating Gestionnaire user...')
    console.log('📧 Email:', email)
    console.log('👤 Name:', name)
    console.log('🔑 Role: Gestionnaire de Projets')

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('⚠️  User with this email already exists!')
      console.log('Would you like to update their role to Gestionnaire? (y/n)')
      
      // In a real script, you'd use readline here
      // For now, just update it
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'Gestionnaire',
          updatedAt: new Date()
        }
      })
      
      console.log('✅ User role updated to Gestionnaire!')
      console.log('User ID:', updatedUser.id)
      return updatedUser
    }

    // Hash the password
    console.log('🔒 Hashing password...')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'Gestionnaire'
      }
    })

    console.log('✅ Gestionnaire user created successfully!')
    console.log('User ID:', user.id)
    console.log('Email:', user.email)
    console.log('Name:', user.name)
    console.log('Role:', user.role)
    console.log('\n🎉 You can now login with:')
    console.log('   Email:', email)
    console.log('   Password:', password)
    console.log('\n⚠️  Remember to change the password after first login!')

    return user

  } catch (error) {
    console.error('❌ Error creating user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function listAllGestionnaires() {
  try {
    const gestionnaires = await prisma.user.findMany({
      where: {
        role: {
          equals: 'Gestionnaire',
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('\n📋 All Gestionnaire users:')
    console.log('─'.repeat(80))
    
    if (gestionnaires.length === 0) {
      console.log('No Gestionnaire users found.')
    } else {
      gestionnaires.forEach((user, index) => {
        console.log(`${index + 1}. ${user.name} (${user.email})`)
        console.log(`   ID: ${user.id}`)
        console.log(`   Created: ${user.createdAt.toLocaleDateString('fr-FR')}`)
        console.log('─'.repeat(80))
      })
    }

    return gestionnaires

  } catch (error) {
    console.error('❌ Error listing users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

async function updateUserRole(email, newRole) {
  try {
    console.log(`🔄 Updating user ${email} to role: ${newRole}`)

    const user = await prisma.user.update({
      where: { email },
      data: {
        role: newRole,
        updatedAt: new Date()
      }
    })

    console.log('✅ User role updated successfully!')
    console.log('Name:', user.name)
    console.log('Email:', user.email)
    console.log('New Role:', user.role)

    return user

  } catch (error) {
    console.error('❌ Error updating user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Main execution
const command = process.argv[2]

if (command === 'list') {
  listAllGestionnaires()
} else if (command === 'update') {
  const email = process.argv[3]
  const role = process.argv[4] || 'Gestionnaire'
  
  if (!email) {
    console.error('❌ Please provide an email address')
    console.log('Usage: node scripts/create-gestionnaire-user.js update email@example.com Gestionnaire')
    process.exit(1)
  }
  
  updateUserRole(email, role)
} else {
  createGestionnaireUser()
}

module.exports = {
  createGestionnaireUser,
  listAllGestionnaires,
  updateUserRole
}
