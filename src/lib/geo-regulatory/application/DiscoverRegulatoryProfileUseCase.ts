/**
 * DiscoverRegulatoryProfileUseCase - Application layer use case
 * 
 * Primary entry point for discovering applicable regulatory profiles.
 * Orchestrates the discovery process and handles cross-cutting concerns.
 * 
 * @domain geo-regulatory
 * @layer application
 */

import { DiscoveryService, type DiscoveryResult } from '../domain/services/DiscoveryService';

export interface DiscoverRequest {
    latitude: number;
    longitude: number;
    domain: string;
}

export interface DiscoverResponse<TParams = Record<string, unknown>> extends DiscoveryResult<TParams> {
    /** Time taken for discovery in milliseconds */
    durationMs: number;

    /** Whether the result was from cache */
    cached: boolean;
}

export class DiscoverRegulatoryProfileUseCase {
    private cache: Map<string, { result: DiscoveryResult<unknown>; timestamp: number }> = new Map();
    private readonly cacheTtlMs = 5 * 60 * 1000;
    private readonly discoveryService: DiscoveryService;

    constructor(discoveryService: DiscoveryService) {
        this.discoveryService = discoveryService;
    }

    async execute<TParams = Record<string, unknown>>(request: DiscoverRequest): Promise<DiscoverResponse<TParams>> {
        const startTime = Date.now();
        const cacheKey = this.getCacheKey(request);

        const cached = this.cache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.cacheTtlMs) {
            return { ...(cached.result as DiscoveryResult<TParams>), durationMs: Date.now() - startTime, cached: true };
        }

        const result = await this.discoveryService.discover<TParams>(request.latitude, request.longitude, request.domain);
        this.cache.set(cacheKey, { result, timestamp: Date.now() });

        return { ...result, durationMs: Date.now() - startTime, cached: false };
    }

    private getCacheKey(request: DiscoverRequest): string {
        const lat = Math.round(request.latitude * 1000) / 1000;
        const lon = Math.round(request.longitude * 1000) / 1000;
        return `${request.domain}:${lat}:${lon}`;
    }

    clearCache(): void { this.cache.clear(); }
}
