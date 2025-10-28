const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function checkAndFixCommercial() {
  try {
    const email = 'john@sketch.ma'
    
    console.log('🔍 Checking user:', email)
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found. Creating new commercial user...')
      
      const hashedPassword = await bcrypt.hash('commercial123', 10)
      
      const newUser = await prisma.user.create({
        data: {
          email: email,
          password: hashedPassword,
          name: 'John',
          role: 'commercial',
          magasin: 'Casa'
        }
      })
      
      console.log('✅ Commercial user created successfully!')
      console.log('📧 Email:', newUser.email)
      console.log('🔑 Password: commercial123')
      console.log('👤 Name:', newUser.name)
      console.log('🏢 Role:', newUser.role)
      console.log('🏪 Magasin:', newUser.magasin)
    } else {
      console.log('✅ User found!')
      console.log('📧 Email:', user.email)
      console.log('👤 Name:', user.name)
      console.log('🏢 Role:', user.role)
      console.log('🏪 Magasin:', user.magasin)
      
      // Update to commercial if not already
      if (user.role !== 'commercial') {
        console.log('\n🔄 Updating user to commercial role...')
        const updated = await prisma.user.update({
          where: { email },
          data: {
            role: 'commercial',
            magasin: user.magasin || 'Casa'
          }
        })
        console.log('✅ User updated to commercial!')
        console.log('🏢 New Role:', updated.role)
        console.log('🏪 Magasin:', updated.magasin)
      }
      
      // Ensure magasin is set
      if (!user.magasin) {
        console.log('\n🔄 Adding magasin to user...')
        const updated = await prisma.user.update({
          where: { email },
          data: {
            magasin: 'Casa'
          }
        })
        console.log('✅ Magasin added!')
        console.log('🏪 Magasin:', updated.magasin)
      }
    }
    
    console.log('\n✅ All checks passed! You can now login with:')
    console.log('📧 Email: john@sketch.ma')
    console.log('🔑 Password: commercial123')
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.error('\nFull error details:', error.message)
    if (error.stack) {
      console.error('Stack trace:', error.stack)
    }
  } finally {
    await prisma.$disconnect()
  }
}

checkAndFixCommercial()
