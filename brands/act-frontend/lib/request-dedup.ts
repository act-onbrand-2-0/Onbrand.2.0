'use client';

// Request deduplication utility to prevent duplicate API calls
// Caches in-flight requests and returns the same promise for duplicate calls

const pendingRequests = new Map<string, Promise<Response>>();
const responseCache = new Map<string, { data: unknown; timestamp: number }>();

const CACHE_TTL = 5000; // 5 seconds cache for GET requests

export async function dedupedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  const method = options?.method?.toUpperCase() || 'GET';
  
  // Only dedupe GET requests
  if (method !== 'GET') {
    return fetch(url, options);
  }

  const cacheKey = url;

  // Check if we have a cached response
  const cached = responseCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return new Response(JSON.stringify(cached.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Check if request is already in flight
  const pending = pendingRequests.get(cacheKey);
  if (pending) {
    return pending.then(res => res.clone());
  }

  // Make the request
  const requestPromise = fetch(url, options)
    .then(async (response) => {
      // Cache successful GET responses
      if (response.ok) {
        try {
          const cloned = response.clone();
          const data = await cloned.json();
          responseCache.set(cacheKey, { data, timestamp: Date.now() });
        } catch {
          // Ignore JSON parse errors
        }
      }
      return response;
    })
    .finally(() => {
      pendingRequests.delete(cacheKey);
    });

  pendingRequests.set(cacheKey, requestPromise);
  return requestPromise;
}

// Clear cache for a specific URL pattern
export function invalidateCache(urlPattern: string) {
  for (const key of responseCache.keys()) {
    if (key.includes(urlPattern)) {
      responseCache.delete(key);
    }
  }
}

// Clear all cache
export function clearCache() {
  responseCache.clear();
  pendingRequests.clear();
}
