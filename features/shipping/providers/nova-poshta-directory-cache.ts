type CacheEntry<T> = {
  value: T
  expiresAt: number
}

type DirectoryCacheLoadOptions<T> = {
  key: string
  ttlMs: number
  enabled: boolean
  loader: () => Promise<T>
  shouldCache?: (value: T) => boolean
  onHit?: (key: string) => void
  onMiss?: (key: string) => void
  onLoadError?: (key: string, error: unknown) => void
}

export interface NovaPoshtaDirectoryCache {
  getOrLoad<T>(options: DirectoryCacheLoadOptions<T>): Promise<T>
  clear(): void
}

export class InMemoryNovaPoshtaDirectoryCache implements NovaPoshtaDirectoryCache {
  private readonly entries = new Map<string, CacheEntry<unknown>>()
  private readonly inflight = new Map<string, Promise<unknown>>()

  constructor(private readonly now: () => number = () => Date.now()) {}

  async getOrLoad<T>(options: DirectoryCacheLoadOptions<T>): Promise<T> {
    if (!options.enabled || options.ttlMs <= 0) {
      options.onMiss?.(options.key)
      return options.loader()
    }

    const cached = this.entries.get(options.key) as CacheEntry<T> | undefined
    const now = this.now()

    if (cached && cached.expiresAt > now) {
      options.onHit?.(options.key)
      return cached.value
    }

    if (cached) {
      this.entries.delete(options.key)
    }

    const inflight = this.inflight.get(options.key) as Promise<T> | undefined
    if (inflight) {
      options.onHit?.(options.key)
      return inflight
    }

    options.onMiss?.(options.key)

    const loadingPromise = options
      .loader()
      .then((value) => {
        if (options.shouldCache?.(value) ?? true) {
          this.entries.set(options.key, {
            value,
            expiresAt: this.now() + options.ttlMs,
          })
        } else {
          this.entries.delete(options.key)
        }
        return value
      })
      .catch((error) => {
        this.entries.delete(options.key)
        options.onLoadError?.(options.key, error)
        throw error
      })
      .finally(() => {
        this.inflight.delete(options.key)
      })

    this.inflight.set(options.key, loadingPromise)

    return loadingPromise
  }

  clear() {
    this.entries.clear()
    this.inflight.clear()
  }
}
