/**
 * OPTIMIZATION: Performance monitoring utilities
 * Track API response times, database query performance, and identify bottlenecks
 */

// Track query performance metrics
interface QueryMetric {
  query: string
  duration: number
  timestamp: Date
}

const queryMetrics: QueryMetric[] = []
const SLOW_QUERY_THRESHOLD = 100 // milliseconds
const MAX_METRICS_STORAGE = 100 // Keep last 100 queries

/**
 * Log a database query performance metric
 */
export function logQueryPerformance(query: string, duration: number) {
  if (process.env.NODE_ENV === 'development') {
    const metric: QueryMetric = {
      query,
      duration,
      timestamp: new Date(),
    }
    
    queryMetrics.push(metric)
    
    // Keep only last MAX_METRICS_STORAGE metrics
    if (queryMetrics.length > MAX_METRICS_STORAGE) {
      queryMetrics.shift()
    }
    
    // Log slow queries
    if (duration > SLOW_QUERY_THRESHOLD) {
      console.warn(`🐢 Slow query detected (${duration.toFixed(2)}ms):`, query.substring(0, 100))
    }
  }
}

/**
 * Get performance statistics for queries
 */
export function getQueryStats() {
  if (queryMetrics.length === 0) {
    return {
      total: 0,
      average: 0,
      slowQueries: 0,
      fastest: 0,
      slowest: 0,
    }
  }
  
  const durations = queryMetrics.map(m => m.duration)
  const total = durations.length
  const sum = durations.reduce((a, b) => a + b, 0)
  const average = sum / total
  const slowQueries = queryMetrics.filter(m => m.duration > SLOW_QUERY_THRESHOLD).length
  const fastest = Math.min(...durations)
  const slowest = Math.max(...durations)
  
  return {
    total,
    average: parseFloat(average.toFixed(2)),
    slowQueries,
    fastest: parseFloat(fastest.toFixed(2)),
    slowest: parseFloat(slowest.toFixed(2)),
  }
}

/**
 * Middleware to track API route performance
 * Usage: const timer = startTimer('GET /api/clients')
 *        ... do work ...
 *        timer.end()
 */
export function startTimer(label: string) {
  const start = performance.now()
  
  return {
    end: () => {
      const duration = performance.now() - start
      logQueryPerformance(label, duration)
      
      if (process.env.NODE_ENV === 'development' && duration > SLOW_QUERY_THRESHOLD) {
        console.warn(`⏱️ Slow API route (${duration.toFixed(2)}ms): ${label}`)
      }
      
      return duration
    },
  }
}

/**
 * Wrapper for measuring async function performance
 */
export async function measureAsync<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const timer = startTimer(label)
  try {
    const result = await fn()
    timer.end()
    return result
  } catch (error) {
    timer.end()
    throw error
  }
}

/**
 * Log performance stats to console (call periodically in development)
 */
export function logPerformanceStats() {
  if (process.env.NODE_ENV === 'development' && queryMetrics.length > 0) {
    const stats = getQueryStats()
    console.log('📊 Performance Stats:', {
      ...stats,
      threshold: `${SLOW_QUERY_THRESHOLD}ms`,
    })
    
    // Log slowest queries
    const slowest = [...queryMetrics]
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
    
    if (slowest.length > 0) {
      console.log('🐢 Top 5 slowest operations:')
      slowest.forEach((metric, i) => {
        console.log(`  ${i + 1}. ${metric.duration.toFixed(2)}ms - ${metric.query.substring(0, 80)}`)
      })
    }
  }
}

// Log stats every 5 minutes in development
if (process.env.NODE_ENV === 'development' && typeof window === 'undefined') {
  setInterval(logPerformanceStats, 5 * 60 * 1000)
}

