/* eslint-disable max-classes-per-file */
import { AxiosInstance } from 'axios'
import { getAxiosInstance } from '../../utils'

export const PRIORITY = {
  NOT_IMPORTANT: 0,
  NORMAL: 1,
  WARNING: 2,
  HIGH: 3,
  CRITICAL: 4,
}

export interface AttachmentField {
  short: boolean
  title: string
  value: string
}

export interface Attachment {
  title?: string
  title_link?: string
  //
  fallback?: string
  color?: string
  //
  pretext?: string
  text?: string
  //
  author_name?: string
  author_icon?: string
  author_link?: string
  //
  fields?: AttachmentField[]
  //
  image_url?: string
}

export interface SlackMessageInterface {
  text: string
  attachments: Attachment[]
  extraInfo?: string
}

export class SlackMessage implements SlackMessageInterface {
  text: string
  attachments: Attachment[]
  extraInfo?: string = ''
  constructor(text: string, attachments?: Attachment[], extraInfo?: string) {
    this.text = text
    this.attachments = attachments || []
    this.extraInfo = extraInfo
  }

  addAttachments(attachment: Attachment) {
    this.attachments.push(attachment)
  }

  addExtraInfo(extraInfo: string | object) {
    let m = typeof extraInfo === 'string' ? extraInfo : JSON.stringify(extraInfo, null, 2)
    if (!this.extraInfo) this.extraInfo = m
    else this.extraInfo += `\n\n---\n${m}`
  }
}

export class Slack {
  enabled: boolean
  username: string
  userIcon?: { iconUrl?: string; iconEmoji?: string }
  webhook: AxiosInstance
  defaultChannel?: string
  constructor(
    webhookUrl: string,
    username: string,
    defaultChannel?: string,
    userIcon?: {
      iconUrl?: string
      iconEmoji?: string
    },
    enabled = true,
  ) {
    this.enabled = enabled
    this.username = username
    this.userIcon = userIcon
    this.defaultChannel = defaultChannel
    this.webhook = getAxiosInstance({
      baseUrl: webhookUrl,
    })
  }

  async send(
    slackMessage: SlackMessageInterface,
    channelName: string | undefined = this.defaultChannel,
  ) {
    if (!this.enabled) {
      return {
        status: false,
        message: 'slack is disabled',
      }
    }

    let response = await this.webhook.post('', {
      text: slackMessage.text,
      attachments: slackMessage.attachments,
      channel: channelName,
      //
      username: this.username,
      icon_url: this.userIcon?.iconUrl,
      icon_emoji: this.userIcon?.iconEmoji,
      props: slackMessage.extraInfo
        ? {
            card: slackMessage.extraInfo,
          }
        : undefined,
    })

    return {
      status: true,
      message: `slack response: ${response.data}`,
    }
  }
}

export default Slack
