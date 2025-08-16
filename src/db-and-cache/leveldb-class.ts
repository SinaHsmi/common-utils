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

  formatKey(key: KeyType) {
    if (typeof key === 'number') {
      return key.toString().padStart(this.keyMaxLengthOrder, '0')
    }
    return key
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
    return this.levelDb.get(this.formatKey(key))
  }

  async get(key: KeyType) {
    try {
      return await this.levelDb.get(this.formatKey(key))
    } catch (err: any) {
      if (err.notFound === true) {
        return undefined
      }
      throw err
    }
  }

  //
  async create(key: KeyType, value: DataModel) {
    let newKey = this.formatKey(key)
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
    await this.levelDb.put(this.formatKey(key), value)
  }

  async update(key: KeyType, value: DataModel) {
    let newKey = this.formatKey(key)
    await this.levelDb.get(newKey)
    await this.levelDb.put(newKey, value)
  }

  async delete(key: KeyType) {
    let newKey = this.formatKey(key)
    await this.levelDb.del(newKey)
  }
}
