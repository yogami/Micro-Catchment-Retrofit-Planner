import { describe, it, expect } from '@jest/globals';
import {
    COUNTRY_HIERARCHIES,
    getCountryHierarchy,
    US_COUNTY_FIPS,
    US_STATE_CODES,
    DE_LAND_CODES
} from '../../../src/lib/geo-regulatory/config/countryHierarchies';

describe('Country Hierarchies Configuration', () => {
    describe('COUNTRY_HIERARCHIES', () => {
        it('contains US configuration', () => {
            expect(COUNTRY_HIERARCHIES.US).toBeDefined();
            expect(COUNTRY_HIERARCHIES.US.codePrefix).toBe('US');
            expect(COUNTRY_HIERARCHIES.US.countryName).toBe('United States');
        });

        it('contains DE configuration', () => {
            expect(COUNTRY_HIERARCHIES.DE).toBeDefined();
            expect(COUNTRY_HIERARCHIES.DE.codePrefix).toBe('DE');
            expect(COUNTRY_HIERARCHIES.DE.countryName).toBe('Germany');
        });

        it('contains GB, FR, AU, CA, JP configurations', () => {
            expect(COUNTRY_HIERARCHIES.GB).toBeDefined();
            expect(COUNTRY_HIERARCHIES.FR).toBeDefined();
            expect(COUNTRY_HIERARCHIES.AU).toBeDefined();
            expect(COUNTRY_HIERARCHIES.CA).toBeDefined();
            expect(COUNTRY_HIERARCHIES.JP).toBeDefined();
        });

        it('US has correct level mappings', () => {
            const us = COUNTRY_HIERARCHIES.US;
            expect(us.levels).toHaveLength(4);
            expect(us.levels.map(l => l.type)).toEqual(['town', 'city', 'county', 'state']);
        });

        it('DE has correct level mappings', () => {
            const de = COUNTRY_HIERARCHIES.DE;
            expect(de.levels).toHaveLength(4);
            expect(de.levels.map(l => l.type)).toEqual(['town', 'city', 'county', 'state']);
        });
    });

    describe('getCountryHierarchy', () => {
        it('returns configured country hierarchy', () => {
            const us = getCountryHierarchy('US');
            expect(us.codePrefix).toBe('US');
            expect(us.countryName).toBe('United States');
        });

        it('handles lowercase input', () => {
            const de = getCountryHierarchy('de');
            expect(de.codePrefix).toBe('DE');
        });

        it('handles mixed case input', () => {
            const gb = getCountryHierarchy('Gb');
            expect(gb.codePrefix).toBe('GB');
        });

        it('returns generic fallback for unknown country', () => {
            const unknown = getCountryHierarchy('XX');
            expect(unknown.codePrefix).toBe('XX');
            expect(unknown.countryName).toBe('Unknown');
            expect(unknown.levels).toHaveLength(3);
            expect(unknown.levels.map(l => l.type)).toEqual(['city', 'county', 'state']);
        });

        it('fallback has correct address fields', () => {
            const unknown = getCountryHierarchy('ZZ');
            expect(unknown.levels[0].addressField).toBe('city');
            expect(unknown.levels[1].addressField).toBe('county');
            expect(unknown.levels[2].addressField).toBe('state');
        });
    });

    describe('US_COUNTY_FIPS', () => {
        it('contains Fairfax County', () => {
            expect(US_COUNTY_FIPS['Fairfax County']).toBe('059');
        });

        it('contains Arlington County', () => {
            expect(US_COUNTY_FIPS['Arlington County']).toBe('013');
        });

        it('contains Loudoun County', () => {
            expect(US_COUNTY_FIPS['Loudoun County']).toBe('107');
        });
    });

    describe('US_STATE_CODES', () => {
        it('contains Virginia', () => {
            expect(US_STATE_CODES['Virginia']).toBe('VA');
        });

        it('contains New York', () => {
            expect(US_STATE_CODES['New York']).toBe('NY');
        });

        it('contains California', () => {
            expect(US_STATE_CODES['California']).toBe('CA');
        });
    });

    describe('DE_LAND_CODES', () => {
        it('contains Berlin', () => {
            expect(DE_LAND_CODES['Berlin']).toBe('BE');
        });

        it('contains Brandenburg', () => {
            expect(DE_LAND_CODES['Brandenburg']).toBe('BB');
        });

        it('contains Bayern', () => {
            expect(DE_LAND_CODES['Bayern']).toBe('BY');
        });
    });
});
