import { getLogger as getWinstonLogger, LoggerLevel, LoggerType } from './logger.winston'
import { LogstashLogger } from './logstash.logger'

type LogType = 'debug' | 'data' | 'log' | 'alert'
export type LogPriority = 'low' | 'normal' | 'high' | 'critical'

export const LOG_PRIORITY_MAP: Record<LogPriority, number> = {
  low: 0,
  normal: 1,
  high: 2,
  critical: 3,
}

type LogMetadata = {
  source: string
  category: string
  //
  dataType: string
  data?: { [key: string]: any }
  extra?: { [key: string]: any }
  //
  tags: string[]
  //
  priority: number
  type: LogType
}

export type Log = LogMetadata & {
  title: string
  message?: string
  time: string
  interval?: number
  id?: string
}

type LogOptions = {
  id?: string
  dataType?: string
  tags?: string[]
  extra?: { [key: string]: any }
  interval?: number
  category?: string
}
type LogData = { [key: string]: any }

export class Logger {
  tags: string[]
  metadata: { source: string; category: string }
  logger: ReturnType<typeof getWinstonLogger>
  sendNotification?: (_input: Log) => Promise<void>
  logOptions: { logType?: LoggerType; logLevel?: LoggerLevel }
  logstashLogger?: LogstashLogger
  constructor(
    source: string,
    defaultCategory: string = 'general',
    tags: string[] = [],
    sendNotification?: (_input: Log) => Promise<void>,
    logType?: LoggerType,
    logLevel?: LoggerLevel,
    section?: string
  ) {
    this.logOptions = {
      logType,
      logLevel,
    }
    this.metadata = {
      source: source.toUpperCase().replace(/ /g, '_'),
      category: defaultCategory,
    }
    this.tags = tags
    if (logType === 'consoleLogstash') {
      this.logstashLogger = new LogstashLogger({
        host: 'dashboard2.teleportdao.xyz',
        port: 5000,
        tls: {
          ca: './certs/ca.crt',
          cert: './certs/server.crt',
          key: './certs/server.key',
          rejectUnauthorized: false,
        },
      })
      this.logOptions.logType = 'console'
      this.logOptions.logLevel = this.logOptions.logLevel || 'verbose'
    }
    this.logger = getWinstonLogger(section, this.logOptions.logType, this.logOptions.logLevel)
    this.sendNotification = sendNotification
  }

  // eslint-disable-next-line class-methods-use-this
  private static getLogFromData(message: string, metadata: LogMetadata, options?: LogOptions): Log {
    const [title, rawMessage] = message.split(':')
    return {
      ...metadata,
      title,
      message: rawMessage,
      time: new Date().toISOString(),
      interval: options?.interval,
      id: options?.id,
    }
  }

  getLogger(section?: string) {
    return new Logger(
      this.metadata.source,
      this.metadata.category,
      this.tags,
      this.sendNotification,
      this.logOptions.logType,
      this.logOptions.logLevel,
      section
    )
  }

  // only log in console, debug is used for development
  debug(message: string, data?: LogData, options?: LogOptions) {
    let metadata: LogMetadata = {
      ...this.metadata,
      type: 'debug',
      priority: LOG_PRIORITY_MAP.low,
      dataType: options?.dataType || 'debug',
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    this.logger.debug(message, metadata)
  }

  // only log in console
  verbose(message: string, data?: LogData, options?: LogOptions) {
    let metadata: LogMetadata = {
      ...this.metadata,
      type: 'debug',
      priority: LOG_PRIORITY_MAP.normal,
      dataType: options?.dataType || 'debug',
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    this.logger.verbose(message, metadata)
  }

  // used to save data to log database
  data(message: string, data?: LogData, options?: LogOptions, notify = false) {
    let metadata: LogMetadata = {
      ...this.metadata,
      type: 'data',
      priority: notify ? LOG_PRIORITY_MAP.normal : LOG_PRIORITY_MAP.low,
      dataType: options?.dataType || 'data',
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    this.logger.http(message, metadata)
    this.checkAndSendNotificationAndSendLogToLogStash(
      Logger.getLogFromData(message, metadata, options)
    )
  }

  // general info, use to show an information
  info(message: string, data?: LogData, options?: LogOptions, priority: LogPriority = 'low') {
    let metadata: LogMetadata = {
      ...this.metadata,
      type: 'log',
      priority: LOG_PRIORITY_MAP[priority],
      dataType: options?.dataType || 'log',
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    this.logger.info(message, metadata)
    this.checkAndSendNotificationAndSendLogToLogStash(
      Logger.getLogFromData(message, metadata, options)
    )
  }

  // used to show an information and send notification
  infoNotify(message: string, data?: LogData, options?: LogOptions) {
    return this.info(message, data, options, 'normal')
  }

  // used to show an information and send a warning notification
  infoWarning(message: string, data?: LogData, options?: LogOptions) {
    return this.info(message, data, options, 'high')
  }

  // used to show an information and send a critical notification
  infoCritical(message: string, data?: LogData, options?: LogOptions) {
    return this.info(message, data, options, 'critical')
  }

  // ------------------------------------------------------------

  // general error and alerts, used to show an error and send a notification if needed
  alert(message: string, data?: LogData, options?: LogOptions, priority: LogPriority = 'high') {
    let metadata: LogMetadata = {
      ...this.metadata,
      type: 'alert',
      priority: LOG_PRIORITY_MAP[priority],
      dataType: options?.dataType || 'alert',
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    this.logger.error(message, metadata)
    this.checkAndSendNotificationAndSendLogToLogStash(
      Logger.getLogFromData(message, metadata, options)
    )
  }

  // warning
  warn(message: string, data?: LogData, options?: LogOptions, notify = false) {
    return this.alert(message, data, options, notify ? 'normal' : 'low')
  }

  // error
  error(message: string, data?: LogData, options?: LogOptions) {
    return this.alert(message, data, options, 'high')
  }

  // critical error
  fatal(message: string, data?: LogData, options?: LogOptions) {
    return this.alert(message, data, options, 'critical')
  }

  // ------------------------------------------------------------

  // general log
  log(
    message: string,
    data?: LogData,
    options?: LogOptions,
    type: LogType = 'log',
    priority: LogPriority = 'low',
    send = false
  ) {
    let metadata: LogMetadata = {
      ...this.metadata,
      type,
      priority: LOG_PRIORITY_MAP[priority],
      dataType: options?.dataType || type,
      data,
      extra: options?.extra,
      tags: [...this.tags, ...(options?.tags || [])],
    }
    if (type === 'log') this.logger.info(message, metadata)
    else if (type === 'alert') this.logger.error(message, metadata)
    else if (type === 'data') this.logger.http(message, metadata)
    else if (type === 'debug' && priority === 'low') this.logger.debug(message, metadata)
    else this.logger.verbose(message, metadata)
    this.checkAndSendNotificationAndSendLogToLogStash(
      Logger.getLogFromData(message, metadata, options),
      send
    )
  }

  // send notification if needed
  async checkAndSendNotificationAndSendLogToLogStash(
    log: Log,
    send = log.priority > LOG_PRIORITY_MAP.low
  ) {
    this.logstashLogger?.log(log)
    if (this.sendNotification && send) {
      this.sendNotification(log).catch((error) => {
        this.logger.error('Error sending notification', { error })
      })
    }
  }
}

export type { LoggerLevel, LoggerType }
