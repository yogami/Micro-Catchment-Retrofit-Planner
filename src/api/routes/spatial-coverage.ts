import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import {
    createCoverageService,
    Boundary,
    CoverageAnalyzer
} from '../../lib/spatial-coverage';

export const spatialCoverageRoutes = new OpenAPIHono();

// In-memory sessions
const sessions = new Map<string, ReturnType<typeof createCoverageService>>();

// --- SCHEMAS ---

const SessionSchema = z.object({
    sessionId: z.string(),
    voxelSize: z.number(),
    createdAt: z.string()
}).openapi('CoverageSession');

const CreateSessionSchema = z.object({
    sessionId: z.string().optional(),
    voxelSize: z.number().min(0.01).max(1.0).default(0.05)
}).openapi('CreateSessionRequest');

const StatsSchema = z.object({
    coveredAreaM2: z.number(),
    voxelCount: z.number(),
    coveragePercent: z.number().nullable(),
    expectedAreaM2: z.number().nullable(),
    isComplete: z.boolean()
}).openapi('CoverageStats');

// --- ROUTES ---

// 1. POST /sessions
const createSessionRoute = createRoute({
    method: 'post',
    path: '/sessions',
    request: {
        body: { content: { 'application/json': { schema: CreateSessionSchema } } }
    },
    responses: {
        201: {
            content: { 'application/json': { schema: SessionSchema } },
            description: 'Create a new coverage session'
        }
    },
    tags: ['Spatial Coverage']
});

spatialCoverageRoutes.openapi(createSessionRoute, async (c) => {
    const { sessionId, voxelSize } = c.req.valid('json');
    const id = sessionId || crypto.randomUUID();
    const service = createCoverageService(voxelSize);
    sessions.set(id, service);
    return c.json({ sessionId: id, voxelSize, createdAt: new Date().toISOString() }, 201);
});

// 2. GET /sessions/:id
const getSessionRoute = createRoute({
    method: 'get',
    path: '/sessions/{id}',
    request: {
        params: z.object({ id: z.string() })
    },
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ sessionId: z.string(), stats: StatsSchema.nullable() }) } },
            description: 'Get session details and stats'
        },
        404: { description: 'Session not found' }
    },
    tags: ['Spatial Coverage']
});

spatialCoverageRoutes.openapi(getSessionRoute, (c) => {
    const id = c.req.param('id');
    const service = sessions.get(id);
    if (!service) return c.json({ error: 'Not found' }, 404);
    return c.json({ sessionId: id, stats: service.getStats() });
});
