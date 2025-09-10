/**
 * Jest configuration for the API package.
 * @type {import('jest').Config}
 */
export default {
  testEnvironment: 'node',
  collectCoverage: true,
  collectCoverageFrom: ['**/*.js', '!**/*.test.js', '!**/node_modules/**', '!jest.config.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
