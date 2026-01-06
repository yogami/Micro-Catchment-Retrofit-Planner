import { OpenAPIHono, createRoute } from '@hono/zod-openapi';
import { z } from 'zod';
import {
    createComplianceService,
    createGrantPDFService,
    GRANT_PROGRAMS,
    GRANT_TEMPLATES,
    type GrantProgramId,
    type ProjectData
} from '../../lib/grant-generator';

export const grantGeneratorRoutes = new OpenAPIHono();

// Lazy-loaded services
let complianceService: ReturnType<typeof createComplianceService> | null = null;
let pdfService: ReturnType<typeof createGrantPDFService> | null = null;

function getComplianceService() {
    if (!complianceService) complianceService = createComplianceService();
    return complianceService;
}

function getPDFService() {
    if (!pdfService) pdfService = createGrantPDFService();
    return pdfService;
}

// --- SCHEMAS ---

const ProjectDataSchema = z.object({
    jurisdictionCode: z.string(),
    jurisdictionChain: z.array(z.string()),
    area_m2: z.number().positive(),
    retention_in: z.number().optional(),
    retention_mm: z.number().optional(),
    peakReduction_percent: z.number().optional(),
    hasBCR: z.boolean().optional(),
    bcrValue: z.number().optional(),
    hasResiliencePlan: z.boolean().optional(),
    phosphorusRemoval_lb_yr: z.number().optional(),
    nitrogenRemoval_lb_yr: z.number().optional(),
    infiltrationRate_mm_hr: z.number().optional(),
    bmps: z.array(z.object({
        type: z.enum(['rain_garden', 'permeable_pavement', 'bioswale', 'green_roof', 'cistern']),
        area_m2: z.number().positive()
    })).default([])
}).openapi('ProjectData');

const ProgramSchema = z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    federalMatch_percent: z.number(),
    localMatch_percent: z.number(),
    applicableRegions: z.array(z.string()),
    requirementCount: z.number()
}).openapi('GrantProgram');

// --- ROUTES ---

// 1. GET /programs
const programsRoute = createRoute({
    method: 'get',
    path: '/programs',
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ count: z.number(), programs: z.array(ProgramSchema) }) } },
            description: 'List all grant programs'
        }
    },
    tags: ['Grant Generator']
});

grantGeneratorRoutes.openapi(programsRoute, (c) => {
    const programs = Object.values(GRANT_PROGRAMS).map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        federalMatch_percent: p.federalMatch_percent,
        localMatch_percent: p.localMatch_percent,
        applicableRegions: p.applicableRegions,
        requirementCount: p.requirements.length
    }));
    return c.json({ count: programs.length, programs });
});

// 2. POST /check-all
const checkAllRoute = createRoute({
    method: 'post',
    path: '/check-all',
    request: {
        body: { content: { 'application/json': { schema: ProjectDataSchema } } }
    },
    responses: {
        200: {
            content: { 'application/json': { schema: z.object({ projectJurisdiction: z.string(), results: z.array(z.any()) }) } },
            description: 'Check compliance for all programs'
        }
    },
    tags: ['Grant Generator']
});

grantGeneratorRoutes.openapi(checkAllRoute, (c) => {
    const projectData = c.req.valid('json') as ProjectData;
    const service = getComplianceService();
    const results = Object.keys(GRANT_PROGRAMS).map(id => service.checkCompliance(projectData, id as GrantProgramId));
    return c.json({ projectJurisdiction: projectData.jurisdictionCode, results: results.sort((a, b) => b.score - a.score) });
});
