import * as cryptography from '../../src/utils/cryptography'

// Cryptography tests
describe('cryptography', () => {
  describe('generatePassword', () => {
    it('should generate password with default length', () => {
      const password = cryptography.generatePassword()
      expect(password.length).toBe(50)
      expect(password).toMatch(/^[0-9A-Za-z?!@]+$/)
    })

    it('should generate password with custom length', () => {
      const password = cryptography.generatePassword(20)
      expect(password.length).toBe(20)
    })

    it('should generate unique passwords', () => {
      const password1 = cryptography.generatePassword()
      const password2 = cryptography.generatePassword()
      expect(password1).not.toBe(password2)
    })
  })

  describe('generateRandomHex', () => {
    it('should generate hex string with default length', () => {
      const hex = cryptography.generateRandomHex()
      expect(hex.length).toBe(32)
      expect(hex).toMatch(/^[0-9a-f]+$/)
    })

    it('should generate hex string with custom length', () => {
      const hex = cryptography.generateRandomHex(16)
      expect(hex.length).toBe(16)
    })

    it('should generate unique hex strings', () => {
      const hex1 = cryptography.generateRandomHex()
      const hex2 = cryptography.generateRandomHex()
      expect(hex1).not.toBe(hex2)
    })
  })

  describe('sha256Hash', () => {
    it('should generate consistent hash for same input', () => {
      const hash1 = cryptography.sha256Hash('test')
      const hash2 = cryptography.sha256Hash('test')
      expect(hash1).toBe(hash2)
    })

    it('should generate different hashes for different inputs', () => {
      const hash1 = cryptography.sha256Hash('test1')
      const hash2 = cryptography.sha256Hash('test2')
      expect(hash1).not.toBe(hash2)
    })

    it('should generate valid SHA-256 hash', () => {
      const hash = cryptography.sha256Hash('hello world')
      expect(hash.length).toBe(64) // SHA-256 produces 64 character hex string
      expect(hash).toMatch(/^[0-9a-f]+$/)
    })
  })
})
