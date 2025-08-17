import tls from 'tls'
import net from 'net'

interface TLSOptions {
  ca: Buffer
  cert: Buffer
  key: Buffer

  rejectUnauthorized?: boolean
}

export interface LogstashLoggerOptions {
  host: string
  port: number
  tls?: TLSOptions
  flushIntervalMs?: number
  maxBufferSize?: number
  reconnectIntervalMs?: number
}

export class LogstashLogger {
  private host: string
  private port: number
  private useTLS: boolean
  private flushIntervalMs: number
  private maxBufferSize: number
  private reconnectIntervalMs: number

  private tlsOptions?: tls.ConnectionOptions
  private buffer: string[] = []
  private client: tls.TLSSocket | net.Socket | null = null
  private connected = false
  private reconnecting = false
  private interval?: NodeJS.Timeout
  private isFlushing = false

  constructor(options: LogstashLoggerOptions) {
    this.host = options.host
    this.port = options.port
    this.flushIntervalMs = options.flushIntervalMs ?? 2000
    this.maxBufferSize = options.maxBufferSize ?? 100
    this.reconnectIntervalMs = options.reconnectIntervalMs ?? 5000
    this.useTLS = !!options.tls

    if (this.useTLS) {
      this.tlsOptions = {
        ca: options.tls?.ca,
        cert: options.tls?.cert,
        key: options.tls?.key,
        rejectUnauthorized: options.tls?.rejectUnauthorized ?? true,
        host: this.host,
        servername: this.host,
      }
    }

    this.connect()
    this.intervalFlush()
  }

  private intervalFlush() {
    this.interval = setInterval(() => this.flush(), this.flushIntervalMs)
  }

  public log(data: any) {
    const json = typeof data === 'string' ? data : JSON.stringify(data)
    this.buffer.push(json)
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  private connect() {
    if (this.connected || this.reconnecting) return

    if (this.useTLS) {
      const tlsClient = tls.connect(this.port, this.host, this.tlsOptions, () => {
        if (tlsClient.authorized || !this.tlsOptions?.rejectUnauthorized) {
          this.connected = true
          this.client = tlsClient
        } else {
          tlsClient.destroy()
          this.tryReconnect()
        }
        this.reconnecting = false
      })
      tlsClient.on('error', (err) => {
        this.connected = false
        this.tryReconnect()
      })

      tlsClient.on('close', () => {
        this.connected = false
        this.tryReconnect()
      })
    } else {
      const tcpClient = new net.Socket()

      tcpClient.connect(this.port, this.host, () => {
        this.connected = true
        this.reconnecting = false
        this.client = tcpClient
      })

      tcpClient.on('error', (err) => {
        this.connected = false
        this.tryReconnect()
      })

      tcpClient.on('close', () => {
        this.connected = false
        this.tryReconnect()
      })
    }
  }

  private tryReconnect() {
    if (this.reconnecting) return
    this.reconnecting = true

    setTimeout(() => {
      this.reconnecting = false
      this.connect()
    }, this.reconnectIntervalMs)
  }

  private flush() {
    if (this.isFlushing || !this.connected || this.buffer.length === 0 || !this.client) return
    this.isFlushing = true
    const data = `${this.buffer.join('\n')}\n`
    this.buffer = []
    this.client.write(data, (err) => {
      if (err) {
        this.connected = false
        this.tryReconnect()
        // Split the data back into separate lines to avoid data duplication issues on re-flush
        this.buffer.unshift(...data.trim().split('\n'))
      }
      this.isFlushing = false
    })
  }

  public close() {
    clearInterval(this.interval)
    this.flush()
    this.client?.destroy()
  }
}
