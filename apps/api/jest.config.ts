export default {
  displayName: 'api',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^@pubg-replay/shared-types$': '<rootDir>/../../libs/shared/types/src/index.ts',
    '^@pubg-replay/shared-utils$': '<rootDir>/../../libs/shared/utils/src/index.ts',
    '^@pubg-replay/replay-engine$': '<rootDir>/../../libs/replay-engine/src/index.ts',
  },
  setupFiles: ['<rootDir>/src/test-setup.ts'],
  coverageDirectory: '../../coverage/apps/api',
};
