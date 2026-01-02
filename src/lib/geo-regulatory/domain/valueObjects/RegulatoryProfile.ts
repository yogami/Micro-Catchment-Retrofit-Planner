/**
 * RegulatoryProfile Value Object - domain-agnostic regulatory standard
 * 
 * The TParams generic allows each domain to define its own parameter structure
 * while sharing the common profile metadata.
 * 
 * @domain geo-regulatory
 * @layer domain/valueObjects
 */

/**
 * Base interface for all regulatory profiles
 * TParams is the domain-specific parameter type
 */
export interface RegulatoryProfile<TParams = Record<string, unknown>> {
    /** Unique identifier */
    readonly id: string;

    /** 
     * Jurisdiction code this profile applies to
     * e.g., "US-VA-059" for Fairfax County, "GLOBAL" for default
     */
    readonly jurisdictionCode: string;

    /** 
     * Domain this profile belongs to
     * e.g., "stormwater", "building-code", "tax", "accessibility"
     */
    readonly domain: string;

    /** Human-readable name */
    readonly name: string;

    /** Description of the regulatory standard */
    readonly description: string;

    /** Name of the regulatory authority */
    readonly authorityName?: string;

    /** URL to the authority's website */
    readonly authorityUrl?: string;

    /** When this standard became effective */
    readonly effectiveDate?: Date;

    /** Expiration date if the standard is being phased out */
    readonly expirationDate?: Date;

    /** Domain-specific parameters (strongly typed per domain) */
    readonly parameters: TParams;
}

// ============================================================================
// Domain-Specific Parameter Types
// ============================================================================

/**
 * Parameters for stormwater management domain
 */
export interface StormwaterParameters {
    /** Target water quality capture depth in mm */
    designDepth_mm: number;

    /** Design storm intensity in mm/hr */
    designIntensity_mm_hr: number;

    /** Runoff coefficient formula based on impervious percentage */
    rvFormula: (imperviousPercent: number) => number;

    /** Preferred unit system for display */
    units: 'imperial' | 'metric';
}

/**
 * Parameters for building code domain (example)
 */
export interface BuildingCodeParameters {
    /** Maximum building height in meters */
    maxHeight_m?: number;

    /** Minimum setback from property line in meters */
    setback_m?: number;

    /** Floor area ratio limit */
    maxFAR?: number;
}

/**
 * Parameters for tax law domain (example)
 */
export interface TaxParameters {
    /** Sales tax rate as decimal */
    salesTaxRate?: number;

    /** Property tax rate as decimal */
    propertyTaxRate?: number;
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a stormwater regulatory profile
 */
export function createStormwaterProfile(
    id: string,
    jurisdictionCode: string,
    name: string,
    description: string,
    parameters: StormwaterParameters,
    options?: {
        authorityName?: string;
        authorityUrl?: string;
        effectiveDate?: Date;
    }
): RegulatoryProfile<StormwaterParameters> {
    return {
        id,
        jurisdictionCode,
        domain: 'stormwater',
        name,
        description,
        parameters,
        ...options
    };
}
