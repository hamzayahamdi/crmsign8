import { useRouter } from 'next/navigation'
import { useCallback } from 'react'

/**
 * OPTIMIZATION: Hook for prefetching routes on hover
 * This improves perceived performance by loading data before user clicks
 * 
 * Usage:
 * const handlePrefetch = usePrefetch()
 * <Link onMouseEnter={() => handlePrefetch('/clients')} />
 */
export function usePrefetch() {
  const router = useRouter()

  const prefetch = useCallback((href: string) => {
    if (typeof window === 'undefined') return
    
    try {
      // Next.js automatically prefetches <Link> components
      // For programmatic prefetch, we use router.prefetch()
      router.prefetch(href)
      
      // OPTIMIZATION: Also prefetch the API data endpoint
      // This warms up the cache before navigation
      const apiEndpoint = getApiEndpoint(href)
      if (apiEndpoint) {
        fetch(apiEndpoint, {
          credentials: 'include',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
          },
        }).catch(() => {
          // Silent fail - prefetch is opportunistic
        })
      }
    } catch (error) {
      // Silent fail - prefetch is best effort
      console.debug('Prefetch error:', error)
    }
  }, [router])

  return prefetch
}

/**
 * Map route paths to their API endpoints for data prefetching
 */
function getApiEndpoint(href: string): string | null {
  const routeToApi: Record<string, string> = {
    '/': '/api/leads?page=1&limit=50',
    '/contacts': '/api/contacts?limit=20&offset=0',
    '/clients': '/api/clients',
    '/opportunites': '/api/clients',
    '/opportunities': '/api/opportunities',
    '/architectes': '/api/architects',
    '/calendrier': '/api/calendar',
    '/tasks': '/api/tasks',
    '/notifications': '/api/notifications',
  }

  return routeToApi[href] || null
}

