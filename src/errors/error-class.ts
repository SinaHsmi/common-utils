import { PRIORITY } from './error-constant'
import { sha256Hash } from '../utils/cryptography'
/**
 * @extends Error
 */
class BaseError<LogMessageCategory = string> extends Error {
  public priority: number
  public moreInfo?: object
  public category?: LogMessageCategory
  id: string
  interval?: number
  includeStack: boolean

  constructor({
    message,
    moreInfo,
    id = sha256Hash(message).slice(0, 10),
    priority = PRIORITY.IMPORTANT,
    category,
    interval = 1 * 60 * 60,
    includeStack = true,
  }: {
    message: string
    id?: string
    priority?: number
    moreInfo?: object
    category?: LogMessageCategory
    interval?: number
    includeStack?: boolean
  }) {
    super(message)
    this.id = id
    this.priority = priority
    this.interval = interval
    this.moreInfo = moreInfo
    this.category = category
    this.includeStack = includeStack
  }

  static fromError(error: Error, priority = PRIORITY.IMPORTANT) {
    let newErr = new BaseError({
      message: error.message,
      priority,
    })
    newErr.stack = error.stack
    return newErr
  }
}

export default BaseError
