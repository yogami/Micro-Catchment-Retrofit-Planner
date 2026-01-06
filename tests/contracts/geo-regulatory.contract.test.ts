/**
 * Contract Tests: geo-regulatory
 * 
 * Validates the public API surface of the geo-regulatory microservice.
 * These tests ensure the discovery, profiles, and jurisdiction chain APIs remain stable.
 */
import {
    createDiscoveryUseCase,
    createStormwaterDiscoveryUseCase,
    createCustomDiscoveryUseCase,
    createJurisdiction,
    createJurisdictionChain,
    getCascadeCodes,
    findInChain,
    createStormwaterProfile,
    DiscoveryService,
    DiscoverRegulatoryProfileUseCase,
    NominatimGeocodingAdapter,
    InMemoryProfileAdapter,
    COUNTRY_HIERARCHIES,
    getCountryHierarchy,
    STORMWATER_PROFILES,
    type Jurisdiction,
    type JurisdictionLevel,
    type JurisdictionChain,
    type RegulatoryProfile,
    type StormwaterParameters,
    type DiscoveryResult,
    type DiscoverRequest,
    type DiscoverResponse,
    type GeocodingPort,
    type ProfileRepositoryPort
} from '../../src/lib/geo-regulatory';

describe('geo-regulatory Contract Tests', () => {
    describe('Factory Functions', () => {
        it('createDiscoveryUseCase returns a valid use case', () => {
            const useCase = createDiscoveryUseCase();

            expect(useCase).toBeInstanceOf(DiscoverRegulatoryProfileUseCase);
            expect(typeof useCase.execute).toBe('function');
        });

        it('createStormwaterDiscoveryUseCase returns pre-configured use case', () => {
            const useCase = createStormwaterDiscoveryUseCase();

            expect(useCase).toBeInstanceOf(DiscoverRegulatoryProfileUseCase);
        });

        it('createCustomDiscoveryUseCase accepts custom adapters', () => {
            const mockGeocoding: GeocodingPort = {
                reverseGeocode: jest.fn().mockResolvedValue({
                    country: 'US',
                    countryCode: 'US',
                    hierarchy: []
                })
            };
            const mockProfiles: ProfileRepositoryPort = {
                findByJurisdictionAndDomain: jest.fn().mockResolvedValue(null),
                listByJurisdiction: jest.fn().mockResolvedValue([]),
                listByDomain: jest.fn().mockResolvedValue([]),
                getDefault: jest.fn().mockResolvedValue(null),
                register: jest.fn(),
                setDefault: jest.fn()
            };

            const useCase = createCustomDiscoveryUseCase(mockGeocoding, mockProfiles);
            expect(useCase).toBeInstanceOf(DiscoverRegulatoryProfileUseCase);
        });
    });

    describe('Jurisdiction Entity', () => {
        it('createJurisdiction creates valid jurisdiction', () => {
            // Factory signature: createJurisdiction(level, name, code, options?)
            const jurisdiction = createJurisdiction('country', 'United States', 'US');

            expect(jurisdiction).toBeDefined();
            expect(jurisdiction.code).toBe('US');
            expect(jurisdiction.level).toBe('country');
            expect(jurisdiction.name).toBe('United States');
        });
    });

    describe('JurisdictionChain Value Object', () => {
        it('createJurisdictionChain creates valid chain', () => {
            // Factory signature: createJurisdictionChain(country, countryCode, hierarchy)
            const chain = createJurisdictionChain('United States', 'US', [
                createJurisdiction('country', 'United States', 'US'),
                createJurisdiction('state', 'Virginia', 'US-VA')
            ]);

            expect(chain).toBeDefined();
            expect(chain.country).toBe('United States');
            expect(chain.countryCode).toBe('US');
            expect(chain.hierarchy).toHaveLength(2);
        });

        it('getCascadeCodes returns codes in cascade order', () => {
            const chain = createJurisdictionChain('United States', 'US', [
                createJurisdiction('county', 'Fairfax', 'US-VA-059'),
                createJurisdiction('state', 'Virginia', 'US-VA'),
                createJurisdiction('country', 'United States', 'US')
            ]);

            const codes = getCascadeCodes(chain);

            // Most specific first (based on hierarchy order)
            expect(codes[0]).toBe('US-VA-059');
            expect(codes[1]).toBe('US-VA');
            expect(codes[2]).toBe('US');
        });

        it('findInChain locates jurisdiction by code', () => {
            const chain = createJurisdictionChain('United States', 'US', [
                createJurisdiction('country', 'United States', 'US'),
                createJurisdiction('state', 'Virginia', 'US-VA')
            ]);

            const state = findInChain(chain, 'US-VA');
            expect(state?.code).toBe('US-VA');
        });
    });

    describe('RegulatoryProfile Value Object', () => {
        it('createStormwaterProfile creates valid profile', () => {
            const profile = createStormwaterProfile({
                id: 'test-profile',
                jurisdictionCode: 'US-TEST',
                name: 'Test Profile',
                description: 'Test description',
                parameters: {
                    designDepth_mm: 25.4,
                    designIntensity_mm_hr: 50.0,
                    rvFormula: (i: number) => 0.05 + (0.009 * i),
                    units: 'imperial'
                }
            });

            expect(profile).toBeDefined();
            expect(profile.id).toBe('test-profile');
            expect(profile.domain).toBe('stormwater');
            expect(profile.parameters.designDepth_mm).toBe(25.4);
        });
    });

    describe('STORMWATER_PROFILES', () => {
        it('exports pre-configured profiles', () => {
            expect(Array.isArray(STORMWATER_PROFILES)).toBe(true);
            expect(STORMWATER_PROFILES.length).toBeGreaterThan(0);
        });

        it('includes Fairfax County profile', () => {
            const fairfax = STORMWATER_PROFILES.find(
                p => p.jurisdictionCode === 'US-VA-059'
            );

            expect(fairfax).toBeDefined();
            expect(fairfax?.name).toContain('Fairfax');
        });

        it('includes Berlin profile', () => {
            const berlin = STORMWATER_PROFILES.find(
                p => p.jurisdictionCode === 'DE-BE'
            );

            expect(berlin).toBeDefined();
            expect(berlin?.name).toContain('Berlin');
        });

        it('includes global default profile', () => {
            const global = STORMWATER_PROFILES.find(
                p => p.jurisdictionCode === 'GLOBAL'
            );

            expect(global).toBeDefined();
        });

        it('all profiles have required StormwaterParameters', () => {
            for (const profile of STORMWATER_PROFILES) {
                expect(profile.parameters).toBeDefined();
                expect(typeof profile.parameters.designDepth_mm).toBe('number');
                expect(typeof profile.parameters.designIntensity_mm_hr).toBe('number');
                expect(typeof profile.parameters.rvFormula).toBe('function');
            }
        });
    });

    describe('Country Hierarchies Configuration', () => {
        it('exports COUNTRY_HIERARCHIES', () => {
            expect(COUNTRY_HIERARCHIES).toBeDefined();
            expect(typeof COUNTRY_HIERARCHIES).toBe('object');
        });

        it('getCountryHierarchy returns hierarchy for known countries', () => {
            const usHierarchy = getCountryHierarchy('US');
            expect(usHierarchy).toBeDefined();
            expect(usHierarchy.codePrefix).toBe('US');
            expect(Array.isArray(usHierarchy.levels)).toBe(true);
        });
    });

    describe('Adapters', () => {
        it('exports NominatimGeocodingAdapter', () => {
            const adapter = new NominatimGeocodingAdapter();
            expect(adapter).toBeDefined();
            expect(typeof adapter.reverseGeocode).toBe('function');
        });

        it('exports InMemoryProfileAdapter', () => {
            const adapter = new InMemoryProfileAdapter();
            expect(adapter).toBeDefined();
            expect(typeof adapter.listByJurisdiction).toBe('function');
            expect(typeof adapter.register).toBe('function');
            expect(typeof adapter.getDefault).toBe('function');
            expect(typeof adapter.setDefault).toBe('function');
        });
    });

    describe('DiscoveryService', () => {
        it('exports DiscoveryService class', () => {
            const mockGeocoding: GeocodingPort = {
                reverseGeocode: jest.fn()
            };
            const mockProfiles: ProfileRepositoryPort = {
                findByJurisdictionAndDomain: jest.fn(),
                listByJurisdiction: jest.fn(),
                listByDomain: jest.fn(),
                getDefault: jest.fn(),
                register: jest.fn(),
                setDefault: jest.fn()
            };

            const service = new DiscoveryService(mockGeocoding, mockProfiles);
            expect(service).toBeInstanceOf(DiscoveryService);
            expect(typeof service.discover).toBe('function');
        });
    });
});
