/**
 * ProfileRepositoryPort - interface for regulatory profile storage
 * 
 * This port abstracts the storage mechanism, allowing different adapters:
 * - InMemoryProfileAdapter (development/testing)
 * - SupabaseProfileAdapter (production)
 * - JSONFileProfileAdapter (static deployment)
 * 
 * @domain geo-regulatory
 * @layer ports
 */

import type { RegulatoryProfile } from '../domain/valueObjects/RegulatoryProfile';

export interface ProfileRepositoryPort {
    /**
     * Find a profile by jurisdiction code and domain
     * Returns null if no profile exists for the combination
     */
    findByJurisdictionAndDomain(
        jurisdictionCode: string,
        domain: string
    ): Promise<RegulatoryProfile | null>;

    /**
     * Get the default/fallback profile for a domain
     * This is used when no jurisdiction-specific profile exists
     */
    getDefault(domain: string): Promise<RegulatoryProfile>;

    /**
     * Register a new profile
     */
    register(profile: RegulatoryProfile): Promise<void>;

    /**
     * Set the default profile for a domain
     */
    setDefault(domain: string, profile: RegulatoryProfile): Promise<void>;

    /**
     * List all profiles for a domain
     */
    listByDomain(domain: string): Promise<RegulatoryProfile[]>;

    /**
     * List all profiles for a jurisdiction (across all domains)
     */
    listByJurisdiction(jurisdictionCode: string): Promise<RegulatoryProfile[]>;
}
