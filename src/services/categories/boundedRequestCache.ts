/** Small in-memory cache with request coalescing and invalidation-safe writes. */
export class BoundedRequestCache<T> {
  private readonly entries = new Map<string, { value: T; expiresAt: number; generation: number }>();
  private readonly inFlight = new Map<string, Promise<T>>();
  private generation = 0;

  constructor(private readonly maxEntries: number, private readonly ttlMs: number) {}

  get(key: string, load: () => Promise<T>): Promise<T> {
    const cached = this.entries.get(key);
    if (cached && cached.expiresAt > Date.now() && cached.generation === this.generation) {
      this.entries.delete(key);
      this.entries.set(key, cached);
      return Promise.resolve(cached.value);
    }
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const generation = this.generation;
    let request: Promise<T>;
    request = load()
      .then(value => {
        if (generation === this.generation) {
          this.entries.set(key, { value, expiresAt: Date.now() + this.ttlMs, generation });
          while (this.entries.size > this.maxEntries) this.entries.delete(this.entries.keys().next().value!);
        }
        return value;
      })
      // A rejected request is never cached, so the next call is a retry.
      .finally(() => {
        if (this.inFlight.get(key) === request) this.inFlight.delete(key);
      });
    this.inFlight.set(key, request);
    return request;
  }

  clear(): void {
    this.generation += 1;
    this.entries.clear();
    this.inFlight.clear();
  }
}
