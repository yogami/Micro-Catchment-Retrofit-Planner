import { DiscoveryService } from '../../../src/lib/geo-regulatory/domain/services/DiscoveryService';
import { InMemoryProfileAdapter } from '../../../src/lib/geo-regulatory/adapters/InMemoryProfileAdapter';
import { MockGeocodingAdapter } from './mocks/MockGeocodingAdapter';
import type { RegulatoryProfile, StormwaterParameters } from '../../../src/lib/geo-regulatory/domain/valueObjects/RegulatoryProfile';

const profileAdapter = new InMemoryProfileAdapter();
const geocodingAdapter = new MockGeocodingAdapter();
const discoveryService = new DiscoveryService(geocodingAdapter, profileAdapter);

const createProfile = (code: string, name: string, depth = 25.4, domain = 'stormwater'): RegulatoryProfile<Record<string, unknown>> => ({
    id: code.toLowerCase(), jurisdictionCode: code, domain, name, description: 'Mock',
    parameters: { designDepth_mm: depth, designIntensity_mm_hr: 50.0, rvFormula: () => 0.9, units: 'imperial' } as Record<string, unknown>
});

describe('Discovery Cascade', () => {
    beforeEach(() => { profileAdapter.clear(); });

    it('returns county profile when county overrides state', async () => {
        await profileAdapter.register(createProfile('US-VA', 'VA Handbook'));
        await profileAdapter.register(createProfile('US-VA-059', 'Fairfax Manual', 38.1));
        geocodingAdapter.setMockChain({
            country: 'US', countryCode: 'US',
            hierarchy: [{ level: 'county', name: 'Fairfax', code: 'US-VA-059' }, { level: 'state', name: 'VA', code: 'US-VA' }]
        });
        const result = await discoveryService.discover<StormwaterParameters>(38.85, -77.30, 'stormwater');
        expect(result.profile.name).toBe('Fairfax Manual');
    });

    it('falls back correctly', async () => {
        await profileAdapter.register(createProfile('US-VA', 'VA Handbook'));
        geocodingAdapter.setMockChain({ country: 'US', countryCode: 'US', hierarchy: [{ level: 'city', name: 'Richmond', code: 'US-VA-760' }, { level: 'state', name: 'VA', code: 'US-VA' }] });
        const result = await discoveryService.discover<StormwaterParameters>(37.54, -77.43, 'stormwater');
        expect(result.status).toBe('fallback');
    });
});

describe('Discovery Defaults & Isolation', () => {
    beforeEach(() => { profileAdapter.clear(); });

    it('returns global default when nothing matches', async () => {
        await profileAdapter.setDefault('stormwater', createProfile('GLOBAL', 'Global', 25.4));
        geocodingAdapter.setMockChain({ country: 'AQ', countryCode: 'AQ', hierarchy: [{ level: 'country', name: 'AQ', code: 'AQ' }] });
        const result = await discoveryService.discover<StormwaterParameters>(-82, 135, 'stormwater');
        expect(result.status).toBe('default');
    });

    it('isolates domains', async () => {
        await profileAdapter.register(createProfile('US-VA', 'VA SW'));
        const buildingProfile = createProfile('GLOBAL', 'IBC', 0, 'building-code');
        await profileAdapter.setDefault('building-code', buildingProfile);
        geocodingAdapter.setMockChain({ country: 'US', countryCode: 'US', hierarchy: [{ level: 'state', name: 'VA', code: 'US-VA' }] });
        const result = await discoveryService.discover(38.85, -77.30, 'building-code');
        expect(result.profile.domain).toBe('building-code');
    });
});
