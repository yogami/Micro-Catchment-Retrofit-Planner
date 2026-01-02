import { describe, it, expect, beforeEach } from 'vitest';
import { ComplianceCheckService } from '../../../src/lib/grant-generator/domain/services/ComplianceCheckService';
import type { ProjectData, ComplianceResult } from '../../../src/lib/grant-generator/domain/services/ComplianceCheckService';

describe('ComplianceCheckService', () => {
    let service: ComplianceCheckService;

    beforeEach(() => {
        service = new ComplianceCheckService();
    });

    describe('CFPF Compliance', () => {
        it('should score Fairfax project 100% for CFPF when all requirements met', () => {
            const project: ProjectData = {
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                area_m2: 120,
                retention_in: 1.5,
                peakReduction_percent: 50,
                hasBCR: true,
                bcrValue: 1.8,
                hasResiliencePlan: true,
                bmps: [
                    { type: 'rain_garden', area_m2: 24 },
                    { type: 'permeable_pavement', area_m2: 48 }
                ]
            };

            const result = service.checkCompliance(project, 'CFPF');

            expect(result.score).toBe(100);
            expect(result.eligible).toBe(true);
            expect(result.checks.every(c => c.passed)).toBe(true);
        });

        it('should fail CFPF if BCR < 1.0', () => {
            const project: ProjectData = {
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                area_m2: 120,
                retention_in: 1.5,
                peakReduction_percent: 50,
                hasBCR: true,
                bcrValue: 0.8, // Below threshold
                hasResiliencePlan: true,
                bmps: []
            };

            const result = service.checkCompliance(project, 'CFPF');

            expect(result.eligible).toBe(false);
            expect(result.checks.find(c => c.id === 'bcr')?.passed).toBe(false);
        });

        it('should require resilience plan for CFPF Round 6', () => {
            const project: ProjectData = {
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                area_m2: 120,
                retention_in: 1.5,
                peakReduction_percent: 50,
                hasBCR: true,
                bcrValue: 1.5,
                hasResiliencePlan: false, // Missing
                bmps: []
            };

            const result = service.checkCompliance(project, 'CFPF');

            expect(result.checks.find(c => c.id === 'resilience_plan')?.passed).toBe(false);
        });
    });

    describe('SLAF Compliance', () => {
        it('should prioritize pollutant removal for SLAF', () => {
            const project: ProjectData = {
                jurisdictionCode: 'US-VA',
                jurisdictionChain: ['Virginia', 'USA'],
                area_m2: 100,
                retention_in: 1.2,
                peakReduction_percent: 40,
                phosphorusRemoval_lb_yr: 0.5,
                nitrogenRemoval_lb_yr: 3.0,
                bmps: [{ type: 'rain_garden', area_m2: 20 }]
            };

            const result = service.checkCompliance(project, 'SLAF');

            expect(result.checks.find(c => c.id === 'pollutant_removal')?.passed).toBe(true);
        });
    });

    describe('BENE2 (Berlin) Compliance', () => {
        it('should check Schwammstadt DWA-A138 compliance for Berlin', () => {
            const project: ProjectData = {
                jurisdictionCode: 'DE-BE',
                jurisdictionChain: ['Berlin', 'Germany'],
                area_m2: 200,
                retention_mm: 30, // Berlin uses metric
                infiltrationRate_mm_hr: 15,
                bmps: [
                    { type: 'rain_garden', area_m2: 40 },
                    { type: 'permeable_pavement', area_m2: 100 }
                ]
            };

            const result = service.checkCompliance(project, 'BENE2');

            expect(result.checks.find(c => c.id === 'schwammstadt')?.passed).toBe(true);
            expect(result.checks.find(c => c.id === 'dwa_a138')?.passed).toBe(true);
        });
    });

    describe('Compliance Summary', () => {
        it('should return formatted checklist for grant application', () => {
            const project: ProjectData = {
                jurisdictionCode: 'US-VA-059',
                jurisdictionChain: ['Fairfax County', 'Virginia', 'USA'],
                area_m2: 120,
                retention_in: 1.5,
                peakReduction_percent: 50,
                hasBCR: true,
                bcrValue: 1.8,
                hasResiliencePlan: true,
                bmps: []
            };

            const result = service.checkCompliance(project, 'CFPF');

            // Should have formatted strings for PDF
            expect(result.summary).toContain('Fairfax PFM');
            expect(result.summary).toContain('1.5in LID retention');
        });
    });
});
