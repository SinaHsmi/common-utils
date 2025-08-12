import { InMemoryCache } from '../../../db-and-cache/in-memory-cache-class'

const cache = new InMemoryCache(2 * 60000)

// interval is in seconds
export async function checkNotificationTimestamp(notificationId: string, interval?: number) {
  if (!interval) return false
  const timestamp = new Date().getTime()
  let value = cache.get(`notification:${notificationId}`)
  if (value) {
    if (timestamp - +value < interval * 1000) {
      return true
    }
  }
  return false
}

export async function setNotificationTimestamp(notificationId: string, interval?: number) {
  if (!interval) return
  const key = `notification:${notificationId}`
  const timestamp = `${new Date().getTime()}`
  cache.set(key, timestamp, interval)
}
