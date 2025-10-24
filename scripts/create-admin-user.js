const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...\n')
    
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'admin@signature8.com' }
    })

    if (existingUser) {
      console.log('⚠️  Admin user already exists!')
      console.log('📧 Email:', existingUser.email)
      console.log('👤 Name:', existingUser.name)
      console.log('🔑 Role:', existingUser.role)
      console.log('\n✅ You can login with: admin@signature8.com / admin123')
      return
    }

    // Hash password
    const hashedPassword = await bcrypt.hash('admin123', 10)
    
    // Create admin user
    const user = await prisma.user.create({
      data: {
        email: 'admin@signature8.com',
        password: hashedPassword,
        name: 'Admin',
        role: 'admin',
      },
    })
    
    console.log('✅ Admin user created successfully!')
    console.log('📧 Email:', user.email)
    console.log('👤 Name:', user.name)
    console.log('🔑 Role:', user.role)
    console.log('\n✅ You can now login with:')
    console.log('   Email: admin@signature8.com')
    console.log('   Password: admin123')
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

createAdminUser()
