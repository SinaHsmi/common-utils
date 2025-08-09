import { createDefaultPreset } from 'ts-jest'

const tsJestTransformCfg = createDefaultPreset().transform

/** @type {import("jest").Config} **/
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    ...tsJestTransformCfg,
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.spec.ts'],
  moduleNameMapper: {
    '^@src/(.*)$': '<rootDir>/src/$1',
  },
  rootDir: '.',
  setupFilesAfterEnv: ['<rootDir>/__tests__/__setup__/jest.test.setup.ts'],
  globalSetup: '<rootDir>/__tests__/__setup__/jest.setup.ts',
  globalTeardown: '<rootDir>/__tests__/__setup__/jest.finished.ts'
}
