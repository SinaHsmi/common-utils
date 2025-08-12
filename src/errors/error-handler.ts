import { PRIORITY } from './error-constant'
import BaseError from './error-class'
import { getKnownPriority } from './known-error-message'
import { Logger, LogPriority } from '../logger'
import { sha256Hash } from '../utils/cryptography'

const priorityMap: Record<number, LogPriority> = {
  [PRIORITY.CRITICAL]: 'critical',
  [PRIORITY.IMPORTANT]: 'high',
  [PRIORITY.WARNING]: 'low',
  [PRIORITY.NORMAL]: 'low',
  [PRIORITY.LOW]: 'low',
}

function customizeStackTrace(stack?: string, slice = -3, splitter = '\n', shifter = true) {
  const sliceParams = slice < 0 ? [slice] : [0, slice]
  let mm = stack
    ?.split('\n')
    .filter((m) => m !== 'Error')
    .filter((m) => !m.includes('__awaiter'))
    .filter((m) => !m.includes('handleError'))
    .filter((m) => !m.includes('process.'))
    .filter((m) => !m.includes('node:internal'))
    .filter((m) => !m.includes('fulfilled'))
    .filter((m) => !m.includes('(<anonymous>)'))
    .slice(...sliceParams)
    .map((m) => m.trim())
    .map((m) => {
      let n = m.split(' ')
      const path = m.split('\\').slice(-5).join('\\')
      if (n.length > 2) {
        const f = n[1]
        return `${f} ${path}`
      }
      return path
    })

  if (shifter) {
    mm = mm?.map((m) => `     ${m}`)
  }
  return mm?.join(splitter)
}

export class ErrorHandler<LogMessageCategory extends string = string> {
  knownErrorMessages: {
    messageTextSearch: string
    priority: number
  }[]
  logger: Logger
  defaultCategory?: LogMessageCategory
  timeThreshold?: { duration: number; maxErrors: number }[]

  constructor(
    logger: Logger,
    options: {
      knownErrorMessages?: {
        messageTextSearch: string
        priority: number
      }[]
      timeThreshold?: {
        duration: number
        maxErrors: number
      }[]
      defaultCategory?: LogMessageCategory
    } = {},
    handleUncaughtException = false
  ) {
    const { knownErrorMessages = [], defaultCategory, timeThreshold } = options
    this.logger = logger.getLogger('Error')
    this.knownErrorMessages = knownErrorMessages
    this.timeThreshold = timeThreshold
    this.defaultCategory = defaultCategory
    if (handleUncaughtException) this.handleUncaughtException()
  }

  convertError(err: Error | string, extraMoreInfo: any) {
    const defaultPriority = PRIORITY.IMPORTANT
    const defaultCategory = this.defaultCategory
    let errorMessage: string = err instanceof Error ? err.message : err
    let errorPriority: number = defaultPriority
    let errCategory: LogMessageCategory | undefined = defaultCategory
    let errorInfo: object | undefined
    let errorId =
      typeof errorMessage === 'string'
        ? sha256Hash(errorMessage).slice(0, 10)
        : sha256Hash(JSON.stringify(errorMessage)).slice(0, 10)
    let errorInterval: number | undefined = 1 * 60 * 60

    if (err instanceof BaseError) {
      errorPriority = err.priority || defaultPriority
      let moreInfo = extraMoreInfo || err.moreInfo || ''
      errorInfo = err.includeStack
        ? {
            stack: err?.stack
              ? err.stack.split('\n').slice(0, 20).join('\n')
              : JSON.stringify(err, null, 4),
            moreInfo,
          }
        : moreInfo
      errCategory = err.category

      errorId = err.id
      errorInterval = err.interval
    } else {
      errorPriority =
        getKnownPriority(errorMessage, this.knownErrorMessages, this.timeThreshold) ||
        defaultPriority
    }

    return { errorPriority, errorMessage, errorInfo, errCategory, errorId, errorInterval }
  }

  async handleError(err: Error | string | any, moreInfo?: any) {
    try {
      const { errorMessage, errorPriority, errorInfo, errCategory, errorId, errorInterval } =
        this.convertError(err, moreInfo)

      const trace = customizeStackTrace(new Error().stack)

      this.logger.alert(
        'Error Occurred: ' + errorMessage,
        errorInfo,
        {
          id: errorId,
          interval: errorInterval,
          extra: {
            trace,
          },
          category: errCategory,
        },
        priorityMap[errorPriority]
      )
    } catch (internalError: any) {
      console.log(
        `something bad happened while sending error to admin. error ${internalError.stack}`
      )
    }
  }

  handleUncaughtException() {
    process.on('uncaughtException', async (err) => {
      await this.handleError(err)
      const newError = new BaseError({
        message: 'uncaughtException. Node has stopped working. check it as soon as possible ...',
        interval: 0,
        priority: PRIORITY.CRITICAL,
      })
      await this.handleError(newError)
      process.exit(1)
    })
  }
}
