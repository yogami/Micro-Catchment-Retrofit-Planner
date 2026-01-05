import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
    type FeatureFlags,
    type CoverageMode,
    defaultFlags,
    loadFeatureFlags,
    resolveCoverageMode
} from '../config/featureFlags';

/**
 * Feature Flag Context
 * 
 * Provides feature flags to the entire app tree with runtime update support.
 */

interface FeatureFlagContextValue {
    flags: FeatureFlags;
    coverageMode: CoverageMode;
    setFlag: (key: keyof FeatureFlags, value: boolean) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextValue>({
    flags: defaultFlags,
    coverageMode: 'none',
    setFlag: () => { },
});

export function FeatureFlagProvider({ children }: { children: ReactNode }) {
    const [flags, setFlags] = useState<FeatureFlags>(defaultFlags);

    useEffect(() => {
        setFlags(loadFeatureFlags());
    }, []);

    const setFlag = (key: keyof FeatureFlags, value: boolean) => {
        setFlags(prev => {
            const next = { ...prev, [key]: value };
            // Persist to localStorage for runtime toggling
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(key, String(value));
            }
            return next;
        });
    };

    const coverageMode = resolveCoverageMode(flags);

    return (
        <FeatureFlagContext.Provider value={{ flags, coverageMode, setFlag }}>
            {children}
        </FeatureFlagContext.Provider>
    );
}

/**
 * Hook to access feature flags
 */
export function useFeatureFlags(): FeatureFlags {
    return useContext(FeatureFlagContext).flags;
}

/**
 * Hook to get the resolved coverage mode
 */
export function useCoverageMode(): CoverageMode {
    return useContext(FeatureFlagContext).coverageMode;
}

/**
 * Hook to toggle a feature flag at runtime
 */
export function useSetFeatureFlag() {
    return useContext(FeatureFlagContext).setFlag;
}
