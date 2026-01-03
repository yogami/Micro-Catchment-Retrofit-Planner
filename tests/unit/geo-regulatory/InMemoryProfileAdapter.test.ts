import { describe, it, expect, beforeEach } from '@jest/globals';
import { InMemoryProfileAdapter } from '../../../src/lib/geo-regulatory/adapters/InMemoryProfileAdapter';
import type { RegulatoryProfile } from '../../../src/lib/geo-regulatory/domain/valueObjects/RegulatoryProfile';

describe('InMemoryProfileAdapter', () => {
    let adapter: InMemoryProfileAdapter;

    const createProfile = (code: string, domain = 'stormwater'): RegulatoryProfile => ({
        id: `${code}-${domain}`,
        jurisdictionCode: code,
        domain,
        name: `${code} Profile`,
        description: `Profile for ${code}`,
        parameters: {
            designDepth_mm: 25.4,
            designIntensity_mm_hr: 50.0,
            rvFormula: () => 0.9,
            units: 'imperial'
        }
    });

    beforeEach(() => {
        adapter = new InMemoryProfileAdapter();
    });

    describe('constructor', () => {
        it('creates empty adapter by default', () => {
            expect(adapter.count()).toBe(0);
        });

        it('accepts initial profiles', () => {
            const profiles = [createProfile('US-VA'), createProfile('US-MD')];
            const preloaded = new InMemoryProfileAdapter(profiles);
            expect(preloaded.count()).toBe(2);
        });
    });

    describe('register', () => {
        it('registers a profile', async () => {
            await adapter.register(createProfile('US-VA'));
            expect(adapter.count()).toBe(1);
        });

        it('overwrites profile with same key', async () => {
            await adapter.register(createProfile('US-VA'));
            await adapter.register(createProfile('US-VA'));
            expect(adapter.count()).toBe(1);
        });
    });

    describe('findByJurisdictionAndDomain', () => {
        it('finds registered profile', async () => {
            await adapter.register(createProfile('US-VA-059'));
            const result = await adapter.findByJurisdictionAndDomain('US-VA-059', 'stormwater');
            expect(result).not.toBeNull();
            expect(result!.jurisdictionCode).toBe('US-VA-059');
        });

        it('returns null for non-existent profile', async () => {
            const result = await adapter.findByJurisdictionAndDomain('UNKNOWN', 'stormwater');
            expect(result).toBeNull();
        });

        it('distinguishes domains', async () => {
            await adapter.register(createProfile('US-VA', 'stormwater'));
            await adapter.register(createProfile('US-VA', 'building-code'));

            const stormwater = await adapter.findByJurisdictionAndDomain('US-VA', 'stormwater');
            const building = await adapter.findByJurisdictionAndDomain('US-VA', 'building-code');

            expect(stormwater!.domain).toBe('stormwater');
            expect(building!.domain).toBe('building-code');
        });
    });

    describe('getDefault', () => {
        it('returns default profile for domain', async () => {
            const defaultProfile = createProfile('GLOBAL');
            await adapter.setDefault('stormwater', defaultProfile);
            const result = await adapter.getDefault('stormwater');
            expect(result.jurisdictionCode).toBe('GLOBAL');
        });

        it('throws error if no default set', async () => {
            await expect(adapter.getDefault('unknown-domain')).rejects.toThrow(
                'No default profile registered for domain: unknown-domain'
            );
        });
    });

    describe('setDefault', () => {
        it('sets default profile for domain', async () => {
            const profile = createProfile('GLOBAL');
            await adapter.setDefault('stormwater', profile);
            const result = await adapter.getDefault('stormwater');
            expect(result).toBe(profile);
        });

        it('overwrites existing default', async () => {
            await adapter.setDefault('stormwater', createProfile('OLD'));
            await adapter.setDefault('stormwater', createProfile('NEW'));
            const result = await adapter.getDefault('stormwater');
            expect(result.jurisdictionCode).toBe('NEW');
        });
    });

    describe('listByDomain', () => {
        it('returns all profiles for domain', async () => {
            await adapter.register(createProfile('US-VA', 'stormwater'));
            await adapter.register(createProfile('US-MD', 'stormwater'));
            await adapter.register(createProfile('US-VA', 'building-code'));

            const results = await adapter.listByDomain('stormwater');
            expect(results).toHaveLength(2);
            results.forEach(r => expect(r.domain).toBe('stormwater'));
        });

        it('returns empty array for non-existent domain', async () => {
            const results = await adapter.listByDomain('unknown');
            expect(results).toEqual([]);
        });
    });

    describe('listByJurisdiction', () => {
        it('returns all profiles for jurisdiction', async () => {
            await adapter.register(createProfile('US-VA', 'stormwater'));
            await adapter.register(createProfile('US-VA', 'building-code'));
            await adapter.register(createProfile('US-MD', 'stormwater'));

            const results = await adapter.listByJurisdiction('US-VA');
            expect(results).toHaveLength(2);
            results.forEach(r => expect(r.jurisdictionCode).toBe('US-VA'));
        });

        it('returns empty array for non-existent jurisdiction', async () => {
            const results = await adapter.listByJurisdiction('UNKNOWN');
            expect(results).toEqual([]);
        });
    });

    describe('loadProfiles', () => {
        it('bulk loads multiple profiles', async () => {
            const profiles = [
                createProfile('US-VA'),
                createProfile('US-MD'),
                createProfile('US-DC')
            ];
            await adapter.loadProfiles(profiles);
            expect(adapter.count()).toBe(3);
        });
    });

    describe('clear', () => {
        it('removes all profiles and defaults', async () => {
            await adapter.register(createProfile('US-VA'));
            await adapter.setDefault('stormwater', createProfile('GLOBAL'));
            adapter.clear();

            expect(adapter.count()).toBe(0);
            await expect(adapter.getDefault('stormwater')).rejects.toThrow();
        });
    });

    describe('count', () => {
        it('returns correct count', async () => {
            expect(adapter.count()).toBe(0);
            await adapter.register(createProfile('A'));
            expect(adapter.count()).toBe(1);
            await adapter.register(createProfile('B'));
            expect(adapter.count()).toBe(2);
        });
    });
});
