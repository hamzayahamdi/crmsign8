const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createUser() {
  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'issam@test.com' }
    })

    if (existingUser) {
      console.log('⚠️  User already exists:', existingUser)
      return
    }

    const hashedPassword = await bcrypt.hash('password123', 10)
    
    const user = await prisma.user.create({
      data: {
        email: 'issam@test.com',
        password: hashedPassword,
        name: 'Issam Test',
        role: 'admin',
      },
    })
    
    
  } catch (error) {
    console.error('❌ Error creating user:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

createUser()
