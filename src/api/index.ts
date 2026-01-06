/**
 * API Entry Point
 * 
 * Exposes microservices as HTTP endpoints using Hono.
 * This is the main entry point for the internal API layer.
 * 
 * Usage:
 *   import { app } from './api';
 *   // Deploy with Node.js adapter, Bun, Deno, or serverless
 * 
 * @module api
 */

import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';

import { spatialCoverageRoutes } from './routes/spatial-coverage';
import { geoRegulatoryRoutes } from './routes/geo-regulatory';
import { grantGeneratorRoutes } from './routes/grant-generator';
import { envCalculatorRoutes } from './routes/env-calculator';
import { healthRoutes } from './routes/health';

// Create main app
export const app = new OpenAPIHono();

// Global middleware
app.use('*', cors());
app.use('*', logger());
app.use('*', prettyJSON());

// Mounting routes (keeping standard Hono route mounting for now, 
// will gradually transition routes to use OpenAPI features)
app.route('/api/health', healthRoutes);
app.route('/api/spatial-coverage', spatialCoverageRoutes);
app.route('/api/geo-regulatory', geoRegulatoryRoutes);
app.route('/api/grant-generator', grantGeneratorRoutes);
app.route('/api/env-calculator', envCalculatorRoutes);

// OpenAPI documentation
app.doc('/openapi.json', {
    openapi: '3.0.0',
    info: {
        version: '1.0.0',
        title: 'Microcatchment Planner API',
        description: 'Internal API layer for Stormwater and Urban Planning microservices.'
    },
    servers: [
        { url: 'http://localhost:3001', description: 'Local development' }
    ]
});

// Swagger UI
app.get('/docs', swaggerUI({ url: '/openapi.json' }));

// Root endpoint
app.get('/', (c) => {
    return c.json({
        name: 'Microcatchment Planner API',
        version: '1.0.0',
        services: [
            '/api/spatial-coverage',
            '/api/geo-regulatory',
            '/api/grant-generator',
            '/api/env-calculator'
        ],
        docs: '/api/docs'
    });
});

export default app;
