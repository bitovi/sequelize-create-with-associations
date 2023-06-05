import type { JestConfigWithTsJest } from "ts-jest";

const config: JestConfigWithTsJest = {
  roots: ["<rootDir>/tests"],
  collectCoverageFrom: ["<rootDir>/src/**/*.ts"],
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  coverageReporters: ["html", "text", "text-summary"],
  testEnvironment: "node",
  transform: { ".+\\.ts$": "ts-jest" },
  testTimeout: 90000,
};

export default config;
