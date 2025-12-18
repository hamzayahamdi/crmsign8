import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with connection pooling and better error handling
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
})

// Reuse Prisma client in development to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Handle connection errors gracefully
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma Client Error:', e)
})

// Test connection on startup in development
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().catch((error) => {
    console.error('Failed to connect to database:', error)
    if (error.message?.includes('Can\'t reach database server')) {
      console.error('\n⚠️  Database Connection Error:')
      console.error('   Please check your DATABASE_URL in .env file')
      console.error('   Current DATABASE_URL:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : 'NOT SET')
      console.error('   Make sure the database server is running and accessible\n')
    }
  })
}
