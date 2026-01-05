/**
 * Unit tests for feature flag resolution logic
 */
import { resolveCoverageMode, loadFeatureFlags, defaultFlags } from '../../../src/config/featureFlags';

describe('featureFlags', () => {
    describe('resolveCoverageMode', () => {
        it('returns "none" when both flags are false', () => {
            expect(resolveCoverageMode({
                COVERAGE_HEATMAP: false,
                GUIDED_COVERAGE: false
            })).toBe('none');
        });

        it('returns "heatmap" when only COVERAGE_HEATMAP is true', () => {
            expect(resolveCoverageMode({
                COVERAGE_HEATMAP: true,
                GUIDED_COVERAGE: false
            })).toBe('heatmap');
        });

        it('returns "guided" when only GUIDED_COVERAGE is true', () => {
            expect(resolveCoverageMode({
                COVERAGE_HEATMAP: false,
                GUIDED_COVERAGE: true
            })).toBe('guided');
        });

        it('returns "guided" when both flags are true (GUIDED takes priority)', () => {
            expect(resolveCoverageMode({
                COVERAGE_HEATMAP: true,
                GUIDED_COVERAGE: true
            })).toBe('guided');
        });
    });

    describe('defaultFlags', () => {
        it('has both flags disabled by default', () => {
            expect(defaultFlags.COVERAGE_HEATMAP).toBe(false);
            expect(defaultFlags.GUIDED_COVERAGE).toBe(false);
        });
    });

    describe('loadFeatureFlags', () => {
        beforeEach(() => {
            // Clear localStorage before each test
            if (typeof localStorage !== 'undefined') {
                localStorage.clear();
            }
        });

        it('returns default flags when no overrides exist', () => {
            const flags = loadFeatureFlags();
            expect(flags.COVERAGE_HEATMAP).toBe(false);
            expect(flags.GUIDED_COVERAGE).toBe(false);
        });

        it('loads flags from localStorage', () => {
            localStorage.setItem('COVERAGE_HEATMAP', 'true');
            const flags = loadFeatureFlags();
            expect(flags.COVERAGE_HEATMAP).toBe(true);
            expect(flags.GUIDED_COVERAGE).toBe(false);
        });
    });
});
