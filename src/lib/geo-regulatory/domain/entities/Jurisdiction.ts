/**
 * Jurisdiction Entity - represents a single administrative unit in a hierarchy
 * 
 * @domain geo-regulatory
 * @layer domain/entities
 */

export type JurisdictionLevel =
    | 'neighborhood'
    | 'town'
    | 'city'
    | 'county'
    | 'state'
    | 'region'
    | 'country'
    | 'supranational';

export interface Jurisdiction {
    /** Semantic level in the hierarchy */
    readonly level: JurisdictionLevel;

    /** Human-readable name (e.g., "Fairfax County") */
    readonly name: string;

    /** 
     * Hierarchical code for lookup (e.g., "US-VA-059")
     * Format: {country}-{state}-{county}-{city}
     */
    readonly code: string;

    /** OpenStreetMap admin level if available */
    readonly osmAdminLevel?: number;

    /** Parent jurisdiction code for upward traversal */
    readonly parentCode?: string;
}

/**
 * Factory function to create a Jurisdiction entity
 */
export function createJurisdiction(
    level: JurisdictionLevel,
    name: string,
    code: string,
    options?: {
        osmAdminLevel?: number;
        parentCode?: string;
    }
): Jurisdiction {
    return {
        level,
        name,
        code,
        osmAdminLevel: options?.osmAdminLevel,
        parentCode: options?.parentCode
    };
}
