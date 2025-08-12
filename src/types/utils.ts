export type BufferToString<T> = T extends Buffer
  ? string
  : T extends Array<infer U>
  ? Array<BufferToString<U>>
  : T extends object
  ? { [K in keyof T]: BufferToString<T[K]> }
  : T
