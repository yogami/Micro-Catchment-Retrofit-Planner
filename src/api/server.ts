/**
 * API Server Entry Point
 * 
 * Runs the Hono API server using Node.js adapter.
 * 
 * Usage:
 *   npx tsx src/api/server.ts
 *   # or
 *   npm run api
 */

import { serve } from '@hono/node-server';
import app from './index';

const port = parseInt(process.env.API_PORT || '3001', 10);

console.log(`🚀 Microcatchment Planner API starting on port ${port}...`);

serve({
    fetch: app.fetch,
    port
}, (info) => {
    console.log(`✅ API server running at http://localhost:${info.port}`);
    console.log('');
    console.log('Available endpoints:');
    console.log('  GET  /                              - API info');
    console.log('  GET  /api/health                    - Health check');
    console.log('  POST /api/spatial-coverage/sessions - Create coverage session');
    console.log('  POST /api/geo-regulatory/discover   - Discover regulatory profile');
    console.log('  GET  /api/grant-generator/programs  - List grant programs');
    console.log('  POST /api/env-calculator/calculate/retrofit - Calculate retrofit');
    console.log('');
});
