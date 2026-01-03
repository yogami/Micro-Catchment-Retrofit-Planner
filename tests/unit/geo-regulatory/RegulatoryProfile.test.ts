import { describe, it, expect } from '@jest/globals';
import {
    createStormwaterProfile,
    type RegulatoryProfile,
    type StormwaterParameters
} from '../../../src/lib/geo-regulatory/domain/valueObjects/RegulatoryProfile';

describe('RegulatoryProfile Value Object', () => {
    describe('createStormwaterProfile', () => {
        const defaultParams: StormwaterParameters = {
            designDepth_mm: 38.1,
            designIntensity_mm_hr: 50.8,
            rvFormula: (i) => 0.05 + (0.009 * i),
            units: 'imperial'
        };

        it('creates a profile with required fields', () => {
            const profile = createStormwaterProfile({
                id: 'fairfax-stormwater',
                jurisdictionCode: 'US-VA-059',
                name: 'Fairfax County LID Manual',
                description: 'Fairfax County stormwater standards',
                parameters: defaultParams
            });

            expect(profile.id).toBe('fairfax-stormwater');
            expect(profile.jurisdictionCode).toBe('US-VA-059');
            expect(profile.domain).toBe('stormwater');
            expect(profile.name).toBe('Fairfax County LID Manual');
            expect(profile.description).toBe('Fairfax County stormwater standards');
            expect(profile.parameters).toBe(defaultParams);
        });

        it('includes optional authority info', () => {
            const profile = createStormwaterProfile({
                id: 'va-stormwater',
                jurisdictionCode: 'US-VA',
                name: 'Virginia DEQ Standards',
                description: 'State-level standards',
                parameters: defaultParams,
                options: {
                    authorityName: 'Virginia DEQ',
                    authorityUrl: 'https://www.deq.virginia.gov/'
                }
            });

            expect(profile.authorityName).toBe('Virginia DEQ');
            expect(profile.authorityUrl).toBe('https://www.deq.virginia.gov/');
        });

        it('includes optional effective date', () => {
            const effectiveDate = new Date('2024-01-01');
            const profile = createStormwaterProfile({
                id: 'test-profile',
                jurisdictionCode: 'TEST',
                name: 'Test Profile',
                description: 'Test description',
                parameters: defaultParams,
                options: {
                    effectiveDate
                }
            });

            expect(profile.effectiveDate).toEqual(effectiveDate);
        });

        it('always sets domain to stormwater', () => {
            const profile = createStormwaterProfile({
                id: 'any-id',
                jurisdictionCode: 'ANY',
                name: 'Any Name',
                description: 'Any description',
                parameters: defaultParams
            });

            expect(profile.domain).toBe('stormwater');
        });

        it('preserves rvFormula functionality', () => {
            const rvFormula = (i: number) => 0.05 + (0.009 * i);
            const profile = createStormwaterProfile({
                id: 'formula-test',
                jurisdictionCode: 'TEST',
                name: 'Formula Test',
                description: 'Test',
                parameters: { ...defaultParams, rvFormula }
            });

            // Test rvFormula at different impervious percentages
            expect(profile.parameters.rvFormula(0)).toBeCloseTo(0.05, 3);
            expect(profile.parameters.rvFormula(50)).toBeCloseTo(0.5, 3);
            expect(profile.parameters.rvFormula(100)).toBeCloseTo(0.95, 3);
        });

        it('handles metric units', () => {
            const profile = createStormwaterProfile({
                id: 'berlin-stormwater',
                jurisdictionCode: 'DE-BE',
                name: 'Berlin Schwammstadt',
                description: 'Berlin sponge city',
                parameters: {
                    designDepth_mm: 30.0,
                    designIntensity_mm_hr: 45.0,
                    rvFormula: () => 0.9,
                    units: 'metric'
                }
            });

            expect(profile.parameters.units).toBe('metric');
            expect(profile.parameters.designDepth_mm).toBe(30.0);
        });
    });
});
