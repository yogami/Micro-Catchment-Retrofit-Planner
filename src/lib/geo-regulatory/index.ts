/**
 * Geo-Regulatory Discovery Library
 * 
 * A domain-agnostic, reusable library for discovering applicable regulatory
 * standards based on GPS coordinates with hierarchical jurisdiction override.
 * 
 * @example
 * ```typescript
 * import { createDiscoveryService, type StormwaterParameters } from '@/lib/geo-regulatory';
 * 
 * const discovery = createDiscoveryService();
 * const result = await discovery.discover<StormwaterParameters>(38.85, -77.30, 'stormwater');
 * 
 * console.log(result.profile.name); // "Fairfax County LID Manual"
 * console.log(result.status); // "discovered" | "fallback" | "default"
 * ```
 */

// Domain Layer - Entities
export { createJurisdiction } from './domain/entities/Jurisdiction';
export type { Jurisdiction, JurisdictionLevel } from './domain/entities/Jurisdiction';

// Domain Layer - Value Objects
export { createJurisdictionChain, getCascadeCodes, findInChain } from './domain/valueObjects/JurisdictionChain';
export type { JurisdictionChain } from './domain/valueObjects/JurisdictionChain';

export { createStormwaterProfile } from './domain/valueObjects/RegulatoryProfile';
export type {
    RegulatoryProfile,
    StormwaterParameters,
    BuildingCodeParameters,
    TaxParameters
} from './domain/valueObjects/RegulatoryProfile';

// Domain Layer - Services
export { DiscoveryService } from './domain/services/DiscoveryService';
export type { DiscoveryResult } from './domain/services/DiscoveryService';

// Application Layer
export { DiscoverRegulatoryProfileUseCase } from './application/DiscoverRegulatoryProfileUseCase';
export type { DiscoverRequest, DiscoverResponse } from './application/DiscoverRegulatoryProfileUseCase';

// Ports
export type { GeocodingPort } from './ports/GeocodingPort';
export type { ProfileRepositoryPort } from './ports/ProfileRepositoryPort';

// Adapters
export { NominatimGeocodingAdapter } from './adapters/NominatimGeocodingAdapter';
export { InMemoryProfileAdapter } from './adapters/InMemoryProfileAdapter';

// Config
export { COUNTRY_HIERARCHIES, getCountryHierarchy } from './config/countryHierarchies';

// ============================================================================
// Factory Functions for Easy Setup
// ============================================================================

import { DiscoveryService } from './domain/services/DiscoveryService';
import { DiscoverRegulatoryProfileUseCase } from './application/DiscoverRegulatoryProfileUseCase';
import { NominatimGeocodingAdapter } from './adapters/NominatimGeocodingAdapter';
import { InMemoryProfileAdapter } from './adapters/InMemoryProfileAdapter';
import type { RegulatoryProfile, StormwaterParameters } from './domain/valueObjects/RegulatoryProfile';

/**
 * Create a fully configured discovery use case with default adapters
 */
export function createDiscoveryUseCase(
    initialProfiles?: RegulatoryProfile[]
): DiscoverRegulatoryProfileUseCase {
    const geocodingAdapter = new NominatimGeocodingAdapter();
    const profileAdapter = new InMemoryProfileAdapter(initialProfiles);
    const discoveryService = new DiscoveryService(geocodingAdapter, profileAdapter);
    return new DiscoverRegulatoryProfileUseCase(discoveryService);
}

/**
 * Create a discovery use case with custom adapters
 */
export function createCustomDiscoveryUseCase(
    geocodingAdapter: import('./ports/GeocodingPort').GeocodingPort,
    profileAdapter: import('./ports/ProfileRepositoryPort').ProfileRepositoryPort
): DiscoverRegulatoryProfileUseCase {
    const discoveryService = new DiscoveryService(geocodingAdapter, profileAdapter);
    return new DiscoverRegulatoryProfileUseCase(discoveryService);
}

// ============================================================================
// Pre-configured Stormwater Profiles
// ============================================================================

/**
 * Default stormwater profiles for major jurisdictions
 * Can be extended or overridden by consumers
 */
export const STORMWATER_PROFILES: RegulatoryProfile<StormwaterParameters>[] = [
    // US Federal Baseline
    {
        id: 'us-federal-stormwater',
        jurisdictionCode: 'US',
        domain: 'stormwater',
        name: 'US EPA Baseline',
        description: 'Federal baseline for Clean Water Act compliance.',
        authorityName: 'US Environmental Protection Agency',
        authorityUrl: 'https://www.epa.gov/',
        parameters: {
            designDepth_mm: 25.4, // 1 inch
            designIntensity_mm_hr: 50.0,
            rvFormula: () => 0.9,
            units: 'imperial'
        }
    },
    // Virginia State
    {
        id: 'va-state-stormwater',
        jurisdictionCode: 'US-VA',
        domain: 'stormwater',
        name: 'Virginia Stormwater Handbook (9VAC25-870)',
        description: 'Virginia DEQ stormwater management standards.',
        authorityName: 'Virginia DEQ',
        authorityUrl: 'https://www.deq.virginia.gov/',
        parameters: {
            designDepth_mm: 30.48, // 1.2 inches
            designIntensity_mm_hr: 50.8,
            rvFormula: (i) => 0.05 + (0.009 * i),
            units: 'imperial'
        }
    },
    // Fairfax County (overrides Virginia)
    {
        id: 'fairfax-county-stormwater',
        jurisdictionCode: 'US-VA-059',
        domain: 'stormwater',
        name: 'Fairfax County LID Manual',
        description: 'Fairfax County Public Facilities Manual - Stormwater.',
        authorityName: 'Fairfax County DPWES',
        authorityUrl: 'https://www.fairfaxcounty.gov/publicworks/',
        parameters: {
            designDepth_mm: 38.1, // 1.5 inches (stricter than state)
            designIntensity_mm_hr: 50.8,
            rvFormula: (i) => 0.05 + (0.009 * i),
            units: 'imperial'
        }
    },
    // New York City
    {
        id: 'nyc-stormwater',
        jurisdictionCode: 'US-NY-NYC',
        domain: 'stormwater',
        name: 'NYC Unified Stormwater Rule (USWR)',
        description: 'NYC DEP 90th percentile retention standard.',
        authorityName: 'NYC DEP',
        authorityUrl: 'https://www1.nyc.gov/site/dep/',
        parameters: {
            designDepth_mm: 38.1, // 1.5 inches
            designIntensity_mm_hr: 45.0,
            rvFormula: (i) => 0.05 + (0.009 * i),
            units: 'imperial'
        }
    },
    // California
    {
        id: 'ca-state-stormwater',
        jurisdictionCode: 'US-CA',
        domain: 'stormwater',
        name: 'California LID Standards (CASQA)',
        description: 'California 85th percentile storm event capture.',
        authorityName: 'California SWRCB',
        authorityUrl: 'https://www.waterboards.ca.gov/',
        parameters: {
            designDepth_mm: 19.05, // 0.75 inches
            designIntensity_mm_hr: 40.0,
            rvFormula: () => 0.9,
            units: 'imperial'
        }
    },
    // Germany National
    {
        id: 'de-national-stormwater',
        jurisdictionCode: 'DE',
        domain: 'stormwater',
        name: 'DWA-A 138 (German National Standard)',
        description: 'German national stormwater standards.',
        authorityName: 'DWA',
        authorityUrl: 'https://de.dwa.de/',
        parameters: {
            designDepth_mm: 25.0,
            designIntensity_mm_hr: 45.0,
            rvFormula: () => 0.9,
            units: 'metric'
        }
    },
    // Germany Berlin State
    {
        id: 'berlin-state-stormwater',
        jurisdictionCode: 'DE-BE',
        domain: 'stormwater',
        name: 'Berliner Regenwasseragentur (Schwammstadt)',
        description: 'Berlin Sponge City / DWA-A 138 guidelines.',
        authorityName: 'Berliner Regenwasseragentur',
        authorityUrl: 'https://regenwasseragentur.berlin/',
        parameters: {
            designDepth_mm: 30.0,
            designIntensity_mm_hr: 45.0,
            rvFormula: () => 0.9,
            units: 'metric'
        }
    },
    // Germany Berlin City (same as state since Berlin is city-state)
    {
        id: 'berlin-city-stormwater',
        jurisdictionCode: 'DE-BE-BERLIN',
        domain: 'stormwater',
        name: 'Berliner Regenwasseragentur (Schwammstadt)',
        description: 'Berlin Sponge City / DWA-A 138 guidelines.',
        authorityName: 'Berliner Regenwasseragentur',
        authorityUrl: 'https://regenwasseragentur.berlin/',
        parameters: {
            designDepth_mm: 30.0,
            designIntensity_mm_hr: 45.0,
            rvFormula: () => 0.9,
            units: 'metric'
        }
    },
    // UK London
    {
        id: 'london-stormwater',
        jurisdictionCode: 'GB-ENG-LDN',
        domain: 'stormwater',
        name: 'London SuDS Design Guide',
        description: 'Greater London Authority 25mm first flush capture.',
        authorityName: 'Greater London Authority',
        authorityUrl: 'https://www.london.gov.uk/',
        parameters: {
            designDepth_mm: 25.0,
            designIntensity_mm_hr: 50.0,
            rvFormula: () => 0.9,
            units: 'metric'
        }
    },
    // Global Default
    {
        id: 'global-default-stormwater',
        jurisdictionCode: 'GLOBAL',
        domain: 'stormwater',
        name: 'WHO/EPA Global Baseline',
        description: 'Generalized 25mm / 1-inch target for regions without local handbooks.',
        parameters: {
            designDepth_mm: 25.4,
            designIntensity_mm_hr: 50.0,
            rvFormula: () => 0.9,
            units: 'metric'
        }
    }
];

/**
 * Create a stormwater-focused discovery use case with pre-loaded profiles
 */
export function createStormwaterDiscoveryUseCase(): DiscoverRegulatoryProfileUseCase {
    const geocodingAdapter = new NominatimGeocodingAdapter();
    const profileAdapter = new InMemoryProfileAdapter();

    // Load stormwater profiles (cast to any to work around generic constraints)
    STORMWATER_PROFILES.forEach(p => profileAdapter.register(p as unknown as RegulatoryProfile));

    // Set global default
    const globalDefault = STORMWATER_PROFILES.find(p => p.jurisdictionCode === 'GLOBAL');
    if (globalDefault) {
        profileAdapter.setDefault('stormwater', globalDefault as unknown as RegulatoryProfile);
    }

    const discoveryService = new DiscoveryService(geocodingAdapter, profileAdapter);
    return new DiscoverRegulatoryProfileUseCase(discoveryService);
}
