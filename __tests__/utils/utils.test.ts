// test arrayMove
import * as utils from '../../src/utils/utils'
import * as time from '../../src/utils/time'
import * as autoReconnectWs from '../../src/utils/auto-reconnect-ws'

describe('arrayMove', () => {
  it('should move an item in an array to a new index', () => {
    const arr = [1, 2, 3, 4, 5]
    const newArr = utils.arrayMove(arr, 2, 3)
    expect(newArr).toEqual([1, 2, 4, 3, 5])
  })
  it('should move an item in an array to a new index out of bounds', () => {
    const arr = [1, 2, 3, 4, 5]
    const newArr = utils.arrayMove(arr, 2, 6)
    expect(newArr).toEqual([1, 2, 4, 5, undefined, undefined, 3])
  })
  it('should throw an error if the index is negative', () => {
    const arr = [1, 2, 3, 4, 5]
    expect(() => utils.arrayMove(arr, -1, 2)).toThrow('Invalid index values')
  })
})

describe('arrayRandomShuffle', () => {
  it('should shuffle an array', () => {
    const arr = [1, 2, 3, 4, 5]
    const newArr = utils.arrayRandomShuffle(arr)
    expect(newArr).not.toEqual(arr)
  })
})

describe('customObjectDeepEqual', () => {
  it('should return true for identical objects', () => {
    const obj1 = { a: 1, b: { c: 2 } }
    const obj2 = { a: 1, b: { c: 2 } }
    const result = utils.customObjectDeepEqual(obj1, obj2)
    expect(result.isEqual).toBe(true)
  })

  it('should return false for different objects', () => {
    const obj1 = { a: 1, b: { c: 2 } }
    const obj2 = { a: 1, b: { c: 3 } }
    const result = utils.customObjectDeepEqual(obj1, obj2)
    expect(result.isEqual).toBe(false)
    expect(result.change).toEqual([2, 3, 'c', 'b'])
  })

  it('should return false when properties are missing', () => {
    const obj1 = { a: 1, b: { c: 2 } }
    const obj2 = { a: 1 }
    const result = utils.customObjectDeepEqual(obj1, obj2)
    expect(result.isEqual).toBe(false)
    expect(result.change).toEqual([{ c: 2 }, null, 'b'])
  })

  it('should return true for primitive values', () => {
    expect(utils.customObjectDeepEqual(5, 5).isEqual).toBe(true)
    expect(utils.customObjectDeepEqual('test', 'test').isEqual).toBe(true)
    expect(utils.customObjectDeepEqual(null, null).isEqual).toBe(true)
  })

  it('should return false for different primitive values', () => {
    expect(utils.customObjectDeepEqual(5, 6).isEqual).toBe(false)
    expect(utils.customObjectDeepEqual('test', 'other').isEqual).toBe(false)
  })
})

describe('hashJsonObject', () => {
  it('should generate consistent hash for same object', () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 2, a: 1 } // Different order, should still hash the same
    const hash1 = utils.hashJsonObject(obj1)
    const hash2 = utils.hashJsonObject(obj2)
    expect(hash1).toBe(hash2)
  })

  it('should generate different hashes for different objects', () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { a: 1, b: 3 }
    const hash1 = utils.hashJsonObject(obj1)
    const hash2 = utils.hashJsonObject(obj2)
    expect(hash1).not.toBe(hash2)
  })
})

describe('removeUndefinedValues', () => {
  it('should remove undefined values from object', () => {
    const obj = { a: 1, b: undefined, c: 3, d: undefined }
    const result = utils.removeUndefinedValues(obj)
    expect(result).toEqual({ a: 1, c: 3 })
  })

  it('should return same object if no undefined values', () => {
    const obj = { a: 1, b: 2, c: 3 }
    const result = utils.removeUndefinedValues(obj)
    expect(result).toEqual(obj)
  })

  it('should handle empty object', () => {
    const obj = {}
    const result = utils.removeUndefinedValues(obj)
    expect(result).toEqual({})
  })
})

describe('pascalToSpace', () => {
  it('should convert PascalCase to space separated', () => {
    expect(utils.pascalToSpace('HelloWorld')).toBe('hello world')
    expect(utils.pascalToSpace('ThisIsATest')).toBe('this is a test')
  })

  it('should handle numbers in PascalCase', () => {
    expect(utils.pascalToSpace('User123Name')).toBe('user 123 name')
    expect(utils.pascalToSpace('Test123')).toBe('test 123')
  })

  it('should use custom divider', () => {
    expect(utils.pascalToSpace('HelloWorld', '-')).toBe('hello-world')
  })
})

describe('getAxiosInstance', () => {
  it('should create axios instance with default config', () => {
    const instance = utils.getAxiosInstance({ baseUrl: 'https://api.example.com' })
    expect(instance.defaults.baseURL).toBe('https://api.example.com')
    expect(instance.defaults.timeout).toBe(5000)
  })

  it('should create axios instance with custom config', () => {
    const instance = utils.getAxiosInstance({
      baseUrl: 'https://api.example.com',
      timeout: 10000,
      headers: { 'X-Custom': 'value' },
      auth: { username: 'user', password: 'pass' },
    })
    expect(instance.defaults.timeout).toBe(10000)
    expect(instance.defaults.headers).toHaveProperty('X-Custom', 'value')
    expect(instance.defaults.auth).toEqual({ username: 'user', password: 'pass' })
  })
})

describe('runWithRetries', () => {
  it('should succeed on first try', async () => {
    const action = jest.fn().mockResolvedValue('success')
    const result = await utils.runWithRetries(action)
    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(1)
  })

  it('should retry and succeed', async () => {
    const action = jest
      .fn()
      .mockRejectedValueOnce(new Error('First failure'))
      .mockResolvedValue('success')

    const result = await utils.runWithRetries(action, { maxRetries: 2 })
    expect(result).toBe('success')
    expect(action).toHaveBeenCalledTimes(2)
  })

  it('should fail after max retries', async () => {
    const action = jest.fn().mockRejectedValue(new Error('Always fails'))

    await expect(utils.runWithRetries(action, { maxRetries: 2 })).rejects.toThrow('Always fails')
    expect(action).toHaveBeenCalledTimes(2)
  })
})

describe('generateRandomInt', () => {
  it('should generate integer within range', () => {
    const result = utils.generateRandomInt(1, 10)
    expect(result).toBeGreaterThanOrEqual(1)
    expect(result).toBeLessThanOrEqual(10)
    expect(Number.isInteger(result)).toBe(true)
  })

  it('should handle single number range', () => {
    const result = utils.generateRandomInt(5, 5)
    expect(result).toBe(5)
  })
})

describe('generateRandomNumber', () => {
  it('should generate number within range', () => {
    const result = utils.generateRandomNumber(1.5, 2.5)
    expect(result).toBeGreaterThanOrEqual(1.5)
    expect(result).toBeLessThan(2.5)
  })
})

describe('generateUUID', () => {
  it('should generate unique UUIDs', () => {
    const uuid1 = utils.generateUUID()
    const uuid2 = utils.generateUUID()
    expect(uuid1).not.toBe(uuid2)
    expect(typeof uuid1).toBe('string')
    expect(uuid1.length).toBe(36) // Standard UUID length
  })
})

describe('removeExtraSpaces', () => {
  it('should remove extra spaces', () => {
    expect(utils.removeExtraSpaces('  hello   world  ')).toBe('hello world')
    expect(utils.removeExtraSpaces('multiple    spaces')).toBe('multiple spaces')
  })

  it('should handle single spaces', () => {
    expect(utils.removeExtraSpaces('hello world')).toBe('hello world')
  })

  it('should handle empty string', () => {
    expect(utils.removeExtraSpaces('')).toBe('')
  })
})

describe('shortenedString', () => {
  it('should shorten long strings', () => {
    const longString = 'This is a very long string that should be shortened'
    const result = utils.shortenedString(longString, 20)
    expect(result.length).toBeLessThanOrEqual(25)
    expect(result).toContain('.....')
  })

  it('should not shorten short strings', () => {
    const shortString = 'Short'
    const result = utils.shortenedString(shortString, 20)
    expect(result).toBe(shortString)
  })

  it('should use default max length', () => {
    const longString = 'This is a very long string that should be shortened to default length'
    const result = utils.shortenedString(longString)
    expect(result.length).toBeLessThanOrEqual(35)
  })
})

describe('deepMerge', () => {
  it('should merge simple objects', () => {
    const obj1 = { a: 1, b: 2 }
    const obj2 = { b: 3, c: 4 }
    const result = utils.deepMerge(obj1, obj2)
    expect(result).toEqual({ a: 1, b: 3, c: 4 })
  })

  it('should deep merge nested objects', () => {
    const obj1 = { a: 1, b: { c: 2, d: 3 } }
    const obj2 = { b: { d: 4, e: 5 } }
    const result = utils.deepMerge(obj1, obj2)
    expect(result).toEqual({ a: 1, b: { c: 2, d: 4, e: 5 } })
  })

  it('should not merge arrays', () => {
    const obj1 = { a: [1, 2], b: { c: [3, 4] } }
    const obj2 = { a: [5, 6], b: { c: [7, 8] } }
    const result = utils.deepMerge(obj1, obj2)
    expect(result.a).toEqual([5, 6])
    expect(result.b.c).toEqual([7, 8])
  })
})

describe('convertObjectBufferToHex', () => {
  it('should convert Buffer to hex string', () => {
    const buffer = Buffer.from('hello world', 'utf8')
    const result = utils.convertObjectBufferToHex(buffer)
    expect(typeof result).toBe('string')
    expect(result).toMatch(/^[0-9a-f]+$/)
  })

  it('should convert nested objects with buffers', () => {
    const obj = {
      data: Buffer.from('test', 'utf8'),
      nested: {
        buffer: Buffer.from('nested', 'utf8'),
      },
    }
    const result = utils.convertObjectBufferToHex(obj)
    expect(typeof result.data).toBe('string')
    expect(typeof result.nested.buffer).toBe('string')
  })

  it('should convert arrays with buffers', () => {
    const arr = [Buffer.from('item1', 'utf8'), Buffer.from('item2', 'utf8')]
    const result = utils.convertObjectBufferToHex(arr)
    expect(Array.isArray(result)).toBe(true)
    expect(typeof result[0]).toBe('string')
    expect(typeof result[1]).toBe('string')
  })

  it('should leave non-buffer values unchanged', () => {
    const obj = { string: 'hello', number: 42, buffer: Buffer.from('test', 'utf8') }
    const result = utils.convertObjectBufferToHex(obj)
    expect(result.string).toBe('hello')
    expect(result.number).toBe(42)
    expect(typeof result.buffer).toBe('string')
  })
})

describe('isJsonString', () => {
  it('should return true for valid JSON strings', () => {
    expect(utils.isJsonString('{"key": "value"}')).toBe(true)
    expect(utils.isJsonString('[1, 2, 3]')).toBe(true)
    expect(utils.isJsonString('"simple string"')).toBe(true)
  })

  it('should return false for invalid JSON strings', () => {
    expect(utils.isJsonString('invalid json')).toBe(false)
    expect(utils.isJsonString('{key: value}')).toBe(false)
    expect(utils.isJsonString('')).toBe(false)
  })
})

describe('sleep', () => {
  it('should wait for specified time', async () => {
    const start = Date.now()
    await utils.sleep(100)
    const end = Date.now()
    expect(end - start).toBeGreaterThanOrEqual(90) // Allow some tolerance
  })
})
