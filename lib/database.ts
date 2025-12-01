import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Create Prisma client with optimized configuration for production
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool configuration for better production performance
  // @ts-ignore - These options are valid but not in types
  __internal: {
    engine: {
      connection_limit: 10,
      pool_timeout: 10,
    },
  },
})

// Reuse Prisma client in development to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('beforeExit', async () => {
    console.log('[Database] Disconnecting Prisma client...')
    await prisma.$disconnect()
  })

  process.on('SIGINT', async () => {
    console.log('[Database] SIGINT received, disconnecting Prisma client...')
    await prisma.$disconnect()
    process.exit(0)
  })

  process.on('SIGTERM', async () => {
    console.log('[Database] SIGTERM received, disconnecting Prisma client...')
    await prisma.$disconnect()
    process.exit(0)
  })
}

// Test connection on initialization
if (process.env.NODE_ENV === 'production') {
  prisma.$connect()
    .then(() => {
      console.log('[Database] Prisma client connected successfully')
    })
    .catch((error) => {
      console.error('[Database] Failed to connect Prisma client:', error)
    })
}
