module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  // transform ESM packages like uuid
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
};

