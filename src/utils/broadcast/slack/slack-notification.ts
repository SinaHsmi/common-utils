/* eslint-disable import/prefer-default-export */
import winston from 'winston'
import { Slack, SlackMessage, PRIORITY } from './index'

import * as notificationScheduleFunctions from './notification-schedule'
import { generateAttachment } from './slack-attachments'

export type Type = 'Alert' | 'Info'

export type CategoryConfig = {
  default: {
    Alert: {
      channel: string // can be array
      colors?: string[]
    }
    Info: {
      channel: string // can be array
      colors?: string[]
    }
  }
  [key: string]: {
    Alert?: {
      channel?: string // can be array
      colors?: string[]
    }
    Info?: {
      channel?: string // can be array
      colors?: string[]
    }
  }
}

const DEFAULT_INFO_COLOR = ['#B3B6B5', '#0AD871', '#BAD80A', '#E96AFD', '#7C00FF']
const DEFAULT_ALERT_COLOR = ['#B3B6B5', '#B3B6B5', '#FEF530', '#FF0035', '#FF00B4']

export function generateSlackLogClass<Category = string>(
  slackConfig: {
    webhookUrl: string
    username: string
    defaultChannel: string
    userIcon?:
      | {
          iconUrl?: string | undefined
          iconEmoji?: string | undefined
        }
      | undefined
    enabled?: boolean
  },
  categoryConfig: CategoryConfig = {
    default: {
      Alert: {
        channel: slackConfig.defaultChannel,
      },
      Info: {
        channel: slackConfig.defaultChannel,
      },
    },
  },
  notificationFunctions: {
    checkNotificationTimestamp: (notificationId: string, interval?: number) => Promise<boolean>
    setNotificationTimestamp: (notificationId: string, interval?: number) => Promise<void>
  } = {
    checkNotificationTimestamp: notificationScheduleFunctions.checkNotificationTimestamp,
    setNotificationTimestamp: notificationScheduleFunctions.setNotificationTimestamp,
  },
  logger: winston.Logger = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.simple(),
      }),
    ],
  }),
  handleError: (error: Error | string) => void = (error: Error | string) => {
    logger.error(typeof error === 'string' ? error : error.message)
  }
) {
  const slack = new Slack(
    slackConfig.webhookUrl,
    slackConfig.username,
    slackConfig.defaultChannel,
    slackConfig.userIcon,
    slackConfig.enabled
  )
  return class LogMessage {
    channels: Set<string>
    slackMessage: SlackMessage
    type: string
    title: string
    info: object
    message?: string
    priority: number
    id: string
    sentStatus: 'unknown' | 'sent' | 'not-sent' = 'unknown'
    interval?: number
    extra: string | undefined
    constructor(
      {
        title,
        info = {},
        category,
        id = '',
        type = 'Info',
        priority = PRIORITY.NORMAL,
        searchableText,
        message,
        interval,
        extra,
      }: {
        title: string
        info?: object
        id?: string
        category?: Category
        type?: Type
        priority?: number
        searchableText?: string[]
        message?: string
        interval?: number
        extra?: object | string
      },
      otherChannels: string[] = []
    ) {
      this.id = id
      this.type = type
      this.title = title
      this.info = info
      this.message = message
      this.priority = priority
      this.interval = interval
      if (extra) {
        this.extra = typeof extra === 'string' ? extra : JSON.stringify(extra, null, 2)
      }
      const notificationChannels: string[] = []
      const config = (categoryConfig[(category || 'default') as keyof typeof categoryConfig] ||
        categoryConfig.default)[type]
      if (config?.channel) notificationChannels.push(config.channel)
      for (let otherChannel of otherChannels) {
        notificationChannels.push(otherChannel)
      }

      const minPriority = Math.max(
        type === 'Alert' ? PRIORITY.WARNING : PRIORITY.NOT_IMPORTANT,
        priority
      )
      const defaultColor = type === 'Alert' ? DEFAULT_ALERT_COLOR : DEFAULT_INFO_COLOR
      const color = config?.colors ? config.colors[minPriority] : defaultColor[minPriority]

      let infoMessage = Object.keys(info).length > 0 ? JSON.stringify(info, null, 2) : ''
      let attachment = generateAttachment({
        title: `${id}:${type}` === 'Alert' ? 'Alert' : title,
        message: message
          ? `${message}${infoMessage ? `\n\n---\n${infoMessage}` : infoMessage}`
          : infoMessage,
        priority: minPriority,
        color,
      })
      let m = new SlackMessage(searchableText ? searchableText.join(' ') : '')
      m.addAttachments(attachment)
      if (this.extra) {
        m.addExtraInfo(this.extra)
      }
      this.slackMessage = m
      this.channels = new Set(notificationChannels)
    }

    async checkSent() {
      if (this.sentStatus === 'unknown') {
        let checked = await notificationFunctions.checkNotificationTimestamp(this.id, this.interval)
        if (checked) {
          this.sentStatus = 'sent'
        } else {
          this.sentStatus = 'not-sent'
        }
      }
      return this.sentStatus === 'sent'
    }

    async send() {
      if ((await this.checkSent()) === true) {
        return false
      }

      if (slack.enabled === true) {
        await notificationFunctions.setNotificationTimestamp(this.id, this.interval)
        this.sentStatus = 'sent'
        for (let channel of this.channels) {
          try {
            await slack.send(this.slackMessage, channel)
          } catch (error: any) {
            handleError(error)
          }
        }
      }

      return true
    }

    async log() {
      let infoMessage = Object.keys(this.info).length > 0 ? JSON.stringify(this.info, null, 2) : ''
      let m = `${this.id ? `[id-${this.id}]-` : ''} ${this.title}${
        this.message ? `: ${this.message}` : ''
      }${infoMessage ? `\n${infoMessage}` : ''}`
      if (this.type === 'Alert') {
        if (this.priority >= PRIORITY.HIGH) {
          logger.error(m + (this.extra ? `\n[\n${this.extra}\n]` : ''))
        } else {
          logger.warn(m)
        }
      }

      if (this.type === 'Info') {
        if (this.priority < PRIORITY.NORMAL) {
          logger.verbose(m)
        } else {
          logger.info(m)
        }
      }
    }

    async sendAndLog() {
      this.log()
      return this.send()
    }
  }
}
