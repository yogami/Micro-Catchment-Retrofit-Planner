import '@testing-library/jest-dom';

// Mock import.meta.env for Vitest-style env vars in Jest
Object.defineProperty(global, 'importMeta', {
    value: {
        env: {
            VITE_SUPABASE_URL: 'http://localhost:54321',
            VITE_SUPABASE_ANON_KEY: 'mock-key',
        },
    },
    writable: false,
});
