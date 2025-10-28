const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword() {
  try {
    const email = 'john@sketch.ma'
    const newPassword = 'commercial123'
    
    console.log('🔍 Finding user:', email)
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      console.log('❌ User not found!')
      return
    }

    console.log('✅ User found!')
    console.log('👤 Name:', user.name)
    console.log('🏢 Role:', user.role)
    
    // Hash new password
    console.log('\n🔄 Hashing new password...')
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Update password
    console.log('🔄 Updating password in database...')
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword
      }
    })
    
    console.log('✅ Password updated successfully!')
    console.log('\n🎯 You can now login with:')
    console.log('📧 Email:', email)
    console.log('🔑 Password:', newPassword)
    
  } catch (error) {
    console.error('❌ Error:', error)
    console.error('Error message:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

resetPassword()
