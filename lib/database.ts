import { PrismaClient } from '@prisma/client'
import { logQueryPerformance } from './performance-monitor'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// OPTIMIZATION: Enhanced Prisma client configuration with connection pooling
// Connection pool settings are configured in DATABASE_URL (connection_limit, pool_timeout)
// For optimal performance with Supabase/PostgreSQL:
// - Use pooled connection URL for queries (DATABASE_URL)
// - Use direct connection URL for migrations (DIRECT_URL in schema.prisma)
export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' 
    ? [
        { emit: 'event', level: 'query' }, // Enable query event monitoring
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ]
    : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // OPTIMIZATION: Connection pool monitoring and optimization
  // These settings help prevent connection exhaustion
  __internal: {
    engine: {
      cwd: process.cwd(),
      binaryTargets: ['native'],
    },
  } as any,
})

// OPTIMIZATION: Monitor query performance in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query' as never, (e: any) => {
    const query = e.query as string
    const duration = e.duration as number
    logQueryPerformance(query, duration)
  })
}

// Reuse Prisma client in development to avoid too many connections
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}

// Handle connection errors gracefully
prisma.$on('error' as never, (e: any) => {
  console.error('Prisma Client Error:', e)
})

// OPTIMIZATION: Test connection and monitor pool stats on startup in development
if (process.env.NODE_ENV === 'development') {
  prisma.$connect().then(() => {
    console.log('✅ Database connected successfully')
    // Log connection pool configuration
    const dbUrl = process.env.DATABASE_URL || ''
    const poolMatch = dbUrl.match(/connection_limit=(\d+)/)
    const timeoutMatch = dbUrl.match(/pool_timeout=(\d+)/)
    if (poolMatch || timeoutMatch) {
      console.log('📊 Connection pool config:', {
        limit: poolMatch ? poolMatch[1] : 'default (10)',
        timeout: timeoutMatch ? timeoutMatch[1] : 'default (10s)'
      })
    }
  }).catch((error) => {
    console.error('Failed to connect to database:', error)
    if (error.message?.includes('Can\'t reach database server')) {
      console.error('\n⚠️  Database Connection Error:')
      console.error('   Please check your DATABASE_URL in .env file')
      console.error('   Current DATABASE_URL:', process.env.DATABASE_URL ? `${process.env.DATABASE_URL.substring(0, 50)}...` : 'NOT SET')
      console.error('   Make sure the database server is running and accessible\n')
      console.error('   💡 Tip: For better performance, add connection pooling parameters:')
      console.error('      connection_limit=10&pool_timeout=10&connect_timeout=10')
    }
  })
}

// OPTIMIZATION: Graceful shutdown - close connections on process termination
const shutdown = async () => {
  await prisma.$disconnect()
  console.log('📊 Database connections closed')
}

process.on('beforeExit', shutdown)
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
