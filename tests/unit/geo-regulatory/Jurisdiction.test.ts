import { describe, it, expect } from '@jest/globals';
import {
    createJurisdiction,
    type Jurisdiction,
    type JurisdictionLevel
} from '../../../src/lib/geo-regulatory/domain/entities/Jurisdiction';

describe('Jurisdiction Entity', () => {
    describe('createJurisdiction', () => {
        it('creates a basic jurisdiction with required fields', () => {
            const jurisdiction = createJurisdiction('county', 'Fairfax County', 'US-VA-059');

            expect(jurisdiction.level).toBe('county');
            expect(jurisdiction.name).toBe('Fairfax County');
            expect(jurisdiction.code).toBe('US-VA-059');
            expect(jurisdiction.osmAdminLevel).toBeUndefined();
            expect(jurisdiction.parentCode).toBeUndefined();
        });

        it('creates a jurisdiction with osmAdminLevel option', () => {
            const jurisdiction = createJurisdiction('city', 'Berlin', 'DE-BE-BERLIN', {
                osmAdminLevel: 8
            });

            expect(jurisdiction.osmAdminLevel).toBe(8);
            expect(jurisdiction.parentCode).toBeUndefined();
        });

        it('creates a jurisdiction with parentCode option', () => {
            const jurisdiction = createJurisdiction('county', 'Arlington County', 'US-VA-013', {
                parentCode: 'US-VA'
            });

            expect(jurisdiction.parentCode).toBe('US-VA');
        });

        it('creates a jurisdiction with all options', () => {
            const jurisdiction = createJurisdiction('town', 'Vienna', 'US-VA-059-VIENNA', {
                osmAdminLevel: 9,
                parentCode: 'US-VA-059'
            });

            expect(jurisdiction.level).toBe('town');
            expect(jurisdiction.name).toBe('Vienna');
            expect(jurisdiction.code).toBe('US-VA-059-VIENNA');
            expect(jurisdiction.osmAdminLevel).toBe(9);
            expect(jurisdiction.parentCode).toBe('US-VA-059');
        });

        it('handles all jurisdiction levels', () => {
            const levels: JurisdictionLevel[] = [
                'neighborhood', 'town', 'city', 'county',
                'state', 'region', 'country', 'supranational'
            ];

            levels.forEach(level => {
                const jurisdiction = createJurisdiction(level, `Test ${level}`, `TEST-${level.toUpperCase()}`);
                expect(jurisdiction.level).toBe(level);
            });
        });

        it('returns an immutable-like object (readonly interface)', () => {
            const jurisdiction = createJurisdiction('state', 'Virginia', 'US-VA');

            // TypeScript prevents mutation at compile time
            // Runtime verification that structure is correct
            expect(Object.keys(jurisdiction)).toEqual(['level', 'name', 'code', 'osmAdminLevel', 'parentCode']);
        });
    });
});
