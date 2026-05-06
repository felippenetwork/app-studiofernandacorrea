import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: 'src',
  testMatch: ['**/__tests__/**/*.test.ts'],
  clearMocks: true,
  collectCoverageFrom: [
    'modules/auth/**/*.ts',
    'services/**/*.ts',
    '!**/*.d.ts',
  ],
};

export default config;
