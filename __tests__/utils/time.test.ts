// test arrayMove
import * as time from '../../src/utils/time'

// Time utility tests
describe('time', () => {
  describe('convertToMilliseconds', () => {
    it('should convert days to milliseconds', () => {
      expect(time.convertToMilliseconds('1d')).toBe(24 * 60 * 60 * 1000)
      expect(time.convertToMilliseconds('2 days')).toBe(2 * 24 * 60 * 60 * 1000)
    })

    it('should convert hours to milliseconds', () => {
      expect(time.convertToMilliseconds('1h')).toBe(60 * 60 * 1000)
      expect(time.convertToMilliseconds('3 hrs')).toBe(3 * 60 * 60 * 1000)
    })

    it('should convert minutes to milliseconds', () => {
      expect(time.convertToMilliseconds('1m')).toBe(60 * 1000)
      expect(time.convertToMilliseconds('5 mins')).toBe(5 * 60 * 1000)
    })

    it('should convert seconds to milliseconds', () => {
      expect(time.convertToMilliseconds('1s')).toBe(1000)
      expect(time.convertToMilliseconds('10 secs')).toBe(10 * 1000)
    })

    it('should return number as is when input is number', () => {
      expect(time.convertToMilliseconds(5000)).toBe(5000)
    })

    it('should return number when input is numeric string', () => {
      expect(time.convertToMilliseconds('5000')).toBe(5000)
    })

    it('should throw error for invalid format', () => {
      expect(() => time.convertToMilliseconds('invalid')).toThrow('Invalid time format')
    })

    it('should throw error for Invalid time format', () => {
      expect(() => time.convertToMilliseconds('1w')).toThrow('Invalid time format')
    })

    it('should handle case insensitive units', () => {
      expect(time.convertToMilliseconds('1D')).toBe(24 * 60 * 60 * 1000)
      expect(time.convertToMilliseconds('1H')).toBe(60 * 60 * 1000)
      expect(time.convertToMilliseconds('1M')).toBe(60 * 1000)
      expect(time.convertToMilliseconds('1S')).toBe(1000)
    })
  })
})
