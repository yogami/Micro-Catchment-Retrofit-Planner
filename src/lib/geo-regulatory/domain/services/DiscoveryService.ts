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
    async discover<TParams = Record<string, unknown>>(lat: number, lon: number, domain: string): Promise<DiscoveryResult<TParams>> {
        const chain = await this.geocodingPort.reverseGeocode(lat, lon);
        const codes = getCascadeCodes(chain);
        const result = await this.searchChain<TParams>(codes, domain, chain);
        if (result) return result;

        const def = await this.profileRepository.getDefault(domain);
        return {
            status: 'default',
            profile: def as RegulatoryProfile<TParams>,
            appliedJurisdiction: createJurisdiction('supranational', 'Global', 'GLOBAL'),
            chain,
            fallbackPath: codes
        };
    }

    private async searchChain<TParams>(codes: string[], domain: string, chain: JurisdictionChain): Promise<DiscoveryResult<TParams> | null> {
        const path: string[] = [];
        for (const code of codes) {
            path.push(code);
            const p = await this.profileRepository.findByJurisdictionAndDomain(code, domain);
            if (p) return this.buildResult({ p: p as RegulatoryProfile<TParams>, code, top: codes[0], chain, path });
        }
        return null;
    }

    private buildResult<TParams>(args: {
        p: RegulatoryProfile<TParams>,
        code: string,
        top: string,
        chain: JurisdictionChain,
        path: string[]
    }): DiscoveryResult<TParams> {
        const { p, code, top, chain, path } = args;
        return {
            status: code === top ? 'discovered' : 'fallback',
            profile: p,
            appliedJurisdiction: findInChain(chain, code)!,
            chain,
            fallbackPath: path
        };
    }
}
