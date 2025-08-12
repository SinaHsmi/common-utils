import nodemailer from 'nodemailer'

export class Email {
  isVerified: boolean
  enabled: boolean
  numberOfError: number
  from: string
  defaultReceivers: string[]
  defaultSubject: string
  nodemailerTransporter: any
  constructor(
    {
      host,
      port,
      username,
      password,
      from,
      defaultReceivers = [],
      defaultSubject = '',
    }: {
      host: string
      port: string
      username: string
      password: string
      from: string
      defaultReceivers?: string[]
      defaultSubject?: string
    },
    enabled: boolean,
  ) {
    this.enabled = enabled
    this.isVerified = false
    this.numberOfError = 0
    this.from = from
    this.defaultReceivers = defaultReceivers
    this.defaultSubject = defaultSubject
    const mailConfig = {
      host,
      port,
      tls: true,
      auth: {
        user: username,
        pass: password,
      },
    }
    this.nodemailerTransporter = nodemailer.createTransport(mailConfig as any)
  }

  async verify() {
    return this.nodemailerTransporter.verify()
  }

  async sendMail(
    message: string,
    subject = this.defaultSubject,
    receivers = this.defaultReceivers,
  ) {
    try {
      if (!this.enabled) {
        return {
          status: false,
          message: 'email is disabled',
        }
      }
      if (!this.isVerified) {
        await this.verify()
        this.isVerified = true
      }
      if (receivers.length === 0) {
        return {
          status: false,
          message: 'no receivers',
        }
      }

      let mailOptions = {
        to: receivers,
        subject,
        html: message,
      }

      let x = await this.nodemailerTransporter.sendMail({
        from: this.from,
        ...mailOptions,
      })
      this.numberOfError = 0
      return {
        status: true,
        message: 'email has been sent',
        response: x,
      }
    } catch (error: any) {
      this.numberOfError += 1
      if (this.numberOfError > 50) this.enabled = false
      return {
        status: false,
        message: 'error in sending email: ' + error.message,
      }
    }
  }

  async sendSingleEmail(message: string, receiver: string, subject = this.defaultSubject) {
    return this.sendMail(message, subject, [receiver])
  }
  
}

export default Email
