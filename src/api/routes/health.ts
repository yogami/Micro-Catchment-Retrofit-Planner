import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';

export const healthRoutes = new OpenAPIHono();

const HealthSchema = z.object({
    status: z.string().openapi({ example: 'healthy' }),
    timestamp: z.string(),
    uptime: z.number()
}).openapi('HealthStatus');

const healthRoute = createRoute({
    method: 'get',
    path: '/',
    responses: {
        200: {
            content: { 'application/json': { schema: HealthSchema } },
            description: 'Get service health status'
        }
    },
    tags: ['Monitoring']
});

healthRoutes.openapi(healthRoute, (c) => {
    return c.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
