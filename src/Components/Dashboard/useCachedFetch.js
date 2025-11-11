import { useCallback, useEffect, useRef, useState } from 'react'

// Simple in-memory cache (module scope)
const store = new Map()

/**
 * useCachedFetch(key, loader, ttlMs)
 * - key: unique identifier
 * - loader: async function returning data
 * - ttlMs: time to live for cache (default 1 min)
 */
export default function useCachedFetch(key, loader, ttlMs = 60_000) {
  const [data, setData] = useState(() => {
    const cached = store.get(key)
    if (cached && (Date.now() - cached.timestamp < ttlMs)) return cached.value
    return null
  })
  const [loading, setLoading] = useState(!data)
  const [error, setError] = useState(null)
  const abortRef = useRef(null)

  const execute = useCallback(async () => {
    setLoading(true)
    setError(null)
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const value = await loader({ signal: controller.signal })
      store.set(key, { value, timestamp: Date.now() })
      setData(value)
    } catch (e) {
      if (e.name !== 'AbortError') setError(e)
    } finally {
      setLoading(false)
    }
  }, [key, loader])

  useEffect(() => {
    if (!data) execute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const refresh = useCallback(() => {
    store.delete(key)
    execute()
  }, [execute, key])

  return { data, loading, error, refresh }
}
