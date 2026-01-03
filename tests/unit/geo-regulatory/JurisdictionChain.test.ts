import { describe, it, expect } from '@jest/globals';
import {
    createJurisdictionChain,
    getCascadeCodes,
    findInChain,
    getMostSpecific,
    getBroadest,
    type JurisdictionChain
} from '../../../src/lib/geo-regulatory/domain/valueObjects/JurisdictionChain';
import { createJurisdiction } from '../../../src/lib/geo-regulatory/domain/entities/Jurisdiction';

describe('JurisdictionChain Value Object', () => {
    const createTestChain = (): JurisdictionChain => {
        const hierarchy = [
            createJurisdiction('town', 'Vienna', 'US-VA-059-VIENNA'),
            createJurisdiction('county', 'Fairfax County', 'US-VA-059'),
            createJurisdiction('state', 'Virginia', 'US-VA'),
            createJurisdiction('country', 'United States', 'US')
        ];
        return createJurisdictionChain('United States', 'US', hierarchy);
    };

    describe('createJurisdictionChain', () => {
        it('creates a chain with country info and hierarchy', () => {
            const chain = createTestChain();

            expect(chain.country).toBe('United States');
            expect(chain.countryCode).toBe('US');
            expect(chain.hierarchy).toHaveLength(4);
        });

        it('creates an empty chain', () => {
            const chain = createJurisdictionChain('Unknown', 'XX', []);

            expect(chain.hierarchy).toHaveLength(0);
        });
    });

    describe('getCascadeCodes', () => {
        it('returns codes from most specific to broadest', () => {
            const chain = createTestChain();
            const codes = getCascadeCodes(chain);

            expect(codes).toEqual([
                'US-VA-059-VIENNA',
                'US-VA-059',
                'US-VA',
                'US'
            ]);
        });

        it('returns empty array for empty hierarchy', () => {
            const chain = createJurisdictionChain('Unknown', 'XX', []);
            const codes = getCascadeCodes(chain);

            expect(codes).toEqual([]);
        });
    });

    describe('findInChain', () => {
        it('finds jurisdiction by code', () => {
            const chain = createTestChain();
            const county = findInChain(chain, 'US-VA-059');

            expect(county).toBeDefined();
            expect(county!.name).toBe('Fairfax County');
            expect(county!.level).toBe('county');
        });

        it('returns undefined for non-existent code', () => {
            const chain = createTestChain();
            const result = findInChain(chain, 'US-MD-001');

            expect(result).toBeUndefined();
        });

        it('returns undefined for empty chain', () => {
            const chain = createJurisdictionChain('Unknown', 'XX', []);
            const result = findInChain(chain, 'US-VA');

            expect(result).toBeUndefined();
        });
    });

    describe('getMostSpecific', () => {
        it('returns first jurisdiction in hierarchy', () => {
            const chain = createTestChain();
            const mostSpecific = getMostSpecific(chain);

            expect(mostSpecific).toBeDefined();
            expect(mostSpecific!.name).toBe('Vienna');
            expect(mostSpecific!.level).toBe('town');
        });

        it('returns undefined for empty hierarchy', () => {
            const chain = createJurisdictionChain('Unknown', 'XX', []);
            const result = getMostSpecific(chain);

            expect(result).toBeUndefined();
        });
    });

    describe('getBroadest', () => {
        it('returns last jurisdiction in hierarchy', () => {
            const chain = createTestChain();
            const broadest = getBroadest(chain);

            expect(broadest).toBeDefined();
            expect(broadest!.name).toBe('United States');
            expect(broadest!.level).toBe('country');
        });

        it('returns undefined for empty hierarchy', () => {
            const chain = createJurisdictionChain('Unknown', 'XX', []);
            const result = getBroadest(chain);

            expect(result).toBeUndefined();
        });
    });
});
