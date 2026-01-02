/**
 * JurisdictionChain Value Object - represents the full hierarchy from most specific to broadest
 * 
 * @domain geo-regulatory
 * @layer domain/valueObjects
 */

import type { Jurisdiction } from '../entities/Jurisdiction';

export interface JurisdictionChain {
    /** Country name */
    readonly country: string;

    /** ISO 3166-1 alpha-2 country code */
    readonly countryCode: string;

    /** 
     * Hierarchy ordered from MOST SPECIFIC to BROADEST
     * e.g., [town, city, county, state, country]
     */
    readonly hierarchy: Jurisdiction[];
}

/**
 * Get jurisdiction codes from most specific to broadest for cascade lookup
 */
export function getCascadeCodes(chain: JurisdictionChain): string[] {
    return chain.hierarchy.map(j => j.code);
}

/**
 * Factory function to create a JurisdictionChain
 */
export function createJurisdictionChain(
    country: string,
    countryCode: string,
    hierarchy: Jurisdiction[]
): JurisdictionChain {
    return {
        country,
        countryCode,
        hierarchy
    };
}

/**
 * Find a jurisdiction in the chain by its code
 */
export function findInChain(chain: JurisdictionChain, code: string): Jurisdiction | undefined {
    return chain.hierarchy.find(j => j.code === code);
}

/**
 * Get the most specific jurisdiction in the chain
 */
export function getMostSpecific(chain: JurisdictionChain): Jurisdiction | undefined {
    return chain.hierarchy[0];
}

/**
 * Get the broadest jurisdiction (usually country)
 */
export function getBroadest(chain: JurisdictionChain): Jurisdiction | undefined {
    return chain.hierarchy[chain.hierarchy.length - 1];
}
