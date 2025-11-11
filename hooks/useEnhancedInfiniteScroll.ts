import { useState, useEffect, useRef, useCallback } from 'react';

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  totalCount: number;
  hasMore?: boolean;
}

interface FetchParams {
  page: number;
  limit: number;
  [key: string]: any;
}

interface UseEnhancedInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  totalCount: number;
  currentPage: number;
  loadMore: () => void;
  retry: () => void;
  addItem: (item: T) => void;
  updateItem: (id: string, updates: Partial<T>) => void;
  removeItem: (id: string) => void;
}

/**
 * Enhanced infinite scroll hook with eager loading and data management
 * @param fetchFn - Function to fetch paginated data
 * @param filters - Filter parameters (changes trigger reset)
 * @param pageSize - Number of items per page
 * @param dependencies - Additional dependencies that trigger reset
 * @param enabled - Whether fetching is enabled
 * @param eagerLoad - Whether to automatically load all pages
 */
export function useEnhancedInfiniteScroll<T extends { id: string }>(
  fetchFn: (params: FetchParams) => Promise<PaginatedResponse<T>>,
  filters: Record<string, any> = {},
  pageSize: number = 50,
  dependencies: any[] = [],
  enabled: boolean = true,
  eagerLoad: boolean = true
): UseEnhancedInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  
  const loadedIdsRef = useRef<Set<string>>(new Set());
  const isLoadingRef = useRef(false);
  const eagerLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when dependencies change
  const reset = useCallback(() => {
    console.log('[InfiniteScroll] Resetting state');
    setData([]);
    setLoading(true);
    setIsLoadingMore(false);
    setHasMore(true);
    setError(null);
    setTotalCount(0);
    setCurrentPage(1);
    loadedIdsRef.current.clear();
    isLoadingRef.current = false;
    
    if (eagerLoadTimeoutRef.current) {
      clearTimeout(eagerLoadTimeoutRef.current);
      eagerLoadTimeoutRef.current = null;
    }
  }, []);

  // Fetch a single page
  const fetchPage = useCallback(async (page: number) => {
    if (isLoadingRef.current || !enabled) {
      return;
    }

    isLoadingRef.current = true;
    
    try {
      console.log(`[InfiniteScroll] Fetching page ${page} (pageSize: ${pageSize})`);
      
      const response = await fetchFn({
        page,
        limit: pageSize,
        ...filters
      });

      if (!response.success) {
        throw new Error('Failed to fetch data');
      }

      const newItems = response.data || [];
      const total = response.totalCount || 0;

      console.log(`[InfiniteScroll] Received ${newItems.length} items, total: ${total}`);

      // Deduplicate items
      const uniqueItems = newItems.filter(item => {
        if (loadedIdsRef.current.has(item.id)) {
          return false;
        }
        loadedIdsRef.current.add(item.id);
        return true;
      });

      console.log(`[InfiniteScroll] ${uniqueItems.length} unique items after deduplication`);

      setData(prev => [...prev, ...uniqueItems]);
      setTotalCount(total);
      setCurrentPage(page);

      const currentTotal = loadedIdsRef.current.size;
      const stillHasMore = currentTotal < total;
      setHasMore(stillHasMore);

      console.log(`[InfiniteScroll] HasMore: ${stillHasMore} (current: ${currentTotal}, total: ${total})`);

      // Eager loading: automatically fetch next page
      if (eagerLoad && stillHasMore) {
        console.log(`[InfiniteScroll] Eager loading enabled, scheduling page ${page + 1} in 200ms`);
        eagerLoadTimeoutRef.current = setTimeout(() => {
          isLoadingRef.current = false;
          fetchPage(page + 1);
        }, 200);
      } else {
        isLoadingRef.current = false;
        if (!stillHasMore) {
          console.log(`[InfiniteScroll] All data loaded (${currentTotal}/${total})`);
        }
      }

      setError(null);
    } catch (err) {
      console.error('[InfiniteScroll] Error fetching page:', err);
      setError(err as Error);
      isLoadingRef.current = false;
    } finally {
      setLoading(false);
      setIsLoadingMore(false);
    }
  }, [fetchFn, filters, pageSize, enabled, eagerLoad]);

  // Load more (manual trigger)
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingRef.current) {
      return;
    }
    setIsLoadingMore(true);
    fetchPage(currentPage + 1);
  }, [hasMore, currentPage, fetchPage]);

  // Retry on error
  const retry = useCallback(() => {
    reset();
    fetchPage(1);
  }, [reset, fetchPage]);

  // CRUD operations
  const addItem = useCallback((item: T) => {
    setData(prev => [item, ...prev]);
    loadedIdsRef.current.add(item.id);
    setTotalCount(prev => prev + 1);
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<T>) => {
    setData(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates } : item
    ));
  }, []);

  const removeItem = useCallback((id: string) => {
    setData(prev => prev.filter(item => item.id !== id));
    loadedIdsRef.current.delete(id);
    setTotalCount(prev => Math.max(0, prev - 1));
  }, []);

  // Initial load and dependency changes
  useEffect(() => {
    if (!enabled) {
      return;
    }

    console.log('[InfiniteScroll] Dependencies changed, resetting and loading page 1');
    reset();
    fetchPage(1);

    return () => {
      if (eagerLoadTimeoutRef.current) {
        clearTimeout(eagerLoadTimeoutRef.current);
      }
    };
  }, [enabled, ...dependencies, JSON.stringify(filters)]);

  return {
    data,
    loading,
    isLoadingMore,
    hasMore,
    error,
    totalCount,
    currentPage,
    loadMore,
    retry,
    addItem,
    updateItem,
    removeItem
  };
}
