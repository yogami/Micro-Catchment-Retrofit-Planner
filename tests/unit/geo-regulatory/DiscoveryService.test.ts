import { describe, it, expect, beforeEach } from 'vitest';
import { DiscoveryService } from '../../../src/lib/geo-regulatory/domain/services/DiscoveryService';
import { InMemoryProfileAdapter } from '../../../src/lib/geo-regulatory/adapters/InMemoryProfileAdapter';
import { MockGeocodingAdapter } from './mocks/MockGeocodingAdapter';
import type { RegulatoryProfile, StormwaterParameters } from '../../../src/lib/geo-regulatory/domain/valueObjects/RegulatoryProfile';
import type { JurisdictionChain } from '../../../src/lib/geo-regulatory/domain/valueObjects/JurisdictionChain';

describe('DiscoveryService', () => {
    let discoveryService: DiscoveryService;
    let profileAdapter: InMemoryProfileAdapter;
    let geocodingAdapter: MockGeocodingAdapter;

    beforeEach(() => {
        profileAdapter = new InMemoryProfileAdapter();
        geocodingAdapter = new MockGeocodingAdapter();
        discoveryService = new DiscoveryService(geocodingAdapter, profileAdapter);
    });

    describe('Hierarchical Cascade Lookup', () => {
        it('should return county profile when county overrides state', async () => {
            // GIVEN: VA state profile and Fairfax County profile exist
            const vaProfile: RegulatoryProfile<StormwaterParameters> = {
                id: 'va-stormwater',
                jurisdictionCode: 'US-VA',
                domain: 'stormwater',
                name: 'Virginia Stormwater Handbook',
                description: 'State-level standards',
                parameters: {
                    designDepth_mm: 25.4,
                    designIntensity_mm_hr: 50.0,
                    rvFormula: () => 0.9,
                    units: 'imperial'
                }
            };
            const fairfaxProfile: RegulatoryProfile<StormwaterParameters> = {
                id: 'fairfax-stormwater',
                jurisdictionCode: 'US-VA-059',
                domain: 'stormwater',
                name: 'Fairfax County LID Manual',
                description: 'County-level override',
                parameters: {
                    designDepth_mm: 38.1, // 1.5 inches - stricter than state
                    designIntensity_mm_hr: 50.0,
                    rvFormula: () => 0.9,
                    units: 'imperial'
                }
            };
            await profileAdapter.register(vaProfile);
            await profileAdapter.register(fairfaxProfile);

            // Mock geocoding to return Fairfax County chain
            geocodingAdapter.setMockChain({
                country: 'United States',
                countryCode: 'US',
                hierarchy: [
                    { level: 'county', name: 'Fairfax County', code: 'US-VA-059' },
                    { level: 'state', name: 'Virginia', code: 'US-VA' },
                    { level: 'country', name: 'United States', code: 'US' }
                ]
            });

            // WHEN: discover for Fairfax location
            const result = await discoveryService.discover<StormwaterParameters>(38.85, -77.30, 'stormwater');

            // THEN: returns Fairfax County profile, status = 'discovered'
            expect(result.status).toBe('discovered');
            expect(result.profile.name).toBe('Fairfax County LID Manual');
            expect(result.profile.parameters.designDepth_mm).toBe(38.1);
            expect(result.appliedJurisdiction.code).toBe('US-VA-059');
        });

        it('should fallback to state when county has no profile', async () => {
            // GIVEN: Only VA state profile exists (no Richmond city profile)
            const vaProfile: RegulatoryProfile<StormwaterParameters> = {
                id: 'va-stormwater',
                jurisdictionCode: 'US-VA',
                domain: 'stormwater',
                name: 'Virginia Stormwater Handbook',
                description: 'State-level standards',
                parameters: {
                    designDepth_mm: 25.4,
                    designIntensity_mm_hr: 50.0,
                    rvFormula: () => 0.9,
                    units: 'imperial'
                }
            };
            await profileAdapter.register(vaProfile);

            // Mock geocoding to return Richmond chain (no county profile)
            geocodingAdapter.setMockChain({
                country: 'United States',
                countryCode: 'US',
                hierarchy: [
                    { level: 'city', name: 'Richmond', code: 'US-VA-760' },
                    { level: 'state', name: 'Virginia', code: 'US-VA' },
                    { level: 'country', name: 'United States', code: 'US' }
                ]
            });

            // WHEN: discover for Richmond location
            const result = await discoveryService.discover<StormwaterParameters>(37.54, -77.43, 'stormwater');

            // THEN: returns VA profile with fallback status
            expect(result.status).toBe('fallback');
            expect(result.profile.name).toBe('Virginia Stormwater Handbook');
            expect(result.appliedJurisdiction.code).toBe('US-VA');
            expect(result.fallbackPath).toContain('US-VA-760'); // Tried city first
        });

        it('should return global default when no profiles match', async () => {
            // GIVEN: No profiles for Antarctica
            const defaultProfile: RegulatoryProfile<StormwaterParameters> = {
                id: 'global-default',
                jurisdictionCode: 'GLOBAL',
                domain: 'stormwater',
                name: 'WHO/EPA Global Baseline',
                description: 'Global fallback',
                parameters: {
                    designDepth_mm: 25.4,
                    designIntensity_mm_hr: 50.0,
                    rvFormula: () => 0.9,
                    units: 'metric'
                }
            };
            await profileAdapter.setDefault('stormwater', defaultProfile);

            // Mock geocoding to return Antarctica chain
            geocodingAdapter.setMockChain({
                country: 'Antarctica',
                countryCode: 'AQ',
                hierarchy: [
                    { level: 'country', name: 'Antarctica', code: 'AQ' }
                ]
            });

            // WHEN: discover for Antarctica
            const result = await discoveryService.discover<StormwaterParameters>(-82.86, 135.0, 'stormwater');

            // THEN: returns default profile
            expect(result.status).toBe('default');
            expect(result.profile.name).toBe('WHO/EPA Global Baseline');
        });
    });

    describe('Domain Isolation', () => {
        it('should not return stormwater profile for building-code domain', async () => {
            // GIVEN: VA stormwater profile exists
            const vaStormwater: RegulatoryProfile<StormwaterParameters> = {
                id: 'va-stormwater',
                jurisdictionCode: 'US-VA',
                domain: 'stormwater',
                name: 'Virginia Stormwater Handbook',
                description: 'Stormwater only',
                parameters: {
                    designDepth_mm: 25.4,
                    designIntensity_mm_hr: 50.0,
                    rvFormula: () => 0.9,
                    units: 'imperial'
                }
            };
            await profileAdapter.register(vaStormwater);

            const buildingDefault: RegulatoryProfile = {
                id: 'building-default',
                jurisdictionCode: 'GLOBAL',
                domain: 'building-code',
                name: 'IBC Baseline',
                description: 'International Building Code',
                parameters: {}
            };
            await profileAdapter.setDefault('building-code', buildingDefault);

            geocodingAdapter.setMockChain({
                country: 'United States',
                countryCode: 'US',
                hierarchy: [
                    { level: 'state', name: 'Virginia', code: 'US-VA' },
                    { level: 'country', name: 'United States', code: 'US' }
                ]
            });

            // WHEN: discover for building-code domain
            const result = await discoveryService.discover(38.85, -77.30, 'building-code');

            // THEN: returns building-code default, NOT stormwater profile
            expect(result.profile.domain).toBe('building-code');
            expect(result.profile.name).toBe('IBC Baseline');
        });
    });

    describe('Jurisdiction Chain Ordering', () => {
        it('should check jurisdictions from most specific to broadest', async () => {
            // GIVEN: Only country-level profile exists
            const usProfile: RegulatoryProfile = {
                id: 'us-stormwater',
                jurisdictionCode: 'US',
                domain: 'stormwater',
                name: 'US EPA Baseline',
                description: 'Federal baseline',
                parameters: {}
            };
            await profileAdapter.register(usProfile);

            geocodingAdapter.setMockChain({
                country: 'United States',
                countryCode: 'US',
                hierarchy: [
                    { level: 'town', name: 'Fairfax City', code: 'US-VA-059-FAIRFAX' },
                    { level: 'county', name: 'Fairfax County', code: 'US-VA-059' },
                    { level: 'state', name: 'Virginia', code: 'US-VA' },
                    { level: 'country', name: 'United States', code: 'US' }
                ]
            });

            // WHEN: discover
            const result = await discoveryService.discover(38.85, -77.30, 'stormwater');

            // THEN: fallback path shows all levels checked
            expect(result.status).toBe('fallback');
            expect(result.fallbackPath).toEqual([
                'US-VA-059-FAIRFAX',
                'US-VA-059',
                'US-VA',
                'US'
            ]);
        });
    });
});
