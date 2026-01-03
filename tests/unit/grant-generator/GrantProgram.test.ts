import { describe, it, expect } from '@jest/globals';
import { GRANT_PROGRAMS, type GrantProgramId, type GrantProgram, type GrantRequirement } from '../../../src/lib/grant-generator/domain/entities/GrantProgram';

describe('GrantProgram Entity', () => {
    describe('GRANT_PROGRAMS registry', () => {
        it('contains CFPF program', () => {
            expect(GRANT_PROGRAMS.CFPF).toBeDefined();
            expect(GRANT_PROGRAMS.CFPF.id).toBe('CFPF');
            expect(GRANT_PROGRAMS.CFPF.name).toBe('Clean Flood Protection Fund');
        });

        it('contains SLAF program', () => {
            expect(GRANT_PROGRAMS.SLAF).toBeDefined();
            expect(GRANT_PROGRAMS.SLAF.id).toBe('SLAF');
        });

        it('contains BRIC program', () => {
            expect(GRANT_PROGRAMS.BRIC).toBeDefined();
            expect(GRANT_PROGRAMS.BRIC.id).toBe('BRIC');
        });

        it('contains BENE2 program', () => {
            expect(GRANT_PROGRAMS.BENE2).toBeDefined();
            expect(GRANT_PROGRAMS.BENE2.id).toBe('BENE2');
        });
    });

    describe('CFPF program structure', () => {
        const cfpf = GRANT_PROGRAMS.CFPF;

        it('has correct federal/local match', () => {
            expect(cfpf.federalMatch_percent).toBe(75);
            expect(cfpf.localMatch_percent).toBe(25);
        });

        it('applies to all US regions', () => {
            expect(cfpf.applicableRegions).toContain('US-*');
        });

        it('has resilience_plan requirement', () => {
            const req = cfpf.requirements.find((r: GrantRequirement) => r.id === 'resilience_plan');
            expect(req).toBeDefined();
            expect(req!.type).toBe('boolean');
            expect(req!.required).toBe(true);
        });

        it('has bcr requirement with threshold', () => {
            const req = cfpf.requirements.find((r: GrantRequirement) => r.id === 'bcr');
            expect(req).toBeDefined();
            expect(req!.type).toBe('numeric');
            expect(req!.threshold).toBe(1.0);
        });

        it('has local_match requirement', () => {
            const req = cfpf.requirements.find((r: GrantRequirement) => r.id === 'local_match');
            expect(req).toBeDefined();
            expect(req!.threshold).toBe(25);
        });

        it('has water_quality as optional', () => {
            const req = cfpf.requirements.find((r: GrantRequirement) => r.id === 'water_quality');
            expect(req).toBeDefined();
            expect(req!.required).toBe(false);
        });
    });

    describe('SLAF program structure', () => {
        const slaf = GRANT_PROGRAMS.SLAF;

        it('has 50/50 match', () => {
            expect(slaf.federalMatch_percent).toBe(50);
            expect(slaf.localMatch_percent).toBe(50);
        });

        it('applies to Chesapeake Bay states', () => {
            expect(slaf.applicableRegions).toContain('US-VA');
            expect(slaf.applicableRegions).toContain('US-MD');
            expect(slaf.applicableRegions).toContain('US-PA');
        });

        it('requires measurable pollutant reduction', () => {
            const req = slaf.requirements.find((r: GrantRequirement) => r.id === 'pollutant_removal');
            expect(req).toBeDefined();
            expect(req!.required).toBe(true);
        });
    });

    describe('BRIC program structure', () => {
        const bric = GRANT_PROGRAMS.BRIC;

        it('requires BCR', () => {
            const req = bric.requirements.find((r: GrantRequirement) => r.id === 'bcr');
            expect(req).toBeDefined();
            expect(req!.required).toBe(true);
        });

        it('requires hazard mitigation plan', () => {
            const req = bric.requirements.find((r: GrantRequirement) => r.id === 'hazard_mitigation_plan');
            expect(req).toBeDefined();
            expect(req!.required).toBe(true);
        });

        it('has optional equity score', () => {
            const req = bric.requirements.find((r: GrantRequirement) => r.id === 'equity');
            expect(req).toBeDefined();
            expect(req!.required).toBe(false);
        });
    });

    describe('BENE2 program structure', () => {
        const bene2 = GRANT_PROGRAMS.BENE2;

        it('has 60/40 match', () => {
            expect(bene2.federalMatch_percent).toBe(60);
            expect(bene2.localMatch_percent).toBe(40);
        });

        it('applies only to Berlin', () => {
            expect(bene2.applicableRegions).toEqual(['DE-BE']);
        });

        it('requires Schwammstadt compliance', () => {
            const req = bene2.requirements.find((r: GrantRequirement) => r.id === 'schwammstadt');
            expect(req).toBeDefined();
            expect(req!.required).toBe(true);
        });

        it('requires DWA-A 138 infiltration', () => {
            const req = bene2.requirements.find((r: GrantRequirement) => r.id === 'dwa_a138');
            expect(req).toBeDefined();
            expect(req!.required).toBe(true);
        });

        it('has optional minimum investment threshold', () => {
            const req = bene2.requirements.find((r: GrantRequirement) => r.id === 'min_investment');
            expect(req).toBeDefined();
            expect(req!.threshold).toBe(200000);
            expect(req!.required).toBe(false);
        });
    });

    describe('all programs have valid structure', () => {
        const allPrograms = Object.values(GRANT_PROGRAMS);

        it('all have description', () => {
            allPrograms.forEach((p: GrantProgram) => {
                expect(p.description).toBeDefined();
                expect(p.description.length).toBeGreaterThan(10);
            });
        });

        it('all have matching percentages totaling 100', () => {
            allPrograms.forEach((p: GrantProgram) => {
                expect(p.federalMatch_percent + p.localMatch_percent).toBe(100);
            });
        });

        it('all requirements have label and description', () => {
            allPrograms.forEach((p: GrantProgram) => {
                p.requirements.forEach((req: GrantRequirement) => {
                    expect(req.label).toBeDefined();
                    expect(req.description).toBeDefined();
                });
            });
        });
    });
});
