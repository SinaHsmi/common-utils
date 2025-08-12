const second = 1000
const minute = 60 * second
const hour = 60 * minute
const day = 24 * hour
const week = 7 * day

export const TIME_MS = {
  WEEK: week,
  DAY: day,
  HOUR: hour,
  MIN: minute,
  SEC: second,
}

export function convertToMilliseconds(duration: string | number): number {
  // Check if the input is already a number (e.g., "100" should return 100 milliseconds)
  if (typeof duration === 'number') {
    return duration // If it's already a number, return it as milliseconds (no conversion needed)
  }

  // Check if the input string is a valid number (e.g., "100" should return 100 milliseconds)

  if (!isNaN(+duration)) {
    return parseInt(duration) // If it's a number string, return it as milliseconds
  }

  // Regular expression to match number and time unit (like 'd', 'h', 'm', 's', 'days', etc.)
  const regex = /^(\d+)\s*(d|days?|h|hrs?|m|mins?|s|secs?)$/i

  // Match the input string with the regex
  const match = duration.replace(' ', '').toLowerCase().match(regex)

  if (!match) {
    throw new Error('Invalid time format')
  }

  // Extract the number and the time unit
  const value = parseInt(match[1])
  const unit = match[2]

  // Convert based on the time unit
  switch (unit) {
    case 'd':
    case 'days':
      return value * day // Convert days to milliseconds
    case 'h':
    case 'hrs':
      return value * hour // Convert hours to milliseconds
    case 'm':
    case 'mins':
      return value * minute // Convert minutes to milliseconds
    case 's':
    case 'secs':
      return value * 1000 // Convert seconds to milliseconds
    default:
      throw new Error('Invalid time format')
  }
}
