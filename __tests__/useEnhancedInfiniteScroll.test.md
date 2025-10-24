# Testing useEnhancedInfiniteScroll Hook

## Manual Testing Guide

### Test 1: Basic Eager Loading

**Steps:**
1. Open your leads page
2. Open browser console (F12)
3. Watch the console logs

**Expected Behavior:**
```
[InfiniteScroll] Dependencies changed, resetting and loading page 1
[InfiniteScroll] Fetching page 1 (pageSize: 50)
[InfiniteScroll] Received 50 items, total: 1108
[InfiniteScroll] 50 unique items after deduplication
[InfiniteScroll] HasMore: true (current: 50, total: 1108)
[InfiniteScroll] Eager loading enabled, scheduling page 2 in 200ms
[InfiniteScroll] Fetching page 2 (pageSize: 50)
[InfiniteScroll] Received 50 items, total: 1108
...continues until all 1108 loaded...
[InfiniteScroll] All data loaded (1108/1108)
```

**Success Criteria:**
- ✅ First 50 leads appear immediately
- ✅ Progress bar shows loading status
- ✅ All 1,108 leads load in ~4-5 seconds
- ✅ No duplicate entries
- ✅ Success notification appears when complete

---

### Test 2: Duplicate Prevention

**Steps:**
1. Add console.log in the hook to track IDs
2. Load the page
3. Check that no ID appears twice

**Expected Behavior:**
- Each lead ID appears exactly once in the final array
- `loadedIdsRef` Set grows with each page
- Duplicate filter removes any repeated IDs

**Success Criteria:**
- ✅ `data.length === totalCount` (no duplicates)
- ✅ All IDs are unique
- ✅ Console shows "X unique items after deduplication"

---

### Test 3: Error Handling

**Steps:**
1. Stop your database or API server
2. Reload the page
3. Observe error handling

**Expected Behavior:**
- Error message displays
- Retry button appears
- No infinite loops
- User can retry

**Success Criteria:**
- ✅ Error message is user-friendly
- ✅ Retry button works
- ✅ No console errors about undefined
- ✅ Loading state resets properly

---

### Test 4: Filter Changes (Reset)

**Steps:**
1. Load all leads
2. Change a filter (status, city, etc.)
3. Observe behavior

**Expected Behavior:**
```
[InfiniteScroll] Dependencies changed, resetting and loading page 1
[InfiniteScroll] Resetting state
[InfiniteScroll] Fetching page 1 (pageSize: 50)
...loads all data again with new filter...
```

**Success Criteria:**
- ✅ Data resets immediately
- ✅ Reloads from page 1
- ✅ Applies new filter
- ✅ No stale data visible

---

### Test 5: Performance Check

**Steps:**
1. Open Network tab in DevTools
2. Load the page
3. Monitor requests

**Expected Behavior:**
- Request 1: page=1, limit=50 → 50 items
- Request 2: page=2, limit=50 → 50 items (after 200ms)
- Request 3: page=3, limit=50 → 50 items (after 200ms)
- ...continues...
- Request 23: page=23, limit=50 → 8 items (last page)

**Success Criteria:**
- ✅ Exactly 23 requests for 1,108 leads (with pageSize=50)
- ✅ 200ms delay between requests
- ✅ Each request completes successfully
- ✅ Total time: ~4.6 seconds

---

### Test 6: UI Responsiveness

**Steps:**
1. Load the page
2. Immediately try to:
   - Scroll the table
   - Click on a lead
   - Use search
   - Change filters

**Expected Behavior:**
- Page remains responsive
- First 50 leads are interactive immediately
- Background loading doesn't block UI
- Smooth scrolling and interactions

**Success Criteria:**
- ✅ No UI freezing
- ✅ Can interact with first page immediately
- ✅ Background loading is non-blocking
- ✅ Smooth 60fps scrolling

---

### Test 7: Memory Usage

**Steps:**
1. Open Performance tab in DevTools
2. Take heap snapshot before loading
3. Load all 1,108 leads
4. Take heap snapshot after loading
5. Compare memory usage

**Expected Behavior:**
- Memory increase: ~500KB-1MB (for JSON data)
- No memory leaks
- Garbage collection works properly

**Success Criteria:**
- ✅ Memory increase is reasonable
- ✅ No memory leaks detected
- ✅ Memory stabilizes after loading

---

### Test 8: Edge Cases

#### Test 8a: Empty Results
**Steps:**
1. Apply filter that returns 0 results
2. Observe behavior

**Expected:**
- Shows "No leads found" message
- No infinite loop
- Can reset filters

#### Test 8b: Single Page
**Steps:**
1. Test with only 20 leads (less than pageSize)
2. Observe behavior

**Expected:**
- Loads single page
- Shows success immediately
- No unnecessary requests

#### Test 8c: Exact Multiple
**Steps:**
1. Test with exactly 100 leads (2 pages with pageSize=50)
2. Observe behavior

**Expected:**
- Loads exactly 2 pages
- Stops correctly
- Shows success

---

## Automated Testing (Optional)

If you want to add Jest tests:

```typescript
// __tests__/useEnhancedInfiniteScroll.test.ts
import { renderHook, waitFor } from '@testing-library/react'
import { useEnhancedInfiniteScroll } from '@/hooks/useEnhancedInfiniteScroll'

describe('useEnhancedInfiniteScroll', () => {
  const mockFetch = jest.fn()

  beforeEach(() => {
    mockFetch.mockClear()
  })

  it('should load first page immediately', async () => {
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: Array(50).fill(null).map((_, i) => ({ id: `${i}` })),
      totalCount: 100
    })

    const { result } = renderHook(() =>
      useEnhancedInfiniteScroll(mockFetch, {}, 50, [], true, false)
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(50)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('should eagerly load all pages', async () => {
    mockFetch
      .mockResolvedValueOnce({
        success: true,
        data: Array(50).fill(null).map((_, i) => ({ id: `${i}` })),
        totalCount: 100
      })
      .mockResolvedValueOnce({
        success: true,
        data: Array(50).fill(null).map((_, i) => ({ id: `${i + 50}` })),
        totalCount: 100
      })

    const { result } = renderHook(() =>
      useEnhancedInfiniteScroll(mockFetch, {}, 50, [], true, true)
    )

    await waitFor(() => {
      expect(result.current.data).toHaveLength(100)
    }, { timeout: 3000 })

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(result.current.hasMore).toBe(false)
  })

  it('should prevent duplicates', async () => {
    mockFetch.mockResolvedValueOnce({
      success: true,
      data: [
        { id: '1' },
        { id: '2' },
        { id: '1' }, // duplicate
      ],
      totalCount: 2
    })

    const { result } = renderHook(() =>
      useEnhancedInfiniteScroll(mockFetch, {}, 50, [], true, false)
    )

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data.map(d => d.id)).toEqual(['1', '2'])
  })
})
```

---

## Performance Benchmarks

### Expected Results (1,108 leads):

| Page Size | Total Pages | Total Time | Requests | Memory |
|-----------|-------------|------------|----------|--------|
| 20        | 56          | ~11.2s     | 56       | ~500KB |
| 50        | 23          | ~4.6s      | 23       | ~500KB |
| 100       | 12          | ~2.4s      | 12       | ~500KB |

### Network Throttling:

| Connection | Page Size 50 | Page Size 100 |
|------------|--------------|---------------|
| Fast 3G    | ~6s          | ~3.5s         |
| Slow 3G    | ~12s         | ~7s           |
| Offline    | Error        | Error         |

---

## Checklist

Before deploying to production:

- [ ] All 8 manual tests pass
- [ ] Console logs show correct behavior
- [ ] No duplicate entries in final data
- [ ] Error handling works correctly
- [ ] UI remains responsive during loading
- [ ] Memory usage is acceptable
- [ ] Performance meets requirements
- [ ] Edge cases handled properly
- [ ] Success notification appears
- [ ] Progress bar shows correctly
- [ ] Retry functionality works
- [ ] Filter changes trigger reset
- [ ] Search works with loaded data
- [ ] Table sorting works
- [ ] Modal interactions work
- [ ] Delete functionality works

---

## Troubleshooting

### Issue: Hook not loading data
**Check:**
1. API endpoint is correct
2. Database is running
3. Prisma client is generated
4. Network tab shows requests

### Issue: Infinite loop
**Check:**
1. API returns correct `totalCount`
2. Items have unique `id` field
3. `hasMore` calculation is correct

### Issue: Duplicates appearing
**Check:**
1. All items have `id` field
2. IDs are truly unique
3. Set-based filtering is working

### Issue: Slow loading
**Check:**
1. Increase page size (50 → 100)
2. Decrease delay (200ms → 100ms)
3. Check database indexes
4. Optimize API queries

---

## Success Metrics

Your implementation is successful when:

✅ **Speed**: All 1,108 leads load in < 5 seconds  
✅ **Accuracy**: No duplicate entries  
✅ **UX**: First page appears instantly  
✅ **Reliability**: Error handling works  
✅ **Performance**: UI stays responsive  
✅ **Completeness**: All data loads automatically  

---

## Next Steps After Testing

1. ✅ Verify all tests pass
2. ✅ Deploy to staging
3. ✅ Test with real users
4. ✅ Monitor performance metrics
5. ✅ Gather user feedback
6. ✅ Optimize based on data
7. ✅ Deploy to production

Good luck! 🚀
