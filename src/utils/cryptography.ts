import crypto from 'crypto'

const DEFAULT_ENCRYPT_PARAMETERS = {
  scryptParameters: {
    N: 2 ** 14,
    r: 8,
    p: 1,
  },
  bcryptSaltRound: 12,
}

function generatePassword(length = 50) {
  const wishlist = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz?!@'
  let password = Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => wishlist[x % wishlist.length])
    .join('')
  return password
}

function generateRandomHex(length = 32) {
  const wishlist = '0123456789abcdef'
  let password = Array.from(crypto.randomFillSync(new Uint32Array(length)))
    .map((x) => wishlist[x % wishlist.length])
    .join('')
  return password
}

function sha256Hash(message: string) {
  let dataBuffer = Buffer.from(message, 'utf8')
  let hashHex = crypto.createHash('sha256').update(dataBuffer).digest('hex')
  return hashHex
}

//  --------------- Asymmetric -------------------------

export {
  sha256Hash,
  generatePassword,
  generateRandomHex
}
