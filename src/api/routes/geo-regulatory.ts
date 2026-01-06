import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import {
    createStormwaterDiscoveryUseCase,
    STORMWATER_PROFILES
} from '../../lib/geo-regulatory';

export const geoRegulatoryRoutes = new OpenAPIHono();

// Lazy-loaded use case
let stormwaterUseCase: ReturnType<typeof createStormwaterDiscoveryUseCase> | null = null;

function getStormwaterUseCase() {
    if (!stormwaterUseCase) {
        stormwaterUseCase = createStormwaterDiscoveryUseCase();
    }
    return stormwaterUseCase;
}

// --- SCHEMAS ---

const DiscoverRequestSchema = z.object({
    lat: z.number().min(-90).max(90).openapi({ example: 38.85 }),
    lon: z.number().min(-180).max(180).openapi({ example: -77.30 }),
    domain: z.string().default('stormwater').openapi({ example: 'stormwater' })
}).openapi('DiscoverRequest');

const DiscoveryResultSchema = z.object({
    success: z.literal(true),
    profile: z.any().optional(),
    jurisdiction: z.any().optional(),
    chain: z.any().optional()
}).openapi('DiscoveryResult');

const ProfileSchema = z.object({
    id: z.string(),
    jurisdictionCode: z.string(),
    domain: z.string(),
    name: z.string(),
    description: z.string(),
    authorityName: z.string().optional(),
    authorityUrl: z.string().optional(),
    parameters: z.object({
        designDepth_mm: z.number(),
        designIntensity_mm_hr: z.number(),
        units: z.string()
    })
}).openapi('Profile');

// --- ROUTES ---

// 1. POST /discover
const discoverRoute = createRoute({
    method: 'post',
    path: '/discover',
    request: {
        body: { content: { 'application/json': { schema: DiscoverRequestSchema } } }
    },
    responses: {
        200: {
            content: { 'application/json': { schema: DiscoveryResultSchema } },
            description: 'Discover regulatory profile by coordinates'
        },
        500: {
            content: { 'application/json': { schema: z.object({ success: z.literal(false), error: z.string() }) } },
            description: 'Internal server error'
        }
    },
    tags: ['Geo-Regulatory']
});

geoRegulatoryRoutes.openapi(discoverRoute, async (c) => {
    const { lat, lon, domain } = c.req.valid('json');
    try {
        const useCase = getStormwaterUseCase();
        const result = await useCase.execute({ latitude: lat, longitude: lon, domain });
        return c.json({ success: true as const, ...result }, 200);
    } catch (error) {
        return c.json({ success: false, error: String(error) }, 500);
    }
});

// 2. GET /profiles
const profilesRoute = createRoute({
    method: 'get',
    path: '/profiles',
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ count: z.number(), profiles: z.array(ProfileSchema) }) } },
            description: 'List all profiles'
        }
    },
    tags: ['Geo-Regulatory']
});

geoRegulatoryRoutes.openapi(profilesRoute, (c) => {
    const profiles = STORMWATER_PROFILES.map(p => ({
        id: p.id,
        jurisdictionCode: p.jurisdictionCode,
        domain: p.domain,
        name: p.name,
        description: p.description,
        authorityName: p.authorityName,
        authorityUrl: p.authorityUrl,
        parameters: {
            designDepth_mm: p.parameters.designDepth_mm,
            designIntensity_mm_hr: p.parameters.designIntensity_mm_hr,
            units: p.parameters.units
        }
    }));
    return c.json({ count: profiles.length, profiles });
});

// 3. GET /profiles/:jurisdictionCode
const profileByCodeRoute = createRoute({
    method: 'get',
    path: '/profiles/{jurisdictionCode}',
    request: {
        params: z.object({ jurisdictionCode: z.string() })
    },
    responses: {
        200: {
            content: { 'application/json': { schema: ProfileSchema } },
            description: 'Get profile by code'
        },
        404: { description: 'Profile not found' }
    },
    tags: ['Geo-Regulatory']
});

geoRegulatoryRoutes.openapi(profileByCodeRoute, (c) => {
    const code = c.req.param('jurisdictionCode');
    const p = STORMWATER_PROFILES.find(p => p.jurisdictionCode === code);
    if (!p) return c.json({ error: 'Not found' }, 404);

    return c.json({
        id: p.id,
        jurisdictionCode: p.jurisdictionCode,
        domain: p.domain,
        name: p.name,
        description: p.description,
        authorityName: p.authorityName,
        authorityUrl: p.authorityUrl,
        parameters: {
            designDepth_mm: p.parameters.designDepth_mm,
            designIntensity_mm_hr: p.parameters.designIntensity_mm_hr,
            units: p.parameters.units
        }
    });
});
