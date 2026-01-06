/**
 * Contract Tests: grant-generator
 * 
 * Validates the public API surface of the grant-generator microservice.
 * Tests factory functions, grant programs, compliance checking, and PDF generation.
 */
import {
    createComplianceService,
    createGrantPDFService,
    ComplianceCheckService,
    GrantPDFService,
    GRANT_PROGRAMS,
    GRANT_TEMPLATES,
    CFPF_TEMPLATE,
    SLAF_TEMPLATE,
    BRIC_TEMPLATE,
    BENE2_TEMPLATE,
    type GrantProgram,
    type GrantProgramId,
    type GrantRequirement,
    type ProjectData,
    type ComplianceCheck,
    type ComplianceResult,
    type BMPSpec,
    type GrantApplicationData,
    type GeneratedPDF,
    type GrantTemplate,
    type TemplateField,
    type TemplateSection
} from '../../src/lib/grant-generator';

describe('grant-generator Contract Tests', () => {
    describe('Factory Functions', () => {
        it('createComplianceService returns valid service', () => {
            const service = createComplianceService();

            expect(service).toBeInstanceOf(ComplianceCheckService);
            expect(typeof service.checkCompliance).toBe('function');
        });

        it('createGrantPDFService returns valid service', () => {
            const service = createGrantPDFService();

            expect(service).toBeInstanceOf(GrantPDFService);
            expect(typeof service.generate).toBe('function');
            expect(typeof service.download).toBe('function');
        });
    });

    describe('GRANT_PROGRAMS Entity', () => {
        it('exports GRANT_PROGRAMS record', () => {
            expect(GRANT_PROGRAMS).toBeDefined();
            expect(typeof GRANT_PROGRAMS).toBe('object');
        });

        it('includes CFPF program', () => {
            const cfpf = GRANT_PROGRAMS['CFPF'];
            expect(cfpf).toBeDefined();
            expect(cfpf.name).toBeDefined();
            expect(cfpf.id).toBe('CFPF');
        });

        it('includes SLAF program', () => {
            const slaf = GRANT_PROGRAMS['SLAF'];
            expect(slaf).toBeDefined();
            expect(slaf.id).toBe('SLAF');
        });

        it('includes BRIC program', () => {
            const bric = GRANT_PROGRAMS['BRIC'];
            expect(bric).toBeDefined();
            expect(bric.id).toBe('BRIC');
        });

        it('includes BENE2 program (Berlin)', () => {
            const bene2 = GRANT_PROGRAMS['BENE2'];
            expect(bene2).toBeDefined();
            expect(bene2.id).toBe('BENE2');
        });

        it('all programs have required structure', () => {
            const programIds: GrantProgramId[] = ['CFPF', 'SLAF', 'BRIC', 'BENE2'];
            for (const id of programIds) {
                const program = GRANT_PROGRAMS[id];
                expect(program.id).toBeDefined();
                expect(program.name).toBeDefined();
                expect(Array.isArray(program.requirements)).toBe(true);
            }
        });
    });

    describe('GRANT_TEMPLATES', () => {
        it('exports GRANT_TEMPLATES object', () => {
            expect(GRANT_TEMPLATES).toBeDefined();
            expect(typeof GRANT_TEMPLATES).toBe('object');
        });

        it('exports individual templates', () => {
            expect(CFPF_TEMPLATE).toBeDefined();
            expect(SLAF_TEMPLATE).toBeDefined();
            expect(BRIC_TEMPLATE).toBeDefined();
            expect(BENE2_TEMPLATE).toBeDefined();
        });

        it('templates have required structure', () => {
            const templates = [CFPF_TEMPLATE, SLAF_TEMPLATE, BRIC_TEMPLATE, BENE2_TEMPLATE];

            for (const template of templates) {
                expect(template.programId).toBeDefined();
                expect(template.title).toBeDefined();
                expect(Array.isArray(template.sections)).toBe(true);
            }
        });
    });

    describe('ComplianceCheckService', () => {
        it('checkCompliance returns ComplianceResult structure', () => {
            const service = createComplianceService();

            const projectData: ProjectData = {
                area_m2: 120,
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                bmps: [{ type: 'rain_garden', area_m2: 24 }]
            };

            const result = service.checkCompliance(projectData, 'CFPF');

            expect(result).toBeDefined();
            expect(result.grantProgram).toBe('CFPF');
            expect(typeof result.score).toBe('number');
            expect(typeof result.eligible).toBe('boolean');
            expect(Array.isArray(result.checks)).toBe(true);
        });

        it('compliance checks include pass/fail status', () => {
            const service = createComplianceService();

            const result = service.checkCompliance({
                area_m2: 120,
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                bmps: []
            }, 'SLAF');

            for (const check of result.checks) {
                expect(typeof check.passed).toBe('boolean');
                expect(check.id).toBeDefined();
            }
        });
    });

    describe('GrantPDFService', () => {
        it('generate accepts GrantApplicationData', async () => {
            const service = createGrantPDFService();

            const appData: GrantApplicationData = {
                project: {
                    name: 'Test Project',
                    area_m2: 120,
                    retention_in: 1.5
                },
                geo: {
                    hierarchy: ['Fairfax County', 'Virginia', 'USA'],
                    jurisdictionCode: 'US-VA-059'
                },
                pollutants: {
                    TP: 0.42,
                    TN: 12,
                    sediment: 85
                },
                bmps: [{ type: 'rain_garden', area_m2: 24 }]
            };

            const pdf = await service.generate(appData, 'CFPF');

            expect(pdf).toBeDefined();
            expect(pdf.blob).toBeInstanceOf(Blob);
            expect(pdf.filename).toContain('cfpf');
        });

        it('download method exists', () => {
            const service = createGrantPDFService();
            expect(typeof service.download).toBe('function');
        });
    });
});
