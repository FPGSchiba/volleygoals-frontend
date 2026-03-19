module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest',
  },
  // transform ESM packages like uuid
  transformIgnorePatterns: ['/node_modules/(?!uuid)'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(scss|css)$': '<rootDir>/src/__mocks__/styleMock.js',
    '\\.(png|jpg|jpeg|svg|webp|yaml)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/index.tsx',
    '!src/**/*.d.ts',
    '!src/i18n/**',
    '!src/__mocks__/**',
    '!src/__tests__/test-utils.tsx',
    '!src/__tests__/mocks/**',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    'src/__tests__/mocks/',
    'src/__tests__/test-utils\\.tsx$',
  ],
  coverageThreshold: {
    global: {
      statements: 30,
      lines: 30,
      branches: 20,
      functions: 25,
    },
  },
};

