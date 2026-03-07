module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    electron: '<rootDir>/__mocks__/electron.ts'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        target: 'ES2022',
        module: 'CommonJS',
        moduleResolution: 'node',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
        skipLibCheck: true,
        strict: false,
        rootDir: './',
        sourceMap: true
      }
    }]
  },
  collectCoverageFrom: [
    'src/main/**/*.ts',
    'src/preload/**/*.ts'
  ]
}
