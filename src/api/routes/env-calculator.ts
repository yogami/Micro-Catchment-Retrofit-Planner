import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import {
    createPollutantService,
    POLLUTANTS,
    BMP_REMOVAL_RATES
} from '../../lib/env-calculator';

export const envCalculatorRoutes = new OpenAPIHono();

// Lazy-loaded service
let pollutantService: ReturnType<typeof createPollutantService> | null = null;

function getPollutantService() {
    if (!pollutantService) {
        pollutantService = createPollutantService();
    }
    return pollutantService;
}

// --- SCHEMAS ---

const PollutantSchema = z.object({
    type: z.string().openapi({ example: 'phosphorus' }),
    name: z.string().openapi({ example: 'Total Phosphorus (TP)' }),
    unit: z.string().openapi({ example: 'lb/yr' }),
    description: z.string().openapi({ example: 'Primary nutrient causing algae blooms' })
}).openapi('Pollutant');

const PollutantLoadResultSchema = z.object({
    phosphorus_lb_yr: z.number(),
    nitrogen_lb_yr: z.number(),
    sediment_percent: z.number(),
    source: z.string()
}).openapi('PollutantLoadResult');

const BMPTypeSchema = z.enum(['rain_garden', 'permeable_pavement', 'bioswale', 'green_roof', 'tree_planter']).openapi('BMPType');

const BMPSpecSchema = z.object({
    type: BMPTypeSchema,
    area_m2: z.number().positive()
}).openapi('BMPSpec');

const RemovalInputSchema = z.object({
    bmpType: BMPTypeSchema,
    area_m2: z.number().positive(),
    imperviousPercent: z.number().min(0).max(100),
    annualRainfall_mm: z.number().positive()
}).openapi('RemovalInput');

const BaselineInputSchema = z.object({
    area_m2: z.number().positive(),
    imperviousPercent: z.number().min(0).max(100),
    annualRainfall_mm: z.number().positive()
}).openapi('BaselineInput');

const RetrofitInputSchema = BaselineInputSchema.extend({
    bmps: z.array(BMPSpecSchema)
}).openapi('RetrofitInput');

// --- ROUTES ---

// 1. GET /pollutants
const pollutantsRoute = createRoute({
    method: 'get',
    path: '/pollutants',
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ pollutants: z.array(PollutantSchema) }) } },
            description: 'List all available pollutant types'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(pollutantsRoute, (c) => {
    return c.json({ pollutants: Object.values(POLLUTANTS) });
});

// 2. GET /bmp-rates
const bmpRatesRoute = createRoute({
    method: 'get',
    path: '/bmp-rates',
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ bmpTypes: z.array(z.string()), rates: z.record(z.string(), z.any()) }) } },
            description: 'Get BMP removal rates'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(bmpRatesRoute, (c) => {
    return c.json({
        bmpTypes: Object.keys(BMP_REMOVAL_RATES),
        rates: BMP_REMOVAL_RATES
    });
});

// 3. POST /calculate/removal
const calculateRemovalRoute = createRoute({
    method: 'post',
    path: '/calculate/removal',
    request: {
        body: { content: { 'application/json': { schema: RemovalInputSchema } } }
    },
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ input: RemovalInputSchema, result: PollutantLoadResultSchema }) } },
            description: 'Calculate BMP removal'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(calculateRemovalRoute, (c) => {
    const input = c.req.valid('json');
    const service = getPollutantService();
    const result = service.calculateRemoval(input);
    return c.json({ input, result });
});

// 4. POST /calculate/baseline
const calculateBaselineRoute = createRoute({
    method: 'post',
    path: '/calculate/baseline',
    request: {
        body: { content: { 'application/json': { schema: BaselineInputSchema } } }
    },
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ input: BaselineInputSchema, result: PollutantLoadResultSchema }) } },
            description: 'Calculate baseline load'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(calculateBaselineRoute, (c) => {
    const input = c.req.valid('json');
    const service = getPollutantService();
    const result = service.calculateBaselineLoad(input);
    return c.json({ input, result });
});

// 5. POST /calculate/retrofit
const calculateRetrofitRoute = createRoute({
    method: 'post',
    path: '/calculate/retrofit',
    request: {
        body: { content: { 'application/json': { schema: RetrofitInputSchema } } }
    },
    responses: {
        200: {
            content: {
                'application/json': {
                    schema: z.object({
                        input: RetrofitInputSchema,
                        baseline: PollutantLoadResultSchema,
                        postRetrofit: PollutantLoadResultSchema,
                        reduction: z.object({
                            phosphorus_lb_yr: z.number(),
                            nitrogen_lb_yr: z.number(),
                            phosphorus_percent: z.number(),
                            nitrogen_percent: z.number()
                        })
                    })
                }
            },
            description: 'Calculate retrofit results'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(calculateRetrofitRoute, (c) => {
    const input = c.req.valid('json');
    const service = getPollutantService();
    const baseline = service.calculateBaselineLoad(input);
    const postRetrofit = service.calculateWithBMPs(input);

    return c.json({
        input,
        baseline,
        postRetrofit,
        reduction: {
            phosphorus_lb_yr: baseline.phosphorus_lb_yr - postRetrofit.phosphorus_lb_yr,
            nitrogen_lb_yr: baseline.nitrogen_lb_yr - postRetrofit.nitrogen_lb_yr,
            phosphorus_percent: baseline.phosphorus_lb_yr > 0
                ? ((baseline.phosphorus_lb_yr - postRetrofit.phosphorus_lb_yr) / baseline.phosphorus_lb_yr) * 100
                : 0,
            nitrogen_percent: baseline.nitrogen_lb_yr > 0
                ? ((baseline.nitrogen_lb_yr - postRetrofit.nitrogen_lb_yr) / baseline.nitrogen_lb_yr) * 100
                : 0
        }
    });
});

// 6. POST /calculate/slaf-summary
const slafSummaryRoute = createRoute({
    method: 'post',
    path: '/calculate/slaf-summary',
    request: {
        body: { content: { 'application/json': { schema: RetrofitInputSchema } } }
    },
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ input: RetrofitInputSchema, summary: z.any() }) } },
            description: 'Get SLAF summary'
        }
    },
    tags: ['Environmental Calculator']
});

envCalculatorRoutes.openapi(slafSummaryRoute, (c) => {
    const input = c.req.valid('json');
    const service = getPollutantService();
    const summary = service.getSLAFSummary(input);
    return c.json({ input, summary });
});
