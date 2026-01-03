import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { DiscoverRegulatoryProfileUseCase, type DiscoverRequest } from '../../../src/lib/geo-regulatory/application/DiscoverRegulatoryProfileUseCase';
import { DiscoveryService, type DiscoveryResult } from '../../../src/lib/geo-regulatory/domain/services/DiscoveryService';
import { createJurisdictionChain } from '../../../src/lib/geo-regulatory/domain/valueObjects/JurisdictionChain';
import { createJurisdiction } from '../../../src/lib/geo-regulatory/domain/entities/Jurisdiction';
import type { StormwaterParameters } from '../../../src/lib/geo-regulatory/domain/valueObjects/RegulatoryProfile';

describe('DiscoverRegulatoryProfileUseCase', () => {
    let mockDiscoveryService: jest.Mocked<DiscoveryService>;
    let useCase: DiscoverRegulatoryProfileUseCase;

    const mockResult: DiscoveryResult<StormwaterParameters> = {
        status: 'discovered',
        profile: {
            id: 'fairfax-stormwater',
            jurisdictionCode: 'US-VA-059',
            domain: 'stormwater',
            name: 'Fairfax Manual',
            description: 'Fairfax County stormwater standards',
            parameters: {
                designDepth_mm: 38.1,
                designIntensity_mm_hr: 50.8,
                rvFormula: (i: number) => 0.05 + (0.009 * i),
                units: 'imperial'
            }
        },
        appliedJurisdiction: createJurisdiction('county', 'Fairfax County', 'US-VA-059'),
        chain: createJurisdictionChain('United States', 'US', [
            createJurisdiction('county', 'Fairfax County', 'US-VA-059'),
            createJurisdiction('state', 'Virginia', 'US-VA')
        ])
    };

    beforeEach(() => {
        mockDiscoveryService = {
            discover: jest.fn()
        } as unknown as jest.Mocked<DiscoveryService>;
        useCase = new DiscoverRegulatoryProfileUseCase(mockDiscoveryService);
    });

    describe('execute', () => {
        it('returns discovery result with timing metadata', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            const request: DiscoverRequest = {
                latitude: 38.85,
                longitude: -77.30,
                domain: 'stormwater'
            };

            const response = await useCase.execute<StormwaterParameters>(request);

            expect(response.status).toBe('discovered');
            expect(response.profile.jurisdictionCode).toBe('US-VA-059');
            expect(response.durationMs).toBeGreaterThanOrEqual(0);
            expect(response.cached).toBe(false);
        });

        it('caches result on subsequent calls', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            const request: DiscoverRequest = {
                latitude: 38.850,
                longitude: -77.300,
                domain: 'stormwater'
            };

            // First call
            const first = await useCase.execute(request);
            expect(first.cached).toBe(false);

            // Second call (should be cached)
            const second = await useCase.execute(request);
            expect(second.cached).toBe(true);

            // Discovery service should only be called once
            expect(mockDiscoveryService.discover).toHaveBeenCalledTimes(1);
        });

        it('uses cache key with rounded coordinates', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            const request1: DiscoverRequest = {
                latitude: 38.8501,
                longitude: -77.3001,
                domain: 'stormwater'
            };
            const request2: DiscoverRequest = {
                latitude: 38.8502,
                longitude: -77.3002,
                domain: 'stormwater'
            };

            await useCase.execute(request1);
            await useCase.execute(request2);

            expect(mockDiscoveryService.discover).toHaveBeenCalledTimes(1);
        });

        it('separates cache by domain', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            const stormwaterRequest: DiscoverRequest = {
                latitude: 38.85,
                longitude: -77.30,
                domain: 'stormwater'
            };
            const buildingRequest: DiscoverRequest = {
                latitude: 38.85,
                longitude: -77.30,
                domain: 'building-code'
            };

            await useCase.execute(stormwaterRequest);
            await useCase.execute(buildingRequest);

            expect(mockDiscoveryService.discover).toHaveBeenCalledTimes(2);
        });

        it('calls discovery service with correct parameters', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            await useCase.execute({
                latitude: 52.52,
                longitude: 13.405,
                domain: 'stormwater'
            });

            expect(mockDiscoveryService.discover).toHaveBeenCalledWith(52.52, 13.405, 'stormwater');
        });
    });

    describe('clearCache', () => {
        it('clears cached results', async () => {
            mockDiscoveryService.discover.mockResolvedValue(mockResult);

            const request: DiscoverRequest = {
                latitude: 38.85,
                longitude: -77.30,
                domain: 'stormwater'
            };

            await useCase.execute(request);
            useCase.clearCache();
            const second = await useCase.execute(request);
            expect(second.cached).toBe(false);
            expect(mockDiscoveryService.discover).toHaveBeenCalledTimes(2);
        });
    });
});
