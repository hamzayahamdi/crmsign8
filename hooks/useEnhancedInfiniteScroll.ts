import { useState, useEffect, useRef, useCallback } from 'react'

interface InfiniteScrollParams {
  page: number
  limit: number
  [key: string]: any
}

interface ApiResponse<T> {
  success: boolean
  data: T[]
  totalCount: number
  hasMore?: boolean
}

interface UseEnhancedInfiniteScrollReturn<T> {
  data: T[]
  loading: boolean
  isLoadingMore: boolean
  hasMore: boolean
  error: string | null
  loadMore: () => void
  addItem: (item: T) => void
  updateItem: (id: string, updates: Partial<T>) => void
  removeItem: (id: string) => void
  currentPage: number
  totalCount: number
}

/**
 * Enhanced infinite scroll hook with eager auto-loading
 * 
 * @param fetchData - API function that returns { success, data, totalCount }
 * @param initialParams - Initial query parameters
 * @param pageSize - Number of items per page
 * @param dependencies - Array of dependencies to trigger reset
 * @param enabled - Whether the hook is enabled
 * @param eagerLoad - Enable automatic background loading of all pages
 */
export function useEnhancedInfiniteScroll<T extends { id: string }>(
  fetchData: (params: InfiniteScrollParams) => Promise<ApiResponse<T>>,
  initialParams: Omit<InfiniteScrollParams, 'page' | 'limit'> = {},
  pageSize: number = 20,
  dependencies: any[] = [],
  enabled: boolean = true,
  eagerLoad: boolean = true
): UseEnhancedInfiniteScrollReturn<T> {
  // State management
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Refs to prevent duplicate fetches and track state
  const isFetchingRef = useRef(false)
  const fetchDataRef = useRef(fetchData)
  const pageSizeRef = useRef(pageSize)
  const loadedIdsRef = useRef<Set<string>>(new Set())
  const fetchedPagesRef = useRef<Set<number>>(new Set())
  const dataRef = useRef<T[]>([])

  // Update refs when props change
  useEffect(() => {
    fetchDataRef.current = fetchData
    pageSizeRef.current = pageSize
  }, [fetchData, pageSize])

  /**
   * Load a specific page of data
   */
  const loadPage = useCallback(async (page: number) => {
    // Prevent duplicate requests
    if (isFetchingRef.current) {
      return
    }

    // Avoid fetching the same page more than once
    if (fetchedPagesRef.current.has(page)) {
      return
    }

    isFetchingRef.current = true
    fetchedPagesRef.current.add(page)
    
    if (page === 1) {
      setLoading(true)
    } else {
      setIsLoadingMore(true)
    }
    
    setError(null)

    try {
      console.log(`[InfiniteScroll] Loading page ${page}`)
      const response = await fetchDataRef.current({
        ...initialParams,
        page,
        limit: pageSizeRef.current,
      })

      if (!response.success) {
        throw new Error('Failed to fetch data')
      }

      const newData = response.data || []
      const apiTotalCount = response.totalCount || 0
      
      console.log(`[InfiniteScroll] Page ${page} loaded: ${newData.length} items, total: ${apiTotalCount}`)
      if (newData.length > 0) {
        console.log('[InfiniteScroll] First item ID:', newData[0].id)
        console.log('[InfiniteScroll] Last item ID:', newData[newData.length - 1].id)
      }

      // Update total count
      setTotalCount(apiTotalCount)

      // Filter out duplicates using Set
      const uniqueNewData = newData.filter(item => {
        if (loadedIdsRef.current.has(item.id)) {
          return false
        }
        loadedIdsRef.current.add(item.id)
        return true
      })

      // Update dataRef deterministically and then push to React state
      if (page === 1) {
        // First page: replace all data
        dataRef.current = uniqueNewData
      } else {
        // Subsequent pages: append unique items
        dataRef.current = [...dataRef.current, ...uniqueNewData]
      }

      // Commit to React state from ref to avoid lost updates
      setData(dataRef.current)

      // Calculate if there's more data
      const hasMorePages = response.hasMore ?? false

      setHasMore(hasMorePages)
      setCurrentPage(page)

      // EAGER LOADING: Auto-fetch next page if enabled and more data exists
      if (eagerLoad && hasMorePages) {
        isFetchingRef.current = false
        setTimeout(() => loadPage(page + 1), 50)
      } else {
        isFetchingRef.current = false
      }

    } catch (err) {
      console.error('[InfiniteScroll] Error fetching data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
      setHasMore(false)
      // Allow retry by removing this page from fetched set on error
      fetchedPagesRef.current.delete(page)
      isFetchingRef.current = false
    } finally {
      if (page === 1) {
        setLoading(false)
      } else {
        setIsLoadingMore(false)
      }
    }
  }, [initialParams, totalCount, eagerLoad])

  /**
   * Manual load more (for scroll-based loading)
   */
  const loadMore = useCallback(() => {
    if (!hasMore || isFetchingRef.current || !enabled) {
      return
    }
    loadPage(currentPage + 1)
  }, [hasMore, currentPage, enabled, loadPage])


  /**
   * Manually add an item to the data
   */
  const addItem = useCallback((item: T) => {
    console.log('[InfiniteScroll] Adding item:', item.id)
    // Update dataRef first to keep it in sync
    dataRef.current = [item, ...dataRef.current]
    // Then update React state
    setData(dataRef.current)
    // Track the ID
    loadedIdsRef.current.add(item.id)
    setTotalCount(prev => prev + 1)
    console.log('[InfiniteScroll] Item added. Total items:', dataRef.current.length)
  }, [])

  /**
   * Manually update an item in the data
   */
  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    // Update dataRef first to keep it in sync
    dataRef.current = dataRef.current.map(item => 
      (item.id === id ? { ...item, ...updates } : item)
    )
    // Then update React state
    setData(dataRef.current)
  }, [])

  /**
   * Manually remove an item from the data
   */
  const removeItem = useCallback((id: string) => {
    // Update dataRef first to keep it in sync
    dataRef.current = dataRef.current.filter(item => item.id !== id)
    // Then update React state
    setData(dataRef.current)
    loadedIdsRef.current.delete(id)
    setTotalCount(prev => Math.max(0, prev - 1))
  }, [])

  /**
   * Initial load - only once on mount
   */
  useEffect(() => {
    if (!enabled) {
      return
    }

    // Only load if we have no data yet
    if (dataRef.current.length > 0) {
      console.log('[InfiniteScroll] Data already loaded, skipping')
      return
    }

    // Prevent double-loading in React Strict Mode
    if (isFetchingRef.current) {
      return
    }
    
    // Load page 1 (no reset needed - already empty)
    console.log('[InfiniteScroll] Initial load - fetching page 1')
    loadPage(1)

    // Cleanup
    return () => {
      isFetchingRef.current = false
    }
  }, [enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    loading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    addItem,
    updateItem,
    removeItem,
    currentPage,
    totalCount,
  }
}
