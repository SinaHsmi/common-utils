import tls from "tls"
import net from "net"
import fs from "fs"

interface TLSOptions {
  ca: string
  cert: string
  key: string
  rejectUnauthorized?: boolean
}

interface LogstashLoggerOptions {
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
        ca: options.tls?.ca ? [fs.readFileSync(options.tls.ca)] : undefined,
        cert: options.tls?.cert ? fs.readFileSync(options.tls.cert) : undefined,
        key: options.tls?.key ? fs.readFileSync(options.tls.key) : undefined,
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
    const json = typeof data === "string" ? data : JSON.stringify(data)
    this.buffer.push(json)
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush()
    }
  }

  private connect() {
    if (this.connected || this.reconnecting) return

    if (this.useTLS) {
      const tlsClient = tls.connect(
        this.port,
        this.host,
        { ...this.tlsOptions, timeout: 1000, sessionTimeout: 1000 },
        () => {
          if (tlsClient.authorized || !this.tlsOptions?.rejectUnauthorized) {
            this.connected = true
            this.client = tlsClient
            console.log(`[LogstashLogger] TLS connected to ${this.host}:${this.port}`)
          } else {
            console.error(`[LogstashLogger] TLS unauthorized: ${tlsClient.authorizationError}`)
            tlsClient.destroy()
            this.tryReconnect()
          }
          this.reconnecting = false
        },
      )

      tlsClient.on("error", (err) => {
        console.error("[LogstashLogger] TLS error:", err.message)
        this.connected = false
        this.tryReconnect()
      })

      tlsClient.on("close", () => {
        console.warn("[LogstashLogger] TLS connection closed")
        this.connected = false
        this.tryReconnect()
      })

      tlsClient.on("end", () => {
        console.warn("[LogstashLogger] TLS connection ended")
        this.connected = false
        this.tryReconnect()
      })

      // Corrected from 'crain' to 'drain', and removed reconnect on drain (not an error)
      tlsClient.on("drain", () => {
        console.log("[LogstashLogger] TLS connection drained")
        // No reconnect on drain event
      })

    } else {
      const tcpClient = new net.Socket()

      tcpClient.connect(this.port, this.host, () => {
        this.connected = true
        this.reconnecting = false
        this.client = tcpClient
        console.log(`[LogstashLogger] TCP connected to ${this.host}:${this.port}`)
      })

      tcpClient.on("error", (err) => {
        console.error("[LogstashLogger] TCP error:", err.message)
        this.connected = false
        this.tryReconnect()
      })

      tcpClient.on("close", () => {
        console.warn("[LogstashLogger] TCP connection closed")
        this.connected = false
        this.tryReconnect()
      })
    }
  }

  private tryReconnect() {
    if (this.reconnecting) return
    this.reconnecting = true

    setTimeout(() => {
      console.log(`[LogstashLogger] Reconnecting...`)
      this.reconnecting = false
      this.connect()
    }, this.reconnectIntervalMs)
  }

  private flush() {
    if (this.isFlushing || !this.connected || this.buffer.length === 0 || !this.client) return
    this.isFlushing = true
    const data = `${this.buffer.join("\n")}\n`
    this.buffer = []
    console.log(`flush\n${data}`)

    this.client.write(data, (err) => {
      if (err) {
        console.error("[LogstashLogger] Write error:", err)
        this.connected = false
        this.tryReconnect()
        // Split the data back into separate lines to avoid data duplication issues on re-flush
        this.buffer.unshift(...data.trim().split("\n"))
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