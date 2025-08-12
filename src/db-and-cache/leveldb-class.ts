import { Level } from 'level'

type KeyType = string | number

export class LevelDBQuery<DataModel = any> {
  levelDb: Level<string, DataModel>
  keyMaxLengthOrder: number
  constructor(db: Level<string, any>, sublevelName?: string, keyMaxLengthOrder = 9) {
    this.levelDb = sublevelName
      ? (db.sublevel(sublevelName, {
          valueEncoding: 'json',
        }) as any as Level<string, DataModel>)
      : db

    this.keyMaxLengthOrder = keyMaxLengthOrder
  }

  formatNumberKey(key: number) {
    return key.toString().padStart(this.keyMaxLengthOrder, '0')
  }

  async getAllKeyAndValue(limit = -1, reverse = false) {
    let data: { key: string; value: DataModel }[] = []
    // eslint-disable-next-line no-restricted-syntax
    for await (const [key, value] of this.levelDb.iterator({
      limit,
      reverse,
    })) {
      data.push({ key, value })
    }
    return data
  }

  async getAll(limit = -1) {
    const values = await this.levelDb.values({ limit }).all()
    return values
  }

  async getAllKeys(limit = -1) {
    const keys = await this.levelDb.keys({ limit }).all()
    return keys
  }

  async getLastKey() {
    const data = await this.levelDb.keys({ limit: 1, reverse: true }).all()
    return data[0]
  }

  async getLastKeyAndValue() {
    const data = await this.getAllKeyAndValue(1, true)
    return data[0] as
      | {
          key: string
          value: DataModel
        }
      | undefined
  }

  async getOrThrow(key: KeyType) {
    let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
    return this.levelDb.get(newKey)
  }

  async get(key: KeyType) {
    try {
      let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
      return await this.levelDb.get(newKey)
    } catch (err: any) {
      if (err.notFound === true) {
        return undefined
      }
      throw err
    }
  }

  //
  async create(key: KeyType, value: DataModel) {
    let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
    try {
      await this.levelDb.get(newKey)
      throw new Error('key already exist')
    } catch (err: any) {
      if (err.notFound === true) {
        await this.levelDb.put(newKey, value)
      } else {
        throw err
      }
    }
  }

  async put(key: KeyType, value: DataModel) {
    let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
    await this.levelDb.put(newKey, value)
  }

  async update(key: KeyType, value: DataModel) {
    let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
    await this.levelDb.get(newKey)
    await this.levelDb.put(newKey, value)
  }

  async delete(key: KeyType) {
    let newKey: string = typeof key === 'number' ? this.formatNumberKey(key) : key
    await this.levelDb.del(newKey)
  }
}
