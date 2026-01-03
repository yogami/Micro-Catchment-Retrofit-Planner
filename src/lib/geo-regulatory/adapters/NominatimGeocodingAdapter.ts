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
import { getCountryHierarchy, US_STATE_CODES, US_COUNTY_FIPS, DE_LAND_CODES } from '../config/countryHierarchies';

interface NominatimAddress {
    country?: string; country_code?: string; state?: string; county?: string; city?: string; town?: string;
    village?: string; suburb?: string; neighbourhood?: string;[key: string]: string | undefined;
}

interface NominatimResponse { address: NominatimAddress; display_name: string; }

interface ProcessingContext {
    cCode: string;
    comps: Record<string, string>;
    h: Jurisdiction[];
}

export class NominatimGeocodingAdapter implements GeocodingPort {
    private lastRequestTime = 0;
    private readonly minIntervalMs = 1000;
    private readonly baseUrl = 'https://nominatim.openstreetmap.org';
    private readonly userAgent = 'MicrocatchmentPlanner/1.0';

    private async throttle(): Promise<void> {
        const timeSince = Date.now() - this.lastRequestTime;
        if (timeSince < this.minIntervalMs) await new Promise(r => setTimeout(r, this.minIntervalMs - timeSince));
        this.lastRequestTime = Date.now();
    }

    async reverseGeocode(lat: number, lon: number): Promise<JurisdictionChain> {
        await this.throttle();
        const res = await fetch(`${this.baseUrl}/reverse?lat=${lat}&lon=${lon}&format=json&addressdetails=1`, {
            headers: { 'User-Agent': this.userAgent, 'Accept': 'application/json' }
        });
        if (!res.ok) throw new Error(`Nominatim API error: ${res.status} ${res.statusText}`);
        return this.parseToChain(await res.json());
    }

    private parseToChain(res: NominatimResponse): JurisdictionChain {
        const addr = res.address;
        const cCode = (addr.country_code || 'XX').toUpperCase();
        const ctx: ProcessingContext = { cCode, comps: { country: cCode }, h: [] };
        // Explicitly create hierarchy levels
        [...getCountryHierarchy(cCode).levels].reverse().forEach(l => {
            const val = addr[l.addressField];
            if (val) this.addLevel(l, val, ctx);
        });
        const countryName = addr.country || 'Unknown';
        ctx.h.unshift(createJurisdiction('country', countryName, cCode));
        return createJurisdictionChain(countryName, cCode, [...ctx.h].reverse());
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private addLevel(l: any, val: string, ctx: ProcessingContext): void {
        const type = l.type as JurisdictionLevel;
        ctx.comps[type] = getCodeComponent(ctx.cCode, type, val);
        const code = buildCode(ctx.cCode, type, val, ctx.comps);
        ctx.h.push(createJurisdiction(type, val, code, { osmAdminLevel: l.osmLevel }));
    }
}

function buildCode(c: string, l: JurisdictionLevel, n: string, comps: Record<string, string>): string {
    const strategies: Record<string, () => string> = {
        'US': () => buildUSCode(l, n, comps),
        'DE': () => buildDECode(l, n, comps)
    };
    return (strategies[c] || (() => buildGenericCode(c, l, n, comps)))();
}

type CodeBuilder = (n: string, comps: Record<string, string>) => string;

const usBuilders: Record<string, CodeBuilder> = {
    'state': (n) => `US-${US_STATE_CODES[n] || abbr(n)}`,
    'county': (n, c) => `US-${c.state || 'XX'}-${US_COUNTY_FIPS[n] || '000'}`,
    'default': (n, c) => `US-${c.state || 'XX'}-${c.county || '000'}-${sanitize(n)}`
};

function buildUSCode(l: JurisdictionLevel, n: string, comps: Record<string, string>): string {
    return (usBuilders[l] || usBuilders['default'])(n, comps);
}

const deBuilders: Record<string, CodeBuilder> = {
    'state': (n) => `DE-${DE_LAND_CODES[n] || abbr(n)}`,
    'default': (n, c) => `DE-${c.state || 'XX'}-${sanitize(n)}`
};

function buildDECode(l: JurisdictionLevel, n: string, comps: Record<string, string>): string {
    return (deBuilders[l] || deBuilders['default'])(n, comps);
}

function buildGenericCode(c: string, l: JurisdictionLevel, n: string, comps: Record<string, string>): string {
    return [
        c,
        comps.state,
        shouldIncludeCounty(l, comps.county) ? comps.county : '',
        isLocality(l) ? sanitize(n) : ''
    ].filter(Boolean).join('-');
}

function shouldIncludeCounty(l: string, county?: string) {
    if (isLocality(l)) return true;
    return l !== 'state' && !!county;
}

const strategies: Record<string, (n: string) => string> = {
    'US.state': (n) => US_STATE_CODES[n] || abbr(n),
    'US.county': (n) => US_COUNTY_FIPS[n] || '000',
    'DE.state': (n) => DE_LAND_CODES[n] || abbr(n)
};

function getCodeComponent(c: string, l: JurisdictionLevel, n: string): string {
    return (strategies[`${c}.${l}`] || sanitize)(n);
}

function isLocality(l: string) { return ['city', 'town', 'village'].includes(l); }
function abbr(n: string): string { return n.substring(0, 2).toUpperCase(); }
function sanitize(n: string): string { return n.toUpperCase().replace(/[^A-Z0-9]/g, '_').substring(0, 20); }
