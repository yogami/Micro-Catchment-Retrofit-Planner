/** @type {import('jest').Config} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'jsdom',
    roots: ['<rootDir>/src', '<rootDir>/tests'],
    testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
    testMatch: [
        '**/__tests__/**/*.+(ts|tsx|js)',
        '**/?(*.)+(spec|test).+(ts|tsx|js)'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
    },
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tsconfig.test.json',
            diagnostics: {
                ignoreCodes: [1343]
            },
            astTransformers: {
                before: [
                    {
                        path: 'node_modules/ts-jest-mock-import-meta',
                        options: { metaObjectReplacement: { env: { VITE_SUPABASE_URL: 'mock', VITE_SUPABASE_ANON_KEY: 'mock' } } }
                    }
                ]
            }
        }]
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/main.tsx',
        '!src/App.tsx',
        // Exclude UI components/hooks requiring browser testing
        '!src/components/**/*.tsx',
        '!src/hooks/*.ts',
        '!src/contexts/*.ts',
        '!src/contexts/*.tsx',
        '!src/store/*.ts',
        // Exclude index/barrel files
        '!src/lib/**/index.ts',
        // Exclude files requiring external services (integration tests)
        '!src/services/projectService.ts',
        '!src/services/supabaseClient.ts',
        '!src/ml/pinnTrainer.ts',
        '!src/lib/geo-regulatory/adapters/NominatimGeocodingAdapter.ts'
    ],
    coverageThreshold: {
        global: {
            branches: 60,
            functions: 85,
            lines: 88,
            statements: 87
        }
    }
};
