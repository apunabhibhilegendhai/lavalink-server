/**
 * High-Speed In-Memory LRU / TTL Cache
 * Provides sub-millisecond (< 1ms) response times for Discord autocomplete and search queries
 */
class MemoryCache {
  constructor(defaultTtlMs = 300000, maxEntries = 500) {
    this.defaultTtlMs = defaultTtlMs;
    this.maxEntries = maxEntries;
    this.store = new Map();
  }

  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }

    // Refresh position for LRU
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value;
  }

  set(key, value, ttlMs = this.defaultTtlMs) {
    if (this.store.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.store.keys().next().value;
      if (firstKey) this.store.delete(firstKey);
    }

    this.store.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  has(key) {
    return this.get(key) !== null;
  }

  clear() {
    this.store.clear();
  }
}

module.exports = new MemoryCache();
