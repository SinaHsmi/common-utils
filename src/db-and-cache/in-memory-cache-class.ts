interface MyCache {
  [key: string]: {
    data: string
    expiry: number
  }
}

export class InMemoryCache {
  cache: MyCache = {}
  clearIntervalMs: number
  isIntervalSet = false

  constructor(clearIntervalMs = 30 * 60_000) {
    this.clearIntervalMs = clearIntervalMs
  }

  // eslint-disable-next-line consistent-return
  get(key: string): string | undefined {
    let data = this.cache[key]
    if (data) {
      if (Date.now() < data.expiry) return data.data
      this.delete(key)
    }
  }

  //   expiry in second. default 30 days
  set(key: string, data: string, expiry = 30 * 24 * 60 * 60) {
    if (!this.isIntervalSet) {
      setInterval(this.clearExpiredData, this.clearIntervalMs)
      this.isIntervalSet = true
    }
    this.cache[key] = {
      data,
      expiry: Date.now() + expiry * 1000,
    }
  }

  delete(key: string) {
    delete this.cache[key]
  }

  clearExpiredData() {
    const now = Date.now()
    for (const key in this.cache) {
      if (this.cache[key] && now >= this.cache[key].expiry) {
        this.delete(key)
      }
    }
  }
}
