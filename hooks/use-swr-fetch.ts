import useSWR from 'swr'
import { useAuth } from '@/contexts/auth-context'

/**
 * OPTIMIZATION: SWR-based data fetching hook with automatic caching and request deduplication
 * 
 * This hook can gradually replace useEffect + fetch patterns throughout the app
 * Benefits:
 * - Automatic request deduplication (same request won't fire twice)
 * - Built-in caching (reduces unnecessary network requests)
 * - Automatic revalidation on focus/window focus
 * - Error retry logic
 * 
 * Usage example:
 * const { data, error, isLoading, mutate } = useSWRFetch('/api/contacts')
 */
export function useSWRFetch<T = any>(
  url: string | null,
  options?: {
    revalidateOnFocus?: boolean
    revalidateOnReconnect?: boolean
    refreshInterval?: number
    shouldFetch?: boolean
  }
) {
  const { user } = useAuth()
  const shouldFetch = options?.shouldFetch !== false && url !== null && !!user

  const fetcher = async (url: string): Promise<T> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    
    const response = await fetch(url, {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Failed to fetch' }))
      throw new Error(error.error || `HTTP ${response.status}`)
    }

    return response.json()
  }

  const { data, error, isLoading, mutate } = useSWR<T>(
    shouldFetch ? url : null,
    fetcher,
    {
      revalidateOnFocus: options?.revalidateOnFocus ?? true,
      revalidateOnReconnect: options?.revalidateOnReconnect ?? true,
      refreshInterval: options?.refreshInterval,
      dedupingInterval: 2000, // Deduplicate requests within 2 seconds
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  )

  return {
    data,
    error,
    isLoading,
    mutate, // Function to manually trigger revalidation
  }
}


