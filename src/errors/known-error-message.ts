import { PRIORITY } from './error-constant'

const ERROR_THRESHOLDS = [
  {
    duration: 10 * 60_000, // 10 minutes in ms
    maxErrors: 3,
  },
  {
    duration: 60 * 60_000, // 1 hour in ms
    maxErrors: 6,
  },
]

const errorCounts: Map<
  string,
  {
    timestamp: number
    count: number
  }[]
> = new Map()

export function getKnownPriority(
  errorMessage: string,
  knownErrorMessages: {
    messageTextSearch: string
    priority: number
  }[],
  timeThreshold = ERROR_THRESHOLDS
): number | null {
  const knownError = knownErrorMessages.find((m) => errorMessage.includes(m.messageTextSearch))
  if (!knownError) {
    return null
  }
  const now = Date.now()
  const errorTimes = errorCounts.get(knownError.messageTextSearch)!
  let newErrorTimes = errorTimes || []

  let newPriority = knownError.priority
  for (let i = 0; i < timeThreshold.length; i += 1) {
    let thd = timeThreshold[i]
    let errorTime = newErrorTimes[i]
    if (!errorTime) {
      newErrorTimes[i] = { timestamp: now, count: 1 }
      continue
    }

    if (now - errorTime.timestamp > thd.duration) {
      errorTime.count = 1
      errorTime.timestamp = now
      continue
    }

    if (errorTime.count + 1 < thd.maxErrors) {
      errorTime.count += 1
      continue
    }

    newPriority = Math.max(newPriority, PRIORITY.IMPORTANT)
    errorTime.count = 1
    errorTime.timestamp = now
  }
  errorCounts.set(knownError.messageTextSearch, newErrorTimes)
  return newPriority
}
