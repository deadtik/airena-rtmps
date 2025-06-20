// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/src/$1',
  },
  // Add transform property to explicitly use ts-jest for .ts/.tsx files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};
