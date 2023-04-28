export default {
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: ["<rootDir>/tests/**/*.ts"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  testEnvironment: "node",
  transform: { ".+\\.ts$": "ts-jest" },
  testTimeout: 90000,
};
