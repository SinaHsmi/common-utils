/* eslint-disable @typescript-eslint/no-empty-function */
import WebSocket from 'ws'

interface PersistentWebSocketOptions {
  reconnectInterval?: number
  pingEnabled?: boolean
  pingInterval?: number
  pongTimeout?: number
  onMessage?: (message: WebSocket.MessageEvent, ws: WebSocket) => void
  onOpen?: (ws: WebSocket) => void
  onClose?: (ws: WebSocket) => void
  onConnect?: (ws: WebSocket) => void
  onError?: (err: Error, ws: WebSocket) => void
}

export interface PersistentWebSocket {
  socket: WebSocket
  shutdown: () => void
}

export function createPersistentWebSocket(
  url: string,
  options: PersistentWebSocketOptions = {},
): PersistentWebSocket {
  const {
    pingEnabled = true,
    reconnectInterval = 30_000,
    pingInterval = 120_000,
    pongTimeout = 5_000,
    onMessage = () => {},
    onOpen = () => {},
    onClose = () => {},
    onError = () => {},
    onConnect = () => {},
  } = options

  let ws: WebSocket
  let shouldReconnect = true

  let pingTimer: NodeJS.Timeout | undefined
  let pongTimer: NodeJS.Timeout | undefined
  function startHeartbeat() {
    pingTimer = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping()
        pongTimer = setTimeout(() => {
          console.warn('[WS] No pong received, terminating socket...')
          ws.terminate()
        }, pongTimeout)
      }
    }, pingInterval)
  }

  function stopHeartbeat() {
    if (pingTimer) clearInterval(pingTimer)
    if (pongTimer) clearTimeout(pongTimer)
  }

  function connect() {
    ws = new WebSocket(url)
    onConnect(ws)

    ws.on('open', () => {
      console.log('[WS] Connected')
      onOpen(ws)
      if (pingEnabled) startHeartbeat()
    })

    ws.onmessage = (data) => {
      // console.log(data.data)
      onMessage(data, ws)
    }

    // ws.on('ping', () => {
    //   console.log('ping')
    // })

    ws.on('pong', () => {
      // console.log('pong')
      if (pongTimer) clearTimeout(pongTimer)
    })

    ws.on('close', () => {
      console.log('[WS] Disconnected')
      stopHeartbeat()
      onClose(ws)
      if (shouldReconnect) {
        setTimeout(connect, reconnectInterval)
      }
    })

    ws.on('error', (err) => {
      console.error('[WS] Error:', err.message)
      onError(err, ws)
      ws.close() // trigger reconnect
    })
  }

  function shutdown() {
    shouldReconnect = false
    stopHeartbeat()
    if (ws) ws.close()
  }

  connect()

  return {
    get socket() {
      return ws
    },
    shutdown,
  }
}
