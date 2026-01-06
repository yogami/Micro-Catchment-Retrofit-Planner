import { useEffect, useRef } from 'react';
import { openMeteoClient } from '../../services/openMeteoClient';
import type { UpdateFn, Services } from '../useARScanner';
import { STORMWATER_PROFILES } from '../../lib/geo-regulatory';
import { createJurisdiction } from '../../lib/geo-regulatory/domain/entities/Jurisdiction';
import { createJurisdictionChain } from '../../lib/geo-regulatory/domain/valueObjects/JurisdictionChain';

export function useScannerDemo(
    demo: string | undefined,
    isScanning: boolean,
    update: UpdateFn,
    discovery: Services['discovery'],
    setUnits: (u: 'metric' | 'imperial') => void
) {
    const consumedRef = useRef(false);

    useEffect(() => {
        if (!demo || isScanning || consumedRef.current) return;
        consumedRef.current = true;

        const startDemo = async () => {
            update({ isLoadingRainfall: true });

            const isBerlin = demo === 'berlin';
            const coords = isBerlin
                ? { lat: 52.52, lon: 13.405, name: 'Berlin' }
                : { lat: 38.8462, lon: -77.3064, name: 'Fairfax, VA' };

            try {
                // Hardcoded regulatory discovery for deterministic demos
                const profile = isBerlin
                    ? STORMWATER_PROFILES.find(p => p.jurisdictionCode === 'DE-BE')!
                    : STORMWATER_PROFILES.find(p => p.jurisdictionCode === 'US-VA-059')!;

                // Mock Jurisdiction Chain
                const chain = isBerlin
                    ? createJurisdictionChain('Germany', 'DE', [
                        createJurisdiction('country', 'Germany', 'DE'),
                        createJurisdiction('state', 'Berlin', 'DE-BE'),
                        createJurisdiction('city', 'Berlin', 'DE-BE-BERLIN')
                    ])
                    : createJurisdictionChain('United States', 'US', [
                        createJurisdiction('country', 'United States', 'US'),
                        createJurisdiction('state', 'Virginia', 'US-VA'),
                        createJurisdiction('county', 'Fairfax County', 'US-VA-059')
                    ]);

                // Mock Discovery Result
                const res = {
                    status: 'discovered',
                    profile: profile,
                    appliedJurisdiction: isBerlin ? chain.hierarchy[1] : chain.hierarchy[2],
                    chain: chain,
                    fallbackPath: []
                };

                const storm = await openMeteoClient.getDesignStorm(coords.lat, coords.lon);

                update({
                    location: { lat: coords.lat, lon: coords.lon },
                    locationName: coords.name,
                    rainfall: storm,
                    isLoadingRainfall: false,
                    isScanning: true,
                    isLocked: true,
                    detectedArea: isBerlin ? 80 : 120, // 80m2 for Berlin, 120m2 for Fairfax
                    activeProfile: profile,
                    jurisdictionChain: chain,
                    discoveryResult: res as any,
                    manualIntensity: profile.parameters.designIntensity_mm_hr,
                    manualDepth: profile.parameters.designDepth_mm
                });

                setUnits(profile.parameters.units);
            } catch (error) {
                console.error('Demo initialization failed:', error);
                update({ isLoadingRainfall: false });
            }
        };

        startDemo();
    }, [demo, isScanning, update, discovery, setUnits]);
}
