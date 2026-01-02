/**
 * Country Hierarchies Configuration
 * 
 * Maps OpenStreetMap admin levels to semantic jurisdiction types per country.
 * This enables the system to understand different administrative structures
 * across different countries.
 * 
 * OSM Admin Levels Reference:
 * - Level 2: Country
 * - Level 4: State/Province/Land
 * - Level 6: County/District/Kreis
 * - Level 8: City/Municipality/Gemeinde
 * - Level 9: Town/Village
 * - Level 10: Neighborhood/Parish
 * 
 * @domain geo-regulatory
 * @layer config
 */

import type { JurisdictionLevel } from '../domain/entities/Jurisdiction';

export interface LevelMapping {
    osmLevel: number;
    type: JurisdictionLevel;
    addressField: string; // Nominatim response field name
}

export interface CountryHierarchy {
    /** ISO 3166-1 alpha-2 code prefix */
    codePrefix: string;

    /** Country name */
    countryName: string;

    /** Level mappings from most specific to broadest */
    levels: LevelMapping[];
}

/**
 * Country-specific administrative hierarchy configurations
 */
export const COUNTRY_HIERARCHIES: Record<string, CountryHierarchy> = {
    US: {
        codePrefix: 'US',
        countryName: 'United States',
        levels: [
            { osmLevel: 9, type: 'town', addressField: 'town' },
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' },
            { osmLevel: 4, type: 'state', addressField: 'state' },
        ]
    },
    DE: {
        codePrefix: 'DE',
        countryName: 'Germany',
        levels: [
            { osmLevel: 9, type: 'town', addressField: 'town' },
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' }, // Kreis
            { osmLevel: 4, type: 'state', addressField: 'state' },  // Land
        ]
    },
    GB: {
        codePrefix: 'GB',
        countryName: 'United Kingdom',
        levels: [
            { osmLevel: 10, type: 'neighborhood', addressField: 'suburb' },
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' },
            { osmLevel: 4, type: 'region', addressField: 'state' }, // England, Scotland, etc.
        ]
    },
    FR: {
        codePrefix: 'FR',
        countryName: 'France',
        levels: [
            { osmLevel: 8, type: 'city', addressField: 'city' }, // Commune
            { osmLevel: 6, type: 'county', addressField: 'county' }, // Département
            { osmLevel: 4, type: 'region', addressField: 'state' }, // Région
        ]
    },
    AU: {
        codePrefix: 'AU',
        countryName: 'Australia',
        levels: [
            { osmLevel: 9, type: 'town', addressField: 'town' },
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' }, // LGA
            { osmLevel: 4, type: 'state', addressField: 'state' }, // State/Territory
        ]
    },
    CA: {
        codePrefix: 'CA',
        countryName: 'Canada',
        levels: [
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' }, // Regional District
            { osmLevel: 4, type: 'state', addressField: 'state' }, // Province
        ]
    },
    JP: {
        codePrefix: 'JP',
        countryName: 'Japan',
        levels: [
            { osmLevel: 8, type: 'city', addressField: 'city' }, // Shi/Ku
            { osmLevel: 4, type: 'state', addressField: 'state' }, // Prefecture
        ]
    }
};

/**
 * Get hierarchy configuration for a country
 * Returns a generic fallback if country not configured
 */
export function getCountryHierarchy(countryCode: string): CountryHierarchy {
    const upperCode = countryCode.toUpperCase();

    if (COUNTRY_HIERARCHIES[upperCode]) {
        return COUNTRY_HIERARCHIES[upperCode];
    }

    // Generic fallback for unconfigured countries
    return {
        codePrefix: upperCode,
        countryName: 'Unknown',
        levels: [
            { osmLevel: 8, type: 'city', addressField: 'city' },
            { osmLevel: 6, type: 'county', addressField: 'county' },
            { osmLevel: 4, type: 'state', addressField: 'state' },
        ]
    };
}

/**
 * US FIPS codes for counties (partial list for demonstration)
 * In production, this would be a complete database or API lookup
 */
export const US_COUNTY_FIPS: Record<string, string> = {
    'Fairfax County': '059',
    'Arlington County': '013',
    'Loudoun County': '107',
    'Prince William County': '153',
    'Richmond City': '760',
    'Alexandria City': '510',
    // Add more as needed
};

/**
 * US State abbreviations
 */
export const US_STATE_CODES: Record<string, string> = {
    'Virginia': 'VA',
    'Maryland': 'MD',
    'District of Columbia': 'DC',
    'New York': 'NY',
    'California': 'CA',
    'Texas': 'TX',
    // Add more as needed
};

/**
 * German Bundesland codes
 */
export const DE_LAND_CODES: Record<string, string> = {
    'Berlin': 'BE',
    'Brandenburg': 'BB',
    'Bayern': 'BY',
    'Baden-Württemberg': 'BW',
    'Nordrhein-Westfalen': 'NW',
    // Add more as needed
};
