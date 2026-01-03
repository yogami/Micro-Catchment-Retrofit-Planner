import { describe, it, expect, beforeEach } from '@jest/globals';
import { ComplianceCheckService } from '../../../src/lib/grant-generator/domain/services/ComplianceCheckService';
import type { ProjectData } from '../../../src/lib/grant-generator/domain/services/ComplianceCheckService';

describe('ComplianceCheckService', () => {
    let service: ComplianceCheckService;
    beforeEach(() => { service = new ComplianceCheckService(); });

    const createProject = (overrides?: Partial<ProjectData>): ProjectData => ({
        jurisdictionCode: 'US-VA-059', jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
        area_m2: 120, retention_in: 1.5, peakReduction_percent: 50, hasBCR: true, bcrValue: 1.8,
        hasResiliencePlan: true, bmps: [{ type: 'rain_garden', area_m2: 24 }], ...overrides
    });

    describe('CFPF Compliance', () => {
        it('should score 100% when all requirements met', () => {
            const result = service.checkCompliance(createProject(), 'CFPF');
            expect(result.score).toBe(100);
            expect(result.eligible).toBe(true);
        });

        it('should fail if BCR < 1.0', () => {
            const result = service.checkCompliance(createProject({ bcrValue: 0.8 }), 'CFPF');
            expect(result.eligible).toBe(false);
        });

        it('should require resilience plan', () => {
            const result = service.checkCompliance(createProject({ hasResiliencePlan: false }), 'CFPF');
            expect(result.checks.find(c => c.id === 'resilience_plan')?.passed).toBe(false);
        });
    });

    describe('SLAF Compliance', () => {
        it('should prioritize pollutant removal', () => {
            const result = service.checkCompliance(createProject({ phosphorusRemoval_lb_yr: 0.5 }), 'SLAF');
            expect(result.checks.find(c => c.id === 'pollutant_removal')?.passed).toBe(true);
        });
    });

    describe('Summary', () => {
        it('should return formatted checklist', () => {
            const result = service.checkCompliance(createProject(), 'CFPF');
            expect(result.summary).toContain('Fairfax PFM');
        });
    });
});
