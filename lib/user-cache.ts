import { prisma } from './database'

interface UserMap {
  [userId: string]: string
}

interface CacheEntry {
  data: UserMap
  timestamp: number
}

// In-memory cache for user ID to name mapping
// TTL: 5 minutes (300000ms)
const CACHE_TTL = 5 * 60 * 1000
let userCache: CacheEntry | null = null

/**
 * Get user mapping (ID -> name) with caching
 * Fetches from database only if cache is expired or missing
 */
export async function getUserMapping(): Promise<UserMap> {
  const now = Date.now()
  
  // Return cached data if still valid
  if (userCache && (now - userCache.timestamp) < CACHE_TTL) {
    return userCache.data
  }
  
  // Fetch fresh data from database
  const users = await prisma.user.findMany({
    select: { id: true, name: true },
  })
  
  const mapping: UserMap = {}
  users.forEach((user) => {
    mapping[user.id] = user.name
  })
  
  // Update cache
  userCache = {
    data: mapping,
    timestamp: now,
  }
  
  return mapping
}

/**
 * Invalidate the user cache (call after user updates)
 */
export function invalidateUserCache(): void {
  userCache = null
}

