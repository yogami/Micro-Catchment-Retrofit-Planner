/**
 * InMemoryProfileAdapter - in-memory implementation of ProfileRepositoryPort
 * 
 * Suitable for:
 * - Development and testing
 * - Static deployments with bundled profiles
 * - Offline-first applications
 * 
 * @domain geo-regulatory
 * @layer adapters
 */

import type { ProfileRepositoryPort } from '../ports/ProfileRepositoryPort';
import type { RegulatoryProfile } from '../domain/valueObjects/RegulatoryProfile';

export class InMemoryProfileAdapter implements ProfileRepositoryPort {
    // Key format: "{domain}:{jurisdictionCode}"
    private profiles: Map<string, RegulatoryProfile> = new Map();

    // Key format: "{domain}"
    private defaults: Map<string, RegulatoryProfile> = new Map();

    constructor(initialProfiles?: RegulatoryProfile[]) {
        initialProfiles?.forEach(p => this.register(p));
    }

    private getKey(jurisdictionCode: string, domain: string): string {
        return `${domain}:${jurisdictionCode}`;
    }

    async findByJurisdictionAndDomain(
        jurisdictionCode: string,
        domain: string
    ): Promise<RegulatoryProfile | null> {
        const key = this.getKey(jurisdictionCode, domain);
        return this.profiles.get(key) || null;
    }

    async getDefault(domain: string): Promise<RegulatoryProfile> {
        const defaultProfile = this.defaults.get(domain);
        if (!defaultProfile) {
            throw new Error(`No default profile registered for domain: ${domain}`);
        }
        return defaultProfile;
    }

    async register(profile: RegulatoryProfile): Promise<void> {
        const key = this.getKey(profile.jurisdictionCode, profile.domain);
        this.profiles.set(key, profile);
    }

    async setDefault(domain: string, profile: RegulatoryProfile): Promise<void> {
        this.defaults.set(domain, profile);
    }

    async listByDomain(domain: string): Promise<RegulatoryProfile[]> {
        const results: RegulatoryProfile[] = [];
        for (const [key, profile] of this.profiles.entries()) {
            if (key.startsWith(`${domain}:`)) {
                results.push(profile);
            }
        }
        return results;
    }

    async listByJurisdiction(jurisdictionCode: string): Promise<RegulatoryProfile[]> {
        const results: RegulatoryProfile[] = [];
        for (const [key, profile] of this.profiles.entries()) {
            if (key.endsWith(`:${jurisdictionCode}`)) {
                results.push(profile);
            }
        }
        return results;
    }

    /**
     * Bulk load profiles (useful for initialization)
     */
    async loadProfiles(profiles: RegulatoryProfile[]): Promise<void> {
        for (const profile of profiles) {
            await this.register(profile);
        }
    }

    /**
     * Clear all profiles (useful for testing)
     */
    clear(): void {
        this.profiles.clear();
        this.defaults.clear();
    }

    /**
     * Get count of registered profiles
     */
    count(): number {
        return this.profiles.size;
    }
}
