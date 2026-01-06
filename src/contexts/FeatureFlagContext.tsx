import { createContext } from 'react';
import type { ReactNode } from 'react';

/**
 * Coverage Mode Context
 * 
 * Feature flags have been absorbed. Coverage mode is now always 'guided'.
 * However, we still support 'heatmap' as a fallback or explicit override via localStorage for testing.
 */

export type CoverageMode = 'guided' | 'heatmap';

interface CoverageModeContextValue {
    coverageMode: CoverageMode;
}

const CoverageModeContext = createContext<CoverageModeContextValue>({
    coverageMode: 'guided',
});

export function CoverageModeProvider({ children }: { children: ReactNode }) {
    return (
        <CoverageModeContext.Provider value={{ coverageMode: 'guided' }}>
            {children}
        </CoverageModeContext.Provider>
    );
}

/**
 * Hook to get the coverage mode
 */
export function useCoverageMode(): CoverageMode {
    if (typeof window !== 'undefined' && localStorage.getItem('COVERAGE_HEATMAP') === 'true') {
        return 'heatmap';
    }
    return 'guided';
}

// Legacy exports for compatibility during migration
export const useFeatureFlags = () => ({ COVERAGE_HEATMAP: true, GUIDED_COVERAGE: true });
export const useSetFeatureFlag = () => () => { };
export const FeatureFlagProvider = CoverageModeProvider;
