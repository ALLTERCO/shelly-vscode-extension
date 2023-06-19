/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  "roots": [
    "<rootDir>/src"
  ],
  "testMatch": [
    "**/__tests__/**/*.ts",
  ],
  "transform": {
    "^.+\\.(ts|tsx)$": "ts-jest"
  },
};
