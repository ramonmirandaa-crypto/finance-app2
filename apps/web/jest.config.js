/**
 * Jest configuration for the Web package.
 * @type {import('jest').Config}
 */
module.exports = {
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: ['{app,components,lib}/**/*.{js,jsx,ts,tsx}', '!**/*.test.{js,jsx,ts,tsx}', '!**/node_modules/**', '!jest.config.js'],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
