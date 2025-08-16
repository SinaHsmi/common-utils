// test arrayMove
import * as autoReconnectWs from '../../src/utils/auto-reconnect-ws'

// Auto-reconnect WebSocket tests
describe.skip('auto-reconnect-ws', () => {
  describe('createPersistentWebSocket', () => {
    it('should create WebSocket instance with default options', () => {
      const mockUrl = 'ws://localhost:8080'
      const ws = autoReconnectWs.createPersistentWebSocket(mockUrl)

      expect(ws).toBeDefined()
      expect(ws.socket).toBeDefined()
      expect(typeof ws.shutdown).toBe('function')
    })

    it('should create WebSocket with custom options', () => {
      const mockUrl = 'ws://localhost:8080'
      const options = {
        reconnectInterval: 10000,
        pingEnabled: false,
        pingInterval: 60000,
        pongTimeout: 3000,
      }

      const ws = autoReconnectWs.createPersistentWebSocket(mockUrl, options)
      expect(ws).toBeDefined()
    })

    it('should call onConnect callback', () => {
      const mockUrl = 'ws://localhost:8080'
      const onConnect = jest.fn()

      autoReconnectWs.createPersistentWebSocket(mockUrl, { onConnect })
      expect(onConnect).toHaveBeenCalled()
    })

    it('should have shutdown method', () => {
      const mockUrl = 'ws://localhost:8080'
      const ws = autoReconnectWs.createPersistentWebSocket(mockUrl)
      expect(() => ws.shutdown()).not.toThrow()
    })
  })
})
