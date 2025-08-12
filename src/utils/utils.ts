import util from 'util'
import axios from 'axios'
import { v4 as uuidv4 } from 'uuid'
import { sha256Hash } from './cryptography'
import { BufferToString } from '../types/utils'

const sleep = util.promisify(setTimeout)

// compare obj1 keys with obj2
export function customObjectDeepEqual(obj1: any, obj2: any): { isEqual: boolean; change?: any[] } {
  // Check if the values are truthy or are strictly equal
  if (obj1 === obj2) return { isEqual: true }

  // Check if both are objects
  if (typeof obj1 === 'object' && obj1 != null && typeof obj2 === 'object' && obj2 != null) {
    // Check if the values of the property are deep equal
    for (let prop in obj1) {
      if (!(prop in obj2)) {
        return {
          isEqual: false,
          change: [obj1[prop], null, prop],
        }
      }
      let { isEqual, change } = customObjectDeepEqual(obj1[prop], obj2[prop])
      if (!isEqual) {
        return {
          isEqual: false,
          change: change ? [...change, prop] : [null, null, prop],
        }
      }
    }

    return {
      isEqual: true,
    }
  }
  return {
    isEqual: false,
    change: [obj1, obj2],
  }
}

function deterministicStringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) {
    return JSON.stringify(obj)
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map(deterministicStringify).join(',') + ']'
  }

  const keys = Object.keys(obj).sort()
  const keyValPairs = keys.map((key) => `"${key}":${deterministicStringify(obj[key])}`).join(',')

  return `{${keyValPairs}}`
}

export function hashJsonObject(jsonObj: object) {
  const str = deterministicStringify(jsonObj)
  const hash = sha256Hash(str)
  return hash
}

function isJsonString(str: string) {
  try {
    JSON.parse(str)
  } catch (e) {
    return false
  }
  return true
}

export function removeUndefinedValues(obj: any) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      // eslint-disable-next-line no-param-reassign
      delete obj[key]
    }
  })
  return obj
}

// to standard is number as separate word (we use this) or stick to previous word
function pascalToSpace(str: string, divider = ' '): string {
  return (
    str
      .replace(/([a-z])([A-Z]|[0-9])/g, `$1${divider}$2`)
      // Insert space after a number followed by a letter
      .replace(/([0-9])([a-zA-Z])/g, `$1${divider}$2`)
      // if two upper case letters are together, insert a space between them
      .replace(/([A-Z])([A-Z])/g, `$1${divider}$2`)
      .toLowerCase()
      .trim()
  )
}

function getAxiosInstance({
  baseUrl,
  timeout = 5000,
  headers = {},
  auth,
}: {
  baseUrl: string
  timeout?: number
  headers?: { [key: string]: string }
  auth?: {
    username: string
    password: string
  }
}) {
  let host = baseUrl
  let instance

  instance = axios.create({
    baseURL: host,
    timeout,
    auth,
    headers: {
      ...headers,
    },
  })

  // Add a response interceptor
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // todo : fix this part
      if (error.response) {
        const serviceError = new Error(
          JSON.stringify({ data: error.response.data, message: error.message })
        )
        return Promise.reject(serviceError)
      }

      if (error.request) {
        const serviceError = new Error(
          error.message +
            '. details: ' +
            JSON.stringify(
              {
                baseURL: error.config.baseURL,
                url: error.config.url,
                method: error.config.method,
                data: error.config.data,
              },
              null,
              2
            )
        )
        return Promise.reject(serviceError)
      }
      return Promise.reject(error)
    }
  )

  return instance
}

async function runWithRetries<T>(
  action: () => Promise<T>,
  config: {
    maxRetries?: number
    retrySleep?: number
  } = {}
): Promise<T> {
  const { maxRetries = 2, retrySleep = 1000 } = config
  let maxTries = maxRetries
  const trace = new Error().stack?.split('\n').slice(5).join('\n')
  let lastError: any
  for (let count = 0; count < maxTries; count += 1) {
    try {
      return await action()
    } catch (error: any) {
      error.message += `\n${trace}`
      console.log(`Attempt ${count + 1} failed: ${error.message}`)
      lastError = error
      if (count < maxTries - 1) {
        await sleep(retrySleep)
      }
    }
  }

  throw lastError || new Error(`Function failed after ${maxTries} retries: ${lastError?.message}`)
}

function generateRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateRandomNumber(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function generateUUID(): string {
  const uuid: string = uuidv4()
  return uuid
}

function arrayRandomShuffle(arr: any[]) {
  let newArr = [...arr]
  for (let i = newArr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

function removeExtraSpaces(inputString: string): string {
  return inputString.replace(/\s+/g, ' ').trim()
}

function shortenedString(str: string, maxLength = 30) {
  let newMaxLength = maxLength
  return str.length > maxLength
    ? `${str.slice(0, Math.floor(maxLength / 2))}.....${str.slice(
        str.length - Math.floor(maxLength / 2)
      )}`
    : str
}

// move an item in an array to a new index
function arrayMove(arr: any[], oldIndex: number, newIndex: number) {
  let newArr = [...arr]
  if (oldIndex === newIndex) {
    return newArr
  }
  if (oldIndex < 0 || oldIndex >= newArr.length || newIndex < 0) {
    throw new Error('Invalid index values')
  }
  if (newIndex >= newArr.length) {
    let k = newIndex - newArr.length + 1
    while (k--) {
      newArr.push(undefined)
    }
  }
  newArr.splice(newIndex, 0, newArr.splice(oldIndex, 1)[0])
  return newArr
}

function deepMerge(obj1: Record<string, any>, obj2: Record<string, any>): Record<string, any> {
  const output: Record<string, any> = { ...obj1 }

  // eslint-disable-next-line no-restricted-syntax
  for (const key in obj2) {
    // If the current key is an object and it also exists in obj1, merge it
    if (
      typeof obj2[key] === 'object' &&
      !Array.isArray(obj2[key]) &&
      obj1[key] &&
      typeof obj1[key] === 'object' &&
      !Array.isArray(obj1[key])
    ) {
      output[key] = deepMerge(obj1[key], obj2[key])
    } else {
      // Else, set/override the key in the output object
      output[key] = obj2[key]
    }
  }

  return output
}

function convertObjectBufferToHex<T>(obj: T): BufferToString<T> {
  if (Buffer.isBuffer(obj)) {
    // @ts-expect-error override Buffer with string
    return obj.toString('hex')
  } else if (Array.isArray(obj)) {
    return obj.map((x) => convertObjectBufferToHex(x)) as BufferToString<T>
  } else if (obj !== null && typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertObjectBufferToHex(value)
    }
    return result
  }
  return obj as BufferToString<T>
}

export {
  sleep,
  isJsonString,
  pascalToSpace,
  getAxiosInstance,
  runWithRetries,
  generateRandomInt,
  generateUUID,
  arrayRandomShuffle,
  removeExtraSpaces,
  shortenedString,
  arrayMove,
  deepMerge,
  convertObjectBufferToHex,
  generateRandomNumber,
}
