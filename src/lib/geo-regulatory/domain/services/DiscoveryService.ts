/**
 * DiscoveryService - Core domain service for hierarchical regulatory discovery
 * 
 * This service implements the cascade lookup algorithm:
 * 1. Reverse geocode GPS → JurisdictionChain
 * 2. Iterate from most specific to broadest jurisdiction
 * 3. Return first matching profile for the domain
 * 4. Fallback to global default if no matches
 * 
 * @domain geo-regulatory
 * @layer domain/services
 */

import type { GeocodingPort } from '../../ports/GeocodingPort';
import type { ProfileRepositoryPort } from '../../ports/ProfileRepositoryPort';
import type { RegulatoryProfile } from '../valueObjects/RegulatoryProfile';
import type { JurisdictionChain } from '../valueObjects/JurisdictionChain';
import type { Jurisdiction } from '../entities/Jurisdiction';
import { getCascadeCodes, findInChain } from '../valueObjects/JurisdictionChain';
import { createJurisdiction } from '../entities/Jurisdiction';

/**
 * Result of a discovery operation
 */
export interface DiscoveryResult<TParams = Record<string, unknown>> {
    /** How the profile was found */
    status: 'discovered' | 'fallback' | 'default';

    /** The applicable regulatory profile */
    profile: RegulatoryProfile<TParams>;

    /** The jurisdiction the profile was found for */
    appliedJurisdiction: Jurisdiction;

    /** Full jurisdiction chain from geocoding */
    chain: JurisdictionChain;

    /** 
     * Codes checked during cascade lookup
     * Useful for debugging and UI transparency
     */
    fallbackPath?: string[];
}

/**
 * Core discovery service - no external dependencies, pure domain logic
 */
export class DiscoveryService {
    private readonly geocodingPort: GeocodingPort;
    private readonly profileRepository: ProfileRepositoryPort;

    constructor(
        geocodingPort: GeocodingPort,
        profileRepository: ProfileRepositoryPort
    ) {
        this.geocodingPort = geocodingPort;
        this.profileRepository = profileRepository;
    }

    /**
     * Discover the applicable regulatory profile for a GPS location
     * 
     * @param lat - Latitude
     * @param lon - Longitude
     * @param domain - Regulatory domain (e.g., "stormwater", "building-code")
     * @returns DiscoveryResult with the applicable profile
     */
    async discover<TParams = Record<string, unknown>>(
        lat: number,
        lon: number,
        domain: string
    ): Promise<DiscoveryResult<TParams>> {
        // Step 1: Reverse geocode to get jurisdiction chain
        const chain = await this.geocodingPort.reverseGeocode(lat, lon);

        // Step 2: Get cascade codes (most specific first)
        const cascadeCodes = getCascadeCodes(chain);
        const fallbackPath: string[] = [];

        // Step 3: Iterate and find first matching profile
        for (const code of cascadeCodes) {
            fallbackPath.push(code);

            const profile = await this.profileRepository.findByJurisdictionAndDomain(
                code,
                domain
            );

            if (profile) {
                const isExactMatch = code === cascadeCodes[0];
                const appliedJurisdiction = findInChain(chain, code);

                return {
                    status: isExactMatch ? 'discovered' : 'fallback',
                    profile: profile as RegulatoryProfile<TParams>,
                    appliedJurisdiction: appliedJurisdiction!,
                    chain,
                    fallbackPath
                };
            }
        }

        // Step 4: No match found, return global default
        const defaultProfile = await this.profileRepository.getDefault(domain);

        return {
            status: 'default',
            profile: defaultProfile as RegulatoryProfile<TParams>,
            appliedJurisdiction: createJurisdiction('supranational', 'Global', 'GLOBAL'),
            chain,
            fallbackPath
        };
    }
}
