/**
 * Feature Flags for Spatial Coverage Features
 * 
 * Flag Priority:
 * - GUIDED_COVERAGE=true → Full Perplexity Spec (overrides Phase 1)
 * - COVERAGE_HEATMAP=true → Phase 1 Static Heatmap
 * - Both false → Current behavior (no heatmap, no guidance)
 */

export interface FeatureFlags {
    /** Phase 1: Static heatmap showing covered/uncovered voxels */
    COVERAGE_HEATMAP: boolean;
    /** Phase 2: Real-time guided coverage with camera tracking (overrides Phase 1) */
    GUIDED_COVERAGE: boolean;
}

export const defaultFlags: FeatureFlags = {
    COVERAGE_HEATMAP: false,
    GUIDED_COVERAGE: false,
};

/** Resolved coverage mode based on flag priority */
export type CoverageMode = 'none' | 'heatmap' | 'guided';

/**
 * Resolve the effective coverage mode from feature flags.
 * GUIDED_COVERAGE takes priority over COVERAGE_HEATMAP.
 */
export function resolveCoverageMode(flags: FeatureFlags): CoverageMode {
    if (flags.GUIDED_COVERAGE) return 'guided';
    if (flags.COVERAGE_HEATMAP) return 'heatmap';
    return 'none';
}

/**
 * Load feature flags from environment variables or localStorage.
 * Supports runtime toggling via URL params: ?COVERAGE_HEATMAP=true
 */
export function loadFeatureFlags(): FeatureFlags {
    const flags = { ...defaultFlags };

    // Check environment variables (build-time)
    if (typeof import.meta !== 'undefined') {
        const env = (import.meta as { env?: Record<string, string> }).env;
        if (env?.VITE_COVERAGE_HEATMAP === 'true') flags.COVERAGE_HEATMAP = true;
        if (env?.VITE_GUIDED_COVERAGE === 'true') flags.GUIDED_COVERAGE = true;
    }

    // Check localStorage (runtime)
    if (typeof localStorage !== 'undefined') {
        if (localStorage.getItem('COVERAGE_HEATMAP') === 'true') flags.COVERAGE_HEATMAP = true;
        if (localStorage.getItem('GUIDED_COVERAGE') === 'true') flags.GUIDED_COVERAGE = true;
    }

    // Check URL params (runtime override)
    if (typeof window !== 'undefined' && window.location) {
        const params = new URLSearchParams(window.location.search);
        if (params.get('COVERAGE_HEATMAP') === 'true') flags.COVERAGE_HEATMAP = true;
        if (params.get('GUIDED_COVERAGE') === 'true') flags.GUIDED_COVERAGE = true;
        // Allow explicit disable via URL
        if (params.get('COVERAGE_HEATMAP') === 'false') flags.COVERAGE_HEATMAP = false;
        if (params.get('GUIDED_COVERAGE') === 'false') flags.GUIDED_COVERAGE = false;
    }

    return flags;
}
