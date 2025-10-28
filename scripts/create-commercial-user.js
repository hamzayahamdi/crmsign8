const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createCommercialUser() {
  try {
    const email = 'radia@signature8.com'
    const password = 'commercial123'
    const name = 'Radia'
    const magasin = 'Casa'

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      console.log('✅ User already exists:', email)
      console.log('Updating to commercial role with magasin...')
      
      const updated = await prisma.user.update({
        where: { email },
        data: {
          role: 'commercial',
          magasin: magasin
        }
      })
      
      console.log('✅ User updated successfully!')
      console.log('📧 Email:', updated.email)
      console.log('👤 Name:', updated.name)
      console.log('🏢 Role:', updated.role)
      console.log('🏪 Magasin:', updated.magasin)
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create commercial user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'commercial',
        magasin
      }
    })

    console.log('✅ Commercial user created successfully!')
    console.log('📧 Email:', user.email)
    console.log('🔑 Password:', password)
    console.log('👤 Name:', user.name)
    console.log('🏢 Role:', user.role)
    console.log('🏪 Magasin:', user.magasin)
    console.log('\n🎯 You can now login with these credentials')
  } catch (error) {
    console.error('❌ Error creating commercial user:', error)
  } finally {
    await prisma.$disconnect()
  }
}

createCommercialUser()
