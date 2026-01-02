/**
 * NominatimGeocodingAdapter - OpenStreetMap Nominatim implementation
 * 
 * Uses the free OSM Nominatim API for reverse geocoding.
 * Respects rate limits (1 request/second) per OSM usage policy.
 * 
 * @domain geo-regulatory
 * @layer adapters
 */

import type { GeocodingPort } from '../ports/GeocodingPort';
import type { JurisdictionChain } from '../domain/valueObjects/JurisdictionChain';
import type { Jurisdiction, JurisdictionLevel } from '../domain/entities/Jurisdiction';
import { createJurisdiction } from '../domain/entities/Jurisdiction';
import { createJurisdictionChain } from '../domain/valueObjects/JurisdictionChain';
import {
    getCountryHierarchy,
    US_STATE_CODES,
    US_COUNTY_FIPS,
    DE_LAND_CODES
} from '../config/countryHierarchies';

interface NominatimAddress {
    country?: string;
    country_code?: string;
    state?: string;
    county?: string;
    city?: string;
    town?: string;
    village?: string;
    suburb?: string;
    neighbourhood?: string;
    [key: string]: string | undefined;
}

interface NominatimResponse {
    address: NominatimAddress;
    display_name: string;
}

export class NominatimGeocodingAdapter implements GeocodingPort {
    private lastRequestTime = 0;
    private readonly minIntervalMs = 1000; // 1 request per second
    private readonly baseUrl = 'https://nominatim.openstreetmap.org';
    private readonly userAgent = 'MicrocatchmentPlanner/1.0';

    /**
     * Enforce rate limiting
     */
    private async throttle(): Promise<void> {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minIntervalMs) {
            const waitTime = this.minIntervalMs - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    async reverseGeocode(lat: number, lon: number): Promise<JurisdictionChain> {
        await this.throttle();

        const url = `${this.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status} ${response.statusText}`);
        }

        const data: NominatimResponse = await response.json();
        return this.parseToChain(data);
    }

    private parseToChain(response: NominatimResponse): JurisdictionChain {
        const address = response.address;
        const countryCode = address.country_code?.toUpperCase() || 'XX';
        const countryName = address.country || 'Unknown';

        const hierarchyConfig = getCountryHierarchy(countryCode);
        const hierarchy: Jurisdiction[] = [];

        // Build jurisdiction codes based on country
        const codeComponents: Record<string, string> = { country: countryCode };

        // Process levels from BROADEST to MOST SPECIFIC to ensure parent components (like state) are available
        const levelsBroadestFirst = [...hierarchyConfig.levels].reverse();

        for (const levelConfig of levelsBroadestFirst) {
            const fieldValue = address[levelConfig.addressField];

            if (fieldValue) {
                // Store component first so it's available for buildJurisdictionCode if needed
                // (though buildJurisdictionCode currently uses components.state, etc.)
                codeComponents[levelConfig.type] = this.getCodeComponent(countryCode, levelConfig.type, fieldValue);

                const jurisdictionCode = this.buildJurisdictionCode(
                    countryCode,
                    levelConfig.type,
                    fieldValue,
                    codeComponents
                );

                hierarchy.push(createJurisdiction(
                    levelConfig.type,
                    fieldValue,
                    jurisdictionCode,
                    { osmAdminLevel: levelConfig.osmLevel }
                ));
            }
        }

        // Add country (broadest)
        hierarchy.unshift(createJurisdiction(
            'country',
            countryName,
            countryCode
        ));

        // Final hierarchy should be MOST SPECIFIC to BROADEST
        const specificFirstHierarchy = hierarchy.reverse();

        return createJurisdictionChain(countryName, countryCode, specificFirstHierarchy);
    }

    private buildJurisdictionCode(
        countryCode: string,
        level: JurisdictionLevel,
        name: string,
        components: Record<string, string>
    ): string {
        switch (countryCode) {
            case 'US':
                return this.buildUSCode(level, name, components);
            case 'DE':
                return this.buildDECode(level, name, components);
            default:
                return this.buildGenericCode(countryCode, level, name, components);
        }
    }

    private buildUSCode(
        level: JurisdictionLevel,
        name: string,
        components: Record<string, string>
    ): string {
        const stateCode = components.state || 'XX';

        switch (level) {
            case 'state':
                return `US-${US_STATE_CODES[name] || this.abbreviate(name)}`;
            case 'county':
                const fips = US_COUNTY_FIPS[name] || '000';
                return `US-${stateCode}-${fips}`;
            case 'city':
            case 'town':
                const countyCode = components.county || '000';
                return `US-${stateCode}-${countyCode}-${this.sanitize(name)}`;
            default:
                return `US-${stateCode}-${this.sanitize(name)}`;
        }
    }

    private buildDECode(
        level: JurisdictionLevel,
        name: string,
        components: Record<string, string>
    ): string {
        switch (level) {
            case 'state':
                return `DE-${DE_LAND_CODES[name] || this.abbreviate(name)}`;
            case 'county':
            case 'city':
                const landCode = components.state || 'XX';
                return `DE-${landCode}-${this.sanitize(name)}`;
            default:
                return `DE-${this.sanitize(name)}`;
        }
    }

    private buildGenericCode(
        countryCode: string,
        level: JurisdictionLevel,
        name: string,
        components: Record<string, string>
    ): string {
        const parts = [countryCode];

        if (components.state) parts.push(components.state);
        if (components.county && level !== 'state') parts.push(components.county);
        if (level === 'city' || level === 'town') parts.push(this.sanitize(name));

        return parts.join('-');
    }

    private getCodeComponent(
        countryCode: string,
        level: JurisdictionLevel,
        name: string
    ): string {
        switch (countryCode) {
            case 'US':
                if (level === 'state') return US_STATE_CODES[name] || this.abbreviate(name);
                if (level === 'county') return US_COUNTY_FIPS[name] || '000';
                return this.sanitize(name);
            case 'DE':
                if (level === 'state') return DE_LAND_CODES[name] || this.abbreviate(name);
                return this.sanitize(name);
            default:
                return this.sanitize(name);
        }
    }

    private abbreviate(name: string): string {
        // Simple abbreviation: first 2 letters uppercase
        return name.substring(0, 2).toUpperCase();
    }

    private sanitize(name: string): string {
        // Remove special characters, replace spaces with underscores
        return name
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, '_')
            .substring(0, 20);
    }
}
